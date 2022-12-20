module.exports = function (options) {
  const Noble = require('./lib/noble');
  const bindings = require('./lib/resolve-bindings')(options);

  return new Noble(bindings);
};
