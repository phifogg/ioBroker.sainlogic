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
const Listener = require('./lib/listener');

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
            this.listener = new WS_Listener(this.config.bind, this.config.port, this.config.path, this);
            this.listener.start();            
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
        this.setStates(datetime, json_response);

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


    setDecimals() {
        var divide_by_10 = [ 'indoortemp', 'temp', 'dewpt', 'windchill', 'barom', 'absbarom', 'rain', 'dailyrain', 'weeklyrain', 'monthlyrain', 'yearlyrain' ];
        
        divide_by_10.forEach(function(state) {
            json_response[state] = json_response[state] / 10;
        });

        json_response.solarradiation = json_response.solarradiation / 10000;

    }


    /**
     * @param {Date} date
     * @param {{ softwaretype: any; indoortempf: any; tempf: any; dewptf: any; windchillf: any; indoorhumidity: any; humidity: any; windspeedmph: any; windgustmph: any; winddir: any; baromin: any; absbaromin: any; ... 6 more ...; UV: any; }} json_response
     */
    setStates(date, obj_values) {
        this.setStateAsync('info.last_update', { val: date.toString(), ack: true });
        this.setStateAsync('info.softwaretype', { val: obj_values.softwaretype, ack: true });
        // temperatures
        this.setStateAsync('weather.indoortemp', { val: obj_values.indoortemp, ack: true });
        this.setStateAsync('weather.outdoortemp', { val: obj_values.temp, ack: true });
        this.setStateAsync('weather.dewpointtemp', { val: obj_values.dewpt, ack: true });
        this.setStateAsync('weather.windchilltemp', { val: obj_values.windchill, ack: true });
        // humidity
        this.setStateAsync('weather.indoorhumidity', { val: obj_values.indoorhumidity, ack: true });
        this.setStateAsync('weather.outdoorhumidity', { val: obj_values.humidity, ack: true });
        // wind
        this.setStateAsync('weather.windspeed', { val: obj_values.windspeed, ack: true });
        this.setStateAsync('weather.windgustspeed', { val: obj_values.windgust, ack: true });
        this.setStateAsync('weather.winddir', { val: obj_values.winddir, ack: true });
        // pressure
        this.setStateAsync('weather.pressurerel', { val: obj_values.barom, ack: true });
        this.setStateAsync('weather.pressureabs', { val: obj_values.absbarom, ack: true });
        // rain
        this.setStateAsync('weather.rain', { val: obj_values.rain, ack: true });
        this.setStateAsync('weather.dailyrain', { val: obj_values.dailyrain, ack: true });
        this.setStateAsync('weather.weeklyrain', { val: obj_values.weeklyrain, ack: true });
        this.setStateAsync('weather.monthlyrain', { val: obj_values.monthlyrain, ack: true });
        this.setStateAsync('weather.yearlyrain', { val: obj_values.yearlyrain, ack: true });
        // solar
        this.setStateAsync('weather.solarradiation', { val: obj_values.solarradiation, ack: true });
        this.setStateAsync('weather.uvi', { val: obj_values.UV, ack: true });
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            if (this.listener)
                this.listener.stop();
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