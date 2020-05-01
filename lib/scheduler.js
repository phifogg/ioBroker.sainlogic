/* jslint node: true */

'use strict';

const { COMMANDS, PARSER_COMMAND, PARSER_FIRMWARE, PARSER_CURRENTDATA, PARSER_MAXDATA } = require("./cmd_getfirmware");

const net = require('net');
//const BinaryParser = require('binary-parser').Parser;

const convert = (from, to) => str => Buffer.from(str, from).toString(to);
const hexToUtf8 = convert('hex', 'utf8');
const utf8ToHex = convert('utf8', 'hex');

class Scheduler {
    constructor(address, port, interval, adapter) {
        this.address = address;
        this.port = port;
        this.interval = interval;
        this.adapter = adapter;

        this.fwClient = null;

        this.schedule_timer = null;
        this.run = 0;

        this.adapter.log.debug(`Weatherstation IP: ${this.address}`);
        this.adapter.log.debug(`Weatherstation port: ${this.port}`);
        this.adapter.log.debug(`Scheduler Interval: ${this.interval}`);
    }

    setCalls(fw, cur, max) {
        this.adapter.log.info('COMMANDS LENGHT: ' + COMMANDS.length );

    }

    start() {
        this.schedule_timer = setInterval(this.getUpdateFromWS.bind(this), this.interval * 1000);
    }

    stop() {
        if (this.schedule_timer)
            clearInterval(this.schedule_timer);
        if (this.fwClient)
            this.fwClient.destroy();
    }


    getUpdateFromWS() {
        this.adapter.log.info('Scheduler pulling for new data');

        this.dataObject = {};
        this.run = 0;

        // firmware 
        this.fwClient = new net.Socket();
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

        var hexVal;

        switch (this.run) {
            case 1:
                hexVal = new Uint8Array(COMMANDS.cmd_getfirmware);
                break;
            case 2:
                hexVal = new Uint8Array(COMMANDS.cmd_getcurrentdata);
                break;
            case 3:
                hexVal = new Uint8Array(COMMANDS.cmd_getmaxdata);
                break;
        }

        this.fwClient.write(hexVal);
    }


    parse_response(data) {
        this.adapter.log.debug('FW Scheduler Received data string: ' + data.toString('hex'));

        var hex_data = data.toString('hex');

        var buf = Buffer.from(hex_data, "hex");
        var objData = PARSER_COMMAND.parse(buf);

        this.adapter.log.debug('Data Command received: ' + objData.command);

        switch (parseInt(objData.command)) {
            case 80:
                // firmware information
                objData = PARSER_FIRMWARE.parse(buf);
                this.adapter.log.debug('Firmware received: ' + objData.softwaretype);

                this.dataObject = Object.assign(this.dataObject, objData);
                break;
            case 11:
                // current data
                switch (parseInt(objData.subcommand)) {
                    case 4: // sensor data
                        objData = PARSER_CURRENTDATA.parse(buf);
                        break;
                    case 5: // max data
                        objData = PARSER_MAXDATA.parse(buf);
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
        var datetime = new Date();
        this.adapter.setStates(datetime, this.dataObject);

        this.dataObject = {};

    }

    extractCurrentWetherData(hex_data) {
        var buf = Buffer.from(hex_data, "hex");
        var objData = PARSER_CURRENTDATA.parse(buf);

        objData = this.setDecimals(objData);
        return objData;
    }

    fwClient_connect() {
        var getfirmwarecmd = [0xff, 0xff, 0x50, 0x03, 0x53];
        var hexVal = new Uint8Array(getfirmwarecmd);
        this.adapter.log.debug('FW Scheduler connected to weather station');
        this.fwClient.write(hexVal);
    }


    fwClient_close() {
        this.adapter.log.debug('FW Scheduler Connection closed');
        this.fwClient = null;

        if (this.dataClient == null) {
            this.updateIODataStore();
        }
    }

    dataClient_close() {
        this.adapter.log.debug('Data Scheduler Connection closed');
        this.dataClient = null;
        if (this.fwClient == null) {
            this.updateIODataStore();
        }

    }

    dataClient_connect() {
        var getweatherdatacmd = [0xFF, 0xFF, 0x0B, 0x00, 0x06, 0x04, 0x04, 0x19];
        var hexVal = new Uint8Array(getweatherdatacmd);

        this.adapter.log.debug('Data Scheduler connected to weather station');
        this.dataClient.write(hexVal);
    }




    setDecimals(objData) {
        var divide_by_10 = ['indoortemp', 'temp', 'dewpt', 'windchill', 'barom', 
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
