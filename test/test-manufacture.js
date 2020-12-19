require('should');
const sinon = require('sinon');

const tryRequire = modulePath => {
  try {
    return require(modulePath);
  } catch (e) {
    console.error(`ERROR:\tCould not load manufacturer list from "${modulePath}".`);
    console.error(`\tPlease see "${__dirname}/../scripts/manufactures/README.md" for instructions.`);
    return false;
  }
};

const Manufacture = require('../lib/manufacture');

const manufacturersCodesHex = tryRequire('../lib/manufactures-hex.json');
const manufacturersCodesDec = tryRequire('../lib/manufactures-dec.json');

const GARMIN_MAN_NAME = 'Garmin International, Inc.';
const GARMIN_MAN_HEX = '87 00 0d 9c';
const APPLE_MAN_NAME = 'Apple, Inc.';
const APPLE_MAN_HEX = '4c 00 10 07 13 1f 79 82 1c 76 18';

describe('Manufacture', function () {
  const mockDataGarmin = Buffer.from(GARMIN_MAN_HEX.replace(/\s+/g, ''), 'hex');
  const mockDataApple = Buffer.from(APPLE_MAN_HEX.replace(/\s+/g, ''), 'hex');
  let mockNoble = null;

  let manufactureGarmin = null;
  let manufactureApple = null;

  beforeEach(function () {
    if (manufacturersCodesDec === false || manufacturersCodesHex === false) {
      this.skip();
    }

    mockNoble = {
      readValue: sinon.spy(),
      writeValue: sinon.spy()
    };

    manufactureGarmin = new Manufacture(mockNoble, mockDataGarmin);
    manufactureApple = new Manufacture(mockNoble, mockDataApple);
  });

  afterEach(function () {
    manufactureGarmin = null;
    manufactureApple = null;
  });

  it('should have data', function () {
    manufactureGarmin.data.should.equal(mockDataGarmin);
    manufactureApple.data.should.equal(mockDataApple);
  });

  it(`should have a name "${GARMIN_MAN_NAME}" from data`, function () {
    manufactureGarmin = new Manufacture(mockNoble, mockDataGarmin);
    manufactureGarmin.name.should.equal(GARMIN_MAN_NAME);
    Manufacture.nameFromDec(mockDataGarmin[0]).should.equal(GARMIN_MAN_NAME);
  });

  it(`should have a name "${APPLE_MAN_NAME}" from data`, function () {
    manufactureApple = new Manufacture(mockNoble, mockDataApple);
    manufactureApple.name.should.equal(APPLE_MAN_NAME);
    Manufacture.nameFromDec(mockDataApple[0]).should.equal(APPLE_MAN_NAME);
  });
});
