'use strict';

/*
 * Created with @iobroker/create-adapter v1.24.1
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
const util = require('util');
const Parser = require('expr-eval').Parser;

// Load your modules here, e.g.:
const Listener = require('./lib/listener');
const Scheduler = require('./lib/scheduler');
const { DATAFIELDS } = require('./lib/constants');
//const getMethods = (obj) => Object.getOwnPropertyNames(obj).filter(item => typeof obj[item] === 'function');


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
    }


    checkUnit(attrdef, obj) {

        const c_id = attrdef.channel + '.' + attrdef.id;
        const target_unit = this.config[attrdef.unit_config];
        this.log.info(`Unit check for ${attrdef.id} from ${obj.common.unit} to ${target_unit}`);

        if (target_unit != obj.common.unit) {
            // change and convert unit
            this.log.info(`Unit changed for ${attrdef.id} from ${obj.common.unit} to ${target_unit}, updating data point`);

            const my_target_unit = attrdef.units.filter(function (unit) {
                return unit.display_name == target_unit;
            });

            const my_source_unit = attrdef.units.filter(function (unit) {
                return unit.display_name == obj.common.unit;
            });

            const conversion_rule_back = my_source_unit[0].main_unit_conversion;
            const conversion_rule_forward = my_target_unit[0].display_conversion;


            this.setObjectAsync(c_id, {
                type: obj.type,
                common: {
                    name: obj.common.name,
                    type: obj.common.type,
                    unit: target_unit,
                    role: obj.common.role
                },
                native: {},
            });


            const that = this;
            this.getState(c_id, function (err, st) {

                const parser = new Parser();

                let new_value = st.val;

                // convert back if required
                if (conversion_rule_back != null) {
                    const exp = parser.parse(conversion_rule_back);
                    new_value = exp.evaluate({ x: new_value });
                }

                // convert forward if required
                if (conversion_rule_forward != null) {
                    const exp = parser.parse(conversion_rule_forward);
                    new_value = exp.evaluate({ x: new_value });

                }
                that.setState(c_id, { val: new_value, ack: true });

            }.bind(that));

        }
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        // Initialize your adapter here

        // try changing a data state object:
        for (const attr in DATAFIELDS) {

            // check object for existence and update if needed
            const obj_id = DATAFIELDS[attr].channel + '.' + DATAFIELDS[attr].id;
            const that = this;
            this.getObject(obj_id, function (err, obj) {
                if (err || obj == null) {
                    that.log.error('Error on retrieving object: ' + obj_id + ', err: ' + err);
                } else {
                    that.log.info('Checking obj: ' + obj_id);
                    if (DATAFIELDS[attr].unit_config != null) {
                        that.checkUnit(DATAFIELDS[attr], obj);
                    }
                }

            }.bind(that));
        }


        // The adapters config (in the instance object everything under the attribute "native") is accessible via
        // this.config:

        if (this.config.scheduler_active == true) {
            this.log.info('Starting Scheduler');
            this.scheduler = new Scheduler(this.config, this);
            this.scheduler.start();
        }

        if (this.config.listener_active == true) {
            this.listener = new Listener(this.config.bind, this.config.port, this.config.path, this.config.listener_protocol, this);
            this.listener.start();
        }
    }


    /**
     * @param {Date} date
     * @param {{ softwaretype: any; indoortempf: any; tempf: any; dewptf: any; windchillf: any; indoorhumidity: any; humidity: any; windspeedmph: any; windgustmph: any; winddir: any; baromin: any; absbaromin: any; ... 6 more ...; UV: any; }} json_response
     */
    setStates(date, obj_values) {

        for (const attr in obj_values) {
            // check if this has a mapping to the current protocol
            this.log.debug(`Setting value from data for ${attr} to ${obj_values[attr]}`);

            this.setStateAsync(attr, { val: obj_values[attr], ack: true });
        }

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