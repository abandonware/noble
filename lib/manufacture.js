const hexValues = require('./manufactures-hex.json');
const decValues = require('./manufactures-dec.json');

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
