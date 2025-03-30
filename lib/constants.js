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
        id: 'model',
        channels: [{
            channel: 'info',
            name: 'Model name of weather station'
        }],
        type: 'string',
        wunderground: null,
        ecowitt: '^model',
        scheduler: null,
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'freq',
        channels: [{
            channel: 'info',
            name: 'Communication frequency of weather station'
        }],
        type: 'string',
        wunderground: null,
        ecowitt: '^freq',
        scheduler: null,
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
        wunderground: 'last_listener_update',
        ecowitt: 'last_listener_update',
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
        max: 100000,
        wunderground: null,
        ecowitt: null,
        scheduler: 'UVraw',
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'UVraw_time',
        channels: [{
            channel: 'weather.maxvalues.daily',
            name: 'Max. UV (raw) (time)'
        }],
        type: 'string',
        role: 'text',
        wunderground: null,
        ecowitt: null,
        scheduler: 'UVraw_time',
        listener_conversion: null,
        scheduler_conversion: 'timestamp_convert(x)'
    },
    {
        id: 'eventrain',
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
        wunderground: '^eventrainin',
        ecowitt: '^eventrainin',
        scheduler: 'eventrain',
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
        id: 'hourlyrain',
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
        wunderground: '^hourlyrainin',
        ecowitt: '^hourlyrainin',
        scheduler: 'hourlyrain',
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
        id: 'dailyrain_piezo',
        channels: [{
            channel: 'weather.current',
            name: 'Rainrate Piezo (Daily)'
        }],
        type: 'number',
        unit: 'mm',
        role: 'value',
        min: 0,
        max: 1500,
        wunderground: '^drain_piezo',
        ecowitt: '^drain_piezo',
        scheduler: null,
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
        id: 'dailyrain_time',
        channels: [{
            channel: 'weather.maxvalues.daily',
            name: 'Max. Rainrate (time)'
        }],
        type: 'string',
        role: 'text',
        wunderground: null,
        ecowitt: null,
        scheduler: 'dailyrain_time',
        listener_conversion: null,
        scheduler_conversion: 'timestamp_convert(x)'
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
        id: 'dewpointtemp_time',
        channels: [{
            channel: 'weather.maxvalues.daily',
            name: 'Max. Dewpoint temperature (time)'
        },{
            channel: 'weather.minvalues.daily',
            name: 'Min. Dewpoint temperature (time)'
        }],
        type: 'string',
        role: 'text',
        wunderground: null,
        ecowitt: null,
        scheduler: 'dewpointtemp_time',
        listener_conversion: null,
        scheduler_conversion: 'timestamp_convert(x)'
    },
    {
        id: 'leafwetness',
        channels: [{
            channel: 'weather.current',
            name: 'Leaf Wetness',
        }],
        type: 'number',
        unit: '%',
        role: 'value.humidity',
        min: 0,
        max: 100,
        wunderground: '^leafwetness',
        ecowitt: '^leafwetness',
        scheduler: null,
        listener_conversion: null,
        scheduler_conversion: null
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
        id: 'indoorhumidity_time',
        channels: [{
            channel: 'weather.maxvalues.daily',
            name: 'Max. Indoor Humidity (time)'
        },{
            channel: 'weather.minvalues.daily',
            name: 'Min. Indoor Humidity (time)'
        }],
        type: 'string',
        role: 'text',
        wunderground: null,
        ecowitt: null,
        scheduler: 'indoorhumidity_time',
        listener_conversion: null,
        scheduler_conversion: 'timestamp_convert(x)'
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
        id: 'indoortemp_time',
        channels: [{
            channel: 'weather.maxvalues.daily',
            name: 'Max. Indoor temperature (time)'
        },{
            channel: 'weather.minvalues.daily',
            name: 'Min. Indoor temperature (time)'
        }],
        type: 'string',
        role: 'text',
        wunderground: null,
        ecowitt: null,
        scheduler: 'indoortemp_time',
        listener_conversion: null,
        scheduler_conversion: 'timestamp_convert(x)'
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
        id: 'monthlyrain_piezo',
        channels: [{
            channel: 'weather.current',
            name: 'Rainrate Piezo (Monthly)'
        }],
        type: 'number',
        unit: 'mm',
        role: 'value',
        min: 0,
        max: 1500,
        wunderground: '^mrain_piezo',
        ecowitt: '^mrain_piezo',
        scheduler: null,
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
        id: 'startrain_piezo',
        channels: [{
            channel: 'weather.current',
            name: 'Rain detected Piezo'
        }],
        type: 'number',
        wunderground: null,
        ecowitt: '^srain_piezo',
        scheduler: null,
        listener_conversion: null,
        scheduler_conversion: null
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
        wunderground: '^humidity([0-9])*',
        ecowitt: '^humidity([0-9])*',
        scheduler: 'outdoorhumidity',
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'outdoorhumidity_time',
        channels: [{
            channel: 'weather.maxvalues.daily',
            name: 'Max. Outdoor Humidity (time)'
        },{
            channel: 'weather.minvalues.daily',
            name: 'Min. Outdoor Humidity (time)'
        }],
        type: 'string',
        role: 'text',
        wunderground: null,
        ecowitt: null,
        scheduler: 'outdoorhumidity_time',
        listener_conversion: null,
        scheduler_conversion: 'timestamp_convert(x)'
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
        id: 'outdoortemp_time',
        channels: [{
            channel: 'weather.maxvalues.daily',
            name: 'Max. Indoor temperature (time)'
        },{
            channel: 'weather.minvalues.daily',
            name: 'Min. Outdoor temperature (time)'
        }],
        type: 'string',
        role: 'text',
        wunderground: null,
        ecowitt: null,
        scheduler: 'outdoortemp_time',
        listener_conversion: null,
        scheduler_conversion: 'timestamp_convert(x)'
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
        id: 'pressureabs_time',
        channels: [{
            channel: 'weather.maxvalues.daily',
            name: 'Max. Pressure absolut (time)'
        },{
            channel: 'weather.minvalues.daily',
            name: 'Min. Pressure absolut (time)'
        }],
        type: 'string',
        role: 'text',
        wunderground: null,
        ecowitt: null,
        scheduler: 'pressureabs_time',
        listener_conversion: null,
        scheduler_conversion: 'timestamp_convert(x)'
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
        id: 'pressurerel_time',
        channels: [{
            channel: 'weather.maxvalues.daily',
            name: 'Max. Pressure relative (time)'
        },{
            channel: 'weather.minvalues.daily',
            name: 'Min. Pressure relative (time)'
        }],
        type: 'string',
        role: 'text',
        wunderground: null,
        ecowitt: null,
        scheduler: 'pressurerel_time',
        listener_conversion: null,
        scheduler_conversion: 'timestamp_convert(x)'
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
        id: 'rain_piezo',
        channels: [{
            channel: 'weather.current',
            name: 'Rainrate Piezo'
        }],
        type: 'number',
        unit: 'mm',
        role: 'value',
        min: 0,
        max: 1500,
        wunderground: '^rrain_piezo',
        ecowitt: '^rrain_piezo',
        scheduler: null,
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
        id: 'solarradiation_time',
        channels: [{
            channel: 'weather.maxvalues.daily',
            name: 'Max. Solarradiation (time)'
        }],
        type: 'string',
        role: 'text',
        wunderground: null,
        ecowitt: null,
        scheduler: 'solarradiation_time',
        listener_conversion: null,
        scheduler_conversion: 'timestamp_convert(x)'
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
        id: 'uvi_time',
        channels: [{
            channel: 'weather.maxvalues.daily',
            name: 'Max. UVI (time)'
        }],
        type: 'string',
        role: 'text',
        wunderground: null,
        ecowitt: null,
        scheduler: 'ivu_time',
        listener_conversion: null,
        scheduler_conversion: 'timestamp_convert(x)'
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
        id: 'weeklyrain_piezo',
        channels: [{
            channel: 'weather.current',
            name: 'Rain Piezo (weekly)'
        }],
        type: 'number',
        unit: 'mm',
        role: 'value',
        min: 0,
        max: 1500,
        wunderground: '^wrain_piezo',
        ecowitt: '^wrain_piezo',
        scheduler: null,
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
        id: 'windchilltemp_time',
        channels: [{
            channel: 'weather.maxvalues.daily',
            name: 'Max. Windchill temperature (time)'
        },{
            channel: 'weather.minvalues.daily',
            name: 'Min. Windchill temperature (time)'
        }],
        type: 'string',
        role: 'text',
        wunderground: null,
        ecowitt: null,
        scheduler: 'windchilltemp_time',
        listener_conversion: null,
        scheduler_conversion: 'timestamp_convert(x)'
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
        id: 'windgustspeed_time',
        channels: [{
            channel: 'weather.maxvalues.daily',
            name: 'Max. Windgust speed (time)'
        }],
        type: 'string',
        role: 'text',
        wunderground: null,
        ecowitt: null,
        scheduler: 'windgustspeed_time',
        listener_conversion: null,
        scheduler_conversion: 'timestamp_convert(x)'
    },
    {
        id: 'maxdailygust',
        channels: [{
            name: 'Daily max windgust speed',
            channel: 'weather.current'
        }],
        type: 'number',
        unit: 'km/h',
        role: 'value.speed',
        min: 0,
        max: 1000,
        wunderground: null,
        ecowitt: '^maxdailygust',
        scheduler: null,
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
        id: 'windspeed_time',
        channels: [{
            channel: 'weather.maxvalues.daily',
            name: 'Max. Windspeed (time)'
        }],
        type: 'string',
        role: 'text',
        wunderground: null,
        ecowitt: null,
        scheduler: 'windspeed_time',
        listener_conversion: null,
        scheduler_conversion: 'timestamp_convert(x)'
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
        max: 20000,
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
    },
    {
        id: 'totalrainin',
        channels: [{
            channel: 'weather.current',
            name: 'Rainrate (Total)'
        },{
            channel: 'weather.maxvalues.absolut',
            name: 'Max. Rainrate (Total) (absolut)'
        }],
        type: 'number',
        unit: 'mm',
        role: 'value',
        min: 0,
        wunderground: '^totalrainin',
        ecowitt: '^totalrainin',
        scheduler: 'totalrainin',
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
        id: 'yearlyrain_piezo',
        channels: [{
            channel: 'weather.current',
            name: 'Rainrate Piezo (Yearly)'
        }],
        type: 'number',
        unit: 'mm',
        role: 'value',
        min: 0,
        wunderground: '^yrain_piezo',
        ecowitt: '^yrain_piezo',
        scheduler: null,
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
        id: 'soilmoisture',
        channels: [{
            channel: 'weather.current',
            name: 'Soil Moisture'
        }],
        type: 'number',
        unit: '%',
        role: 'value.humidity',
        min: 0,
        max: 100,
        wunderground: '^soilmoisture([0-9])*',
        ecowitt: '^soilmoisture([0-9])*',
        scheduler: null,
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'soilbatt',
        channels: [{
            channel: 'weather.info',
            name: 'Soil Battery Voltage'
        }],
        type: 'number',
        unit: 'V',
        role: 'value.voltage',
        min: 0,
        max: 24,
        wunderground: '^soilbatt([0-9])*',
        ecowitt: '^soilbatt([0-9])*',
        scheduler: null,
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'wh80batt',
        channels: [{
            channel: 'weather.info',
            name: 'WH80 Battery Voltage'
        }],
        type: 'number',
        unit: 'V',
        role: 'value.voltage',
        min: 0,
        max: 24,
        wunderground: '^wh80batt([0-9])*',
        ecowitt: '^wh80batt([0-9])*',
        scheduler: null,
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'wh65batt',
        channels: [{
            channel: 'weather.info',
            name: 'WH65 Battery Voltage'
        }],
        type: 'number',
        unit: 'V',
        role: 'value.voltage',
        min: 0,
        max: 24,
        wunderground: '^wh65batt([0-9])*',
        ecowitt: '^wh65batt([0-9])*',
        scheduler: null,
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'wh57batt',
        channels: [{
            channel: 'weather.info',
            name: 'WH57 Battery Voltage'
        }],
        type: 'number',
        unit: 'V',
        role: 'value.voltage',
        min: 0,
        max: 24,
        wunderground: '^wh57batt([0-9])*',
        ecowitt: '^wh57batt([0-9])*',
        scheduler: null,
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'wh40batt',
        channels: [{
            channel: 'weather.info',
            name: 'WH40 Battery Voltage'
        }],
        type: 'number',
        unit: 'V',
        role: 'value.voltage',
        min: 0,
        max: 24,
        wunderground: '^wh40batt([0-9])*',
        ecowitt: '^wh40batt([0-9])*',
        scheduler: null,
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'wh25batt',
        channels: [{
            channel: 'weather.info',
            name: 'WH25 Battery Voltage'
        }],
        type: 'number',
        unit: 'V',
        role: 'value.voltage',
        min: 0,
        max: 24,
        wunderground: '^wh25batt([0-9])*',
        ecowitt: '^wh25batt([0-9])*',
        scheduler: null,
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'wh26batt',
        channels: [{
            channel: 'weather.info',
            name: 'WH26 Battery Voltage'
        }],
        type: 'number',
        unit: 'V',
        role: 'value.voltage',
        min: 0,
        max: 24,
        wunderground: '^wh26batt([0-9])*',
        ecowitt: '^wh26batt([0-9])*',
        scheduler: null,
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'tf_ch',
        channels: [{
            channel: 'weather.current',
            name: 'External sensor temperature'
        }],
        type: 'number',
        role: 'value.temperature',
        min: -40,
        max: 80,
        unit: '°C',
        wunderground: '^tf_ch([0-9])*',
        ecowitt: '^tf_ch([0-9])*',
        scheduler: 'tf_ch',
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
        id: 'tf_batt',
        channels: [{
            channel: 'weather.info',
            name: 'External sensor battery (TF)'
        }],
        type: 'number',
        unit: 'V',
        role: 'value.voltage',
        min: 0,
        max: 24,
        wunderground: '^tf_batt([0-9])*',
        ecowitt: '^tf_batt([0-9])*',
        scheduler: null,
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'batt1',
        channels: [{
            channel: 'weather.info',
            name: 'External sensor battery (Batt1)'
        }],
        type: 'number',
        unit: 'V',
        role: 'value.voltage',
        min: 0,
        max: 24,
        wunderground: '^batt([0-9])*',
        ecowitt: '^batt([0-9])*',
        scheduler: null,
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'tf_co2',
        channels: [{
            channel: 'weather.current',
            name: 'External CO2 sensor temperature'
        }],
        type: 'number',
        role: 'value.temperature',
        min: -40,
        max: 60,
        unit: '°C',
        wunderground: '^tf_co2([0-9])*',
        ecowitt: '^tf_co2([0-9])*',
        scheduler: null,
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
        id: 'humi_co2',
        channels: [{
            channel: 'weather.current',
            name: 'External CO2 sensor humidity',
        }],
        type: 'number',
        unit: '%',
        role: 'value.humidity',
        min: 0,
        max: 100,
        wunderground: '^humi_co2',
        ecowitt: '^humi_co2',
        scheduler: null,
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'pm25_co2',
        channels: [{
            channel: 'weather.current',
            name: 'External CO2 PM 2.5',
        }],
        type: 'number',
        unit: 'ug/m3',
        role: 'value',
        min: 0,
        max: 1000,
        wunderground: '^pm25_co2',
        ecowitt: '^pm25_co2',
        scheduler: null,
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'pm25_24h_co2',
        channels: [{
            channel: 'weather.daily',
            name: 'External CO2 PM 2.5',
        }],
        type: 'number',
        unit: 'ug/m3',
        role: 'value',
        min: 0,
        max: 1000,
        wunderground: '^pm25_24h_co2',
        ecowitt: '^pm25_24h_co2',
        scheduler: null,
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'pm10_co2',
        channels: [{
            channel: 'weather.current',
            name: 'External CO2 PM 10',
        }],
        type: 'number',
        unit: 'ug/m3',
        role: 'value',
        min: 0,
        max: 1000,
        wunderground: '^pm10_co2',
        ecowitt: '^pm10_co2',
        scheduler: null,
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'pm10_24h_co2',
        channels: [{
            channel: 'weather.daily',
            name: 'External CO2 PM 10',
        }],
        type: 'number',
        unit: 'ug/m3',
        role: 'value',
        min: 0,
        max: 1000,
        wunderground: '^pm10_24h_co2',
        ecowitt: '^pm10_24h_co2',
        scheduler: null,
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'co2',
        channels: [{
            channel: 'weather.current',
            name: 'External CO2',
        }],
        type: 'number',
        unit: 'ppm',
        role: 'value',
        min: 0,
        max: 40000,
        wunderground: '^co2$',
        ecowitt: '^co2$',
        scheduler: null,
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'co2_24h',
        channels: [{
            channel: 'weather.daily',
            name: 'External CO2',
        }],
        type: 'number',
        unit: 'ppm',
        role: 'value',
        min: 0,
        max: 40000,
        wunderground: '^co2_24h',
        ecowitt: '^co2_24h',
        scheduler: null,
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'co2_batt',
        channels: [{
            channel: 'weather.info',
            name: 'External CO2 sensor battery'
        }],
        type: 'number',
        unit: 'V',
        role: 'value.voltage',
        min: 0,
        max: 24,
        wunderground: '^co2_batt([0-9])*',
        ecowitt: '^co2_batt([0-9])*',
        scheduler: null,
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'lightning_time',
        channels: [{
            channel: 'weather.current',
            name: 'last lightning(time)'
        }],
        type: 'number',
        role: 'value',
        wunderground: null,
        ecowitt: 'lightning_time',
        scheduler: null,
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'lightning',
        channels: [{
            channel: 'weather.current',
            name: 'last lightning (distance)'
        }],
        type: 'number',
        unit: 'km',
        role: 'value',
        wunderground: null,
        ecowitt: 'lightning$',
        scheduler: null,
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'lightning_num',
        channels: [{
            channel: 'weather.daily',
            name: 'lightning count (day)'
        }],
        type: 'number',
        unit: '',
        role: 'value',
        wunderground: null,
        ecowitt: 'lightning_num',
        scheduler: null,
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'eventrain_piezo',
        channels: [{
            channel: 'weather.current',
            name: 'Rain Piezo (event)'
        }],
        type: 'number',
        unit: 'mm',
        role: 'value',
        min: 0,
        max: 1500,
        wunderground: '^erain_piezo',
        ecowitt: '^erain_piezo',
        scheduler: null,
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
        id: 'hourlyrain_piezo',
        channels: [{
            channel: 'weather.current',
            name: 'Rain Piezo (hourly)'
        }],
        type: 'number',
        unit: 'mm',
        role: 'value',
        min: 0,
        max: 1500,
        wunderground: '^hrain_piezo',
        ecowitt: '^hrain_piezo',
        scheduler: null,
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
        id: 'leak_ch',
        channels: [{
            channel: 'weather.current',
            name: 'Leak'
        }],
        type: 'number',
        unit: '',
        role: 'value',
        min: 0,
        max: 10,
        wunderground: '^leak_ch([0-9])*',
        ecowitt: '^leak_ch([0-9])*',
        scheduler: null,
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'leakbatt',
        channels: [{
            channel: 'weather.info',
            name: 'Leak Battery Voltage'
        }],
        type: 'number',
        unit: '',
        role: 'value.voltage',
        min: 0,
        max: 5,
        wunderground: '^leakbatt([0-9])*',
        ecowitt: '^leakbatt([0-9])*',
        scheduler: null,
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'air_ch',
        channels: [{
            channel: 'weather.current',
            name: 'Air Distance'
        }],
        type: 'number',
        unit: 'mm',
        role: '',
        min: 0,
        max: 500,
        wunderground: '^air_ch([0-9])*',
        ecowitt: '^air_ch([0-9])*',
        scheduler: null,
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'thi_ch',
        channels: [{
            channel: 'weather.current',
            name: 'Total Distance'
        }],
        type: 'number',
        unit: 'mm',
        role: '',
        min: 0,
        max: 500,
        wunderground: '^thi_ch([0-9])*',
        ecowitt: '^thi_ch([0-9])*',
        scheduler: null,
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'depth_ch',
        channels: [{
            channel: 'weather.current',
            name: 'Depth Distance'
        }],
        type: 'number',
        unit: 'V',
        role: 'value.voltage',
        min: 0,
        max: 5,
        wunderground: '^depth_ch([0-9])*',
        ecowitt: '^depth_ch([0-9])*',
        scheduler: null,
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'ldsbatt',
        channels: [{
            channel: 'weather.info',
            name: 'Depth Distance'
        }],
        type: 'number',
        unit: 'mm',
        role: '',
        min: 0,
        max: 500,
        wunderground: '^ldsbatt([0-9])*',
        ecowitt: '^ldsbatt([0-9])*',
        scheduler: null,
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'runtime',
        channels: [{
            channel: 'info',
            name: 'seconds since weather station reset'
        }],
        type: 'number',
        wunderground: null,
        ecowitt: '^runtime',
        scheduler: null,
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'dateutc',
        channels: [{
            channel: 'info',
            name: 'date and time'
        }],
        type: 'string',
        wunderground: null,
        ecowitt: '^dateutc',
        scheduler: null,
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'ws90cap_volt',
        channels: [{
            channel: 'info',
            name: 'voltage of the super cap'
        }],
        type: 'string',
        wunderground: null,
        ecowitt: '^ws90cap_volt',
        scheduler: null,
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'ws90_ver',
        channels: [{
            channel: 'info',
            name: 'ws90 version'
        }],
        type: 'string',
        wunderground: null,
        ecowitt: '^ws90_ver',
        scheduler: null,
        listener_conversion: null,
        scheduler_conversion: null
    },
    {
        id: 'wh90batt',
        channels: [{
            channel: 'info',
            name: 'voltage of the two AA cells'
        }],
        type: 'string',
        wunderground: null,
        ecowitt: '^wh90batt',
        scheduler: null,
        listener_conversion: null,
        scheduler_conversion: null
    }
        id: 'nickname',
        type: 'string',
        unit: '',
        role: '',
        wunderground: null,
        ecowitt: null,
        gateway: 'nickname',
        gateway_conversion: null
    },
    {
        id: 'model',
        type: 'number',
        unit: '',
        role: '',
        wunderground: null,
        ecowitt: null,
        gateway: 'model',
        gateway_conversion: null
    },
    {
        id: 'devicename',
        type: 'string',
        unit: '',
        role: '',
        wunderground: null,
        ecowitt: null,
        gateway: 'devicename',
        gateway_conversion: null
    },
    {
        id: 'version',
        type: 'number',
        unit: '',
        role: '',
        wunderground: null,
        ecowitt: null,
        gateway: 'version',
        gateway_conversion: null
    },
    {
        id: 'water_status',
        type: 'number',
        unit: '',
        role: '',
        states: {
            0: 'IDLE RUN',
            1: 'BUTTON RUN',
            2: 'BUTTON STOP',
            3: 'QUICK RUN',
            4: 'QUICK STOP',
            5: 'SMART RUN',
            6: 'SMART STOP',
            7: 'PLAN RUN',
            35: 'LOCAL RUN',
            36: 'LOCAL STOP'
        },
        wunderground: null,
        ecowitt: null,
        gateway: 'water_status',
        gateway_conversion: null
    },
    {
        id: 'warning',
        type: 'number',
        unit: '',
        role: '',
        wunderground: null,
        ecowitt: null,
        gateway: 'warning',
        gateway_conversion: null
    },
    {
        id: 'always_on',
        type: 'number',
        unit: '',
        role: '',
        wunderground: null,
        ecowitt: null,
        gateway: 'always_on',
        gateway_conversion: null
    },
    {
        id: 'val_type',
        type: 'number',
        unit: '',
        role: '',
        states: {
            0: 'SECONDS',
            1: 'MINUTES',
            2: 'HOURS',
            3: 'VOLUME (L)'
        },
        wunderground: null,
        ecowitt: null,
        gateway: 'val_type',
        gateway_conversion: null
    },
    {
        id: 'val',
        type: 'number',
        unit: '',
        role: '',
        wunderground: null,
        ecowitt: null,
        gateway: 'val',
        gateway_conversion: null
    },
    {
        id: 'run_time',
        type: 'number',
        unit: 's',
        role: '',
        wunderground: null,
        ecowitt: null,
        gateway: 'run_time',
        gateway_conversion: null
    },
    {
        id: 'wfc01batt',
        type: 'number',
        min: 0,
        max: 5,
        unit: '',
        role: '',
        wunderground: null,
        ecowitt: null,
        gateway: 'wfc01batt',
        gateway_conversion: null
    },
    {
        id: 'rssi',
        type: 'number',
        unit: '',
        role: '',
        wunderground: null,
        ecowitt: null,
        gateway: 'rssi',
        gateway_conversion: null
    },
    {
        id: 'gw_rssi',
        type: 'number',
        unit: 'dbm',
        role: '',
        wunderground: null,
        ecowitt: null,
        gateway: 'gw_rssi',
        gateway_conversion: null
    },
    {
        id: 'timeutc',
        type: 'string',
        unit: '',
        role: 'value.time',
        wunderground: null,
        ecowitt: null,
        gateway: 'timeutc',
        gateway_conversion: null
    },
    {
        id: 'publish_time',
        type: 'string',
        unit: '',
        role: 'value.time',
        wunderground: null,
        ecowitt: null,
        gateway: 'publish_time',
        gateway_conversion: null
    },
    {
        id: 'water_action',
        type: 'number',
        value_list: [
            'IDLE RUN',
            'BUTTON RUN',
            'BUTTON STOP',
            'QUICK RUN',
            'SMART RUN',
            'SMART STOP',
            'PLAN RUN',
            '',
            '',
            '',
            'SOME OTHER'
        ],
        unit: '',
        role: '',
        wunderground: null,
        ecowitt: null,
        gateway: 'water_action',
        gateway_conversion: null
    },
    {
        id: 'plan_status',
        type: 'number',
        unit: '',
        role: '',
        wunderground: null,
        ecowitt: null,
        gateway: 'plan_status',
        gateway_conversion: null
    },
    {
        id: 'capacity',
        type: 'number',
        unit: '',
        role: '',
        wunderground: null,
        ecowitt: null,
        gateway: 'capacity',
        gateway_conversion: null
    } ,
    {
        id: 'water_total',
        type: 'number',
        unit: 'L',
        role: '',
        wunderground: null,
        ecowitt: null,
        gateway: 'water_total',
        gateway_conversion: null
    },
    {
        id: 'happen_water',
        type: 'number',
        unit: 'L',
        role: '',
        wunderground: null,
        ecowitt: null,
        gateway: 'happen_water',
        gateway_conversion: null
    },
    {
        id: 'flow_velocity',
        type: 'number',
        unit: 'L/min',
        role: '',
        wunderground: null,
        ecowitt: null,
        gateway: 'flow_velocity',
        gateway_conversion: null
    },
    {
        id: 'water_temp',
        type: 'number',
        role: 'value.temperature',
        min: -40,
        max: 60,
        unit: '°C',
        wunderground: null,
        ecowitt: null,
        gateway: 'water_temp',
        gateway_conversion: null
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
            .uint32('totalrainin').seek(1)
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
            .int16('indoortemp_time').seek(1)
            .int16('outdoortemp')
            .int16('outdoortemp_time').seek(1)
            .int16('dewpointtemp')
            .int16('dewpointtemp_time').seek(1)
            .int16('windchilltemp')
            .int16('windchilltemp_time').seek(1)
            .uint8('indoorhumidity')
            .int16('indoorhumidity_time').seek(1)
            .uint8('outdoorhumidity')
            .int16('outdoorhumidity_time').seek(1)
            .uint16('pressureabs')
            .int16('pressureabs_time').seek(1)
            .uint16('pressurerel')
            .int16('pressurerel_time').seek(1)
            .uint16('windspeed')
            .int16('windspeed_time').seek(1)
            .uint16('windgustspeed')
            .int16('windgustspeed_time').seek(1)
            .uint32('dailyrain')
            .int16('dailyrain_time').seek(1)
            .uint32('solarradiation')
            .int16('solarradiation_time').seek(1)
            .uint16('UVraw')
            .int16('UVraw_time').seek(1)
            .uint8('uvi')
            .int16('uvi_time')
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
            .int16('indoortemp_time').seek(1)
            .int16('outdoortemp')
            .int16('outdoortemp_time').seek(1)
            .int16('dewpointtemp')
            .int16('dewpointtemp_time').seek(1)
            .int16('windchilltemp')
            .int16('windchilltemp_time').seek(1)
            .uint8('indoorhumidity')
            .int16('indoorhumidity_time').seek(1)
            .uint8('outdoorhumidity')
            .int16('outdoorhumidity_time').seek(1)
            .uint16('pressureabs')
            .int16('pressureabs_time').seek(1)
            .uint16('pressurerl')
            .int16('pressurerel_time').seek(1)
    },
];

exports.COMMANDS = COMMANDS;

