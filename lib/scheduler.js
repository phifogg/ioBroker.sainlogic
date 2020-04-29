/* jslint node: true */

'use strict';

const net = require('net');
const BinaryParser = require('binary-parser').Parser;

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
        this.dataClient = null;

        this.schedule_timer = null;
        this.run = 0;

        this.adapter.log.debug(`Weatherstation IP: ${this.address}`);
        this.adapter.log.debug(`Weatherstation port: ${this.port}`);
        this.adapter.log.debug(`Scheduler Interval: ${this.interval}`);
    }

    start() {
        this.schedule_timer = setInterval(this.getUpdateFromWS.bind(this), this.interval * 1000);
    }

    stop() {
        if (this.schedule_timer)
            clearInterval(this.schedule_timer);
        if (this.dataClient)
            this.dataClient.destroy();
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
        this.fwClient.connect(this.port, this.address, this.client_connect.bind(this));

        // weather data
        this.dataClient = new net.Socket();
        this.dataClient.on('data', this.parse_response.bind(this));
        this.dataClient.on('close', this.dataClient_close.bind(this));
        this.dataClient.connect(this.port, this.address, this.client_connect.bind(this));

    }

    client_connect() {
        var getfirmwarecmd = [0xff, 0xff, 0x50, 0x03, 0x53];
        var getweatherdatacmd = [0xFF, 0xFF, 0x0B, 0x00, 0x06, 0x04, 0x04, 0x19];
        var commands = {getfirmwarecmd,getweatherdatacmd };

        this.adapter.log.debug('Scheduler connected to weather station');
        this.run++;

        var hexVal = new Uint8Array(commands[this.run]);
        this.fwClient.write(hexVal);
    }


    parse_response(data) {
        this.adapter.log.debug('FW Scheduler Received data string: ' + data.toString('hex'));

        var hex_data = data.toString('hex');
        var wdata = new BinaryParser()
            .endianess("big").seek(2)
            .uint8("command");

        var buf = Buffer.from(hex_data, "hex");
        var objData = wdata.parse(buf);

        this.adapter.log.debug('Data Command received: ' + objData.command);

        switch (parseInt(objData.command)) {
            case 80:
                // firmware information
                this.dataObject = Object.assign(this.dataObject, this.extract_firmware(hex_data)); // kill client after server's response
                break;
            case 11:
                // current weather data
                this.dataObject = Object.assign(this.dataObject, this.extractCurrentWetherData(hex_data));
                break;
            default:
                this.adapter.log.console.error('Scheduler received data for unkown command ' + objData.command);
        }

    }

    updateIODataStore() {
        this.adapter.log.info('Scheduler updating IOBroker states');
        var datetime = new Date();
        this.adapter.setStates(datetime, this.dataObject);

        this.dataObject = {};

    }

    extract_firmware(hex_data) {
        // softwaretype
        var wdata = new BinaryParser()
            .endianess("big").seek(5)
            .string("softwaretype", {
                encoding: 'utf8',
                length: 17
            });
        var buf = Buffer.from(hex_data, "hex");
        var objData = wdata.parse(buf);

        this.adapter.log.debug('Firmware received: ' + objData.softwaretype);

        return objData;
    }

    extractCurrentWetherData(hex_data) {

        // setup parser
        var wdata = new BinaryParser()
            .endianess("big").seek(7)
            .uint16("indoortemp").seek(1)
            .uint16("temp").seek(1)
            .uint16("dewpt").seek(1)
            .uint16("windchill").seek(1)
            .uint16be("heatindex").seek(1)
            .uint8("indoorhumidity").seek(1)
            .uint8("humidity").seek(1)
            .uint16("absbarom").seek(1)
            .uint16('barom').seek(1)
            .uint16('winddir').seek(1)
            .uint16('windspeed').seek(1)
            .uint16('windgust').seek(1)
            .uint32('rain').seek(1)
            .uint32('dailyrain').seek(1)
            .uint32('weeklyrain').seek(1)
            .uint32('monthlyrain').seek(1)
            .uint32('yearlyrain').seek(1)
            .uint32('raintotal').seek(1)
            .uint32('solarradiation').seek(1)
            .uint16('UVraw').seek(1)
            .uint8('UV');

        var buf = Buffer.from(hex_data, "hex");
        var objData = wdata.parse(buf);

        objData = this.setDecimals();
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




    setDecimals() {
        var _this = this;
        var divide_by_10 = ['indoortemp', 'temp', 'dewpt', 'windchill', 'barom', 'absbarom', 'rain', 'dailyrain', 'weeklyrain', 'monthlyrain', 'yearlyrain'];

        divide_by_10.forEach(function (state) {
            _this.dataObject[state] = _this.dataObject[state] / 10;
        });

        this.dataObject.solarradiation = this.dataObject.solarradiation / 10000;

    }



}

module.exports = Scheduler;