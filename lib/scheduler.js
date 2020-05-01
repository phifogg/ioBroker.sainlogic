/* jslint node: true */

'use strict';

const { COMMANDS } = require('./cmd_getfirmware');

const net = require('net');
//const BinaryParser = require('binary-parser').Parser;

class Scheduler {
    constructor(config, adapter) {
        this.address = config.ws_address;
        this.port = config.ws_port;
        this.interval = config.ws_interval;
        this.adapter = adapter;

        this.adapter.log.info('Config: ' + JSON.stringify(config));
        // select activated calls
        for (const cmd of COMMANDS) {
            if (cmd.configurable) {
                adapter.log.info('Checking for active calls: ' + cmd.config_variable);
                const cfg = cmd.config_variable;

                if (config[cfg] == true) {
                    adapter.log.info('Get Firmware activated');
                }
            }

        }


        this.fwClient = new net.Socket();

        this.schedule_timer = null;
        this.run = 0;

        this.adapter.log.debug(`Weatherstation IP: ${this.address}`);
        this.adapter.log.debug(`Weatherstation port: ${this.port}`);
        this.adapter.log.debug(`Scheduler Interval: ${this.interval}`);
    }

    start() {
        // this.schedule_timer = setInterval(this.getUpdateFromWS.bind(this), this.interval * 1000);
    }

    stop() {
        if (this.schedule_timer)
            clearInterval(this.schedule_timer);
        this.fwClient.destroy();
    }


    getUpdateFromWS() {
        this.adapter.log.info('Scheduler pulling for new data');

        this.dataObject = {};
        this.run = 0;

        // firmware 
        this.fwClient.on('data', this.parse_response.bind(this));
        this.fwClient.on('close', this.fwClient_close.bind(this));
        this.fwClient.on('error', this.server_error.bind(this));

        this.fwClient.connect(this.port, this.address, this.client_connect.bind(this));
    }

    server_error(e) {
        this.adapter.log.error(`Connection error on ${this.address || '0.0.0.0'}:${this.port}: ${e}`);
    }


    client_connect() {

        this.run++;
        this.adapter.log.debug('Scheduler connected to weather station run ' + this.run);

        let hexVal;

        switch (this.run) {
            case 1:
                hexVal = new Uint8Array(COMMANDS.ws_getfirmware.command);
                break;
            case 2:
                hexVal = new Uint8Array(COMMANDS.ws_getcurrent.command);
                break;
            case 3:
                hexVal = new Uint8Array(COMMANDS.ws_getmax.command);
                break;
        }

        this.fwClient.write(hexVal);
    }


    parse_response(data) {
        this.adapter.log.debug('FW Scheduler Received data string: ' + data.toString('hex'));

        const buf = Buffer.from(data.toString('hex'), 'hex');
        let objData = COMMANDS.ws_answer.parser.parse(buf);

        this.adapter.log.debug('Data Command received: ' + objData.command);

        switch (parseInt(objData.command)) {
            case 80:
                // firmware information
                objData = COMMANDS.ws_getfirmware.parser.parse(buf);
                this.adapter.log.debug('Firmware received: ' + objData.softwaretype);

                this.dataObject = Object.assign(this.dataObject, objData);
                break;
            case 11:
                // current data
                switch (parseInt(objData.subcommand)) {
                    case 4: // sensor data
                        objData = COMMANDS.ws_getcurrent.parser.parse(buf);
                        break;
                    case 5: // max data
                        objData = COMMANDS.ws_getmax.parser.parse(buf);
                        break;
                    default:
                        this.adapter.log.error('Scheduler received data for unkown subcommand ' + objData.subcommand);
                }
                this.adapter.log.debug('Data object: ' + JSON.stringify(objData));
                objData = this.setDecimals(objData);
                this.dataObject = Object.assign(this.dataObject, objData);

                break;
            default:
                this.adapter.log.error('Scheduler received data for unkown command ' + objData.command);
        }

        if (this.run < 3) {
            this.client_connect();
        } else {
            this.fwClient.destroy();
        }

    }

    updateIODataStore() {
        this.adapter.log.info('Scheduler updating IOBroker states');
        this.adapter.setStates(new Date(), this.dataObject);

        this.dataObject = {};

    }


    fwClient_close() {
        this.adapter.log.debug('FW Scheduler Connection closed');
    }




    setDecimals(objData) {
        const divide_by_10 = ['indoortemp', 'temp', 'dewpt', 'windchill', 'barom',
            'absbarom', 'rain', 'dailyrain', 'weeklyrain', 'monthlyrain', 'yearlyrain',
            'indoortempmax', 'tempmax', 'dewptmax', 'windchillmax', 'barommax',
            'absbarommax', 'rainmax', 'dailyrainmax', 'weeklyrainmax', 'monthlyrainmax', 'yearlyrainmax'];

        divide_by_10.forEach(function (state) {
            if (objData[state])
                objData[state] = objData[state] / 10;
        });

        objData.solarradiation = objData.solarradiation / 10000;
        return objData;
    }



}

module.exports = Scheduler;
