/* jslint node: true */

'use strict';

const got = require('@esm2cjs/got').default;
const Parser = require('expr-eval').Parser;

const { DATAFIELDS } = require('./constants');

/**
 * Gateway class
 *
 */
class Gateway {
    /**
     * @param {string} gw_address IP Address of the gateway to query
     * @param {object} adapter web adapter object
     * @returns object instance
     */
    constructor(gw_address, adapter) {
        this.gateway_address = gw_address;
        this.adapter = adapter;
    }

    /**
     * execute fetching data from the gateway
     */
    run() {
        // create listener for state changes
        this.adapter.on('stateChange', this.onStateChange.bind(this));

        // create or update main gateway node in IOB states
        this.create_channel(this, 'gateway');

        // construt get_iot_device_list URL
        const gw_url = new URL(`http://${this.gateway_address}/get_iot_device_list`);

        got(gw_url, { method: 'GET', retry: { limit: 0 } })
            .then(got_response => {
                this.adapter.log.debug(`Gateway URL: + ${got_response.requestUrl}`);
                this.adapter.log.debug(`Gateway response body: ${got_response.body}`);

                // parse response and create states
                const device_list = JSON.parse(got_response.body).command;

                device_list.forEach(device => {
                    this.create_channel(this, `gateway.${device.id}`);

                    // fetch details for device
                    const device_url = new URL(`http://${this.gateway_address}/parse_quick_cmd_iot`);
                    const device_cmd = `{"command":[{"cmd":"read_device","id":${device.id},"model":${device.model}}]}`;
                    got(device_url, { method: 'POST', retry: { limit: 0 }, body: device_cmd }).then(got_response => {
                        this.adapter.log.debug(`Gateway URL: + ${got_response.requestUrl}`);
                        this.adapter.log.debug(`Gateway response body: ${got_response.body}`);

                        const device_info = JSON.parse(got_response.body).command;
                        if (device_info) {
                            this.updateIODataStore(`gateway.${device.id}`, device_info);
                        }
                    });
                });
            })
            .catch(error => {
                this.adapter.log.info(error);
            });
    }

    /**
     * Funktion zum Suchen eines Elements nach zwei Attributen
     *
     * @param id ID des gesuchten Datenfeldes
     * @returns Das gefundene Datenfeld-Objekt oder undefined, wenn nicht gefunden
     */
    findDataFieldByID(id) {
        return DATAFIELDS.find(item => item['gateway'] === id);
    }

    /**
     * Update the IOBroker data store with the fetched data
     *
     * @param channel IO Broker chanel
     * @param json_data JSON data fetched from the gateway
     */
    updateIODataStore(channel, json_data) {
        const myobj = {};
        const parser = new Parser();

        json_data = json_data[0];

        for (const name in json_data) {
            this.adapter.log.debug(`Found prop ${name} in json_data: ${json_data[name]}`);
            const datafield = this.findDataFieldByID(name);

            if (datafield) {
                this.adapter.log.debug(`DATAFIELD found for this property: ${JSON.stringify(datafield)}`);

                const c_id = `${channel}.${datafield.id}`;

                myobj[c_id] = json_data[name];

                if (datafield.gateway_conversion != null) {
                    const exp = parser.parse(datafield.gateway_conversion);
                    myobj[c_id] = exp.evaluate({ x: myobj[c_id] });
                }

                this.adapter.verify_datapoint(c_id, this.adapter, datafield, name, json_data[name]);
            }
        }

        //this.adapter.setStates(new Date(), myobj);
    }

    /**
     * creates a new channel in the iobroker object tree
     *
     * @param that adapter instance
     * @param obj_id object id to create
     */
    create_channel(that, obj_id) {
        that.adapter.getObject(obj_id, function (err, obj) {
            if (err || obj == null) {
                that.adapter.setObjectNotExists(obj_id, {
                    type: 'channel',
                    common: {
                        name: 'gateway',
                    },
                });
            }
        });
    }

    /**
     * state change handler
     *
     * @param id ID of the state
     * @param state state object
     */
    onStateChange(id, state) {
        this.adapter.log.info(`stateChange ${id} ${JSON.stringify(state)}`);
    }
}

module.exports = Gateway;
