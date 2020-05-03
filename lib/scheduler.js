/* jslint node: true */

'use strict';

const { COMMANDS } = require('./cmd_getfirmware');

const net = require('net');
//const BinaryParser = require('binary-parser').Parser;

class Scheduler {
    constructor(config, adapter) {
        this.address = config.ws_address;
        this.port = config.ws_port;
        this.interval = config.ws_freq;
        this.adapter = adapter;

        this.activeCalls = [];

        this.adapter.log.info('Config: ' + JSON.stringify(config));
        // select activated calls
        for (const cmd of COMMANDS) {
            if (cmd.configurable) {
                const cfg = cmd.config_variable;

                if (config[cfg] == true) {
                    adapter.log.info('Scheduler call ' + cmd.config_variable + ' activated');
                    this.activeCalls.push(cmd);
                }
            }

        }


        this.fwClient = new net.Socket();
        // firmware 
        this.fwClient.on('data', this.parse_response.bind(this));
        this.fwClient.on('close', this.fwClient_close.bind(this));
        this.fwClient.on('error', this.server_error.bind(this));

        this.schedule_timer = null;
        this.run = 0;

        this.adapter.log.debug(`Weatherstation IP: ${this.address}`);
        this.adapter.log.debug(`Weatherstation port: ${this.port}`);
        this.adapter.log.debug(`Scheduler Interval: ${this.interval}`);
    }

    start() {
        if (this.interval > 0) {
            this.schedule_timer = setInterval(this.getUpdateFromWS.bind(this), this.interval * 1000);
        } else {
            this.adapter.log.console.error('Configuration error, interval cannot be 0');

        }
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

        this.fwClient.connect(this.port, this.address, this.client_connect.bind(this));
    }

    server_error(e) {
        this.adapter.log.error(`Connection error on ${this.address || '0.0.0.0'}:${this.port}: ${e}`);
    }


    client_connect() {
        const current_call = this.activeCalls[this.run];

        this.adapter.log.debug('Scheduler connected to weather station run ' + current_call.command);
        this.fwClient.write(new Uint8Array(current_call.command));
    }


    parse_response(data) {
        this.adapter.log.debug('FW Scheduler Received data string: ' + data.toString('hex'));

        const buf = Buffer.from(data.toString('hex'), 'hex');
        let objData = COMMANDS[0].parser.parse(buf);

        this.adapter.log.debug('Data Command received: ' + objData.command + ' subcommand ' + objData.subcommand);
        let dataparser;


        for (const cmd of this.activeCalls) {
            if (parseInt(cmd.command_int) == parseInt(objData.command) &&
                parseInt(cmd.subcommand_int) == parseInt(objData.subcommand)) {
                dataparser = cmd.parser;
                break;
            }
        }

        if (dataparser) {
            objData = dataparser.parse(buf);
            this.adapter.log.debug('Data object: ' + JSON.stringify(objData));
            objData = this.setDecimals(objData);
            this.dataObject = Object.assign(this.dataObject, objData);
        } else {
            this.adapter.log.error('Scheduler received data for unkown command ' + objData.command + ' subcommand ' + objData.subcommand);

        }

        this.run++;

        if (this.run < this.activeCalls.length) {
            this.client_connect();
        } else {
            this.updateIODataStore();
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
            // abs max values
            'indoortempmax', 'tempmax', 'dewptmax', 'windchillmax', 'barommax',
            'absbarommax', 'rainmax', 'dailyrainmax', 'weeklyrainmax', 'monthlyrainmax',
            'yearlyrainmax',
            // abs min values
            'indoortempmin', 'tempmin', 'dewptmin', 'windchillmin', 'barommin',
            'absbarommin',
            // daily max values
            'indoortempdailymax', 'tempdailymax', 'dewptdailymax', 'windchilldailymax', 'baromdailymax',
            'absbaromdailymax', 'raindailymax',
            // daily min values
            'indoortempdailymin', 'tempdailymin', 'dewptdailymin', 'windchilldailymin', 'baromdailymin',
            'absbaromdailymin'
        ];

        const wind = [
            'windspeed', 'windgust',
            // abs max values
            'windspeedmax', 'windgustmax',
            // daily max values
            'windspeeddailymax', 'windgustdailymax'
        ];


        for (const state of divide_by_10) {
            if (objData[state]) {
                objData[state] = objData[state] / 10;
            }
        }

        for (const state of wind) {
            if (objData[state])
                objData[state] = (objData[state] / 10 * 3.6).toFixed(1);
        }

        objData.solarradiation = objData.solarradiation / 10000;
        objData.solarradiationax = objData.solarradiationax / 10000;

        return objData;
    }



}

module.exports = Scheduler;
