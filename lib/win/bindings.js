const { EventEmitter } = require('events');
const { inherits } = require('util');
const binding = require('node-gyp-build')(__dirname);

const { NobleWinrt } = binding;

inherits(NobleWinrt, EventEmitter);

module.exports = NobleWinrt;
