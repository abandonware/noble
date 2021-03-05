const should = require('should');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const fakeOs = {};
const { assert } = sinon;
const Signaling = proxyquire('../../../lib/hci-socket/signaling', { os: fakeOs });

describe('hci-socket signaling', () => {
  let signaling;

  const handle = 'handle';
  const aclStream = {
    on: sinon.spy(),
    removeListener: sinon.spy(),
    write: sinon.spy()
  };

  beforeEach(() => {
    signaling = new Signaling(handle, aclStream);
  });

  afterEach(() => {
    sinon.reset();
  });

  it('construct', () => {
    assert.callCount(aclStream.on, 2);
    assert.calledWithMatch(aclStream.on, 'data', sinon.match.func);
    assert.calledWithMatch(aclStream.on, 'end', sinon.match.func);

    should(signaling._handle).equal(handle);
    should(signaling._aclStream).equal(aclStream);
  });

  describe('onAclStreamData', () => {
    beforeEach(() => {
      signaling.processConnectionParameterUpdateRequest = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should do nothing as not SIGNALING_CID', () => {
      signaling.onAclStreamData(0, 'data');
      assert.notCalled(signaling.processConnectionParameterUpdateRequest);
    });

    it('should do nothing as not CONNECTION_PARAMETER_UPDATE_REQUEST', () => {
      const data = Buffer.from([0, 1, 2, 3, 4]);
      signaling.onAclStreamData(5, data);
      assert.notCalled(signaling.processConnectionParameterUpdateRequest);
    });

    it('should do nothing processConnectionParameterUpdateRequest', () => {
      const data = Buffer.from([18, 1, 2, 3, 4, 5]);
      signaling.onAclStreamData(5, data);
      assert.calledOnceWithExactly(signaling.processConnectionParameterUpdateRequest, 1, Buffer.from([4, 5]));
    });
  });

  it('onAclStreamEnd', () => {
    signaling.onAclStreamEnd();

    assert.callCount(aclStream.removeListener, 2);
    assert.calledWithMatch(aclStream.removeListener, 'data', sinon.match.func);
    assert.calledWithMatch(aclStream.removeListener, 'end', sinon.match.func);
  });

  describe('processConnectionParameterUpdateRequest', () => {
    it('should not write on linux', () => {
      fakeOs.platform = sinon.fake.returns('linux');
      const callback = sinon.spy();

      signaling.on('connectionParameterUpdateRequest', callback);
      signaling.processConnectionParameterUpdateRequest(1, Buffer.from([1, 0, 2, 0, 3, 0, 4, 0]));

      assert.notCalled(callback);
      assert.notCalled(aclStream.write);
    });

    it('should write on !linux', () => {
      fakeOs.platform = sinon.fake.returns('!linux');
      const callback = sinon.spy();

      signaling.on('connectionParameterUpdateRequest', callback);
      signaling.processConnectionParameterUpdateRequest(1, Buffer.from([1, 0, 2, 0, 3, 0, 4, 0]));

      assert.calledOnceWithExactly(callback, handle, 1.25, 2.5, 3, 40);
      assert.calledOnceWithExactly(aclStream.write, 5, Buffer.from([0x13, 0x01, 0x02, 0x00, 0x00, 0x00]));
    });
  });
});
