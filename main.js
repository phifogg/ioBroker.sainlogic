/* jshint node: true */
'use strict';

/*
 * Created with @iobroker/create-adapter v1.24.1
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
//const util = require('util');
const Parser = require('expr-eval').Parser;

// Load your modules here, e.g.:
const Listener = require('./lib/listener');
const Scheduler = require('./lib/scheduler');
const { DATAFIELDS } = require('./lib/constants');
//const getMethods = (obj) => Object.getOwnPropertyNames(obj).filter(item => typeof obj[item] === 'function');

class Sainlogic extends utils.Adapter {
    /**
     * @param  [options] Adapter options
     */
    constructor(options) {
        super({
            ...options,
            name: 'sainlogic',
        });
        this.on('ready', this.onReady.bind(this));
        // this.on('objectChange', this.onObjectChange.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        // this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    checkUnit(attrdef, obj) {
        const c_id = obj._id;
        const target_unit = this.config[attrdef.unit_config];

        if (target_unit != obj.common.unit) {
            // change and convert unit
            this.log.info(`Unit changed for ${c_id} from ${obj.common.unit} to ${target_unit}, updating data point`);
            this.extendObject(c_id, {
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

            this.getState(c_id, (err, st) => {
                const parser = new Parser();

                let new_value = st.val;

                // convert back if required
                if (conversion_rule_back != null) {
                    const exp = parser.parse(conversion_rule_back);
                    new_value = exp.evaluate({ x: new_value });
                }

                new_value = this.toDisplayUnit(attrdef, new_value);
                this.setState(c_id, { val: new_value, ack: true });
            });
        }
    }

    /**
     * Converts the given value to the target unit for given attribute definition
     *
     * @param attrdef Attribute definition
     * @param value Value to convert
     * @returns converted value
     */
    toDisplayUnit(attrdef, value) {
        const parser = new Parser();

        const target_unit = this.config[attrdef.unit_config];
        const my_target_unit = attrdef.units.filter(function (unit) {
            return unit.display_name == target_unit;
        });

        const conversion_rule_forward = my_target_unit[0].display_conversion;
        this.log.debug(
            `Target for ${attrdef.id} unit is set: ${target_unit}, using conversion: ${conversion_rule_forward}`,
        );

        let new_value = value;

        // convert forward if required
        if (conversion_rule_forward != null) {
            const exp = parser.parse(conversion_rule_forward);
            new_value = exp.evaluate({ x: value });
        }

        return new_value;
    }

    async onStateChange(id, state) {
        if (state) {
            // The state was changed
            this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
        } else {
            // The state was deleted
            this.log.info(`state ${id} deleted`);
        }
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
            this.listener = new Listener(
                this.config.listener_ip,
                this.config.listener_port,
                this.config.path,
                this.config.listener_protocol,
                this.config.listener_forward_url,
                this,
            );
            this.listener.start();
        }
    }

    verify_datapoint(obj_id, that, attrdef, attrname, value) {
        // check target type and type-cast if needed
        let default_value = '';
        if (attrdef.type == 'number') {
            if (value != null) {
                default_value = 0;
                value = parseFloat(value);
            } else {
                value = 0;
                default_value = 0;
            }
        } else if (attrdef.type == 'string') {
            value = `${value}`;
        }

        this.getObject(
            obj_id,
            function (err, obj) {
                if (err || obj == null) {
                    that.log.info(`Creating new data point: ${obj_id}`);
                    that.setObjectNotExists(
                        obj_id,
                        {
                            type: 'state',
                            common: {
                                name: attrname,
                                type: attrdef.type,
                                unit: attrdef.unit,
                                role: attrdef.role,
                                min: attrdef.min,
                                max: attrdef.max,
                                states: attrdef.states,
                                def: default_value,
                                read: true,
                                write: true,
                                mobile: {
                                    admin: {
                                        visible: true,
                                    },
                                },
                            },
                            native: {},
                        },
                        function (err, obj) {
                            // now update the value
                            if (err || obj == null) {
                                that.log.error(`Error creating object ${obj_id}: ${err}`);
                            } else {
                                that.setStateAsync(obj_id, { val: value, ack: true });
                            }
                        },
                    );
                } else {
                    if (attrdef.unit_config != null) {
                        that.checkUnit(attrdef, obj);
                    }
                    // now update the value
                    that.setStateAsync(obj_id, { val: value, ack: true });
                }
            }.bind(that),
        );
    }

    /**
     * @param {Date} date Date of the update
     * @param obj_values JSON response with values
     */
    setStates(date, obj_values) {
        this.setStateAsync('info.last_update', { val: date.toString(), ack: true });

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

            this.verify_datapoint(attr, this, my_attr_def[0], my_attr_def[0].channels[0].name, display_val); // allways channel 0 as primary attribute name

            if (c_id == 'winddir') {
                const winddir_attrdef = DATAFIELDS.filter(function (def) {
                    return def.id == 'windheading';
                });

                this.verify_datapoint(
                    'weather.current.windheading',
                    this,
                    winddir_attrdef[0],
                    winddir_attrdef[0].channels[0].name,
                    this.getHeading(display_val, 16),
                );
            }
        }
    }

    // taken from https://www.programmieraufgaben.ch/aufgabe/windrichtung-bestimmen/ibbn2e7d
    getHeading(degrees, precision) {
        this.log.debug(`Determining wind heading for ${degrees} and precision ${precision}`);
        precision = precision || 16;
        let directions = [],
            direction = 0;
        const step = 360 / precision;
        let i = step / 2;

        switch (precision) {
            case 4:
                directions = 'N O S W'.split(' ');
                break;
            case 8:
                directions = 'N NO O SO S SW W NW'.split(' ');
                break;
            case 16:
                directions = ('N NNO NO ONO O OSO SO ' + 'SSO S SSW SW WSW W WNW NW NNW').split(' ');
                break;
            case 32:
                directions = (
                    'N NzO NNO NOzN NO NOzO ONO OzN O OzS OSO ' +
                    'SOzO SO SOzS SSO SzO S SzW SSW SWzS SW SWzW WSW WzS W WzN ' +
                    'WNW NWzW NW NWzN NNW NzW'
                ).split(' ');
                break;
            default:
                this.log.error('Wind heading could not be determined: invalid precision');
                return '';
        }

        if (degrees < 0 || degrees > 360) {
            this.log.error('Wind heading could not be determined: wind direction outside boundary');
            return '';
        }
        if (degrees <= i || degrees >= 360 - i) {
            return 'N';
        }
        while (i <= degrees) {
            direction++;
            i += step;
        }

        this.log.debug(`GetHeading returning: ${directions[direction]}`);
        return directions[direction];
    }
    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     *
     * @param {() => void} callback Callback function
     */
    onUnload(callback) {
        try {
            if (this.listener) {
                this.listener.stop();
            }
            if (this.scheduler) {
                this.scheduler.stop();
            }
            this.log.info('Sainlogic Adapter gracefully shut down...');
            callback();
        } catch (e) {
            this.log.error(`Error during shutdown of Sainlogic Adapter: ${e}`);
            callback();
        }
    }
}

// @ts-expect-error parent is a valid property on module
if (module.parent) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<ioBroker.AdapterOptions>} [options] Adapter options
     */
    module.exports = options => new Sainlogic(options);
} else {
    // otherwise start the instance directly
    new Sainlogic();
}
