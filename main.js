'use strict';

/*
 * Created with @iobroker/create-adapter v1.24.1
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');

// Load your modules here, e.g.:
const Listener = require('./lib/listener');
const Scheduler = require('./lib/scheduler');

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

        if (this.config.scheduler_active == true) {
            this.log.info('Starting Scheduler');
            this.scheduler = new Scheduler(this.config.ws_address, this.config.ws_port, this.config.ws_freq, this);
            this.scheduler.setCalls(this.config.ws_getfirmware, this.config.ws_getcurrent, this.config.ws_getmax);
            this.scheduler.start();
        }

        if (this.config.listener_active == true) {
            this.listener = new Listener(this.config.bind, this.config.port, this.config.path, this);
            this.listener.start();            
        }
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

        // max. temperatures
        this.setStateAsync('weather.maxvalues.indoortempmax', { val: obj_values.indoortempmax, ack: true });
        this.setStateAsync('weather.maxvalues.outdoortempmax', { val: obj_values.tempmax, ack: true });
        this.setStateAsync('weather.maxvalues.dewpointtempmax', { val: obj_values.dewptmax, ack: true });
        this.setStateAsync('weather.maxvalues.windchilltempmax', { val: obj_values.windchillmax, ack: true });
        // humidity
        this.setStateAsync('weather.maxvalues.indoorhumiditymax', { val: obj_values.indoorhumiditymax, ack: true });
        this.setStateAsync('weather.maxvalues.outdoorhumiditymax', { val: obj_values.humiditymax, ack: true });
        // wind
        this.setStateAsync('weather.maxvalues.windspeedmax', { val: obj_values.windspeedmax, ack: true });
        this.setStateAsync('weather.maxvalues.windgustspeedmax', { val: obj_values.windgustmax, ack: true });
        // pressure
        this.setStateAsync('weather.maxvalues.pressurerelmax', { val: obj_values.barommax, ack: true });
        this.setStateAsync('weather.maxvalues.pressureabsmax', { val: obj_values.absbarommax, ack: true });
        // rain
        this.setStateAsync('weather.maxvalues.rainmax', { val: obj_values.rainmax, ack: true });
        this.setStateAsync('weather.maxvalues.dailyrainmax', { val: obj_values.dailyrainmax, ack: true });
        this.setStateAsync('weather.maxvalues.weeklyrainmax', { val: obj_values.weeklyrainmax, ack: true });
        this.setStateAsync('weather.maxvalues.monthlyrainmax', { val: obj_values.monthlyrainmax, ack: true });
        this.setStateAsync('weather.maxvalues.yearlyrainmax', { val: obj_values.yearlyrainmax, ack: true });
        // solar
        this.setStateAsync('weather.maxvalues.solarradiationmax', { val: obj_values.solarradiationmax, ack: true });
        this.setStateAsync('weather.maxvalues.uvimax', { val: obj_values.UVmax, ack: true });

    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            if (this.listener)
                this.listener.stop();
            if (this.scheduler)
                this.scheduler.stop();
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