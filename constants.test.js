const { expect } = require('chai');
const { DATAFIELDS } = require('./lib/constants');

describe('Ecowitt listener fields', () => {
    const expectedFields = [
        ['heap', 'heap'],
        ['interval', 'interval'],
        ['last24hrain', 'last24hrainin'],
        ['vpd', 'vpd'],
        ['console_batt', 'console_batt'],
    ];

    for (const [id, payloadField] of expectedFields) {
        it(`maps ${payloadField} to ${id}`, () => {
            const definition = DATAFIELDS.find(field => field.id === id);

            expect(definition).to.exist;
            expect(payloadField).to.match(new RegExp(definition.ecowitt));
        });
    }

    it('converts last24hrainin from inches to millimeters', () => {
        const definition = DATAFIELDS.find(field => field.id === 'last24hrain');

        expect(definition.unit).to.equal('mm');
        expect(definition.listener_conversion).to.equal('roundTo(x * 25.4, 1)');
    });

    it('converts VPD from inHg to hPa', () => {
        const definition = DATAFIELDS.find(field => field.id === 'vpd');

        expect(definition.unit).to.equal('hPa');
        expect(definition.listener_conversion).to.equal('roundTo(x * 33.86, 1)');
    });

    it('treats the console battery value as voltage', () => {
        const definition = DATAFIELDS.find(field => field.id === 'console_batt');

        expect(definition.unit).to.equal('V');
        expect(definition.role).to.equal('value.voltage');
    });
});
