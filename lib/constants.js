const BinaryParser = require('binary-parser').Parser;

const PROT_WU = 'wunderground';
const PROT_EW = 'ecowitt';
exports.PROT_WU = PROT_WU;
exports.PROT_EW = PROT_EW;

// conversion functions
const mm_to_inch = 'roundTo(x * 25.4, 1)';
const inch_to_mm = 'roundTo(x / 25.4, 1)';
const F_to_C = 'roundTo((x - 32) * (5 / 9), 1)';
const C_to_F = 'roundTo((x * (9/5)) + 32, 1)';


const inHg_to_hPA = 'roundTo(x / 0.02952998751, 1)';
const hPA_to_inHg = 'roundTo(x * 0.02952998751, 1)';
const mmHg_to_hPa = 'roundTo(x / 0.750062, 1)';
const hPA_to_mmHg = 'roundTo(x * 0.750062, 1)';



const DATAFIELDS = [
    {
        id: 'softwaretype',
        channel: 'info',
        type: 'string',
        name: 'Software type and version of weather station',
        wunderground: 'softwaretype',
        ecowitt: 'stationtype',
        scheduler: 'softwaretype',
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'UVraw',
        channel: 'weather.current',
        wunderground: null,
        ecowitt: null,
        scheduler: 'UVraw',
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'dailyrain',
        channel: 'weather.current',
        wunderground: 'dailyrainin',
        ecowitt: 'dailyrainin',
        scheduler: 'dailyrain',
        listener_conversion: mm_to_inch,
        scheduler_conversion: 'x / 10',
        unit_config: 'unit_rain',
        units: [{
            display_name: 'in',
            display_conversion: inch_to_mm,
            main_unit_conversion: mm_to_inch
        }, {
            display_name: 'mm',
            display_conversion: null
        }
        ]
    },
    {
        id: 'dewpointtemp',
        channel: 'weather.current',
        wunderground: 'dewptf',
        scheduler: 'dewpt',
        ecowitt: null,
        listener_conversion: F_to_C,
        scheduler_conversion: 'x / 10',
        unit_config: 'unit_temperature',
        units: [{
            display_name: 'F',
            display_conversion: C_to_F,
            main_unit_conversion: F_to_C
        }, {
            display_name: '°C',
            display_conversion: null
        }
        ]
    },
    {
        id: 'indoorhumidity',
        channel: 'weather.current',
        wunderground: 'indoorhumidity',
        ecowitt: 'humidityin',
        scheduler: 'indoorhumidity',
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'indoortemp',
        channel: 'weather.current',
        type: 'number',
        name: 'Indoor temperature',
        role: 'value.temperature',
        min: -40,
        max: 80,
        wunderground: 'indoortempf',
        ecowitt: 'tempinf',
        scheduler: 'tempin',
        listener_conversion: F_to_C,
        scheduler_conversion: 'x / 10',
        unit_config: 'unit_temperature',
        units: [{
            display_name: 'F',
            display_conversion: C_to_F,
            main_unit_conversion: F_to_C
        }, {
            display_name: '°C',
            display_conversion: null
        }
        ]
    },
    {
        id: 'monthlyrain',
        channel: 'weather.current',
        wunderground: 'monthlyrainin',
        ecowitt: 'monthlyrainin',
        scheduler: 'monthlyrain',
        listener_conversion: mm_to_inch,
        scheduler_conversion: 'x / 10',
        unit_config: 'unit_rain',
        units: [{
            display_name: 'in',
            display_conversion: inch_to_mm,
            main_unit_conversion: mm_to_inch
        }, {
            display_name: 'mm',
            display_conversion: null,
            main_unit_conversion: null
        }
        ]
    },
    {
        id: 'outdoorhumidity',
        channel: 'weather.current',
        wunderground: 'humidity',
        ecowitt: 'humidity',
        scheduler: 'humidity',
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'outdoortemp',
        channel: 'weather.current',
        wunderground: 'tempf',
        ecowitt: 'tempf',
        scheduler: 'temp',
        listener_conversion: F_to_C,
        scheduler_conversion: ' x / 10',
        unit_config: 'unit_temperature',
        units: [{
            display_name: 'F',
            display_conversion: C_to_F,
            main_unit_conversion: F_to_C
        }, {
            display_name: '°C',
            display_conversion: null
        }
        ]
    },
    {
        id: 'pressureabs',
        channel: 'weather.current',
        wunderground: 'absbaromin',
        ecowitt: 'baromabsin',
        scheduler: 'baromabs',
        listener_conversion: inHg_to_hPA,
        scheduler_conversion: 'x / 10',
        unit_config: 'unit_pressure',
        units: [{
            display_name: 'mmHg',
            display_conversion: hPA_to_mmHg,
            main_unit_conversion: mmHg_to_hPa
        }, {
            display_name: 'inHg',
            display_conversion: hPA_to_inHg,
            main_unit_conversion: inHg_to_hPA
        }, {
            display_name: 'hPa',
            display_conversion: null
        }
        ]
    },
    {
        id: 'pressurerel',
        channel: 'weather.current',
        wunderground: 'baromin',
        ecowitt: 'baromrelin',
        scheduler: 'baromrel',
        listener_conversion: inHg_to_hPA,
        scheduler_conversion: 'x / 10',
        unit_config: 'unit_pressure',
        units: [{
            display_name: 'mmHg',
            display_conversion: hPA_to_mmHg,
            main_unit_conversion: mmHg_to_hPa
        }, {
            display_name: 'inHg',
            display_conversion: hPA_to_inHg,
            main_unit_conversion: inHg_to_hPA
        }, {
            display_name: 'hPa',
            display_conversion: null
        }
        ]
    },
    {
        id: 'rain',
        channel: 'weather.current',
        wunderground: 'rainin',
        ecowitt: 'rainratein',
        scheduler: 'rainrate',
        listener_conversion: mm_to_inch,
        scheduler_conversion: 'x / 10',
        unit_config: 'unit_rain',
        units: [{
            display_name: 'in',
            display_conversion: inch_to_mm,
            main_unit_conversion: mm_to_inch
        }, {
            display_name: 'mm',
            display_conversion: null,
            main_unit_conversion: null
        }
        ]
    },
    {
        id: 'solarradiation',
        channel: 'weather.current',
        wunderground: 'solarradiation',
        ecowitt: 'solarradiation',
        scheduler: 'solarradiation',
        listener_conversion: 'roundTo(x  * 126.7, 0)',
        scheduler_conversion: 'x / 10'
    },
    {
        id: 'uvi',
        channel: 'weather.current',
        wunderground: 'UV',
        ecowitt: 'uv',
        scheduler: 'UV',
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'weeklyrain',
        channel: 'weather.current',
        wunderground: 'weeklyrainin',
        ecowitt: 'weeklyrainin',
        scheduler: 'weeklyrain',
        listener_conversion: mm_to_inch,
        scheduler_conversion: ' x / 10',
        unit_config: 'unit_rain',
        units: [{
            display_name: 'in',
            display_conversion: inch_to_mm,
            main_unit_conversion: mm_to_inch
        }, {
            display_name: 'mm',
            display_conversion: null,
            main_unit_conversion: null
        }
        ]
    },
    {
        id: 'windchilltemp',
        channel: 'weather.current',
        wunderground: 'windchillf',
        scheduler: 'windchill',
        ecowitt: null,
        listener_conversion: F_to_C,
        scheduler_conversion: ' x / 10'
    },
    {
        id: 'winddir',
        channel: 'weather.current',
        wunderground: 'winddir',
        ecowitt: 'winddir',
        scheduler: 'winddir',
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'windgustspeed',
        channel: 'weather.current',
        wunderground: 'windgustmph',
        ecowitt: 'windgustmph',
        scheduler: 'windgust',
        listener_conversion: 'roundTo(x * 1.60934, 1)',
        scheduler_conversion: 'roundTo((x / 10 * 3.6),1)'
    },
    {
        id: 'windspeed',
        channel: 'weather.current',
        wunderground: 'windspeedmph',
        ecowitt: 'windspeedmph',
        scheduler: 'windspeed',
        listener_conversion: 'roundTo(x * 1.60934, 1)',
        scheduler_conversion: 'roundTo((x / 10 * 3.6),1)'
    },
    {
        id: 'yearlyrain',
        channel: 'weather.current',
        wunderground: 'yearlyrainin',
        ecowitt: 'yearlyrainin',
        scheduler: 'yearlyrain',
        listener_conversion: mm_to_inch,
        scheduler_conversion: ' x / 10',
        unit_config: 'unit_rain',
        units: [{
            display_name: 'in',
            display_conversion: inch_to_mm,
            main_unit_conversion: mm_to_inch
        }, {
            display_name: 'mm',
            display_conversion: null,
            main_unit_conversion: null
        }
        ]
    }

];
exports.DATAFIELDS = DATAFIELDS;

const COMMANDS = [
    {
        name: 'Return Header',
        configurable: false,
        parser: new BinaryParser()
            .endianess('big').seek(2)
            .uint8('command').seek(2)
            .uint8('subcommand')
    },

    {
        name: 'Get Firmware',
        configurable: true,
        config_variable: 'ws_getfirmware',
        command: [0xFF, 0xFF, 0x50, 0x03, 0x53],
        command_int: 80,
        subcommand_int: 69,
        parser: new BinaryParser()
            .endianess('big').seek(5)
            .string('softwaretype', {
                encoding: 'utf8',
                length: 17
            })
    },
    {
        name: 'Get Current Data',
        configurable: true,
        config_variable: 'ws_getcurrent',
        command: [0xFF, 0xFF, 0x0B, 0x00, 0x06, 0x04, 0x04, 0x19],
        command_int: 11,
        subcommand_int: 4,
        parser: new BinaryParser()
            .endianess('big').seek(7)
            .int16('indoortemp').seek(1)
            .int16('temp').seek(1)
            .int16('dewpt').seek(1)
            .int16('windchill').seek(1)
            .int16('heatindex').seek(1)
            .uint8('indoorhumidity').seek(1)
            .uint8('humidity').seek(1)
            .uint16('baromabs').seek(1)
            .uint16('baromrel').seek(1)
            .uint16('winddir').seek(1)
            .uint16('windspeed').seek(1)
            .uint16('windgust').seek(1)
            .uint32('rainrate').seek(1)
            .uint32('dailyrain').seek(1)
            .uint32('weeklyrain').seek(1)
            .uint32('monthlyrain').seek(1)
            .uint32('yearlyrain').seek(1)
            .uint32('raintotal').seek(1)
            .uint32('solarradiation').seek(1)
            .uint16('UVraw').seek(1)
            .uint8('UV')
    },
    {
        name: 'Get Max Data',
        configurable: true,
        config_variable: 'ws_getmax',
        command: [0xFF, 0xFF, 0x0B, 0x00, 0x06, 0x05, 0x05, 0x1B],
        command_int: 11,
        subcommand_int: 5,
        parser: new BinaryParser()
            .endianess('big').seek(7)
            .int16('indoortempmax').seek(1)
            .int16('tempmax').seek(1)
            .int16('dewptmax').seek(1)
            .int16('heatindexmax').seek(1)
            .uint8('indoorhumiditymax').seek(1)
            .uint8('humiditymax').seek(1)
            .uint16('absbarommax').seek(1)
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
            .uint8('UVmax')
    },
    {
        name: 'Get Min Data',
        configurable: true,
        config_variable: 'ws_getmin',
        command: [0xFF, 0xFF, 0x0B, 0x00, 0x06, 0x06, 0x06, 0x1D],
        command_int: 11,
        subcommand_int: 6,
        parser: new BinaryParser()
            .endianess('big').seek(7)
            .int16('indoortempmin').seek(1)
            .int16('tempmin').seek(1)
            .int16('dewptmin').seek(1)
            .int16('windchillmin').seek(1)
            .uint8('indoorhumiditymin').seek(1)
            .uint8('humiditymin').seek(1)
            .uint16('absbarommin').seek(1)
            .uint16('barommin').seek(1)
    },
    {
        name: 'Get Daily Max Data',
        configurable: true,
        config_variable: 'ws_getmaxdaily',
        command: [0xFF, 0xFF, 0x0B, 0x00, 0x06, 0x07, 0x07, 0x1F],
        command_int: 11,
        subcommand_int: 7,
        parser: new BinaryParser()
            .endianess('big').seek(7)
            .int16('indoortempdailymax')
            .int16('indoortempdailymaxtime').seek(1)
            .int16('tempdailymax')
            .int16('tempdailymaxtime').seek(1)
            .int16('dewptdailymax')
            .int16('dewptdailymaytime').seek(1)
            .int16('windchilldailymax')
            .int16('windchilldailymaxtime').seek(1)
            .uint8('indoorhumiditydailymax')
            .int16('indoorhumiditydailymaxtime').seek(1)
            .uint8('humiditydailymax')
            .int16('humiditydailymaxtime').seek(1)
            .uint16('absbaromdailymax')
            .int16('absbaromdailymaxtime').seek(1)
            .uint16('baromdailymax')
            .int16('baromdailymaxtime').seek(1)
            .uint16('windspeeddailymax')
            .int16('windspeeddailymaxtime').seek(1)
            .uint16('windgustdailymax')
            .int16('windgustdailymaxtime').seek(1)
            .uint32('raindailymax')
            .int16('raindailymaxtime').seek(1)
            .uint32('solarradiationdailymax')
            .int16('solarradiationdailymaxtime').seek(1)
            .uint16('UVrawdailymax')
            .int16('UVrawdailymaxtime').seek(1)
            .uint8('UVdailymax')
            .int16('UVdailymaxtime')
    },
    {
        name: 'Get Daily Min Data',
        configurable: true,
        config_variable: 'ws_getmindaily',
        command: [0xFF, 0xFF, 0x0B, 0x00, 0x06, 0x08, 0x08, 0x21],
        command_int: 11,
        subcommand_int: 8,
        parser: new BinaryParser()
            .endianess('big').seek(7)
            .int16('indoortempdailymin')
            .int16('indoortempdailymintime').seek(1)
            .int16('tempdailymin')
            .int16('tempdailymintime').seek(1)
            .int16('dewptdailymin')
            .int16('dewptdailymintime').seek(1)
            .int16('windchilldailymin')
            .int16('windchilldailymintime').seek(1)
            .uint8('indoorhumiditydailymin')
            .int16('indoorhumiditydailymintime').seek(1)
            .uint8('humiditydailymin')
            .int16('humiditydailymintime').seek(1)
            .uint16('absbaromdailymin')
            .int16('absbaromdailymintime').seek(1)
            .uint16('baromdailymin')
            .int16('baromdailymintime').seek(1)
    },
];

exports.COMMANDS = COMMANDS;

