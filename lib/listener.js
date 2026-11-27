/* jslint node: true */

'use strict';

const http = require('node:http');
const got = require('@esm2cjs/got').default;

const { parse } = require('node:querystring');

const { PROT_WU, PROT_EW, DATAFIELDS } = require('./constants');
const { evaluateExpression } = require('./expressions');

const MAX_POST_BODY_BYTES = 1024 * 1024;

/**
 * Listener class
 *
 * @param {string} address IP Address to listen on
 * @param {number} port Port to listen on
 * @param {string} path URL / Path whrer updates come in
 * @param {object} adapter web adapter object
 * @returns {object} object instance
 */
class Listener {
    /**
     * @param {string} address IP Address to listen on
     * @param {number} port Port to listen on
     * @param {string} path URL / Path whrer updates come in
     * @param {string} protocol Protocol used (WU or EW)
     * @param {string} fwd_url Forward URL (if any)
     * @param {object} adapter web adapter object
     */
    constructor(address, port, path, protocol, fwd_url, adapter) {
        this.address = address === 'listenOnAllPorts' ? '' : address;
        this.port = port;
        this.path = path;
        this.protocol = protocol;
        this.forward_url = fwd_url;
        this.adapter = adapter;
        this.webServer = null;

        this.adapter.log.debug(`Listener IP: ${this.address}`);
        this.adapter.log.debug(`Listener port: ${this.port}`);
        this.adapter.log.debug(`Listener path: ${this.path}`);
        this.adapter.log.debug(`Listener protocol: ${this.protocol}`);
        this.adapter.log.debug(`Forward URL: ${this.forward_url}`);
    }

    /**
     * starts the listener
     */
    start() {
        this.adapter.log.info('Starting Listener');
        try {
            /**
             * @param {import('node:http').IncomingMessage} request
             * @param {import('node:http').ServerResponse} response
             */
            this.webServer = http.createServer((request, response) => {
                let my_body;
                let json_response;

                const my_url = new URL(request.url || '/', 'http://localhost');
                const my_path = my_url.pathname;

                // Wunderground
                switch (this.protocol) {
                    case PROT_WU:
                        json_response = Object.fromEntries(my_url.searchParams.entries());

                        if (my_path == this.path) {
                            const rawPayload = JSON.stringify(json_response);
                            this.adapter.log.debug(`Listener received WU update: ${rawPayload}`);

                            response.writeHead(200, { 'Content-Type': 'text/html' });
                            response.end();
                            this.adapter.setStates(
                                new Date(),
                                this.extract_values({ ...json_response, last_listener_update: rawPayload }),
                            );

                            this.forwardRequest({ searchParams: json_response, method: 'GET' });
                        } else {
                            this.adapter.log.warn(`Listener received illegal request: ${request.url}`);
                            response.writeHead(400, { 'Content-Type': 'text/html' });
                            response.end();
                        }
                        break;
                    case PROT_EW:
                        if (request.method == 'POST' && my_path == this.path) {
                            my_body = '';
                            let bodyBytes = 0;
                            let bodyExceeded = false;

                            request.on('data', chunk => {
                                if (bodyExceeded) {
                                    return;
                                }
                                bodyBytes += chunk.length;
                                if (bodyBytes > MAX_POST_BODY_BYTES) {
                                    bodyExceeded = true;
                                    this.adapter.log.warn(
                                        `Listener rejected oversized POST body (> ${MAX_POST_BODY_BYTES} bytes)`,
                                    );
                                    response.writeHead(413, { 'Content-Type': 'text/plain' });
                                    response.end('Payload Too Large');
                                    request.destroy();
                                    return;
                                }
                                my_body += chunk.toString();
                            });
                            request.on('end', () => {
                                if (bodyExceeded) {
                                    return;
                                }
                                this.adapter.log.debug(`Listener body is ${my_body}`);
                                json_response = parse(my_body);
                                const rawPayload = JSON.stringify(json_response);
                                this.adapter.log.debug(`Listener received EW update: ${rawPayload}`);
                                response.end('ok');
                                this.adapter.setStates(
                                    new Date(),
                                    this.extract_values({ ...json_response, last_listener_update: rawPayload }),
                                );

                                // forwarding needs to happen when request is complete, otherwise we send empty payload
                                this.forwardRequest({ method: 'POST', body: my_body });
                            });
                        } else {
                            this.adapter.log.warn(
                                `Listener received illegal request: (${request.method}) ${request.url}`,
                            );
                            response.writeHead(400, { 'Content-Type': 'text/html' });
                            response.end();
                        }
                        break;
                }
            });

            this.webServer.on('error', this.server_error.bind(this));
            this.webServer.listen(this.port, this.address);
        } catch (e) {
            this.adapter.log.error(`Something else went wrong on starting our Listener: ${e}`);
        }
    }

    /**
     * Forwards the received payload to the configured forward URL, if any.
     *
     * @param {object} requestOptions Options passed to `got` (method, searchParams or body)
     */
    forwardRequest(requestOptions) {
        if (!this.forward_url) {
            return;
        }

        let fwd_url;
        try {
            fwd_url = new URL(this.forward_url);
        } catch (error) {
            this.adapter.log.error(`Invalid forward URL "${this.forward_url}": ${error}`);
            return;
        }

        got(fwd_url, { ...requestOptions, retry: { limit: 0 } })
            .then(got_response => {
                this.adapter.log.debug(`Forward URL: + ${got_response.requestUrl}`);
                this.adapter.log.debug(`Forward response body: ${got_response.body}`);
            })
            .catch(error => {
                this.adapter.log.info(error);
            });
    }

    /**
     * stops the listener
     *
     * @returns {Promise<void>} resolves when the HTTP server has closed
     */
    stop() {
        return new Promise(resolve => {
            if (this.webServer) {
                this.webServer.close(() => {
                    this.adapter.log.info('Listener closed.');
                    resolve();
                });
                // drop idle keep-alive connections so close() does not hang on shutdown
                this.webServer.closeAllConnections();
            } else {
                resolve();
            }
        });
    }

    /**
     * error handler for server
     *
     * @param e Error object
     */
    server_error(e) {
        if (e.toString().includes('EACCES') && this.port <= 1024) {
            this.adapter.log.error(
                `node.js process has no rights to start server on the port ${this.port}.\n` +
                    `Do you know that on linux you need special permissions for ports under 1024?\n` +
                    `You can call in shell following scrip to allow it for node.js: "iobroker fix"`,
            );
        } else {
            this.adapter.log.error(`Cannot start server on ${this.address || '0.0.0.0'}:${this.port}: ${e}`);
        }
    }

    /**
     * Extracts the values from the received JSON response
     *
     * @param json_response JSON Object received from the listener
     * @returns array of extracted values
     */
    extract_values(json_response) {
        const myobj = {};
        const protocol = this.protocol;

        for (const dataelement in json_response) {
            let element_index = '';
            let target_data_point = null;

            for (const def of DATAFIELDS) {
                const pattern = def[protocol];
                if (!pattern) {
                    continue;
                }
                const retval = dataelement.match(pattern);
                if (retval) {
                    target_data_point = def;
                    if (retval.length == 2) {
                        element_index = retval[1];
                    }
                    break;
                }
            }

            // expecting only one target data point to store value
            if (target_data_point) {
                // Select first channel entry of datapoint of channel for new datapoint
                let channel = `${target_data_point.channels[0].channel}.`;

                // add element index to channel if not empty
                if (element_index && element_index != '') {
                    channel = `${channel + element_index}.`;
                }
                const c_id = channel + target_data_point.id;

                this.adapter.log.debug(`Extracting value for ${c_id}(${dataelement})`);

                myobj[c_id] = json_response[dataelement];

                if (target_data_point.listener_conversion != null) {
                    myobj[c_id] = evaluateExpression(target_data_point.listener_conversion, { x: myobj[c_id] });
                }
            } else {
                this.adapter.log.debug(`No mapping found for dataelement: ${dataelement}`);
            }
        }
        return myobj;
    }
}

module.exports = Listener;
