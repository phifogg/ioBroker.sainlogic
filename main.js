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
            try {
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


                webServer.on('error', this.server_error);

                webServer.listen(this.config.port, this.config.bind);
            }
            catch (e) {
                this.log.error('Something else went wrong on starting our Listener');
            }
        }
    }

    server_error(e) {
        if (e.toString().includes('EACCES') && this.config.port <= 1024) {
            adapter.log.error(`node.js process has no rights to start server on the port ${port}.\n` +
                `Do you know that on linux you need special permissions for ports under 1024?\n` +
                `You can call in shell following scrip to allow it for node.js: "iobroker fix"`
            );
        } else {
            adapter.log.error(`Cannot start server on ${this.config.bind || '0.0.0.0'}:${this.config.port}: ${e}`);
        }
    }

    /**
     * Parses the JSON object delivered by the Query update from weather station
     * @param {*} json_response 
     */
    parse_response(json_response) {
        var dateutc = json_response.dateutc;
        var date = new Date(dateutc + ' UTC');
        
        this.setStateAsync('info.last_update', { val: date.toString(), ack: true });
        this.setStateAsync('info.softwaretype', { val: json_response.softwaretype, ack: true });

        // temperatures
        this.setStateAsync('weather.indoortemp', { val: this.convert_temp(json_response.indoortempf), ack: true });
        this.setStateAsync('weather.outdoortemp', {val: this.convert_temp(json_response.tempf), ack: true });
        this.setStateAsync('weather.dewpointtemp', {val: this.convert_temp(json_response.dewptf), ack: true });
        this.setStateAsync('weather.windchilltemp', {val: this.convert_temp(json_response.windchillf), ack: true });

        // humidity
        this.setStateAsync('weather.indoorhumidity', {val: json_response.indoorhumidity, ack: true});
        this.setStateAsync('weather.outdoorhumidity', {val: json_response.humidity, ack: true});

        // wind
        this.setStateAsync('weather.windspeed', {val: this.convert_windspeed(json_response.windspeedmph), ack: true});
        this.setStateAsync('weather.windgustspeed', {val: this.convert_windspeed(json_response.windgustmph), ack: true});
        this.setStateAsync('weather.winddir', {val: json_response.winddir, ack: true});

        // pressure
        this.setStateAsync('weather.pressurerel', {val: this.convert_pressure(json_response.baromin), ack: true});
        this.setStateAsync('weather.pressureabs', {val: this.convert_pressure(json_response.absbaromin), ack: true});

        // rain
        this.setStateAsync('weather.rain', {val: this.convert_rain(json_response.rainin), ack: true});
        this.setStateAsync('weather.dailyrain', {val: this.convert_rain(json_response.dailyrainin), ack: true});
        this.setStateAsync('weather.weeklyrain', {val: this.convert_rain(json_response.weeklyrainin), ack: true});
        this.setStateAsync('weather.monthlyrain', {val: this.convert_rain(json_response.monthlyrainin), ack: true});
        this.setStateAsync('weather.yearlyrain', {val: this.convert_rain(json_response.yearlyrainin), ack: true});
        
        // solar
        this.setStateAsync('weather.solarradiation', {val: json_response.solarradiation, ack: true});
        this.setStateAsync('weather.uvi', {val: json_response.UV, ack: true});

    }

    /**
     * Covert rain from in to mm
     * @param {*} rainin
     */
    convert_rain(rainin) {
        return rainin * 25.4;
    }


    /**
     * Convert a pressure from baromin to hPa
     * @param {*} baromin
     */
    convert_pressure(baromin) {
        return baromin / 0.02952998751;
    }

    /**
    * Converts a wind speed from mph to system settings
    * @param {*} speedmph 
    */
    convert_windspeed(speedmph) {
        return speedmph * 1.60934;
    }

    /**
     * Converts a Fahrenheit temperature to Celsius if needed
     * @param {*} tempf 
     */
    convert_temp(tempf) {
        return (tempf -32) * (5/9);
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