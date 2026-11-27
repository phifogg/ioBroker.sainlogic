'use strict';

const Parser = require('expr-eval').Parser;

const restrictedParser = new Parser({
    operators: {
        add: true,
        subtract: true,
        multiply: true,
        divide: true,
        power: true,
        remainder: true,
        concatenate: false,
        conditional: false,
        logical: false,
        comparison: false,
        in: false,
        assignment: false,
    },
});

restrictedParser.functions.timestamp_convert = function (timestamp) {
    const hex = `0000${parseInt(timestamp, 10).toString(16)}`.slice(-4);
    const hours = `0${parseInt(hex.substring(0, 2), 16)}`.slice(-2);
    const minutes = `0${parseInt(hex.substring(2), 16)}`.slice(-2);
    return `${hours}:${minutes}`;
};

const compiledCache = new Map();

/**
 * Compiles (and caches) a conversion expression and evaluates it against the given scope.
 *
 * @param {string} formula Conversion expression string
 * @param {Record<string, number | string>} scope Variables passed to the expression
 * @returns {number | string} Evaluated result
 */
function evaluateExpression(formula, scope) {
    let compiled = compiledCache.get(formula);
    if (!compiled) {
        compiled = restrictedParser.parse(formula);
        compiledCache.set(formula, compiled);
    }
    return compiled.evaluate(scope);
}

module.exports = {
    evaluateExpression,
};
