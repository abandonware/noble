const should = require('should');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const crypto = {};
const { assert } = sinon;
const Smp = proxyquire('../../../lib/hci-socket/smp', { './crypto': crypto });

describe('hci-socket smp', () => {
  let smp;

  const aclStream = {};
  const localAddressType = 'public';
  const localAddress = 'aa:bb:cc:dd:ee:ff';
  const remoteAddressType = 'random';
  const remoteAddress = '00:11:22:33:44:55';

  beforeEach(() => {
    aclStream.on = sinon.spy();
    aclStream.removeListener = sinon.spy();
    aclStream.write = sinon.spy();

    smp = new Smp(aclStream, localAddressType, localAddress, remoteAddressType, remoteAddress);
  });

  afterEach(() => {
    sinon.reset();
  });

  it('construct 1', () => {
    assert.callCount(aclStream.on, 2);
    assert.calledWithMatch(aclStream.on, 'data', sinon.match.func);
    assert.calledWithMatch(aclStream.on, 'end', sinon.match.func);

    should(smp._iat).deepEqual(Buffer.from([0x00]));
    should(smp._ia).deepEqual(Buffer.from([0xff, 0xee, 0xdd, 0xcc, 0xbb, 0xaa]));
    should(smp._rat).deepEqual(Buffer.from([0x01]));
    should(smp._ra).deepEqual(Buffer.from([0x55, 0x44, 0x33, 0x22, 0x11, 0x00]));
  });

  it('construct 2', () => {
    sinon.reset(aclStream);
    const smp = new Smp(aclStream, remoteAddressType, remoteAddress, localAddressType, localAddress);

    assert.callCount(aclStream.on, 2);
    assert.calledWithMatch(aclStream.on, 'data', sinon.match.func);
    assert.calledWithMatch(aclStream.on, 'end', sinon.match.func);

    should(smp._iat).deepEqual(Buffer.from([0x01]));
    should(smp._ia).deepEqual(Buffer.from([0x55, 0x44, 0x33, 0x22, 0x11, 0x00]));
    should(smp._rat).deepEqual(Buffer.from([0x00]));
    should(smp._ra).deepEqual(Buffer.from([0xff, 0xee, 0xdd, 0xcc, 0xbb, 0xaa]));
  });

  it('should write sendPairingRequest', () => {
    smp.write = sinon.spy();

    smp.sendPairingRequest();

    assert.calledOnceWithExactly(smp.write, Buffer.from([0x01, 0x03, 0x00, 0x01, 0x10, 0x00, 0x01]));
  });

  describe('onAclStreamData', () => {
    beforeEach(() => {
      smp.handlePairingResponse = sinon.spy();
      smp.handlePairingConfirm = sinon.spy();
      smp.handlePairingRandom = sinon.spy();
      smp.handlePairingFailed = sinon.spy();
      smp.handleEncryptInfo = sinon.spy();
      smp.handleMasterIdent = sinon.spy();
    });

    it('should do nothing with !SMP_CID', () => {
      smp.onAclStreamData(0);

      assert.notCalled(smp.handlePairingResponse);
      assert.notCalled(smp.handlePairingConfirm);
      assert.notCalled(smp.handlePairingRandom);
      assert.notCalled(smp.handlePairingFailed);
      assert.notCalled(smp.handleEncryptInfo);
      assert.notCalled(smp.handleMasterIdent);
    });

    it('should handlePairingResponse', () => {
      const data = Buffer.from([0x02, 0x33, 0x44]);
      smp.onAclStreamData(6, data);

      assert.calledOnceWithExactly(smp.handlePairingResponse, data);
      assert.notCalled(smp.handlePairingConfirm);
      assert.notCalled(smp.handlePairingRandom);
      assert.notCalled(smp.handlePairingFailed);
      assert.notCalled(smp.handleEncryptInfo);
      assert.notCalled(smp.handleMasterIdent);
    });

    it('should handlePairingConfirm', () => {
      const data = Buffer.from([0x03, 0x33, 0x44]);
      smp.onAclStreamData(6, data);

      assert.notCalled(smp.handlePairingResponse);
      assert.calledOnceWithExactly(smp.handlePairingConfirm, data);
      assert.notCalled(smp.handlePairingRandom);
      assert.notCalled(smp.handlePairingFailed);
      assert.notCalled(smp.handleEncryptInfo);
      assert.notCalled(smp.handleMasterIdent);
    });

    it('should handlePairingRandom', () => {
      const data = Buffer.from([0x04, 0x33, 0x44]);
      smp.onAclStreamData(6, data);

      assert.notCalled(smp.handlePairingResponse);
      assert.notCalled(smp.handlePairingConfirm);
      assert.calledOnceWithExactly(smp.handlePairingRandom, data);
      assert.notCalled(smp.handlePairingFailed);
      assert.notCalled(smp.handleEncryptInfo);
      assert.notCalled(smp.handleMasterIdent);
    });

    it('should handlePairingFailed', () => {
      const data = Buffer.from([0x05, 0x33, 0x44]);
      smp.onAclStreamData(6, data);

      assert.notCalled(smp.handlePairingResponse);
      assert.notCalled(smp.handlePairingConfirm);
      assert.notCalled(smp.handlePairingRandom);
      assert.calledOnceWithExactly(smp.handlePairingFailed, data);
      assert.notCalled(smp.handleEncryptInfo);
      assert.notCalled(smp.handleMasterIdent);
    });

    it('should handleEncryptInfo', () => {
      const data = Buffer.from([0x06, 0x33, 0x44]);
      smp.onAclStreamData(6, data);

      assert.notCalled(smp.handlePairingResponse);
      assert.notCalled(smp.handlePairingConfirm);
      assert.notCalled(smp.handlePairingRandom);
      assert.notCalled(smp.handlePairingFailed);
      assert.calledOnceWithExactly(smp.handleEncryptInfo, data);
      assert.notCalled(smp.handleMasterIdent);
    });

    it('should handleMasterIdent', () => {
      const data = Buffer.from([0x07, 0x33, 0x44]);
      smp.onAclStreamData(6, data);

      assert.notCalled(smp.handlePairingResponse);
      assert.notCalled(smp.handlePairingConfirm);
      assert.notCalled(smp.handlePairingRandom);
      assert.notCalled(smp.handlePairingFailed);
      assert.notCalled(smp.handleEncryptInfo);
      assert.calledOnceWithExactly(smp.handleMasterIdent, data);
    });

    it('should do nothing on bad code', () => {
      const data = Buffer.from([0x08, 0x33, 0x44]);
      smp.onAclStreamData(6, data);

      assert.notCalled(smp.handlePairingResponse);
      assert.notCalled(smp.handlePairingConfirm);
      assert.notCalled(smp.handlePairingRandom);
      assert.notCalled(smp.handlePairingFailed);
      assert.notCalled(smp.handleEncryptInfo);
      assert.notCalled(smp.handleMasterIdent);
    });
  });

  it('onAclStreamEnd', () => {
    const callback = sinon.spy();
    smp.on('end', callback);
    smp.onAclStreamEnd();

    assert.callCount(aclStream.removeListener, 2);
    assert.calledWithMatch(aclStream.removeListener, 'data', sinon.match.func);
    assert.calledWithMatch(aclStream.removeListener, 'end', sinon.match.func);
    assert.calledOnceWithExactly(callback);
  });

  it('handlePairingResponse', () => {
    smp.write = sinon.spy();
    crypto.r = sinon.spy();
    crypto.c1 = sinon.fake.returns(Buffer.from([0x99]));

    smp.handlePairingResponse('data');

    should(smp._pres).equal('data');

    assert.calledOnceWithExactly(crypto.r);
    assert.calledOnce(crypto.c1);
    assert.calledOnceWithExactly(smp.write, Buffer.from([0x03, 0x99]));
  });

  it('handlePairingConfirm', () => {
    smp.write = sinon.spy();
    smp._r = Buffer.from([0x99]);

    smp.handlePairingConfirm('data');

    should(smp._pcnf).equal('data');

    assert.calledOnceWithExactly(smp.write, Buffer.from([0x04, 0x99]));
  });

  describe('handlePairingRandom', () => {
    it('should emit stk', () => {
      crypto.c1 = sinon.fake.returns(Buffer.from([0x99]));
      crypto.s1 = sinon.fake.returns('stk_answer');

      const data = Buffer.from([0, 1]);
      const callback = sinon.spy();
      const failCallback = sinon.spy();

      smp._pcnf = Buffer.from([3, 153]);
      smp.on('stk', callback);
      smp.on('fail', failCallback);
      smp.handlePairingRandom(data);

      assert.calledOnceWithExactly(callback, 'stk_answer');
      assert.notCalled(failCallback);
    });

    it('should write and emit fail stk', () => {
      crypto.c1 = sinon.fake.returns(Buffer.from([0x99]));
      crypto.s1 = sinon.fake.returns('stk_answer');

      const data = Buffer.from([0, 1]);
      const callback = sinon.spy();
      const failCallback = sinon.spy();

      smp.write = sinon.spy();
      smp._pcnf = Buffer.from([0]);
      smp.on('stk', callback);
      smp.on('fail', failCallback);
      smp.handlePairingRandom(data);

      assert.calledOnceWithExactly(smp.write, Buffer.from([4, 3]));
      assert.notCalled(callback);
      assert.calledOnceWithExactly(failCallback);
    });
  });

  it('should emit fail on handlePairingFailed', () => {
    const callback = sinon.spy();
    smp.on('fail', callback);
    smp.handlePairingFailed();
    assert.calledOnceWithExactly(callback);
  });

  it('should emit ltk on handleEncryptInfo', () => {
    const callback = sinon.spy();
    smp.on('ltk', callback);
    smp.handleEncryptInfo(Buffer.from([0x02, 0x03, 0x04]));
    assert.calledOnceWithExactly(callback, Buffer.from([0x03, 0x04]));
  });

  it('should emit ltk on handleMasterIdent', () => {
    const callback = sinon.spy();
    smp.on('masterIdent', callback);
    smp.handleMasterIdent(Buffer.from([0x02, 0x03, 0x04, 0x05, 0x06]));
    assert.calledOnceWithExactly(callback, Buffer.from([0x03, 0x04]), Buffer.from([0x05, 0x06]));
  });

  it('should write on aclStream', () => {
    smp.write('data');
    assert.calledOnceWithExactly(aclStream.write, 6, 'data');
  });
});
