/* jslint node: true */

'use strict';

const url = require('url');
const http = require('http');
const got = require('got');
const Parser = require('expr-eval').Parser;

const { parse } = require('querystring');

const { PROT_WU, PROT_EW, DATAFIELDS } = require('./constants');


/**
 * Listener class
 *
 * @class
 * @param {string} address IP Address to listen on
 * @param {number} port Port to listen on
 * @param {string} path URL / Path whrer updates come in
 * @param {object} adapter web adapter object
 * @return {object} object instance
 */
class Listener {

    constructor(address, port, path, protocol, fwd_url, adapter) {
        this.address = address;
        this.port = port;
        this.path = path;
        this.protocol = protocol;
        this.forward_url = fwd_url;
        this.adapter = adapter;
        this.webServer = null;



        this.adapter.log.debug('Listener IP: ' + this.address);
        this.adapter.log.debug('Listener port: ' + this.port);
        this.adapter.log.debug('Listener path: ' + this.path);
        this.adapter.log.debug('Listener protocol: ' + this.protocol);
        this.adapter.log.debug('Forward URL: ' + this.forward_url);

    }

    start() {
        this.adapter.log.info('Starting Listener');
        try {
            /**
             * @param {{ url: string; }} request
             * @param {{ writeHead: (arg0: number, arg1: { "Content-Type": string; }) => void; end: () => void; }} response
             */
            this.webServer = http.createServer((request, response) => {

                let my_body;
                let json_response;

                const my_url = url.parse(request.url, true);
                const my_path = my_url.pathname;

                // Wunderground
                switch (this.protocol) {
                    case PROT_WU:
                        json_response = my_url.query;

                        if (my_path == this.path) {
                            this.adapter.log.info('Listener received WU update: ' + JSON.stringify(json_response));
                            this.adapter.setStateAsync('info.last_listener_update', { val: JSON.stringify(json_response), ack: true });

                            response.writeHead(200, { 'Content-Type': 'text/html' });
                            response.end();
                            this.adapter.setStates(new Date(), this.extract_values(json_response));

                            if (this.forward_url != null && this.forward_url != '') {
                                // forward to another host
                                const fwd_url = new URL(this.forward_url);

                                got(fwd_url, { searchParams: json_response, method: 'GET', retry: 0 }).then(response => {
                                    this.adapter.log.info(response.body.url);
                                    this.adapter.log.info(response.body.explanation);
                                }).catch(error => {
                                    this.adapter.log.info(error);
                                });
                            }

                        } else {
                            this.adapter.log.warn('Listener received illegal request: ' + request.url);
                            response.writeHead(400, { 'Content-Type': 'text/html' });
                            response.end();
                        }
                        break;
                    case PROT_EW:
                        if (request.method == 'POST' && my_path == this.path) {
                            my_body = '';
                            request.on('data', chunk => {
                                my_body += chunk.toString();
                            });
                            request.on('end', () => {
                                this.adapter.log.info('Listener body is ' + my_body);
                                json_response = parse(my_body);
                                this.adapter.setStates(new Date(), this.extract_values(json_response));
                                this.adapter.log.info('Listener received EW update: ' + JSON.stringify(json_response));
                                this.adapter.setStateAsync('info.last_listener_update', { val: JSON.stringify(json_response), ack: true });
                                response.end('ok');
                            });


                            if (this.forward_url != null && this.forward_url != '') {
                                // forward to another host
                                const fwd_url = new URL(this.forward_url);

                                got(fwd_url, { method: 'POST', retry: 0, body: my_body }).then(response => {
                                    this.adapter.log.info(response.body.url);
                                    this.adapter.log.info(response.body.explanation);
                                }).catch(error => {
                                    this.adapter.log.info(error);
                                });
                            }

                        } else {
                            this.adapter.log.warn(`Listener received illegal request: (${request.method}) ${request.url}`);
                            response.writeHead(400, { 'Content-Type': 'text/html' });
                            response.end();
                        }
                        break;
                }
            });


            this.webServer.on('error', this.server_error.bind(this));
            this.webServer.listen(this.port, this.address);
        }
        catch (e) {
            this.adapter.log.error('Something else went wrong on starting our Listener');
        }
    }

    stop() {
        if (this.webServer)
            this.webServer.close();

    }

    server_error(e) {
        if (e.toString().includes('EACCES') && this.port <= 1024) {
            this.adapter.log.error(`node.js process has no rights to start server on the port ${this.port}.\n` +
                `Do you know that on linux you need special permissions for ports under 1024?\n` +
                `You can call in shell following scrip to allow it for node.js: "iobroker fix"`
            );
        } else {
            this.adapter.log.error(`Cannot start server on ${this.address || '0.0.0.0'}:${this.port}: ${e}`);
        }
    }



    extract_values(json_response) {
        const myobj = {};
        const parser = new Parser();
        const protocol = this.protocol;


        for (const dataelement in json_response) {

            let element_index = '';

            const my_attr_def = DATAFIELDS.filter(function (def) {
                const retval = dataelement.match(def[protocol]);
                if (retval && retval.length == 2) {
                    element_index = retval[1];
                }

                return retval;
            });

            // expecting only one target data point to store value
            if (my_attr_def.length > 0) {
                const target_data_point = my_attr_def[0];
                // Select first channel entry of datapoint of channel for new datapoint
                let channel = target_data_point.channels[0].channel + '.';

                // add element index to channel if not empty
                if (element_index && element_index!='') {
                    channel = channel + element_index + '.';
                }
                const c_id = channel + target_data_point.id;

                this.adapter.log.debug('Extracting value for ' + c_id + '(' + dataelement + ')');

                myobj[c_id] = json_response[dataelement];

                if (target_data_point.listener_conversion != null) {
                    const exp = parser.parse(target_data_point.listener_conversion);
                    myobj[c_id] = exp.evaluate({ x: myobj[c_id] });
                }
            } else {
                this.adapter.log.debug('No mapping found for dataelement: ' + dataelement);
            }
        }
        return myobj;
    }


}

module.exports = Listener;