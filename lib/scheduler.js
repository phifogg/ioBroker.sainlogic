/* jslint node: true */

'use strict';

const net = require('net');
const BinaryParser = require('binary-parser').Parser;

/**
 * Scheduler class
 *
 * @class
 * @param {string} address IP Address for the weather station
 * @param {number} port Port to connect to
 * @param {number} interval Interval in seconds to poll for new information
 * @param {object} adapter web adapter object
 * @return {object} object instance
 */
function Scheduler(address, port, interval, adapter) {
    if (!(this instanceof Scheduler)) {
        return new Scheduler(address, port, interval, adapter);
    }

    const convert = (from, to) => str => Buffer.from(str, from).toString(to);
    const hexToUtf8 = convert('hex', 'utf8');
    const utf8ToHex = convert('utf8', 'hex');


    this.address = address;
    this.port = port;
    this.interval = interval;
    this.adapter = adapter;

    this.fwClient = null;
    this.dataClient = null;

    this.schedule_timer = null;
    this.json_response = {};

    const that = this;

    const __construct = (function () {

        that.adapter.log.debug(`Weatherstation IP: ${that.address}`);
        that.adapter.log.debug(`Weatherstation port: ${that.port}`);
        that.adapter.log.debug(`Scheduler Interval: ${that.interval}`);

    }.bind(this))();


    this.start = function () {

        this.schedule_timer = setInterval(this.getFirmware.bind(this), this.interval * 1000);
    }

    this.stop = function () {
        if (this.schedule_timer)
            clearInterval(this.schedule_timer);
        if (this.dataClient)
            this.dataClient.destroy();
        if (this.fwClient)
            this.fwClient.destroy();
    }

    this.getFirmware = function () {
        this.adapter.log.info('Scheduler pulling for new data')
        // firmware 
        this.fwClient = new net.Socket();
        this.fwClient.on('data', this.fwClient_data_received.bind(this));
        this.fwClient.on('close', this.fwClient_close.bind(this));
        this.fwClient.connect(this.port, this.address, this.fwClient_connect.bind(this));
    }

    this.fwClient_connect = function () {
        var getfirmwarecmd = [0xff, 0xff, 0x50, 0x03, 0x53];
        var hexVal = new Uint8Array(getfirmwarecmd);
        this.adapter.log.debug('FW Scheduler connected to weather station');
        this.fwClient.write(hexVal);
    }

    this.fwClient_data_received = function (data) {
        this.adapter.log.debug('FW Scheduler Received data string: ' + data.toString('hex'));

        var utf_data = hexToUtf8(data.toString('hex'));
        utf_data = utf_data.slice(5, utf_data.length);
        this.adapter.log.debug('FW Scheduler received raw: ' + utf_data);
        this.json_response.softwaretype = utf_data;
        this.fwClient.destroy(); // kill client after server's response
    }

    this.dataClient_close = function () {
        this.adapter.log.debug('Data Scheduler Connection closed');

    }

    this.dataClient_connect = function () {
        var getweatherdatacmd = [0xFF, 0xFF, 0x0B, 0x00, 0x06, 0x04, 0x04, 0x19];
        var hexVal = new Uint8Array(getweatherdatacmd);

        this.adapter.log.debug('Data Scheduler connected to weather station');
        this.dataClient.write(hexVal);
    }

    this.dataClient_data_received = function (data) {
        var hex_data = data.toString('hex');
        this.adapter.log.debug('Data Scheduler Received data string: ' + data);

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
        this.json_response = Object.assign(this.json_response, wdata.parse(buf));
        this.adapter.log.debug(JSON.stringify(wdata.parse(buf)));

        this.setDecimals();
        var datetime = new Date();
        this.adapter.setStates(datetime, this.json_response);

        this.dataClient.destroy(); // kill client after server's response
    }

    this.fwClient_close = function () {
        this.adapter.log.debug('FW Scheduler Connection closed');
        // weather data
        this.dataClient = new net.Socket();
        this.dataClient.on('data', this.dataClient_data_received.bind(this));
        this.dataClient.on('close', this.dataClient_close.bind(this));
        this.dataClient.connect(this.port, this.address, this.dataClient_connect.bind(this));

    }


    this.setDecimals = function () {
        var divide_by_10 = ['indoortemp', 'temp', 'dewpt', 'windchill', 'barom', 'absbarom', 'rain', 'dailyrain', 'weeklyrain', 'monthlyrain', 'yearlyrain'];

        divide_by_10.forEach(function (state, json_response) {
            json_response[state] = json_response[state] / 10;
        });

        this.json_response.solarradiation = this.json_response.solarradiation / 10000;

    }



}

module.exports = Scheduler;