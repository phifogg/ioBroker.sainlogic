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

        const c_id = obj._id;
        const target_unit = this.config[attrdef.unit_config];

        if (target_unit != obj.common.unit) {
            // change and convert unit
            this.log.info(`Unit changed for ${c_id} from ${obj.common.unit} to ${target_unit}, updating data point`);
            this.setObjectAsync(c_id, {
                type: obj.type,
                common: {
                    name: attrdef.display_name,
                    type: attrdef.type,
                    role: attrdef.role,
                    unit: target_unit,
                },
                native: {},
            });


            const my_source_unit = attrdef.units.filter(function (unit) {
                return unit.display_name == obj.common.unit;
            });

            const conversion_rule_back = my_source_unit[0].main_unit_conversion;

            const that = this;
            this.getState(c_id, function (err, st) {

                const parser = new Parser();

                let new_value = st.val;

                // convert back if required
                if (conversion_rule_back != null) {
                    const exp = parser.parse(conversion_rule_back);
                    new_value = exp.evaluate({ x: new_value });
                }

                new_value = that.toDisplayUnit(attrdef, new_value);
                that.setState(c_id, { val: new_value, ack: true });

            }.bind(that));
        }
    }

    /** Converts the given value to the target unit for given attribute definition */
    toDisplayUnit(attrdef, value) {
        const parser = new Parser();

        const target_unit = this.config[attrdef.unit_config];
        const my_target_unit = attrdef.units.filter(function (unit) {
            return unit.display_name == target_unit;
        });

        const conversion_rule_forward = my_target_unit[0].display_conversion;
        this.log.debug('Target for ' + attrdef.id + ' unit is set: ' + target_unit + ', using conversion: ' + conversion_rule_forward);

        let new_value = value;

        // convert forward if required
        if (conversion_rule_forward != null) {
            const exp = parser.parse(conversion_rule_forward);
            new_value = exp.evaluate({ x: value });
        }

        return new_value;
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        // Initialize your adapter here

        // try changing a data state object:
        for (const attr in DATAFIELDS) {

            for (const ch in DATAFIELDS[attr].channels) {

                // check object for existence and update if needed
                const obj_id = DATAFIELDS[attr].channels[ch].channel + '.' + DATAFIELDS[attr].id;
                const that = this;
                this.getObject(obj_id, function (err, obj) {
                    if (err || obj == null) {
                        that.log.info('Creating new data point: ' + obj_id );
                        that.setObjectAsync(obj_id, {
                            type: 'state',
                            common: {
                                name: DATAFIELDS[attr].channels[ch].name,
                                type: DATAFIELDS[attr].type,
                                unit: DATAFIELDS[attr].unit,
                                role: DATAFIELDS[attr].role,
                                min: DATAFIELDS[attr].min,
                                max: DATAFIELDS[attr].max,
                                def: 0,
                                read: true,
                                write: false,
                                mobile: {
                                    admin: {
                                        visible: true
                                    }
                                },
                            },
                            native: {},
                        });

                    } else {
                        if (DATAFIELDS[attr].unit_config != null) {
                            that.checkUnit(DATAFIELDS[attr], obj);
                        }
                    }


                }.bind(that));
            }
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
            // extract attribute id w/o channel
            const c_id = attr.split('.').pop();

            // check if this has a mapping to the current protocol
            this.log.debug(`Setting value from data for ${attr} to ${obj_values[attr]}`);
            const my_attr_def = DATAFIELDS.filter(function (def) {
                return def.id == c_id;
            });
    
            let display_val = obj_values[attr];
            if (my_attr_def[0].unit_config) {
                display_val = this.toDisplayUnit(my_attr_def[0], display_val);
            }
            this.setStateAsync(attr, { val: display_val, ack: true });
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