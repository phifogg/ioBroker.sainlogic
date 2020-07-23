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
const inHg_to_hPA = 'roundTo(x * 33.86, 1)';
const hPA_to_inHg = 'roundTo(x * 0.02952998751, 1)';
const mmHg_to_hPa = 'roundTo(x * 1.33, 1)';
const hPA_to_mmHg = 'roundTo(x * 0.750062, 1)';
const kmh_to_ms = 'roundTo(x / 3.6, 1)';
const ms_to_kmh = 'roundTo(x * 3.6, 1)';
const kmh_to_mph = 'roundTo(x / 1.609, 1)';
const mph_to_kmh = 'roundTo(x * 1.609, 1)';
const kmh_to_knots = 'roundTo(x / 1.852, 1)';
const knots_to_kmh = 'roundTo(x * 1.852, 1)';
const kmh_to_fpm = 'roundTo(x * 54.681, 1)';
const fpm_to_kmh = 'roundTo(x / 54.681, 1)';
const lx_to_wm2 = 'roundTo(x / 126.7, 1)';
const wm2_to_lx = 'roundTo(x  * 126.7, 0)';

const DATAFIELDS = [
    {
        id: 'softwaretype',
        channels: [{
            channel: 'info',
            name: 'Software type and version of weather station'
        }],
        type: 'string',
        wunderground: '^softwaretype',
        ecowitt: '^stationtype',
        scheduler: 'softwaretype',
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'last_listener_update',
        channels: [{
            channel: 'info',
            name: 'Last data received from Listener (raw)'
        }],
        type: 'string',
        wunderground: null,
        ecowitt: null,
        scheduler: null,
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'UVraw',
        channels: [{
            channel: 'weather.current',
            name: 'UV (raw)'
        },{
            channel: 'weather.maxvalues.absolut',
            name: 'Max. UV (raw) (absolut)'
        },{
            channel: 'weather.maxvalues.daily',
            name: 'Max. UV (raw) (daily)'
        }],
        channel: 'weather.current',
        type: 'number',
        unit: 'µW/m²',
        role: '',
        min: 0,
        max: 2000,
        wunderground: null,
        ecowitt: null,
        scheduler: 'UVraw',
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'dailyrain',
        channels: [{
            channel: 'weather.current',
            name: 'Rainrate (Daily)'
        },{
            channel: 'weather.maxvalues.absolut',
            name: 'Max. Rainrate (Daily) (absolut)'
        },{
            channel: 'weather.maxvalues.daily',
            name: 'Max. Rainrate (Daily) (daily)'
        }],
        type: 'number',
        unit: 'mm',
        role: 'value',
        min: 0,
        max: 1500,
        wunderground: '^dailyrainin',
        ecowitt: '^dailyrainin',
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
        channels: [{
            channel: 'weather.current',
            name: 'Dewpoint temperature'
        },{
            channel: 'weather.maxvalues.absolut',
            name: 'Max. Dewpoint temperature (absolut)'
        },{
            channel: 'weather.maxvalues.daily',
            name: 'Max. Dewpoint temperature (daily)'
        },{
            channel: 'weather.minvalues.absolut',
            name: 'Min. Dewpoint temperature (absolut)'
        },{
            channel: 'weather.minvalues.daily',
            name: 'Min. Dewpoint temperature (daily)'
        }],
        type: 'number',
        unit: '°C',
        role: 'value.temperature',
        min: -40,
        max: 80,
        wunderground: '^dewptf',
        scheduler: 'dewpointtemp',
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
        channels: [{
            channel: 'weather.current',    
            name: 'Indoor humidity',
        },{
            channel: 'weather.maxvalues.absolut',
            name: 'Max. Indoor humidity (absolut)'
        },{
            channel: 'weather.maxvalues.daily',
            name: 'Max. Indoor humidity (daily)'
        },{
            channel: 'weather.minvalues.absolut',
            name: 'Min. Indoor humidity (absolut)'
        },{
            channel: 'weather.minvalues.daily',
            name: 'Min. Indoor humidity (daily)'
        }],
        type: 'number',
        unit: '%',
        role: 'value.humidity',
        min: 0,
        max: 100,
        wunderground: '^indoorhumidity',
        ecowitt: '^humidityin',
        scheduler: 'indoorhumidity',
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'indoortemp',
        channels: [{
            channel: 'weather.current',
            name: 'Indoor temperature'
        },{
            channel: 'weather.maxvalues.absolut',
            name: 'Max. Indoor temperature (absolut)'
        },{
            channel: 'weather.maxvalues.daily',
            name: 'Max. Indoor temperature (daily)'
        },{
            channel: 'weather.minvalues.absolut',
            name: 'Min. Indoor temperature (absolut)'
        },{
            channel: 'weather.minvalues.daily',
            name: 'Min. Indoor temperature (daily)'
        }],
        type: 'number',
        role: 'value.temperature',
        min: -40,
        max: 80,
        unit: '°C',
        wunderground: '^indoortempf',
        ecowitt: '^tempinf',
        scheduler: 'indoortemp',
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
        channels: [{
            channel: 'weather.current',
            name: 'Rainrate (Monthly)'
        },{
            channel: 'weather.maxvalues.absolut',
            name: 'Max. Rainrate (Monthly) (absolut)'
        },{
            channel: 'weather.maxvalues.daily',
            name: 'Max. Rainrate (Monthly) (daily)'
        }],
        type: 'number',
        unit: 'mm',
        role: 'value',
        min: 0,
        max: 1500,
        wunderground: '^monthlyrainin',
        ecowitt: '^monthlyrainin',
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
        channels: [{
            channel: 'weather.current',
            name: 'Outdoor humidity'
        },{
            channel: 'weather.maxvalues.absolut',
            name: 'Max. Outdoor humidity (absolut)'
        },{
            channel: 'weather.maxvalues.daily',
            name: 'Max. Outdoor humidity (daily)'
        },{
            channel: 'weather.minvalues.absolut',
            name: 'Min. Outdoor humidity (absolut)'
        },{
            channel: 'weather.minvalues.daily',
            name: 'Min. Outdoor humidity (daily)'
        }],
        type: 'number',
        unit: '%',
        role: 'value.humidity',
        min: 0,
        max: 100,
        wunderground: '^humidity([0-9])',
        ecowitt: '^humidity([0-9])',
        scheduler: 'humidity',
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'outdoortemp',
        channels: [{
            channel: 'weather.current',
            name: 'Outdoor temperature'
        },{
            channel: 'weather.maxvalues.absolut',
            name: 'Max. Outdoor temperature (absolut)'
        },{
            channel: 'weather.maxvalues.daily',
            name: 'Max. Outdoor temperature (daily)'
        },{
            channel: 'weather.minvalues.absolut',
            name: 'Min. Outdoor temperature (absolut)'
        },{
            channel: 'weather.minvalues.daily',
            name: 'Min. Outdoor temperature (daily)'
        }],
        type: 'number',
        unit: '°C',
        role: 'value.temperature',
        min: -40,
        max: 80,
        wunderground: '^temp([0-9])*f',
        ecowitt: '^temp([0-9])*f',
        scheduler: 'outdoortemp',
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
        channels: [{
            channel: 'weather.current',
            name: 'Pressure absolut'
        },{
            channel: 'weather.maxvalues.absolut',
            name: 'Max. Pressure absolut (absolut)'
        },{
            channel: 'weather.maxvalues.daily',
            name: 'Max. Pressure absolut (daily)'
        },{
            channel: 'weather.minvalues.absolut',
            name: 'Min. Pressure absolut (absolut)'
        },{
            channel: 'weather.minvalues.daily',
            name: 'Min. Pressure absolut (daily)'
        }],
        type: 'number',
        unit: 'hPa',
        role: 'value.pressure',
        min: 0,
        max: 1500,
        wunderground: '^absbaromin',
        ecowitt: '^baromabsin',
        scheduler: 'pressureabs',
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
        channels: [{
            channel: 'weather.current',
            name: 'Pressure relative'
        },{
            channel: 'weather.maxvalues.absolut',
            name: 'Max. Pressure relative (absolut)'
        },{
            channel: 'weather.maxvalues.daily',
            name: 'Max. Pressure relative (daily)'
        },{
            channel: 'weather.minvalues.absolut',
            name: 'Min. Pressure relative (absolut)'
        },{
            channel: 'weather.minvalues.daily',
            name: 'Min. Pressure relative (daily)'
        }],
        type: 'number',
        unit: 'hPa',
        role: 'value.pressure',
        min: 0,
        max: 1500,
        wunderground: '^baromin',
        ecowitt: '^baromrelin',
        scheduler: 'pressurerel',
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
        channels: [{
            channel: 'weather.current',
            name: 'Rainrate'
        },{
            channel: 'weather.maxvalues.absolut',
            name: 'Max. Rainrate (absolut)'
        }],
        type: 'number',
        unit: 'mm',
        role: 'value',
        min: 0,
        max: 1500,
        wunderground: '^rainin',
        ecowitt: '^rainratein',
        scheduler: 'rain',
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
        channels: [{
            channel: 'weather.current',
            name: 'Solar Radiation'
        },{
            channel: 'weather.maxvalues.absolut',
            name: 'Max. Solarradiation (absolut)'
        },{
            channel: 'weather.maxvalues.daily',
            name: 'Max. Solarradiation (daily)'
        }],
        type: 'number',
        unit: 'lx',
        role: 'value.brightness',
        min: 0,
        max: 300000,
        wunderground: '^solarradiation',
        ecowitt: '^solarradiation',
        scheduler: 'solarradiation',
        listener_conversion: wm2_to_lx,
        scheduler_conversion: 'x / 10',
        unit_config: 'unit_solar',
        units: [{
            display_name: 'W/m2',
            display_conversion: lx_to_wm2,
            main_unit_conversion: wm2_to_lx
        }, {
            display_name: 'lx',
            display_conversion: null
        }
        ]
    },
    {
        id: 'uvi',
        channels: [{
            channel: 'weather.current',
            name: 'UVI'
        },{
            channel: 'weather.maxvalues.absolut',
            name: 'Max. UVI (absolut)'
        },{
            channel: 'weather.maxvalues.daily',
            name: 'Max. UVI (daily)'
        }],
        type: 'number',
        unit: '',
        role: 'value',
        min: 0,
        max: 15,
        wunderground: '^UV',
        ecowitt: '^uv',
        scheduler: 'uvi',
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'weeklyrain',
        channels: [{
            channel: 'weather.current',
            name: 'Rain (weekly)'
        },{
            channel: 'weather.maxvalues.absolut',
            name: 'Max. Rain (weekly) (absolut)'
        }],
        type: 'number',
        unit: 'mm',
        role: 'value',
        min: 0,
        max: 1500,
        wunderground: '^weeklyrainin',
        ecowitt: '^weeklyrainin',
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
        channels: [{
            channel: 'weather.current',
            name: 'Windchill temperature'
        },{
            channel: 'weather.minvalues.absolut',
            name: 'Min. Windchill temperature (absolut)'
        },{
            channel: 'weather.minvalues.daily',
            name: 'Min. Windchill temperature (daily)'
        }],
        type: 'number',
        unit: '°C',
        role: 'value.temperature',
        min: -40,
        max: 80,
        wunderground: '^windchillf',
        scheduler: 'windchilltemp',
        ecowitt: null,
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
        id: 'winddir',
        channels: [{
            channel: 'weather.current',
            name: 'Wind direction'
        }],
        type: 'number',
        unit: '°',
        role: 'value.direction',
        min: 0,
        max: 359,
        wunderground: '^winddir',
        ecowitt: '^winddir',
        scheduler: 'winddir',
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'windheading',
        channels: [{
            channel: 'weather.current',
            name: 'Wind Heading'
        }],
        type: 'string',
        unit: '',
        role: 'indicator.direction',
        wunderground: null,
        ecowitt: null,
        scheduler: null,
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'windgustspeed',
        channels: [{
            name: 'Windgust speed',
            channel: 'weather.current'
        },{
            channel: 'weather.maxvalues.absolut',
            name: 'Max. Windgust speed (absolut)'
        },{
            channel: 'weather.maxvalues.daily',
            name: 'Max. Windgust speed (daily)'
        }],
        type: 'number',
        unit: 'km/h',
        role: 'value.speed',
        min: 0,
        max: 1000,
        wunderground: '^windgustmph',
        ecowitt: '^windgustmph',
        scheduler: 'windgustspeed',
        listener_conversion: 'roundTo(x * 1.60934, 1)',
        scheduler_conversion: 'roundTo((x / 10 * 3.6),1)',
        unit_config: 'unit_windspeed',
        units: [{
            display_name: 'm/s',
            display_conversion: kmh_to_ms,
            main_unit_conversion: ms_to_kmh
        }, {
            display_name: 'mph',
            display_conversion: kmh_to_mph,
            main_unit_conversion: mph_to_kmh
        }, {
            display_name: 'knots',
            display_conversion: kmh_to_knots,
            main_unit_conversion: knots_to_kmh
        }, {
            display_name: 'fpm',
            display_conversion: kmh_to_fpm,
            main_unit_conversion: fpm_to_kmh
        }, {
            display_name: 'km/h',
            display_conversion: null
        }
        ]

    },
    {
        id: 'windspeed',
        channels: [{
            channel: 'weather.current',
            name: 'Wind speed'
        },{
            channel: 'weather.maxvalues.absolut',
            name: 'Max. Wind speed (absolut)'
        },{
            channel: 'weather.maxvalues.daily',
            name: 'Max. Wind speed (daily)'
        }],
        type: 'number',
        unit: 'km/h',
        role: 'value.speed',
        min: 0,
        max: 1000,
        wunderground: '^windspeedmph',
        ecowitt: '^windspeedmph',
        scheduler: 'windspeed',
        listener_conversion: 'roundTo(x * 1.60934, 1)',
        scheduler_conversion: 'roundTo((x / 10 * 3.6),1)',
        unit_config: 'unit_windspeed',
        units: [{
            display_name: 'm/s',
            display_conversion: kmh_to_ms,
            main_unit_conversion: ms_to_kmh
        }, {
            display_name: 'mph',
            display_conversion: kmh_to_mph,
            main_unit_conversion: mph_to_kmh
        }, {
            display_name: 'knots',
            display_conversion: kmh_to_knots,
            main_unit_conversion: knots_to_kmh
        }, {
            display_name: 'fpm',
            display_conversion: kmh_to_fpm,
            main_unit_conversion: fpm_to_kmh
        }, {
            display_name: 'km/h',
            display_conversion: null
        }
        ]
    },
    {
        id: 'yearlyrain',
        channels: [{
            channel: 'weather.current',
            name: 'Rainrate (Yearly)'
        },{
            channel: 'weather.maxvalues.absolut',
            name: 'Max. Rainrate (Yearly) (absolut)'
        }],
        type: 'number',
        unit: 'mm',
        role: 'value',
        min: 0,
        max: 1500,
        wunderground: '^yearlyrainin',
        ecowitt: '^yearlyrainin',
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
        channel: 'info',
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
        channel: 'weather.current',
        command: [0xFF, 0xFF, 0x0B, 0x00, 0x06, 0x04, 0x04, 0x19],
        command_int: 11,
        subcommand_int: 4,
        parser: new BinaryParser()
            .endianess('big').seek(7)
            .int16('indoortemp').seek(1)
            .int16('outdoortemp').seek(1)
            .int16('dewpointtemp').seek(1)
            .int16('windchilltemp').seek(1)
            .int16('heatindex').seek(1)
            .uint8('indoorhumidity').seek(1)
            .uint8('outdoorhumidity').seek(1)
            .uint16('pressureabs').seek(1)
            .uint16('pressurerel').seek(1)
            .uint16('winddir').seek(1)
            .uint16('windspeed').seek(1)
            .uint16('windgustspeed').seek(1)
            .uint32('rain').seek(1)
            .uint32('dailyrain').seek(1)
            .uint32('weeklyrain').seek(1)
            .uint32('monthlyrain').seek(1)
            .uint32('yearlyrain').seek(1)
            .uint32('raintotal').seek(1)
            .uint32('solarradiation').seek(1)
            .uint16('UVraw').seek(1)
            .uint8('uvi')
    },
    {
        name: 'Get Max Data',
        configurable: true,
        config_variable: 'ws_getmax',
        channel: 'weather.maxvalues.absolut',
        command: [0xFF, 0xFF, 0x0B, 0x00, 0x06, 0x05, 0x05, 0x1B],
        command_int: 11,
        subcommand_int: 5,
        parser: new BinaryParser()
            .endianess('big').seek(7)
            .int16('indoortemp').seek(1)
            .int16('outdoortemp').seek(1)
            .int16('dewpointtemp').seek(1)
            .int16('heatindex').seek(1)
            .uint8('indoorhumidity').seek(1)
            .uint8('outdoorhumidity').seek(1)
            .uint16('pressureabs').seek(1)
            .uint16('pressurerel').seek(1)
            .uint16('windspeed').seek(1)
            .uint16('windgustspeed').seek(1)
            .uint32('rain').seek(1)
            .uint32('dailyrain').seek(1)
            .uint32('weeklyrain').seek(1)
            .uint32('monthlyrain').seek(1)
            .uint32('yearlyrain').seek(1)
            .uint32('solarradiation').seek(1)
            .uint16('UVraw').seek(1)
            .uint8('uvi')
    },
    {
        name: 'Get Min Data',
        configurable: true,
        config_variable: 'ws_getmin',
        channel: 'weather.minvalues.absolut',
        command: [0xFF, 0xFF, 0x0B, 0x00, 0x06, 0x06, 0x06, 0x1D],
        command_int: 11,
        subcommand_int: 6,
        parser: new BinaryParser()
            .endianess('big').seek(7)
            .int16('indoortemp').seek(1)
            .int16('outdoortemp').seek(1)
            .int16('dewpointtemp').seek(1)
            .int16('windchilltemp').seek(1)
            .uint8('indoorhumidity').seek(1)
            .uint8('outdoorhumidity').seek(1)
            .uint16('pressureabs').seek(1)
            .uint16('pressurerel').seek(1)
    },
    {
        name: 'Get Daily Max Data',
        configurable: true,
        config_variable: 'ws_getmaxdaily',
        channel: 'weather.maxvalues.daily',
        command: [0xFF, 0xFF, 0x0B, 0x00, 0x06, 0x07, 0x07, 0x1F],
        command_int: 11,
        subcommand_int: 7,
        parser: new BinaryParser()
            .endianess('big').seek(7)
            .int16('indoortemp')
            .int16('indoortemptime').seek(1)
            .int16('outdoortemp')
            .int16('outdoortemptime').seek(1)
            .int16('dewpointtemp')
            .int16('dewpointtemptime').seek(1)
            .int16('windchilltemp')
            .int16('windchilltemptime').seek(1)
            .uint8('indoorhumidity')
            .int16('indoorhumiditytime').seek(1)
            .uint8('outdoorhumidity')
            .int16('outdoorhumiditytime').seek(1)
            .uint16('pressureabs')
            .int16('pressureabstime').seek(1)
            .uint16('pressurerel')
            .int16('pressurereltime').seek(1)
            .uint16('windspeed')
            .int16('windspeedtime').seek(1)
            .uint16('windgustspeed')
            .int16('windgustspeedtime').seek(1)
            .uint32('dailyrain')
            .int16('dailyraintime').seek(1)
            .uint32('solarradiation')
            .int16('solarradiationtime').seek(1)
            .uint16('UVraw')
            .int16('UVrawtime').seek(1)
            .uint8('uvi')
            .int16('uvitime')
    },
    {
        name: 'Get Daily Min Data',
        configurable: true,
        config_variable: 'ws_getmindaily',
        channel: 'weather.minvalues.daily',
        command: [0xFF, 0xFF, 0x0B, 0x00, 0x06, 0x08, 0x08, 0x21],
        command_int: 11,
        subcommand_int: 8,
        parser: new BinaryParser()
            .endianess('big').seek(7)
            .int16('indoortemp')
            .int16('indoortemptime').seek(1)
            .int16('outdoortemp')
            .int16('outdoortemptime').seek(1)
            .int16('dewpointtemp')
            .int16('dewpointtemptime').seek(1)
            .int16('windchilltemp')
            .int16('windchilltemptime').seek(1)
            .uint8('indoorhumidity')
            .int16('indoorhumidityime').seek(1)
            .uint8('outdoorhumidity')
            .int16('outdoorhumiditytime').seek(1)
            .uint16('pressureabs')
            .int16('pressureabstime').seek(1)
            .uint16('pressurerl')
            .int16('pressurereltime').seek(1)
    },
];

exports.COMMANDS = COMMANDS;

