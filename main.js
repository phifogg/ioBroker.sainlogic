/* jshint node: true */
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
const { DATAFIELDS } = require('./lib/constants');
const { evaluateExpression } = require('./lib/expressions');

class Sainlogic extends utils.Adapter {
    /**
     * @param  [options] Adapter options
     */
    constructor(options) {
        super({
            ...options,
            name: 'sainlogic',
        });
        this.knownDatapoints = new Set();
        this.on('ready', this.onReady.bind(this));
        //this.on('objectChange', this.onObjectChange.bind(this));
        // this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    /**
     * Checks and updates the unit of an existing datapoint if the configured display unit changed.
     *
     * @param {object} attrdef Attribute definition from DATAFIELDS
     * @param {ioBroker.Object} obj Existing ioBroker object
     * @param {boolean} [convertExistingState] Whether to convert and re-write the currently stored state value
     */
    async checkUnit(attrdef, obj, convertExistingState = true) {
        const c_id = obj._id;
        const target_unit = this.config[attrdef.unit_config];
        const target_unit_definition = attrdef.units.find(function (unit) {
            return unit.display_name == target_unit || unit.value == target_unit;
        });
        const target_display_unit = target_unit_definition?.display_name || target_unit;

        if (target_display_unit != obj.common.unit) {
            // change and convert unit
            this.log.info(
                `Unit changed for ${c_id} from ${obj.common.unit} to ${target_display_unit}, updating data point`,
            );
            await this.extendObjectAsync(c_id, {
                type: obj.type,
                common: {
                    name: attrdef.display_name,
                    type: attrdef.type,
                    role: attrdef.role,
                    unit: target_display_unit,
                },
                native: {},
            });

            if (convertExistingState) {
                const my_source_unit = attrdef.units.filter(function (unit) {
                    return unit.display_name == obj.common.unit || unit.value == obj.common.unit;
                });

                const conversion_rule_back = my_source_unit[0]?.main_unit_conversion;
                const st = await this.getStateAsync(c_id);

                if (st) {
                    let new_value = st.val;

                    // convert back if required
                    if (conversion_rule_back != null && new_value != null) {
                        new_value = evaluateExpression(conversion_rule_back, { x: new_value });
                    }

                    new_value = this.toDisplayUnit(attrdef, new_value);
                    await this.setStateAsync(c_id, { val: new_value, ack: true });
                }
            }
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
        const target_unit = this.config[attrdef.unit_config];
        const my_target_unit = attrdef.units.filter(function (unit) {
            return unit.display_name == target_unit || unit.value == target_unit;
        });

        if (!my_target_unit.length) {
            this.log.warn(
                `No unit definition found for ${attrdef.id} and target unit '${target_unit}', using raw value`,
            );
            return value;
        }

        const conversion_rule_forward = my_target_unit[0].display_conversion;
        this.log.debug(
            `Target for ${attrdef.id} unit is set: ${target_unit}, using conversion: ${conversion_rule_forward}`,
        );

        let new_value = value;

        // convert forward if required
        if (conversion_rule_forward != null) {
            new_value = evaluateExpression(conversion_rule_forward, { x: value });
        }

        return new_value;
    }

    async migrateTemperatureUnit() {
        const migratedUnit = {
            C: '°C',
            F: '°F',
        }[this.config.unit_temperature];

        if (!migratedUnit) {
            return;
        }

        const previousUnit = this.config.unit_temperature;
        this.config.unit_temperature = migratedUnit;
        try {
            await this.extendForeignObjectAsync(`system.adapter.${this.namespace}`, {
                native: {
                    unit_temperature: migratedUnit,
                },
            });
            this.log.info(`Migrated temperature unit configuration from ${previousUnit} to ${migratedUnit}`);
        } catch (error) {
            this.log.error(`Could not persist temperature unit migration: ${error}`);
        }
    }

    async migrateTemperatureDatapoints() {
        const temperatureFields = new Map(
            DATAFIELDS.filter(attrdef => attrdef.unit_config === 'unit_temperature').map(attrdef => [
                attrdef.id,
                attrdef,
            ]),
        );

        // scan all existing objects once, so indexed channels (e.g. weather.current.1.temp) are covered too
        const objects = await this.getAdapterObjectsAsync();
        for (const obj of Object.values(objects)) {
            if (obj.type !== 'state') {
                continue;
            }
            const attrdef = temperatureFields.get(obj._id.split('.').pop());
            if (attrdef) {
                await this.checkUnit(attrdef, obj, true);
            }
        }
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        // Initialize your adapter here

        // The adapters config (in the instance object everything under the attribute "native") is accessible via
        // this.config:

        await this.migrateTemperatureUnit();
        await this.migrateTemperatureDatapoints();

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

    /**
     * Ensures the datapoint exists with up-to-date unit metadata and writes its state value.
     *
     * @param {string} obj_id Target state object ID
     * @param {object} _that Adapter reference (kept for backwards compatibility)
     * @param {object} attrdef Attribute definition from DATAFIELDS
     * @param {string} attrname Human-readable attribute name
     * @param {string | number} value Value to write
     */
    async verify_datapoint(obj_id, _that, attrdef, attrname, value) {
        // check target type and type-cast if needed
        let default_value = '';
        if (attrdef.type == 'number') {
            if (value != null) {
                default_value = 0;
                value = parseFloat(String(value));
            } else {
                value = 0;
                default_value = 0;
            }

            if (!Number.isFinite(value)) {
                this.log.warn(`Rejected invalid numeric value for "${obj_id}": ${value} is not a finite number`);
                return;
            }

            if (attrdef.min != null && value < attrdef.min) {
                this.log.warn(`Rejected out-of-range value for "${obj_id}": ${value} less than min ${attrdef.min}`);
                return;
            }

            if (attrdef.max != null && value > attrdef.max) {
                this.log.warn(`Rejected out-of-range value for "${obj_id}": ${value} greater than max ${attrdef.max}`);
                return;
            }
        } else if (attrdef.type == 'string') {
            value = `${value}`;
        }

        if (!this.knownDatapoints.has(obj_id)) {
            const obj = await this.getObjectAsync(obj_id);
            if (!obj) {
                this.log.info(`Creating new data point: ${obj_id}`);
                await this.setObjectNotExistsAsync(obj_id, {
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
                        write: attrdef.writeable ? true : false,
                        mobile: {
                            admin: {
                                visible: true,
                            },
                        },
                    },
                    native: {},
                });
            } else {
                // align metadata of objects created by earlier versions
                const commonUpdate = {};
                const writeable = !!attrdef.writeable;
                if (!!obj.common?.write !== writeable) {
                    // e.g. water_action was writable in earlier versions
                    commonUpdate.write = writeable;
                }
                if (attrdef.unit_config == null && (obj.common?.unit ?? '') !== (attrdef.unit ?? '')) {
                    // fixed units without a configurable display unit, e.g. depth_ch (mm) / ldsbatt (V)
                    commonUpdate.unit = attrdef.unit ?? '';
                }
                if (Object.keys(commonUpdate).length) {
                    this.log.info(`Updating metadata of ${obj_id}: ${JSON.stringify(commonUpdate)}`);
                    await this.extendObjectAsync(obj_id, { common: commonUpdate });
                }
                if (attrdef.unit_config != null) {
                    await this.checkUnit(attrdef, obj, false);
                }
            }

            this.knownDatapoints.add(obj_id);
        }

        await this.setStateAsync(obj_id, { val: value, ack: true });
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
            const my_attr_def = DATAFIELDS.find(def => def.id == c_id);
            if (!my_attr_def) {
                this.log.warn(`No datafield definition found for "${attr}" (${c_id}), skipping`);
                continue;
            }

            let display_val = obj_values[attr];
            if (my_attr_def.unit_config) {
                display_val = this.toDisplayUnit(my_attr_def, display_val);
            }

            const attrName = my_attr_def.channels?.[0]?.name || my_attr_def.id;
            this.verify_datapoint(attr, this, my_attr_def, attrName, display_val).catch(err => {
                this.log.error(`Error updating datapoint ${attr}: ${err}`);
            });

            if (c_id == 'winddir') {
                const winddir_attrdef = DATAFIELDS.find(def => def.id == 'windheading');
                if (winddir_attrdef) {
                    const winddirName = winddir_attrdef.channels?.[0]?.name || winddir_attrdef.id;
                    this.verify_datapoint(
                        'weather.current.windheading',
                        this,
                        winddir_attrdef,
                        winddirName,
                        this.getHeading(display_val, 16),
                    ).catch(err => {
                        this.log.error(`Error updating windheading: ${err}`);
                    });
                }
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
    async onUnload(callback) {
        try {
            if (this.scheduler) {
                this.scheduler.stop();
            }
            if (this.listener) {
                await this.listener.stop();
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
