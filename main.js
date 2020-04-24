'use strict';

/*
 * Created with @iobroker/create-adapter v1.24.1
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');

// Load your modules here, e.g.:
const url = require('url');
const http = require('http');
// const fs = require("fs");

let webServer = null;

class Sainlogic extends utils.Adapter {

    /**
     * @param {Partial<ioBroker.AdapterOptions>} [options={}]
     */
    constructor(options) {
        super({
            ...options,
            name: 'sainlogic',
        });
        this.on('ready', this.onReady.bind(this));
        this.on('objectChange', this.onObjectChange.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        // this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        // Initialize your adapter here

        // The adapters config (in the instance object everything under the attribute "native") is accessible via
        // this.config:
        this.log.info('Listner active: ' + this.config.listener_active);
        this.log.info('Config IP: ' + this.config.bind);
        this.log.info('Config port: ' + this.config.port);
        this.log.info('Config path: ' + this.config.path);


        if (this.config.listener_active == true) {
            webServer = http.createServer((request, response) => {
                var my_url = url.parse(request.url, true);
                var query = my_url.query;
                var my_path = my_url.pathname;

                if (my_path == this.config.path) {  
                    this.log.info('Received path: ' + my_path);
                    this.log.info('JSON Query string: ' + JSON.stringify(query));
                    response.writeHead(200, {"Content-Type": "text/html"});
                    response.end();
                    this.parse_response(query);
                }
                else {
                    response.writeHead(400, {"Content-Type": "text/html"});
                    response.end();
                 }
            });
            webServer.listen(this.config.port, this.config.bind);
        }
    }

    /**
     * Parses the JSON object delivered by the Query update from weather station
     * @param {*} json_response 
     */
    parse_response(json_response) {
        var dateutc = json_response.dateutc;
        this.setStateAsync('info.last_update', { val: dateutc, ack: true });
        this.setStateAsync('info.softwaretype', { val: json_response.softwaretype, ack: true });

    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            webServer.close(function () {
            }); 
            this.log.info('cleaned everything up...');
            callback();
        } catch (e) {
            callback();
        }
    }

    /**
     * Is called if a subscribed object changes
     * @param {string} id
     * @param {ioBroker.Object | null | undefined} obj
     */
    onObjectChange(id, obj) {
        if (obj) {
            // The object was changed
            this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
        } else {
            // The object was deleted
            this.log.info(`object ${id} deleted`);
        }
    }

    /**
     * Is called if a subscribed state changes
     * @param {string} id
     * @param {ioBroker.State | null | undefined} state
     */
    onStateChange(id, state) {
        if (state) {
            // The state was changed
            this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
        } else {
            // The state was deleted
            this.log.info(`state ${id} deleted`);
        }
    }

    // /**
    //  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
    //  * Using this method requires "common.message" property to be set to true in io-package.json
    //  * @param {ioBroker.Message} obj
    //  */
    // onMessage(obj) {
    // 	if (typeof obj === 'object' && obj.message) {
    // 		if (obj.command === 'send') {
    // 			// e.g. send email or pushover or whatever
    // 			this.log.info('send command');

    // 			// Send response in callback if required
    // 			if (obj.callback) this.sendTo(obj.from, obj.command, 'Message received', obj.callback);
    // 		}
    // 	}
    // }

}

// @ts-ignore parent is a valid property on module
if (module.parent) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<ioBroker.AdapterOptions>} [options={}]
     */
    module.exports = (options) => new Sainlogic(options);
} else {
    // otherwise start the instance directly
    new Sainlogic();
}