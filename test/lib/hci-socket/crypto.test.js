const should = require('should');
const sinon = require('sinon');
const cryptoLib = require('crypto');

const { assert } = sinon;

const crypto = require('../../../lib/hci-socket/crypto');

describe('hci-socket crypto', () => {
  beforeEach(() => {
    sinon.spy(cryptoLib, 'randomBytes');
    sinon.spy(cryptoLib, 'createCipheriv');
  });

  afterEach(() => {
    cryptoLib.randomBytes.restore();
    cryptoLib.createCipheriv.restore();
    sinon.reset();
  });

  it('should generate a random on 16 bytes', () => {
    const result1 = crypto.r();
    const result2 = crypto.r();

    should(result1).have.size(16);
    should(result2).have.size(16);
    should(result1).not.equal(result2);

    assert.calledTwice(cryptoLib.randomBytes);
    assert.calledWithExactly(cryptoLib.randomBytes, 16);
  });

  it('should compute s1', () => {
    const key = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
    const r1 = Buffer.from([29, 30, 31, 32, 33, 34, 35, 36, 4, 5, 6]);
    const r2 = Buffer.from([21, 22, 23, 24, 25, 26, 27, 28, 1, 2, 3]);

    const result = crypto.s1(key, r1, r2);

    const expectedResult = Buffer.from([0xab, 0xa0, 0x44, 0x06, 0x3b, 0xdc, 0x1c, 0x5d, 0x3c, 0x68, 0x0e, 0xdb, 0xc7, 0x9b, 0xe7, 0xc3]);
    should(result).deepEqual(expectedResult);
  });

  it('should compute e', () => {
    const key = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
    const data = [21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36];
    const swapKey = [16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];

    const result = crypto.e(key, data);

    const expectedResult = Buffer.from([0xab, 0xa0, 0x44, 0x06, 0x3b, 0xdc, 0x1c, 0x5d, 0x3c, 0x68, 0x0e, 0xdb, 0xc7, 0x9b, 0xe7, 0xc3]);
    should(result).deepEqual(expectedResult);
    assert.calledOnceWithMatch(cryptoLib.createCipheriv, 'aes-128-ecb', sinon.match(Buffer.from(swapKey)), '');
  });
});
