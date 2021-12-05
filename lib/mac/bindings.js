const { EventEmitter } = require('events');
const { inherits } = require('util');
const binding = require('node-gyp-build')(__dirname);

const { NobleMac } = binding;

inherits(NobleMac, EventEmitter);

module.exports = NobleMac;
