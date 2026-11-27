'use strict';

const { expect } = require('chai');
const sinon = require('sinon');
const proxyquire = require('proxyquire');
const Parser = require('expr-eval').Parser;

const { PROT_WU, PROT_EW, DATAFIELDS, COMMANDS } = require('./lib/constants');
const Listener = require('./lib/listener');

function createMockAdapter(configOverrides = {}) {
    return {
        config: {
            unit_rain: 'mm',
            unit_temperature: '°C',
            unit_pressure: 'hPa',
            unit_windspeed: 'km/h',
            unit_solar: 'lx',
            unit_uv: '',
            ...configOverrides,
        },
        log: {
            debug: sinon.stub(),
            info: sinon.stub(),
            warn: sinon.stub(),
            error: sinon.stub(),
        },
        on: sinon.stub(),
        setInterval: sinon.stub(),
        clearInterval: sinon.stub(),
        setStates: sinon.stub(),
        verify_datapoint: sinon.stub().resolves(),
        getObject: sinon.stub(),
        setObjectNotExists: sinon.stub(),
        setStateAsync: sinon.stub().resolves(),
    };
}

describe('ioBroker.sainlogic', () => {
    afterEach(() => {
        sinon.restore();
    });

    describe('constants integrity', () => {
        it('maps every parsed COMMANDS field to a DATAFIELDS scheduler entry', () => {
            const schedulerFields = new Set(DATAFIELDS.filter(df => df.scheduler).map(df => df.scheduler));
            const missing = [];

            for (const cmd of COMMANDS) {
                if (!cmd.configurable || !cmd.parser) {
                    continue;
                }
                let node = cmd.parser;
                while (node) {
                    if (node.varName && !schedulerFields.has(node.varName)) {
                        missing.push(`${cmd.name}.${node.varName}`);
                    }
                    node = node.next;
                }
            }

            expect(missing).to.deep.equal([]);
        });

        it('has valid regexes for wunderground and ecowitt fields', () => {
            for (const df of DATAFIELDS) {
                if (df.wunderground) {
                    expect(() => new RegExp(df.wunderground)).to.not.throw();
                }
                if (df.ecowitt) {
                    expect(() => new RegExp(df.ecowitt)).to.not.throw();
                }
            }
        });

        it('uses correct units for depth_ch (mm) and ldsbatt (V)', () => {
            const depth = DATAFIELDS.find(df => df.id === 'depth_ch');
            const ldsbatt = DATAFIELDS.find(df => df.id === 'ldsbatt');

            expect(depth.unit).to.equal('mm');
            expect(ldsbatt.unit).to.equal('V');
            expect(ldsbatt.role).to.equal('value.voltage');
        });

        it('converts rain accurately between inches and mm', () => {
            const parser = new Parser();
            const dailyrain = DATAFIELDS.find(df => df.id === 'dailyrain');
            const toMm = parser.parse(dailyrain.listener_conversion);
            const inUnit = dailyrain.units.find(u => u.display_name === 'in');
            const toIn = parser.parse(inUnit.display_conversion);
            const backToMm = parser.parse(inUnit.main_unit_conversion);

            expect(toMm.evaluate({ x: 1 })).to.equal(25.4);
            expect(toIn.evaluate({ x: 25.4 })).to.equal(1);
            expect(toIn.evaluate({ x: 1 })).to.equal(0.04);
            expect(backToMm.evaluate({ x: 1 })).to.equal(25.4);
        });
    });

    describe('Listener', () => {
        it('extracts and converts Wunderground values including multi-digit channels', () => {
            const adapter = createMockAdapter();
            const listener = new Listener('', 45000, '/update', PROT_WU, '', adapter);

            const extracted = listener.extract_values({
                tempf: '68',
                temp2f: '50',
                dailyrainin: '1',
                soilmoisture12: '42',
                soilad12: '210',
                wn20batt: '1.5',
                last_listener_update: '{"tempf":"68"}',
            });

            expect(extracted['weather.current.outdoortemp']).to.equal(20);
            expect(extracted['weather.current.2.outdoortemp']).to.equal(10);
            expect(extracted['weather.current.dailyrain']).to.equal(25.4);
            expect(extracted['weather.current.12.soilmoisture']).to.equal('42');
            expect(extracted['weather.current.12.soilad']).to.equal('210');
            expect(extracted['weather.info.wn20batt']).to.equal('1.5');
            expect(extracted['info.last_listener_update']).to.equal('{"tempf":"68"}');
        });

        it('extracts Ecowitt values including WH52 soil EC fields', () => {
            const adapter = createMockAdapter();
            const listener = new Listener('', 45000, '/data/report', PROT_EW, '', adapter);

            const extracted = listener.extract_values({
                stationtype: 'GW1100A_V2.2.3',
                tempinf: '77',
                humidityin: '55',
                soil_ec_temp3: '59',
                soil_ec3: '320',
                soil_ec_hum3: '38',
            });

            expect(extracted['info.softwaretype']).to.equal('GW1100A_V2.2.3');
            expect(extracted['weather.current.indoortemp']).to.equal(25);
            expect(extracted['weather.current.indoorhumidity']).to.equal('55');
            expect(extracted['weather.current.3.soil_ec_temp']).to.equal(15);
            expect(extracted['weather.current.3.soil_ec']).to.equal('320');
            expect(extracted['weather.current.3.soil_ec_hum']).to.equal('38');
        });

        it('forwards without leaking last_listener_update and handles invalid forward URLs safely', () => {
            const gotStub = sinon.stub().resolves({ requestUrl: 'https://example.com', body: 'ok' });
            const ProxyListener = proxyquire('./lib/listener', {
                '@esm2cjs/got': { default: gotStub },
            });
            const adapter = createMockAdapter();

            const listener = new ProxyListener('', 45000, '/update', PROT_WU, 'https://example.com/update?', adapter);
            const params = { tempf: '68' };
            listener.forwardRequest({ searchParams: params, method: 'GET' });

            expect(gotStub).to.have.been.calledOnce;
            expect(gotStub.firstCall.args[1].searchParams).to.not.have.property('last_listener_update');

            const badListener = new ProxyListener('', 45000, '/update', PROT_WU, 'not a valid url', adapter);
            expect(() => badListener.forwardRequest({ searchParams: params, method: 'GET' })).to.not.throw();
            expect(adapter.log.error).to.have.been.calledOnce;
        });
    });

    describe('Scheduler', () => {
        it('does not invoke Gateway when gw_address is undefined or empty', () => {
            const gatewaySpy = sinon.spy();
            const ProxyScheduler = proxyquire('./lib/scheduler', {
                './gateway': gatewaySpy,
            });
            const adapter = createMockAdapter();

            const scheduler = new ProxyScheduler(
                {
                    ws_address: '',
                    ws_port: 45000,
                    ws_freq: 15,
                    // gw_address intentionally omitted (undefined)
                },
                adapter,
            );

            scheduler.getUpdateFromWS();
            expect(gatewaySpy).to.not.have.been.called;
        });

        it('handles empty activeCalls cleanly in client_connect', () => {
            const Scheduler = require('./lib/scheduler');
            const adapter = createMockAdapter();
            const scheduler = new Scheduler({ ws_address: '', ws_port: 45000, ws_freq: 15 }, adapter);
            scheduler.fwClient.destroy = sinon.stub();

            expect(() => scheduler.client_connect()).to.not.throw();
            expect(adapter.log.warn).to.have.been.calledOnce;
            expect(scheduler.fwClient.destroy).to.have.been.calledOnce;
        });

        it('converts scheduler timestamps and scaled values in updateIODataStore', () => {
            const Scheduler = require('./lib/scheduler');
            const adapter = createMockAdapter();
            const scheduler = new Scheduler({ ws_address: '', ws_port: 45000, ws_freq: 15 }, adapter);

            scheduler.updateIODataStore('weather.maxvalues.daily', {
                outdoortemp: 235,
                uvi_time: (14 << 8) | 5,
            });

            expect(adapter.setStates).to.have.been.calledOnce;
            const values = adapter.setStates.firstCall.args[1];
            expect(values['weather.maxvalues.daily.outdoortemp']).to.equal(23.5);
            expect(values['weather.maxvalues.daily.uvi_time']).to.equal('14:05');
        });
    });

    describe('Gateway', () => {
        it('does not attach stateChange listeners inside run() and passes converted values', () => {
            const gotStub = sinon.stub().rejects(new Error('offline'));
            const ProxyGateway = proxyquire('./lib/gateway', {
                '@esm2cjs/got': { default: gotStub },
            });
            const adapter = createMockAdapter();
            const gw = new ProxyGateway('192.168.1.50', adapter);

            gw.run();
            expect(adapter.on).to.not.have.been.called;

            const fakeField = {
                id: 'water_temp',
                type: 'number',
                gateway: 'water_temp',
                gateway_conversion: 'x + 1',
            };
            const origFind = gw.findDataFieldByID.bind(gw);
            sinon.stub(gw, 'findDataFieldByID').callsFake(id => (id === 'water_temp' ? fakeField : origFind(id)));

            gw.updateIODataStore('gateway.1', [{ water_temp: 19 }]);
            expect(adapter.verify_datapoint).to.have.been.calledOnce;
            expect(adapter.verify_datapoint.firstCall.args[4]).to.equal(20);
        });
    });

    describe('Sainlogic adapter helpers', () => {
        function createSainlogicInstance(configOverrides = {}) {
            const mock = createMockAdapter(configOverrides);
            class MockAdapter {
                constructor(options) {
                    this.config = mock.config;
                    this.log = mock.log;
                    Object.assign(this, options);
                }
                on() {}
            }
            const createAdapter = proxyquire.noCallThru().load('./main', {
                '@iobroker/adapter-core': { Adapter: MockAdapter },
            });
            return createAdapter({ name: 'sainlogic' });
        }

        it('skips unknown attributes in setStates without throwing and computes windheading', () => {
            const adapter = createSainlogicInstance();
            adapter.setStateAsync = sinon.stub().resolves();
            const verifyStub = sinon.stub(adapter, 'verify_datapoint').resolves();

            expect(() =>
                adapter.setStates(new Date('2026-01-01T00:00:00Z'), {
                    'weather.current.unknown_field': 123,
                    'weather.current.winddir': 90,
                }),
            ).to.not.throw();

            expect(adapter.log.warn).to.have.been.calledOnce;
            expect(verifyStub).to.have.been.calledTwice;
            expect(verifyStub.firstCall.args[0]).to.equal('weather.current.winddir');
            expect(verifyStub.secondCall.args[0]).to.equal('weather.current.windheading');
            expect(verifyStub.secondCall.args[4]).to.equal('O');
        });

        it('converts display units accurately in toDisplayUnit', () => {
            const adapter = createSainlogicInstance({
                unit_temperature: '°F',
                unit_rain: 'in',
                unit_pressure: 'inHg',
                unit_windspeed: 'mph',
                unit_solar: 'W/m2',
            });

            const tempDef = DATAFIELDS.find(df => df.id === 'outdoortemp');
            const rainDef = DATAFIELDS.find(df => df.id === 'dailyrain');
            const pressDef = DATAFIELDS.find(df => df.id === 'pressureabs');
            const windDef = DATAFIELDS.find(df => df.id === 'windspeed');
            const solarDef = DATAFIELDS.find(df => df.id === 'solarradiation');

            expect(adapter.toDisplayUnit(tempDef, 20)).to.equal(68);
            expect(adapter.toDisplayUnit(rainDef, 25.4)).to.equal(1);
            expect(adapter.toDisplayUnit(pressDef, 1000)).to.equal(29.5);
            expect(adapter.toDisplayUnit(windDef, 16.09)).to.equal(10);
            expect(adapter.toDisplayUnit(solarDef, 126.7)).to.equal(1);
        });

        it('resets the write flag of formerly writable datapoints', async () => {
            const adapter = createSainlogicInstance();
            adapter.getObjectAsync = sinon
                .stub()
                .resolves({ _id: 'gateway.1.water_action', type: 'state', common: { unit: '', write: true } });
            adapter.extendObjectAsync = sinon.stub().resolves();
            adapter.setStateAsync = sinon.stub().resolves();

            const waterActionDef = DATAFIELDS.find(df => df.id === 'water_action');
            await adapter.verify_datapoint('gateway.1.water_action', adapter, waterActionDef, 'water_action', 1);

            expect(adapter.extendObjectAsync).to.have.been.calledOnceWith('gateway.1.water_action', {
                common: { write: false },
            });
        });

        it('migrates temperature units on indexed channels', async () => {
            const adapter = createSainlogicInstance({ unit_temperature: '°F' });
            adapter.getAdapterObjectsAsync = sinon.stub().resolves({
                'sainlogic.0.weather.current.1.outdoortemp': {
                    _id: 'sainlogic.0.weather.current.1.outdoortemp',
                    type: 'state',
                    common: { unit: '°C' },
                },
                'sainlogic.0.weather.current': { _id: 'sainlogic.0.weather.current', type: 'channel', common: {} },
            });
            const checkUnitStub = sinon.stub(adapter, 'checkUnit').resolves();

            await adapter.migrateTemperatureDatapoints();

            expect(checkUnitStub).to.have.been.calledOnce;
            expect(checkUnitStub.firstCall.args[1]._id).to.equal('sainlogic.0.weather.current.1.outdoortemp');
        });

        it('caches known datapoints and only looks them up once', async () => {
            const adapter = createSainlogicInstance();
            adapter.getObjectAsync = sinon
                .stub()
                .resolves({ _id: 'gateway.1.water_action', type: 'state', common: { unit: '' } });
            adapter.setObjectNotExistsAsync = sinon.stub().resolves();
            adapter.setStateAsync = sinon.stub().resolves();

            const waterActionDef = DATAFIELDS.find(df => df.id === 'water_action');

            await adapter.verify_datapoint('gateway.1.water_action', adapter, waterActionDef, 'water_action', 1);
            await adapter.verify_datapoint('gateway.1.water_action', adapter, waterActionDef, 'water_action', 2);

            expect(adapter.getObjectAsync).to.have.been.calledOnce;
            expect(adapter.setStateAsync).to.have.been.calledTwice;
        });

        it('updates unit metadata in verify_datapoint without overwriting new value with old state', async () => {
            const adapter = createSainlogicInstance({ unit_temperature: '°F' });
            adapter.getObjectAsync = sinon.stub().resolves({
                _id: 'weather.current.outdoortemp',
                type: 'state',
                common: { unit: '°C' },
            });
            adapter.extendObjectAsync = sinon.stub().resolves();
            adapter.getStateAsync = sinon.stub().resolves({ val: 10, ack: true });
            adapter.setStateAsync = sinon.stub().resolves();

            const tempDef = DATAFIELDS.find(df => df.id === 'outdoortemp');
            await adapter.verify_datapoint('weather.current.outdoortemp', adapter, tempDef, 'Outdoor temperature', 68);

            expect(adapter.extendObjectAsync).to.have.been.calledOnce;
            expect(adapter.getStateAsync).to.not.have.been.called;
            expect(adapter.setStateAsync).to.have.been.calledOnceWith('weather.current.outdoortemp', {
                val: 68,
                ack: true,
            });
        });
    });

    describe('P1 hardening', () => {
        it('normalizes listenOnAllPorts and ignores unanchored suffixes in Listener', () => {
            const adapter = createMockAdapter();
            const listener = new Listener('listenOnAllPorts', 45000, '/update', PROT_WU, '', adapter);
            expect(listener.address).to.equal('');

            const extracted = listener.extract_values({
                soilmoisture12extra: '99',
                soilmoisture12: '45',
            });
            expect(extracted).to.not.have.property('weather.current.12extra.soilmoisture');
            expect(extracted['weather.current.12.soilmoisture']).to.equal('45');
        });

        it('buffers fragmented TCP chunks in Scheduler.parse_response', () => {
            const Scheduler = require('./lib/scheduler');
            const adapter = createMockAdapter();
            const scheduler = new Scheduler(
                { ws_address: '127.0.0.1', ws_port: 45000, ws_freq: 15, ws_getfirmware: true },
                adapter,
            );
            scheduler.fwClient.destroy = sinon.stub();

            // Firmware response: 2 header bytes, cmd=80 (0x50), 2 bytes, subcmd=69 (0x45) + 17-char string
            // Note: COMMANDS[1].parser seeks 5 bytes then reads 17-char utf8 string (total 22 bytes)
            const frame = Buffer.concat([
                Buffer.from([0xff, 0xff, 80, 0x00, 0x00]),
                Buffer.from('EasyWeatherV1.6.4', 'utf8'),
            ]);
            // Put subcommand=69 at index 5? COMMANDS[0] seeks 2, reads uint8(cmd), seeks 2, reads uint8(subcmd) -> index 5
            frame[5] = 69;

            scheduler.parse_response(frame.subarray(0, 10));
            expect(adapter.setStates).to.not.have.been.called;

            scheduler.parse_response(frame.subarray(10));
            expect(adapter.setStates).to.have.been.calledOnce;
            expect(adapter.setStates.firstCall.args[1]['info.softwaretype']).to.equal('EasyWeatherV1.6.4');
        });

        it('restricts disallowed operators in evaluateExpression', () => {
            const { evaluateExpression } = require('./lib/expressions');
            expect(evaluateExpression('roundTo((x * (9/5)) + 32, 1)', { x: 20 })).to.equal(68);
            expect(() => evaluateExpression('x = 1', { x: 2 })).to.throw();
        });
    });
});
