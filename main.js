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
const net = require('net');
const BinaryParser = require('binary-parser').Parser;

const convert = (from, to) => str => Buffer.from(str, from).toString(to);
const hexToUtf8 = convert('hex', 'utf8');
const utf8ToHex = convert('utf8', 'hex');

let webServer = null;
let fwClient = null;
let dataClient = null;
let json_response = null;
let schedule_timer = null;

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
        this.log.info('Starting Sainlogic Adapter')
        this.log.debug('=== Listener config ===');
        this.log.debug('Listner active: ' + this.config.listener_active);
        this.log.debug('Config IP: ' + this.config.bind);
        this.log.debug('Config port: ' + this.config.port);
        this.log.debug('Config path: ' + this.config.path);
        this.log.debug('=== Scheduler config ===');
        this.log.debug('Scheduler active: ' + this.config.scheduler_active);
        this.log.debug('WS IP: ' + this.config.ws_address);
        this.log.debug('WS Port: ' + this.config.ws_port);
        this.log.debug('WS Frequency: ' + this.config.ws_freq);
        json_response = {};

        if (this.config.scheduler_active == true) {
            this.log.info('Starting Scheduler');
            schedule_timer = setInterval(this.startScheduler.bind(this), this.config.ws_freq * 1000);
        }

        if (this.config.listener_active == true) {
            this.log.info('Starting Listener');
            try {
                webServer = http.createServer((request, response) => {
                var my_url = url.parse(request.url, true);
                json_response = my_url.query;
                var my_path = my_url.pathname;

                if (my_path == this.config.path) {  
                    this.log.info('Listener received update: ' + JSON.stringify(json_response));
                    response.writeHead(200, {"Content-Type": "text/html"});
                    response.end();
                    this.parse_response();
                }
                else {
                    this.log.warn('Listener received illegal request: ' + request.url);
                    response.writeHead(400, {"Content-Type": "text/html"});
                    response.end();
                 }
                });


                webServer.on('error', this.server_error.bind(this));
                webServer.listen(this.config.port, this.config.bind);
            }
            catch (e) {
                this.log.error('Something else went wrong on starting our Listener');
            }
        }
    }

    startScheduler() {
        this.log.info('Scheduler pulling for new data')
        // firmware 
        fwClient = new net.Socket();
        fwClient.on('data', this.fwClient_data_received.bind(this));
        fwClient.on('close', this.fwClient_close.bind(this));
        fwClient.connect(this.config.ws_port, this.config.ws_address, this.fwClient_connect.bind(this));
    }

    fwClient_connect() {
        var getfirmwarecmd = [0xff, 0xff, 0x50, 0x03, 0x53];
        var hexVal = new Uint8Array(getfirmwarecmd);
        this.log.debug('FW Scheduler connected to weather station');
        fwClient.write(hexVal);
    }

    fwClient_data_received(data) {
        this.log.debug('FW Scheduler Received data string: ' +  data.toString('hex'));
        
        var utf_data = hexToUtf8(data.toString('hex'));
        utf_data = utf_data.slice(5, utf_data.length);
        this.log.debug('FW Scheduler received raw: ' + utf_data);
        json_response.softwaretype = utf_data;
        fwClient.destroy(); // kill client after server's response
    }

    dataClient_close() {
        this.log.debug('Data Scheduler Connection closed');

    }

    dataClient_connect() {
        var getweatherdatacmd = [0xFF, 0xFF, 0x0B, 0x00, 0x06, 0x04, 0x04, 0x19];
        var hexVal = new Uint8Array(getweatherdatacmd);

        this.log.debug('Data Scheduler connected to weather station');
        dataClient.write(hexVal);
    }

    dataClient_data_received(data) {
        var hex_data = data.toString('hex');
        this.log.debug('Data Scheduler Received data string: ' +  data);
        
        // setup parser
       var wdata = new BinaryParser()
           .endianess("big").seek(7)
           .uint16("indoortemp").seek(1)
           .uint16("temp").seek(1)
           .uint16("dewpt").seek(1)
           .uint16("windchill").seek(1)
           .uint16be("heatindex").seek(1)
           .uint8("indoorhumidity").seek(1)
           .uint8("humidity").seek(1)
           .uint16("absbarom").seek(1)
           .uint16('barom').seek(1)
           .uint16('winddir').seek(1)
           .uint16('windspeed').seek(1)
           .uint16('windgust').seek(1)
           .uint32('rain').seek(1)
           .uint32('dailyrain').seek(1)
           .uint32('weeklyrain').seek(1)
           .uint32('monthlyrain').seek(1)
           .uint32('yearlyrain').seek(1)
           .uint32('raintotal').seek(1)
           .uint32('solarradiation').seek(1)
           .uint16('UVraw').seek(1)
           .uint8('UV');

        var buf = Buffer.from(hex_data, "hex");
        json_response = Object.assign(json_response, wdata.parse(buf));
        this.log.debug(JSON.stringify(wdata.parse(buf)));

        this.setDecimals();
        var datetime = new Date();
        this.setStates(datetime);

        dataClient.destroy(); // kill client after server's response
    }

    fwClient_close() {
        this.log.debug('FW Scheduler Connection closed');
        // weather data
        dataClient = new net.Socket();
        dataClient.on('data', this.dataClient_data_received.bind(this));
        dataClient.on('close', this.dataClient_close.bind(this));
        dataClient.connect(this.config.ws_port, this.config.ws_address, this.dataClient_connect.bind(this));
        
    }

    server_error(e) {
        if (e.toString().includes('EACCES') && this.config.port <= 1024) {
            this.log.error(`node.js process has no rights to start server on the port ${this.config.port}.\n` +
                `Do you know that on linux you need special permissions for ports under 1024?\n` +
                `You can call in shell following scrip to allow it for node.js: "iobroker fix"`
            );
        } else {
            this.log.error(`Cannot start server on ${this.config.bind || '0.0.0.0'}:${this.config.port}: ${e}`);
        }
    }

    /**
     * Parses the JSON object delivered by the Query update from weather station
     */
    parse_response() {
        var datetime = new Date();
        this.convertToMetric(json_response);
        this.setStates(datetime, json_response);

    }

    setDecimals() {
        var divide_by_10 = [ 'indoortemp', 'temp', 'dewpt', 'windchill', 'barom', 'absbarom', 'rain', 'dailyrain', 'weeklyrain', 'monthlyrain', 'yearlyrain' ];
        
        divide_by_10.forEach(function(state) {
            json_response[state] = json_response[state] / 10;
        });

        json_response.solarradiation = json_response.solarradiation / 10000;

    }

    convertToMetric() {
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
     * @param {Date} date
     * @param {{ softwaretype: any; indoortempf: any; tempf: any; dewptf: any; windchillf: any; indoorhumidity: any; humidity: any; windspeedmph: any; windgustmph: any; winddir: any; baromin: any; absbaromin: any; ... 6 more ...; UV: any; }} json_response
     */
    setStates(date) {
        this.setStateAsync('info.last_update', { val: date.toString(), ack: true });
        this.setStateAsync('info.softwaretype', { val: json_response.softwaretype, ack: true });
        // temperatures
        this.setStateAsync('weather.indoortemp', { val: json_response.indoortemp, ack: true });
        this.setStateAsync('weather.outdoortemp', { val: json_response.temp, ack: true });
        this.setStateAsync('weather.dewpointtemp', { val: json_response.dewpt, ack: true });
        this.setStateAsync('weather.windchilltemp', { val: json_response.windchill, ack: true });
        // humidity
        this.setStateAsync('weather.indoorhumidity', { val: json_response.indoorhumidity, ack: true });
        this.setStateAsync('weather.outdoorhumidity', { val: json_response.humidity, ack: true });
        // wind
        this.setStateAsync('weather.windspeed', { val: json_response.windspeed, ack: true });
        this.setStateAsync('weather.windgustspeed', { val: json_response.windgust, ack: true });
        this.setStateAsync('weather.winddir', { val: json_response.winddir, ack: true });
        // pressure
        this.setStateAsync('weather.pressurerel', { val: json_response.barom, ack: true });
        this.setStateAsync('weather.pressureabs', { val: json_response.absbarom, ack: true });
        // rain
        this.setStateAsync('weather.rain', { val: json_response.rain, ack: true });
        this.setStateAsync('weather.dailyrain', { val: json_response.dailyrain, ack: true });
        this.setStateAsync('weather.weeklyrain', { val: json_response.weeklyrain, ack: true });
        this.setStateAsync('weather.monthlyrain', { val: json_response.monthlyrain, ack: true });
        this.setStateAsync('weather.yearlyrain', { val: json_response.yearlyrain, ack: true });
        // solar
        this.setStateAsync('weather.solarradiation', { val: json_response.solarradiation, ack: true });
        this.setStateAsync('weather.uvi', { val: json_response.UV, ack: true });
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
            if (webServer)
                webServer.close(); 
            if (schedule_timer)
                clearInterval(schedule_timer);
            if (dataClient) 
                dataClient.destroy();
            if (fwClient)
                fwClient.destroy();
            this.log.info('Sainlogic Adapter gracefully shut down...');
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
            log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
        } else {
            // The object was deleted
            log.info(`object ${id} deleted`);
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
            log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
        } else {
            // The state was deleted
            log.info(`state ${id} deleted`);
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
    // 			log.info('send command');

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