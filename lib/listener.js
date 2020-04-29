/* jslint node: true */

'use strict';

const url = require('url');
const http = require('http');

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
function Listener(address, port, path, adapter) {
    if (!(this instanceof Listener)) {
        return new Listener(address, port, path, adapter);
    }

    this.address = address;
    this.port = port;
    this.path = path;
    this.adapter = adapter;
    this.webServer = null;    
    
    const that = this;

    const __construct = (function () {
   
            that.adapter.log.debug('Listener IP: ' + that.address);
            that.adapter.log.debug('Listener port: ' + that.port);
            that.adapter.log.debug('Listener path: ' + that.path);
    
    }.bind(this))();


    this.start = function() {
        this.adapter.log.info('Starting Listener');
        try {
            /**
             * @param {{ url: string; }} request
             * @param {{ writeHead: (arg0: number, arg1: { "Content-Type": string; }) => void; end: () => void; }} response
             */
            this.webServer = http.createServer((request, response) => {
                var my_url = url.parse(request.url, true);
                var json_response = my_url.query;
                var my_path = my_url.pathname;

                if (my_path == this.path) {
                    this.adapter.log.info('Listener received update: ' + JSON.stringify(json_response));
                    response.writeHead(200, { "Content-Type": "text/html" });
                    response.end();
                    this.parse_response(json_response);
                }
                else {
                    this.adapter.log.warn('Listener received illegal request: ' + request.url);
                    response.writeHead(400, { "Content-Type": "text/html" });
                    response.end();
                }
            });


            this.webServer.on('error', this.server_error.bind(this));
            this.webServer.listen(this.port, this.address);
        }
        catch (e) {
            this.adapter.log.error('Something else went wrong on starting our Listener');
        }
    }

    this.stop = function() {
        if (this.webServer)
            this.webServer.close();

    }

    this.server_error = /**
     * @param {{ toString: () => string; }} e
     */
 function(e) {
        if (e.toString().includes('EACCES') && this.port <= 1024) {
            this.adapter.log.error(`node.js process has no rights to start server on the port ${this.port}.\n` +
                `Do you know that on linux you need special permissions for ports under 1024?\n` +
                `You can call in shell following scrip to allow it for node.js: "iobroker fix"`
            );
        } else {
            this.adapter.log.error(`Cannot start server on ${this.address || '0.0.0.0'}:${this.port}: ${e}`);
        }
    }


    /**
     * Parses the JSON object delivered by the Query update from weather station
     */
    this.parse_response = /**
     * @param {any} json_response
     */
 function(json_response) {
        var datetime = new Date();
        this.convertToMetric(json_response);
        this.adapter.setStates(datetime, json_response);
    }

    this.convertToMetric = /**
     * @param {{ indoortemp: any; indoortempf: any; temp: any; tempf: any; dewpt: any; dewptf: any; windchill: any; windchillf: any; windspeed: any; windspeedmph: any; windgust: any; windgustmph: any; barom: any; baromin: any; ... 11 more ...; yearlyrainin: any; }} json_response
     */
 function(json_response) {
        json_response.indoortemp = this.convert_temp(json_response.indoortempf).toFixed(1);
        json_response.temp = this.convert_temp(json_response.tempf).toFixed(1);
        json_response.dewpt = this.convert_temp(json_response.dewptf).toFixed(1);
        json_response.windchill = this.convert_temp(json_response.windchillf).toFixed(1);
        json_response.windspeed = this.convert_windspeed(json_response.windspeedmph).toFixed(1);
        json_response.windgust = this.convert_windspeed(json_response.windgustmph).toFixed(1);
        json_response.barom = this.convert_pressure(json_response.baromin).toFixed(1);
        json_response.absbarom = this.convert_pressure(json_response.absbaromin).toFixed(1);
        json_response.rain = this.convert_rain(json_response.rainin).toFixed(1);
        json_response.dailyrain = this.convert_rain(json_response.dailyrainin).toFixed(1);
        json_response.weeklyrain = this.convert_rain(json_response.weeklyrainin).toFixed(1);
        json_response.monthlyrain = this.convert_rain(json_response.monthlyrainin).toFixed(1);
        json_response.yearlyrain = this.convert_rain(json_response.yearlyrainin).toFixed(1);
    }

    /**
     * Covert rain from in to mm
     * @param {*} rainin
     */
    this.convert_rain = function(rainin) {
        return rainin * 25.4;
    }


    /**
     * Convert a pressure from baromin to hPa
     * @param {*} baromin
     */
    this.convert_pressure = function(baromin) {
        return baromin / 0.02952998751;
    }

    /**
    * Converts a wind speed from mph to system settings
    * @param {*} speedmph 
    */
    this.convert_windspeed = function(speedmph) {
        return speedmph * 1.60934;
    }

    /**
     * Converts a Fahrenheit temperature to Celsius if needed
     * @param {*} tempf 
     */
    this.convert_temp = function (tempf) {
        return (tempf - 32) * (5 / 9);
    }

}

module.exports = Listener;