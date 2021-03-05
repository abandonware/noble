const proxyquire = require('proxyquire').noCallThru();
const should = require('should');
const sinon = require('sinon');
const { assert, fake, match } = sinon;

describe('hci-socket acl-stream', () => {
  const Smp = sinon.stub();

  const AclStream = proxyquire('../../../lib/hci-socket/acl-stream', {
    './smp': Smp
  });

  beforeEach(() => {
    Smp.prototype.on = fake.resolves(null);
    Smp.prototype.removeListener = fake.resolves(null);
  });

  afterEach(() => {
    sinon.reset();
  });

  it('constructor', () => {
    const hci = fake.resolves();
    const handle = fake.resolves();
    const localAddressType = fake.resolves();
    const localAddress = fake.resolves();
    const remoteAddressType = fake.resolves();
    const remoteAddress = fake.resolves();

    const aclStream = new AclStream(hci, handle, localAddressType, localAddress, remoteAddressType, remoteAddress);

    should(aclStream._hci).eql(hci);
    should(aclStream._handle).eql(handle);

    should(aclStream._smp).instanceOf(Smp);

    assert.calledOnce(Smp);
    assert.calledWith(Smp, aclStream, localAddressType, localAddress, remoteAddressType, remoteAddress);

    assert.calledThrice(aclStream._smp.on);
    assert.calledWith(aclStream._smp.on, 'stk', match.any);
    assert.calledWith(aclStream._smp.on, 'fail', match.any);
    assert.calledWith(aclStream._smp.on, 'end', match.any);
  });

  it('encrypt', () => {
    const hci = fake.resolves();
    const handle = fake.resolves();
    const localAddressType = fake.resolves();
    const localAddress = fake.resolves();
    const remoteAddressType = fake.resolves();
    const remoteAddress = fake.resolves();

    const aclStream = new AclStream(hci, handle, localAddressType, localAddress, remoteAddressType, remoteAddress);

    aclStream._smp.sendPairingRequest = fake.resolves(null);

    aclStream.encrypt();

    assert.calledOnceWithExactly(aclStream._smp.sendPairingRequest);
  });

  it('write', () => {
    const hci = fake.resolves();
    const handle = fake.resolves();
    const localAddressType = fake.resolves();
    const localAddress = fake.resolves();
    const remoteAddressType = fake.resolves();
    const remoteAddress = fake.resolves();

    const aclStream = new AclStream(hci, handle, localAddressType, localAddress, remoteAddressType, remoteAddress);

    aclStream._hci.writeAclDataPkt = fake.resolves(null);

    aclStream.write('cid', 'data');

    assert.calledOnceWithExactly(aclStream._hci.writeAclDataPkt, handle, 'cid', 'data');
  });

  it('push data', () => {
    const hci = fake.resolves();
    const handle = fake.resolves();
    const localAddressType = fake.resolves();
    const localAddress = fake.resolves();
    const remoteAddressType = fake.resolves();
    const remoteAddress = fake.resolves();

    const aclStream = new AclStream(hci, handle, localAddressType, localAddress, remoteAddressType, remoteAddress);

    const eventEmmitted = fake.resolves(null);
    aclStream.on('data', eventEmmitted);

    aclStream.push('cid', 'data');

    assert.calledOnceWithExactly(eventEmmitted, 'cid', 'data');
  });

  it('push no data', () => {
    const hci = fake.resolves();
    const handle = fake.resolves();
    const localAddressType = fake.resolves();
    const localAddress = fake.resolves();
    const remoteAddressType = fake.resolves();
    const remoteAddress = fake.resolves();

    const aclStream = new AclStream(hci, handle, localAddressType, localAddress, remoteAddressType, remoteAddress);

    const eventEmmitted = fake.resolves(null);
    aclStream.on('end', eventEmmitted);

    aclStream.push('cid');

    assert.calledOnceWithExactly(eventEmmitted);
  });

  it('pushEncrypt', () => {
    const hci = fake.resolves();
    const handle = fake.resolves();
    const localAddressType = fake.resolves();
    const localAddress = fake.resolves();
    const remoteAddressType = fake.resolves();
    const remoteAddress = fake.resolves();

    const aclStream = new AclStream(hci, handle, localAddressType, localAddress, remoteAddressType, remoteAddress);

    const eventEmmitted = fake.resolves(null);
    aclStream.on('encrypt', eventEmmitted);

    aclStream.pushEncrypt('cid');

    assert.calledOnceWithExactly(eventEmmitted, 'cid');
  });

  it('onSmpStk', () => {
    const hci = fake.resolves();
    const handle = fake.resolves();
    const localAddressType = fake.resolves();
    const localAddress = fake.resolves();
    const remoteAddressType = fake.resolves();
    const remoteAddress = fake.resolves();

    const aclStream = new AclStream(hci, handle, localAddressType, localAddress, remoteAddressType, remoteAddress);

    aclStream._hci.startLeEncryption = fake.resolves(null);

    aclStream.onSmpStk('stk');

    assert.calledOnceWithExactly(aclStream._hci.startLeEncryption, handle, Buffer.from('0000000000000000', 'hex'), Buffer.from('0000', 'hex'), 'stk');
  });

  it('onSmpFail', () => {
    const hci = fake.resolves();
    const handle = fake.resolves();
    const localAddressType = fake.resolves();
    const localAddress = fake.resolves();
    const remoteAddressType = fake.resolves();
    const remoteAddress = fake.resolves();

    const aclStream = new AclStream(hci, handle, localAddressType, localAddress, remoteAddressType, remoteAddress);

    const eventEmmitted = fake.resolves(null);
    aclStream.on('encryptFail', eventEmmitted);

    aclStream.onSmpFail();

    assert.calledOnceWithExactly(eventEmmitted);
  });

  it('onSmpEnd', () => {
    const hci = fake.resolves();
    const handle = fake.resolves();
    const localAddressType = fake.resolves();
    const localAddress = fake.resolves();
    const remoteAddressType = fake.resolves();
    const remoteAddress = fake.resolves();

    const aclStream = new AclStream(hci, handle, localAddressType, localAddress, remoteAddressType, remoteAddress);

    aclStream._smp.sendPairingRequest = fake.resolves(null);

    aclStream.onSmpEnd();

    assert.calledThrice(aclStream._smp.removeListener);
    assert.calledWith(aclStream._smp.removeListener, 'stk', match.any);
    assert.calledWith(aclStream._smp.removeListener, 'fail', match.any);
    assert.calledWith(aclStream._smp.removeListener, 'end', match.any);
  });
});
