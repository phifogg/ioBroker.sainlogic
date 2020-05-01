const BinaryParser = require('binary-parser').Parser;

const cmd_getfirmware = [0xFF, 0xFF, 0x50, 0x03, 0x53];
const cmd_getcurrentdata = [0xFF, 0xFF, 0x0B, 0x00, 0x06, 0x04, 0x04, 0x19];
const cmd_getmaxdata = [0xFF, 0xFF, 0x0B, 0x00, 0x06, 0x05, 0x05, 0x1B];

const COMMANDS = [ cmd_getfirmware, cmd_getcurrentdata, cmd_getmaxdata ];
exports.COMMANDS = COMMANDS;

const PARSER_MAXDATA = new BinaryParser()
    .endianess('big').seek(7)
    .uint16('indoortempmax').seek(1)
    .uint16('tempmax').seek(1)
    .uint16('dewptmax').seek(1)
    .uint16('heatindexmax').seek(1)
    .uint8('indoorhumiditymax').seek(1)
    .uint8('humiditymax').seek(1)
    .uint16("absbarommax").seek(1)
    .uint16('barommax').seek(1)
    .uint16('windspeedmax').seek(1)
    .uint16('windgustmax').seek(1)
    .uint32('rainmax').seek(1)
    .uint32('dailyrainmax').seek(1)
    .uint32('weeklyrainmax').seek(1)
    .uint32('monthlyrainmax').seek(1)
    .uint32('yearlyrainmax').seek(1)
    .uint32('solarradiationmax').seek(1)
    .uint16('UVrawmax').seek(1)
    .uint8('UVmax');
exports.PARSER_MAXDATA = PARSER_MAXDATA;

const PARSER_CURRENTDATA = new BinaryParser()
    .endianess("big").seek(7)
    .uint16("indoortemp").seek(1)
    .uint16("temp").seek(1)
    .uint16("dewpt").seek(1)
    .uint16("windchill").seek(1)
    .uint16("heatindex").seek(1)
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
exports.PARSER_CURRENTDATA = PARSER_CURRENTDATA;

const PARSER_FIRMWARE = new BinaryParser()
    .endianess("big").seek(5)
    .string("softwaretype", {
        encoding: 'utf8',
        length: 17
    });
exports.PARSER_FIRMWARE = PARSER_FIRMWARE;

const PARSER_COMMAND = new BinaryParser()
    .endianess("big").seek(2)
    .uint8("command").seek(2)
    .uint8("subcommand");
exports.PARSER_COMMAND = PARSER_COMMAND;
