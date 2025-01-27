/* jslint node: true */

'use strict';

const got = require('@esm2cjs/got').default;

/**
 * Gateway class
 *
 * @class
 */
class Gateway {

    /**
    * @param {string} gw_address IP Address of the gateway to query
    * @param {object} adapter web adapter object
    * @return object instance
    **/
    constructor(gw_address, adapter) {
        this.gateway_address = gw_address;
        this.adapter = adapter;
    }

    // execute fetching data from the gateway
    run() {

        // create or update main gateway node in IOB states
        this.create_channel(this.adapter, 'gateway');

        // construt get_iot_device_list URL
        const gw_url = new URL(`http://${this.gateway_address}/get_iot_device_list`);

        got(gw_url, { method: 'GET', retry: {limit: 0} }).then(got_response => {
            this.adapter.log.debug('Gateway URL: + ' + got_response.requestUrl);
            this.adapter.log.debug('Gateway response body: ' + got_response.body);

            // parse response and create states
            const device_list = JSON.parse(got_response.body).command;

            device_list.forEach(device => {
                this.create_channel(this, 'gateway.' + device.id);

                // fetch details for device
                const device_url = new URL(`http://${this.gateway_address}/parse_quick_cmd_iot`);
                const device_cmd = `{"command":[{"cmd":"read_device","id":${device.id},"model":${device.model}}]}`;
                got(device_url, { method: 'POST', retry: {limit: 0} , body: device_cmd}).then(got_response => {
                    this.adapter.log.debug('Gateway URL: + ' + got_response.requestUrl);
                    this.adapter.log.debug('Gateway response body: ' + got_response.body);
                });

            });

        }).catch(error => {
            this.adapter.log.info(error);
        });
    }

    // creates a new channel
    create_channel(that, obj_id) {
        this.adapter.getObject(obj_id, function (err, obj) {
            if (err || obj == null) {

                that.log.info('Creating new gateway channel: ' + obj_id);
                that.setObjectNotExists(obj_id, {
                    type: 'channel',
                    common: {
                        name: 'gateway'
                    },
                });
            }
        });
    }
}


module.exports = Gateway;