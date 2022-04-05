const path = require('path');

const tryRequire = modulePath => {
  try {
    return require(modulePath);
  } catch (e) {
    console.error(`ERROR:\tCould not load manufacturer list from "${modulePath}".`);
    console.error(`\tPlease see "${path.join(__dirname, '..', 'scripts', 'manufactures', 'README.md')}" for instructions.`);
    return {};
  }
};

const hexValues = tryRequire('./manufactures-hex.json');
const decValues = tryRequire('./manufactures-dec.json');

function Manufacture (noble, data) {
  this._noble = noble;

  this.name = null;
  this.data = data;

  try {
    const tmp = JSON.parse(JSON.stringify(data)).data;

    if (Array.isArray(tmp)) {
      this.name = decValues[tmp[0]];
    }
  } catch (e) {
    console.error(e);
  }
}

Manufacture.prototype.toString = function () {
  return JSON.stringify({
    name: this.name,
    data: JSON.parse(JSON.stringify(this.data))
  });
};

Manufacture.nameFromHex = function (hexValue) {
  return hexValues[hexValue] || undefined;
};

Manufacture.nameFromDec = function (decValue) {
  return decValues[decValue] || undefined;
};

module.exports = Manufacture;
