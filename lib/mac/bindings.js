const { EventEmitter } = require('events');
const { inherits } = require('util');
const { resolve } = require('path');
const dir = resolve(__dirname, '..', '..');
const binding = require('node-gyp-build')(dir);

const { NobleMac } = binding;

inherits(NobleMac, EventEmitter);

module.exports = NobleMac;
