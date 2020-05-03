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
            this.scheduler = new Scheduler(this.config, this);
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
        
        // ---- current data
        this.setStateAsync('weather.current.indoortemp', { val: obj_values.indoortemp, ack: true });
        this.setStateAsync('weather.current.outdoortemp', { val: obj_values.temp, ack: true });
        this.setStateAsync('weather.current.dewpointtemp', { val: obj_values.dewpt, ack: true });
        this.setStateAsync('weather.current.windchilltemp', { val: obj_values.windchill, ack: true });
        // humidity
        this.setStateAsync('weather.current.indoorhumidity', { val: obj_values.indoorhumidity, ack: true });
        this.setStateAsync('weather.current.outdoorhumidity', { val: obj_values.humidity, ack: true });
        // wind
        this.setStateAsync('weather.current.windspeed', { val: obj_values.windspeed, ack: true });
        this.setStateAsync('weather.current.windgustspeed', { val: obj_values.windgust, ack: true });
        this.setStateAsync('weather.current.winddir', { val: obj_values.winddir, ack: true });
        // pressure
        this.setStateAsync('weather.current.pressurerel', { val: obj_values.barom, ack: true });
        this.setStateAsync('weather.current.pressureabs', { val: obj_values.absbarom, ack: true });
        // rain
        this.setStateAsync('weather.current.rain', { val: obj_values.rain, ack: true });
        this.setStateAsync('weather.current.dailyrain', { val: obj_values.dailyrain, ack: true });
        this.setStateAsync('weather.current.weeklyrain', { val: obj_values.weeklyrain, ack: true });
        this.setStateAsync('weather.current.monthlyrain', { val: obj_values.monthlyrain, ack: true });
        this.setStateAsync('weather.current.yearlyrain', { val: obj_values.yearlyrain, ack: true });
        // solar
        this.setStateAsync('weather.current.solarradiation', { val: obj_values.solarradiation, ack: true });
        this.setStateAsync('weather.current.uvi', { val: obj_values.UV, ack: true });

        // ----- Absolut max. data
        this.setStateAsync('weather.maxvalues.absolut.indoortempmax', { val: obj_values.indoortempmax, ack: true });
        this.setStateAsync('weather.maxvalues.absolut.outdoortempmax', { val: obj_values.tempmax, ack: true });
        this.setStateAsync('weather.maxvalues.absolut.dewpointtempmax', { val: obj_values.dewptmax, ack: true });
        this.setStateAsync('weather.maxvalues.absolut.windchilltempmax', { val: obj_values.windchillmax, ack: true });
        // humidity
        this.setStateAsync('weather.maxvalues.absolut.indoorhumiditymax', { val: obj_values.indoorhumiditymax, ack: true });
        this.setStateAsync('weather.maxvalues.absolut.outdoorhumiditymax', { val: obj_values.humiditymax, ack: true });
        // wind
        this.setStateAsync('weather.maxvalues.absolut.windspeedmax', { val: obj_values.windspeedmax, ack: true });
        this.setStateAsync('weather.maxvalues.absolut.windgustspeedmax', { val: obj_values.windgustmax, ack: true });
        // pressure
        this.setStateAsync('weather.maxvalues.absolut.pressurerelmax', { val: obj_values.barommax, ack: true });
        this.setStateAsync('weather.maxvalues.absolut.pressureabsmax', { val: obj_values.absbarommax, ack: true });
        // rain
        this.setStateAsync('weather.maxvalues.absolut.rainmax', { val: obj_values.rainmax, ack: true });
        this.setStateAsync('weather.maxvalues.absolut.dailyrainmax', { val: obj_values.dailyrainmax, ack: true });
        this.setStateAsync('weather.maxvalues.absolut.weeklyrainmax', { val: obj_values.weeklyrainmax, ack: true });
        this.setStateAsync('weather.maxvalues.absolut.monthlyrainmax', { val: obj_values.monthlyrainmax, ack: true });
        this.setStateAsync('weather.maxvalues.absolut.yearlyrainmax', { val: obj_values.yearlyrainmax, ack: true });
        // solar
        this.setStateAsync('weather.maxvalues.absolut.solarradiationmax', { val: obj_values.solarradiationmax, ack: true });
        this.setStateAsync('weather.maxvalues.absolut.uvimax', { val: obj_values.UVmax, ack: true });

        // ----- Absolut min. data
        this.setStateAsync('weather.minvalues.absolut.indoortempmin', { val: obj_values.indoortempmin, ack: true });
        this.setStateAsync('weather.minvalues.absolut.outdoortempmin', { val: obj_values.tempmin, ack: true });
        this.setStateAsync('weather.minvalues.absolut.dewpointtempmin', { val: obj_values.dewptmin, ack: true });
        this.setStateAsync('weather.minvalues.absolut.windchilltempmin', { val: obj_values.windchillmin, ack: true });
        // humidity
        this.setStateAsync('weather.minvalues.absolut.indoorhumiditymin', { val: obj_values.indoorhumiditymin, ack: true });
        this.setStateAsync('weather.minvalues.absolut.outdoorhumiditymin', { val: obj_values.humiditymin, ack: true });
        // pressure
        this.setStateAsync('weather.minvalues.absolut.pressurerelmin', { val: obj_values.barommin, ack: true });
        this.setStateAsync('weather.minvalues.absolut.pressureabsmin', { val: obj_values.absbarommin, ack: true });

        // ----- Daily max. data
        this.setStateAsync('weather.maxvalues.daily.indoortempmax', { val: obj_values.indoortempdailymax, ack: true });
        this.setStateAsync('weather.maxvalues.daily.outdoortempmax', { val: obj_values.tempdailymax, ack: true });
        this.setStateAsync('weather.maxvalues.daily.dewpointtempmax', { val: obj_values.dewptdailymax, ack: true });
        this.setStateAsync('weather.maxvalues.daily.windchilltempmax', { val: obj_values.windchilldailymax, ack: true });
        // humidity
        this.setStateAsync('weather.maxvalues.daily.indoorhumiditymax', { val: obj_values.indoorhumiditydailymax, ack: true });
        this.setStateAsync('weather.maxvalues.daily.outdoorhumiditymax', { val: obj_values.humiditydailymax, ack: true });
        // wind
        this.setStateAsync('weather.maxvalues.daily.windspeedmax', { val: obj_values.windspeeddailymax, ack: true });
        this.setStateAsync('weather.maxvalues.daily.windgustspeedmax', { val: obj_values.windspeeddailymax, ack: true });
        // pressure
        this.setStateAsync('weather.maxvalues.daily.pressurerelmax', { val: obj_values.baromdailymax, ack: true });
        this.setStateAsync('weather.maxvalues.daily.pressureabsmax', { val: obj_values.absbaromdailymax, ack: true });
        // rain
        this.setStateAsync('weather.maxvalues.daily.rainmax', { val: obj_values.raindailymax, ack: true });
        // solar
        this.setStateAsync('weather.maxvalues.daily.solarradiationmax', { val: obj_values.solarradiationdailymax, ack: true });
        this.setStateAsync('weather.maxvalues.daily.uvimax', { val: obj_values.UVdailymax, ack: true });

        // ----- Daily min. data
        this.setStateAsync('weather.minvalues.daily.indoortempmin', { val: obj_values.indoortempdailymin, ack: true });
        this.setStateAsync('weather.minvalues.daily.outdoortempmin', { val: obj_values.tempdailymin, ack: true });
        this.setStateAsync('weather.minvalues.daily.dewpointtempmin', { val: obj_values.dewptdailymin, ack: true });
        this.setStateAsync('weather.minvalues.daily.windchilltempmin', { val: obj_values.windchilldailymin, ack: true });
        // humidity
        this.setStateAsync('weather.minvalues.daily.indoorhumiditymin', { val: obj_values.indoorhumiditydailymin, ack: true });
        this.setStateAsync('weather.minvalues.absolut.outdoorhumiditymin', { val: obj_values.humiditydailymin, ack: true });
        // pressure
        this.setStateAsync('weather.minvalues.daily.pressurerelmin', { val: obj_values.baromdailymin, ack: true });
        this.setStateAsync('weather.minvalues.daily.pressureabsmin', { val: obj_values.absbaromdailymin, ack: true });


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