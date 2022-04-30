const should = require('should');
const sinon = require('sinon');
const proxyquire = require('proxyquire').noCallThru();

const { assert } = sinon;

describe('hci-socket hci', () => {
  const deviceId = 'deviceId';
  const Socket = sinon.stub();

  const Hci = proxyquire('../../../lib/hci-socket/hci', {
    '@abandonware/bluetooth-hci-socket': Socket
  });

  let hci;

  beforeEach(() => {
    Socket.prototype.on = sinon.stub();
    Socket.prototype.bindUser = sinon.stub();
    Socket.prototype.bindRaw = sinon.stub();
    Socket.prototype.start = sinon.stub();
    Socket.prototype.isDevUp = sinon.stub();
    Socket.prototype.removeAllListeners = sinon.stub();
    Socket.prototype.setFilter = sinon.stub();
    Socket.prototype.write = sinon.stub();

    hci = new Hci({});
    hci._deviceId = deviceId;
  });

  afterEach(() => {
    sinon.reset();
  });

  describe('init', () => {
    it('should reset', () => {
      hci.reset = sinon.spy();

      hci._userChannel = 'userChannel';
      hci.init();

      assert.callCount(hci._socket.on, 2);
      assert.calledWithMatch(hci._socket.on, 'data', sinon.match.func);
      assert.calledWithMatch(hci._socket.on, 'error', sinon.match.func);

      assert.calledOnceWithExactly(hci._socket.bindUser, deviceId);
      assert.calledOnceWithExactly(hci._socket.start);

      assert.calledOnceWithExactly(hci.reset);
    });

    it('should bindRaw', () => {
      hci.pollIsDevUp = sinon.spy();

      hci._userChannel = undefined;
      hci._bound = false;
      hci.init();

      assert.callCount(hci._socket.on, 2);
      assert.calledWithMatch(hci._socket.on, 'data', sinon.match.func);
      assert.calledWithMatch(hci._socket.on, 'error', sinon.match.func);

      assert.calledOnceWithExactly(hci._socket.bindRaw, deviceId);
      assert.calledOnceWithExactly(hci._socket.start);

      assert.calledOnceWithExactly(hci.pollIsDevUp);

      should(hci._bound).be.true();
    });

    it('should not bindRaw', () => {
      hci.pollIsDevUp = sinon.spy();

      hci._userChannel = undefined;
      hci._bound = true;
      hci.init();

      assert.callCount(hci._socket.on, 2);
      assert.calledWithMatch(hci._socket.on, 'data', sinon.match.func);
      assert.calledWithMatch(hci._socket.on, 'error', sinon.match.func);

      assert.notCalled(hci._socket.bindRaw);
      assert.calledOnceWithExactly(hci._socket.start);

      assert.calledOnceWithExactly(hci.pollIsDevUp);

      should(hci._bound).be.true();
    });
  });

  describe('pollIsDevUp', () => {
    let callback;

    beforeEach(() => {
      sinon.useFakeTimers();

      callback = sinon.spy();

      hci.setSocketFilter = sinon.spy();
      hci.setEventMask = sinon.spy();
      hci.setLeEventMask = sinon.spy();
      hci.readLocalVersion = sinon.spy();
      hci.writeLeHostSupported = sinon.spy();
      hci.readLeHostSupported = sinon.spy();
      hci.readLeBufferSize = sinon.spy();
      hci.readBdAddr = sinon.spy();
      hci.init = sinon.spy();
      hci.setCodedPhySupport = sinon.spy();

      hci.on('stateChange', callback);
    });

    afterEach(() => {
      sinon.restore();
      sinon.reset();
    });

    it('should only register timeout', () => {
      hci._socket.isDevUp.returns(true);
      hci._isDevUp = true;

      hci.pollIsDevUp();

      assert.notCalled(hci.setSocketFilter);
      assert.notCalled(hci.setEventMask);
      assert.notCalled(hci.setLeEventMask);
      assert.notCalled(hci.readLocalVersion);
      assert.notCalled(hci.writeLeHostSupported);
      assert.notCalled(hci.readLeHostSupported);
      assert.notCalled(hci.readLeBufferSize);
      assert.notCalled(hci.readBdAddr);
      assert.notCalled(hci.setCodedPhySupport);
      assert.notCalled(hci.init);
      assert.notCalled(callback);
    });

    it('should re-init', () => {
      hci._socket.isDevUp.returns(true);
      hci._isDevUp = false;
      hci._state = 'poweredOff';

      hci.pollIsDevUp();

      should(hci._state).equal(null);

      assert.calledOnceWithExactly(hci._socket.removeAllListeners);
      assert.calledOnceWithExactly(hci.init);

      assert.notCalled(hci.setSocketFilter);
      assert.notCalled(hci.setEventMask);
      assert.notCalled(hci.setLeEventMask);
      assert.notCalled(hci.readLocalVersion);
      assert.notCalled(hci.writeLeHostSupported);
      assert.notCalled(hci.readLeHostSupported);
      assert.notCalled(hci.readLeBufferSize);
      assert.notCalled(hci.readBdAddr);
      assert.notCalled(hci.setCodedPhySupport);
      assert.notCalled(callback);
    });

    it('should init all', () => {
      hci._socket.isDevUp.returns(true);
      hci._isDevUp = false;
      hci._state = undefined;

      hci.pollIsDevUp();

      assert.calledOnceWithExactly(hci.setSocketFilter);
      assert.calledOnceWithExactly(hci.setEventMask);
      assert.calledOnceWithExactly(hci.setLeEventMask);
      assert.calledOnceWithExactly(hci.readLocalVersion);
      assert.calledOnceWithExactly(hci.writeLeHostSupported);
      assert.calledOnceWithExactly(hci.readLeHostSupported);
      assert.calledOnceWithExactly(hci.readLeBufferSize);
      assert.calledOnceWithExactly(hci.readBdAddr);

      assert.notCalled(hci.setCodedPhySupport);
      assert.notCalled(hci._socket.removeAllListeners);
      assert.notCalled(hci.init);
      assert.notCalled(callback);
    });

    it('should init all with extended option', () => {
      hci._socket.isDevUp.returns(true);
      hci._isDevUp = false;
      hci._state = undefined;
      hci._isExtended = true;

      hci.pollIsDevUp();

      assert.calledOnceWithExactly(hci.setSocketFilter);
      assert.calledOnceWithExactly(hci.setEventMask);
      assert.calledOnceWithExactly(hci.setLeEventMask);
      assert.calledOnceWithExactly(hci.readLocalVersion);
      assert.calledOnceWithExactly(hci.writeLeHostSupported);
      assert.calledOnceWithExactly(hci.readLeHostSupported);
      assert.calledOnceWithExactly(hci.readLeBufferSize);
      assert.calledOnceWithExactly(hci.readBdAddr);
      assert.calledOnceWithExactly(hci.setCodedPhySupport);

      assert.notCalled(hci._socket.removeAllListeners);
      assert.notCalled(hci.init);
      assert.notCalled(callback);
    });

    it('should emit stateChange', () => {
      hci._socket.isDevUp.returns(false);
      hci._isDevUp = true;

      hci.pollIsDevUp();

      assert.calledOnceWithExactly(callback, 'poweredOff');

      assert.notCalled(hci._socket.removeAllListeners);
      assert.notCalled(hci.init);
      assert.notCalled(hci.setSocketFilter);
      assert.notCalled(hci.setEventMask);
      assert.notCalled(hci.setLeEventMask);
      assert.notCalled(hci.readLocalVersion);
      assert.notCalled(hci.writeLeHostSupported);
      assert.notCalled(hci.readLeHostSupported);
      assert.notCalled(hci.readLeBufferSize);
      assert.notCalled(hci.readBdAddr);
      assert.notCalled(hci.setCodedPhySupport);
    });
  });

  it('should write codedPhySupport command', () => {
    hci.setCodedPhySupport();
    assert.calledOnceWithExactly(hci._socket.write, Buffer.from([0x01, 0x31, 0x20, 0x03, 0x00, 0x05, 0x05]));
  });

  it('should write randomMAC command', () => {
    hci.setRandomMAC();
    assert.calledOnceWithExactly(hci._socket.write, Buffer.from([0x01, 0x05, 0x20, 0x06, 0x05, 0x04, 0x03, 0x02, 0x01, 0x00]));
  });

  it('should setSocketFilter', () => {
    hci.setSocketFilter();
    assert.calledOnceWithExactly(hci._socket.setFilter, Buffer.from([0x16, 0, 0, 0, 0x20, 0xc1, 0x08, 0, 0, 0, 0, 0x40, 0, 0]));
  });

  it('should setEventMask', () => {
    hci.setEventMask();
    assert.calledOnceWithExactly(hci._socket.write, Buffer.from([1, 1, 0x0c, 0x08, 0xff, 0xff, 0xfb, 0xff, 0x07, 0xf8, 0xbf, 0x3d]));
  });

  it('should reset', () => {
    hci.reset();
    assert.calledOnceWithExactly(hci._socket.write, Buffer.from([1, 3, 0x0c, 0]));
  });

  it('should readSupportedCommands', () => {
    hci.readSupportedCommands();
    assert.calledOnceWithExactly(hci._socket.write, Buffer.from([0x01, 0x02, 0x10, 0x00]));
  });

  it('should readLocalVersion', () => {
    hci.readLocalVersion();
    assert.calledOnceWithExactly(hci._socket.write, Buffer.from([1, 1, 0x10, 0]));
  });

  it('should readBufferSize', () => {
    hci.readBufferSize();
    assert.calledOnceWithExactly(hci._socket.write, Buffer.from([1, 5, 0x10, 0]));
  });

  it('should readBdAddr', () => {
    hci.readBdAddr();
    assert.calledOnceWithExactly(hci._socket.write, Buffer.from([1, 9, 0x10, 0]));
  });

  describe('setLeEventMask', () => {
    it('should setLeEventMask', () => {
      hci.setLeEventMask();
      assert.calledOnceWithExactly(hci._socket.write, Buffer.from([1, 1, 0x20, 8, 0x1f, 0, 0, 0, 0, 0, 0, 0]));
    });

    it('should setLeEventMask for BLE5 (extended)', () => {
      hci._isExtended = true;
      hci.setLeEventMask();
      assert.calledOnceWithExactly(hci._socket.write, Buffer.from([1, 1, 0x20, 8, 0x1f, 0xff, 0, 0, 0, 0, 0, 0]));
    });
  });

  it('should readLeBufferSize', () => {
    hci.readLeBufferSize();
    assert.calledOnceWithExactly(hci._socket.write, Buffer.from([1, 2, 0x20, 0]));
  });

  it('should readLeHostSupported', () => {
    hci.readLeHostSupported();
    assert.calledOnceWithExactly(hci._socket.write, Buffer.from([1, 0x6c, 0x0c, 0]));
  });

  it('should writeLeHostSupported', () => {
    hci.writeLeHostSupported();
    assert.calledOnceWithExactly(hci._socket.write, Buffer.from([1, 0x6d, 0x0c, 2, 1, 0]));
  });

  describe('setScanParameters', () => {
    it('should keep default parameters', () => {
      hci.setScanParameters();
      assert.calledOnceWithExactly(hci._socket.write, Buffer.from([1, 0x0b, 0x20, 7, 1, 0x12, 0, 0x12, 0, 0, 0]));
    });

    it('should keep default parameters (extended)', () => {
      hci._isExtended = true;
      hci.setScanParameters();
      assert.calledOnceWithExactly(hci._socket.write, Buffer.from([1, 0x41, 0x20, 0x0d, 0x00, 0x00, 0x05, 0x01, 0x12, 0x00, 0x12, 0x00, 0x01, 0x12, 0x00, 0x12, 0x00]));
    });

    it('should force parameters', () => {
      hci.setScanParameters(0x2222, 0x3333);
      assert.calledOnceWithExactly(hci._socket.write, Buffer.from([1, 0x0b, 0x20, 7, 1, 0x22, 0x022, 0x33, 0x33, 0, 0]));
    });

    it('should force parameters (extended)', () => {
      hci._isExtended = true;
      hci.setScanParameters(0x2222, 0x3333);
      assert.calledOnceWithExactly(hci._socket.write, Buffer.from([1, 0x41, 0x20, 0x0d, 0x00, 0x00, 0x05, 0x01, 0x22, 0x22, 0x33, 0x33, 0x01, 0x22, 0x22, 0x33, 0x33]));
    });
  });

  describe('setScanEnabled', () => {
    it('should keep default parameters', () => {
      hci.setScanEnabled();
      assert.calledOnceWithExactly(hci._socket.write, Buffer.from([1, 0x0c, 0x20, 2, 0, 0]));
    });

    it('should keep default parameters (extended)', () => {
      hci._isExtended = true;
      hci.setScanEnabled();
      assert.calledOnceWithExactly(hci._socket.write, Buffer.from([1, 0x42, 0x20, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]));
    });

    it('should force parameters', () => {
      hci.setScanEnabled(true, true);
      assert.calledOnceWithExactly(hci._socket.write, Buffer.from([1, 0x0c, 0x20, 2, 1, 1]));
    });

    it('should force parameters (extended)', () => {
      hci._isExtended = true;
      hci.setScanEnabled(true, true);
      assert.calledOnceWithExactly(hci._socket.write, Buffer.from([1, 0x42, 0x20, 0x06, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00]));
    });
  });

  describe('createLeConn', () => {
    it('should keep default parameters', () => {
      const address = 'aa:bb:cc:dd:ee';
      const addressType = 'random';
      hci.createLeConn(address, addressType);
      assert.calledOnceWithExactly(hci._socket.write, Buffer.from([0x01, 0x0d, 0x20, 0x19, 0x60, 0x00, 0x30, 0x00, 0x00, 0x01, 0xee, 0xdd, 0xcc, 0xbb, 0xaa, 0x00, 0x00, 0x06, 0x00, 0x12, 0x00, 0x00, 0x00, 0x2a, 0x00, 0x04, 0x00, 0x06, 0x00]));
    });

    it('should keep default parameters (extended)', () => {
      const address = 'aa:bb:cc:dd:ee';
      const addressType = 'random';
      hci._isExtended = true;
      hci.createLeConn(address, addressType);
      assert.calledOnceWithExactly(hci._socket.write, Buffer.from([0x01, 0x43, 0x20, 0x2a, 0x00, 0x00, 0x01, 0xee, 0xdd, 0xcc, 0xbb, 0xaa, 0x00, 0x05, 0x60, 0x00, 0x60, 0x00, 0x06, 0x00, 0x12, 0x00, 0x00, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x00, 0x00, 0x60, 0x00, 0x60, 0x00, 0x06, 0x00, 0x12, 0x00, 0x00, 0x00, 0x2a, 0x00, 0x00, 0x00, 0x00, 0x00]));
    });

    it('should override default parameters', () => {
      const address = 'ee:dd:cc:bb:aa';
      const addressType = 'not_random';
      const parameters = { minInterval: 0x0060, maxInterval: 0x00c0, latency: 0x0010, timeout: 0x0c80 };
      hci.createLeConn(address, addressType, parameters);
      assert.calledOnceWithExactly(hci._socket.write, Buffer.from([0x01, 0x0d, 0x20, 0x19, 0x60, 0x00, 0x30, 0x00, 0x00, 0x00, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0x00, 0x00, 0x60, 0x00, 0xc0, 0x00, 0x10, 0x00, 0x80, 0x0c, 0x04, 0x00, 0x06, 0x00]));
    });

    it('should override default parameters (extended)', () => {
      const address = 'ee:dd:cc:bb:aa';
      const addressType = 'not_random';
      const parameters = { minInterval: 0x0060, maxInterval: 0x00c0, latency: 0x0010, timeout: 0x0c80 };
      hci._isExtended = true;
      hci.createLeConn(address, addressType, parameters);
      assert.calledOnceWithExactly(hci._socket.write, Buffer.from([0x01, 0x43, 0x20, 0x2a, 0x00, 0x00, 0x00, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0x00, 0x05, 0x60, 0x00, 0x60, 0x00, 0x60, 0x00, 0xc0, 0x00, 0x10, 0x00, 0x80, 0x0c, 0x00, 0x00, 0x00, 0x00, 0x60, 0x00, 0x60, 0x00, 0x60, 0x00, 0xc0, 0x00, 0x10, 0x00, 0x80, 0x0c, 0x00, 0x00, 0x00, 0x00]));
    });
  });

  it('should write connUpdateLe', () => {
    const handle = 0x1234;
    const minInterval = 5;
    const maxInterval = 15;
    const latency = 12;
    const supervisionTimeout = 25;
    hci.connUpdateLe(handle, minInterval, maxInterval, latency, supervisionTimeout);
    assert.calledOnceWithExactly(hci._socket.write, Buffer.from([0x01, 0x13, 0x20, 0x0e, 0x34, 0x12, 0x04, 0x00, 0x0c, 0x00, 0x0c, 0x00, 0x02, 0x00, 0x00, 0x00, 0x00, 0x00]));
  });

  it('should write cancelConnect', () => {
    hci.cancelConnect();
    assert.calledOnceWithExactly(hci._socket.write, Buffer.from([0x01, 0x0e, 0x20, 0x00]));
  });

  it('should write startLeEncryption', () => {
    const handle = 0x1234;
    const random = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8]);
    const diversifier = Buffer.from([11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 23, 24, 25]);
    const key = Buffer.from([31, 32, 33, 34, 35, 36, 37, 38, 39, 30, 31, 32, 33, 33, 34, 35]);
    hci.startLeEncryption(handle, random, diversifier, key);
    assert.calledOnceWithExactly(hci._socket.write, Buffer.from([0x01, 0x19, 0x20, 0x1c, 0x34, 0x12, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x0b, 0x0c, 0x1f, 0x20, 0x21, 0x22, 0x23, 0x24, 0x25, 0x26, 0x27, 0x1e, 0x1f, 0x20, 0x21, 0x21, 0x22, 0x23]));
  });

  describe('disconnect', () => {
    it('should write disconnect with defaults', () => {
      const handle = 0x1234;
      const reason = undefined;
      hci.disconnect(handle, reason);
      assert.calledOnceWithExactly(hci._socket.write, Buffer.from([0x01, 0x06, 0x04, 0x03, 0x34, 0x12, 0x13]));
    });

    it('should write disconnect with reason', () => {
      const handle = 0x1234;
      const reason = 17;
      hci.disconnect(handle, reason);
      assert.calledOnceWithExactly(hci._socket.write, Buffer.from([0x01, 0x06, 0x04, 0x03, 0x34, 0x12, 0x11]));
    });
  });

  it('should write readRssi', () => {
    const handle = 0x1234;
    hci.readRssi(handle);
    assert.calledOnceWithExactly(hci._socket.write, Buffer.from([0x01, 0x05, 0x14, 0x02, 0x34, 0x12]));
  });

  it('should writeAclDataPkt - push in aclQueue and flushAcl', () => {
    hci.flushAcl = sinon.spy();
    hci._aclBuffers = [1, 2, 3, 4, 5, 6, 7, 8];

    const handle = 0x1234;
    const cid = 345;
    const data = Buffer.from([5, 6, 7, 8, 9, 10, 11]);
    hci.writeAclDataPkt(handle, cid, data);

    assert.calledOnceWithExactly(hci.flushAcl);

    should(hci._aclQueue).deepEqual([
      {
        handle: 4660,
        packet: Buffer.from([0x02, 0x34, 0x12, 0x08, 0x00, 0x07, 0x00, 0x59, 0x01, 0x05, 0x06, 0x07, 0x08])
      },
      {
        handle: 4660,
        packet: Buffer.from([0x02, 0x34, 0x12, 0x03, 0x00, 0x09, 0x0a, 0x0b])
      }
    ]);
  });

  describe('flushAcl', () => {
    it('should not write flush on no pending connections', () => {
      const queue = [
        {
          handle: 4660,
          packet: Buffer.from([0x02, 0x34, 0x12, 0x08, 0x00, 0x07, 0x00, 0x59, 0x01, 0x05, 0x06, 0x07, 0x08])
        },
        {
          handle: 4660,
          packet: Buffer.from([0x02, 0x34, 0x12, 0x03, 0x00, 0x09, 0x0a, 0x0b])
        }
      ];
      hci._aclQueue = [...queue];

      hci.flushAcl();

      assert.notCalled(hci._socket.write);
      should(hci._aclQueue).deepEqual(queue);
    });

    it('should not write flush on empty queue', () => {
      hci._aclQueue = [];
      hci._aclConnections.set(4660, { pending: 3 });
      hci._aclConnections.set(4661, { pending: 2 });
      hci._aclBuffers = { num: 12 };

      hci.flushAcl();

      assert.notCalled(hci._socket.write);

      should(hci._aclQueue).be.empty();
    });

    it('should not write flush on not enough pending connections', () => {
      const queue = [
        {
          handle: 4660,
          packet: Buffer.from([0x02, 0x34, 0x12, 0x08, 0x00, 0x07, 0x00, 0x59, 0x01, 0x05, 0x06, 0x07, 0x08])
        },
        {
          handle: 4660,
          packet: Buffer.from([0x02, 0x34, 0x12, 0x03, 0x00, 0x09, 0x0a, 0x0b])
        }
      ];
      hci._aclQueue = [...queue];
      hci._aclConnections.set(4660, { pending: 3 });
      hci._aclConnections.set(4661, { pending: 2 });
      hci._aclBuffers = { num: 1 };

      hci.flushAcl();

      assert.notCalled(hci._socket.write);
      should(hci._aclQueue).deepEqual(queue);
    });

    it('should write flush', () => {
      const queue = [
        {
          handle: 4660,
          packet: Buffer.from([0x02, 0x34, 0x12, 0x08, 0x00, 0x07, 0x00, 0x59, 0x01, 0x05, 0x06, 0x07, 0x08])
        },
        {
          handle: 4660,
          packet: Buffer.from([0x02, 0x34, 0x12, 0x03, 0x00, 0x09, 0x0a, 0x0b])
        },
        {
          handle: 4661,
          packet: Buffer.from([0x02])
        }
      ];
      hci._aclQueue = [...queue];
      hci._aclConnections.set(4660, { pending: 3 });
      hci._aclConnections.set(4661, { pending: 2 });
      hci._aclBuffers = { num: 12 };

      hci.flushAcl();

      assert.callCount(hci._socket.write, 3);
      assert.calledWithExactly(hci._socket.write, Buffer.from([0x02, 0x34, 0x12, 0x08, 0x00, 0x07, 0x00, 0x59, 0x01, 0x05, 0x06, 0x07, 0x08]));
      assert.calledWithExactly(hci._socket.write, Buffer.from([0x02, 0x34, 0x12, 0x03, 0x00, 0x09, 0x0a, 0x0b]));
      assert.calledWithExactly(hci._socket.write, Buffer.from([0x02]));

      should(hci._aclQueue).be.empty();
    });
  });

  describe('onSocketData', () => {
    const aclQueue = [
      {
        handle: 4660,
        packet: Buffer.from([0x02, 0x34, 0x12, 0x08, 0x00, 0x07, 0x00, 0x59, 0x01, 0x05, 0x06, 0x07, 0x08])
      },
      {
        handle: 4660,
        packet: Buffer.from([0x02, 0x34, 0x12, 0x03, 0x00, 0x09, 0x0a, 0x0b])
      },
      {
        handle: 4661,
        packet: Buffer.from([0x02])
      }
    ];

    let disconnCompleteCallback;
    let encryptChangeCallback;
    let aclDataPktCallback;
    let leScanEnableSetCmdCallback;

    beforeEach(() => {
      hci.flushAcl = sinon.spy();
      hci.processCmdCompleteEvent = sinon.spy();
      hci.processCmdStatusEvent = sinon.spy();
      hci.processLeMetaEvent = sinon.spy();

      hci._aclQueue = [...aclQueue];
      hci._aclConnections.set(4660, { pending: 3 });
      hci._aclConnections.set(4661, { pending: 2 });

      disconnCompleteCallback = sinon.spy();
      encryptChangeCallback = sinon.spy();
      aclDataPktCallback = sinon.spy();
      leScanEnableSetCmdCallback = sinon.spy();
      hci.on('disconnComplete', disconnCompleteCallback);
      hci.on('encryptChange', encryptChangeCallback);
      hci.on('aclDataPkt', aclDataPktCallback);
      hci.on('leScanEnableSetCmd', leScanEnableSetCmdCallback);
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should flushAcl - HCI_EVENT_PKT / EVT_DISCONN_COMPLETE', () => {
      const eventType = 4;
      const subEventType = 5;
      const data = Buffer.from([eventType, subEventType, 0, 0, 0x34, 0x12, 3]);

      hci.onSocketData(data);

      // called
      assert.calledOnceWithExactly(hci.flushAcl);
      assert.calledOnceWithExactly(disconnCompleteCallback, 4660, 3);

      // not called
      assert.notCalled(hci.processCmdCompleteEvent);
      assert.notCalled(hci.processLeMetaEvent);
      assert.notCalled(encryptChangeCallback);
      assert.notCalled(aclDataPktCallback);
      assert.notCalled(leScanEnableSetCmdCallback);

      // hci checks
      should(hci._aclQueue).deepEqual([
        {
          handle: 4661,
          packet: Buffer.from([0x02])
        }
      ]);
      should(hci._aclConnections).have.keys(4661);
      should(hci._aclConnections.get(4661)).deepEqual({ pending: 2 });
    });

    it('should only emit encryptChange - HCI_EVENT_PKT / EVT_ENCRYPT_CHANGE', () => {
      const eventType = 4;
      const subEventType = 8;
      const data = Buffer.from([eventType, subEventType, 0, 0, 0x34, 0x12, 3]);
      hci.onSocketData(data);

      // called
      assert.calledOnceWithExactly(encryptChangeCallback, 4660, 3);

      // not called
      assert.notCalled(hci.flushAcl);
      assert.notCalled(hci.processCmdCompleteEvent);
      assert.notCalled(hci.processLeMetaEvent);
      assert.notCalled(disconnCompleteCallback);
      assert.notCalled(aclDataPktCallback);
      assert.notCalled(leScanEnableSetCmdCallback);

      // hci checks
      should(hci._aclQueue).deepEqual(aclQueue);
      should(hci._aclConnections).have.keys(4660, 4661);
      should(hci._aclConnections.get(4660)).deepEqual({ pending: 3 });
      should(hci._aclConnections.get(4661)).deepEqual({ pending: 2 });
    });

    it('should only processCmdCompleteEvent - HCI_EVENT_PKT / EVT_CMD_COMPLETE', () => {
      const eventType = 4;
      const subEventType = 14;
      const data = Buffer.from([eventType, subEventType, 0, 0, 0x34, 0x12, 3, 9, 9]);
      hci.onSocketData(data);

      // called
      assert.calledOnceWithExactly(hci.processCmdCompleteEvent, 4660, 3, Buffer.from([9, 9]));

      // not called
      assert.notCalled(hci.flushAcl);
      assert.notCalled(encryptChangeCallback);
      assert.notCalled(hci.processLeMetaEvent);
      assert.notCalled(disconnCompleteCallback);
      assert.notCalled(aclDataPktCallback);
      assert.notCalled(leScanEnableSetCmdCallback);

      // hci checks
      should(hci._aclQueue).deepEqual(aclQueue);
      should(hci._aclConnections).have.keys(4660, 4661);
      should(hci._aclConnections.get(4660)).deepEqual({ pending: 3 });
      should(hci._aclConnections.get(4661)).deepEqual({ pending: 2 });
    });

    it('should only processCmdStatusEvent - HCI_EVENT_PKT / EVT_CMD_STATUS', () => {
      const eventType = 4;
      const subEventType = 15;
      const data = Buffer.from([eventType, subEventType, 4, 2, 0x34, 0x12, 3, 9, 9]);
      hci.onSocketData(data);

      // called
      assert.calledOnceWithExactly(hci.processCmdStatusEvent, 786, 2);

      // not called
      assert.notCalled(hci.flushAcl);
      assert.notCalled(encryptChangeCallback);
      assert.notCalled(hci.processCmdCompleteEvent);
      assert.notCalled(hci.processLeMetaEvent);
      assert.notCalled(disconnCompleteCallback);
      assert.notCalled(aclDataPktCallback);
      assert.notCalled(leScanEnableSetCmdCallback);

      // hci checks
      should(hci._aclQueue).deepEqual(aclQueue);
      should(hci._aclConnections).have.keys(4660, 4661);
      should(hci._aclConnections.get(4660)).deepEqual({ pending: 3 });
      should(hci._aclConnections.get(4661)).deepEqual({ pending: 2 });
    });

    it('should only processLeMetaEvent - HCI_EVENT_PKT / EVT_LE_META_EVENT', () => {
      const eventType = 4;
      const subEventType = 62;
      const data = Buffer.from([eventType, subEventType, 0, 1, 0x34, 0x12, 3, 9, 9]);
      hci.onSocketData(data);

      // called
      assert.calledOnceWithExactly(hci.processLeMetaEvent, 1, 52, Buffer.from([0x12, 3, 9, 9]));

      // not called
      assert.notCalled(hci.flushAcl);
      assert.notCalled(encryptChangeCallback);
      assert.notCalled(hci.processCmdCompleteEvent);
      assert.notCalled(disconnCompleteCallback);
      assert.notCalled(aclDataPktCallback);
      assert.notCalled(leScanEnableSetCmdCallback);

      // hci checks
      should(hci._aclQueue).deepEqual(aclQueue);
      should(hci._aclConnections).have.keys(4660, 4661);
      should(hci._aclConnections.get(4660)).deepEqual({ pending: 3 });
      should(hci._aclConnections.get(4661)).deepEqual({ pending: 2 });
    });

    it('should only flushAcl - HCI_EVENT_PKT / EVT_NUMBER_OF_COMPLETED_PACKETS', () => {
      const eventType = 4;
      const subEventType = 19;
      const data = Buffer.from([eventType, subEventType, 0, 1, 0x34, 0x12, 3, 9, 9]);
      hci.onSocketData(data);

      // called
      assert.calledOnceWithExactly(hci.flushAcl);

      // not called
      assert.notCalled(hci.processLeMetaEvent);
      assert.notCalled(encryptChangeCallback);
      assert.notCalled(hci.processCmdCompleteEvent);
      assert.notCalled(disconnCompleteCallback);
      assert.notCalled(aclDataPktCallback);
      assert.notCalled(leScanEnableSetCmdCallback);

      // hci checks
      should(hci._aclQueue).deepEqual(aclQueue);
      should(hci._aclConnections).have.keys(4660, 4661);
      should(hci._aclConnections.get(4660)).deepEqual({ pending: 0 });
      should(hci._aclConnections.get(4661)).deepEqual({ pending: 2 });
    });

    it('should do nothing - HCI_EVENT_PKT / ??', () => {
      const eventType = 4;
      const subEventType = 122;
      const data = Buffer.from([eventType, subEventType, 0, 1, 0x34, 0x12, 3, 9, 9]);
      hci.onSocketData(data);

      // called

      // not called
      assert.notCalled(hci.flushAcl);
      assert.notCalled(hci.processLeMetaEvent);
      assert.notCalled(encryptChangeCallback);
      assert.notCalled(hci.processCmdCompleteEvent);
      assert.notCalled(disconnCompleteCallback);
      assert.notCalled(aclDataPktCallback);
      assert.notCalled(leScanEnableSetCmdCallback);

      // hci checks
      should(hci._aclQueue).deepEqual(aclQueue);
      should(hci._aclConnections).have.keys(4660, 4661);
      should(hci._aclConnections.get(4660)).deepEqual({ pending: 3 });
      should(hci._aclConnections.get(4661)).deepEqual({ pending: 2 });
    });

    it('should only emit aclDataPkt - HCI_ACLDATA_PKT / ACL_START', () => {
      const eventType = 2;
      const subEventTypeP1 = 0xf2;
      const subEventTypeP2 = 0x24;
      const data = Buffer.from([eventType, subEventTypeP1, subEventTypeP2, 0x34, 0x12, 0x03, 0x00, 3, 9, 9, 8, 7]);
      hci.onSocketData(data);

      // called
      assert.calledOnceWithExactly(aclDataPktCallback, 1266, 2307, Buffer.from([9, 8, 7]));

      // not called
      assert.notCalled(hci.flushAcl);
      assert.notCalled(hci.processLeMetaEvent);
      assert.notCalled(encryptChangeCallback);
      assert.notCalled(hci.processCmdCompleteEvent);
      assert.notCalled(disconnCompleteCallback);
      assert.notCalled(leScanEnableSetCmdCallback);

      // hci checks
      should(hci._aclQueue).deepEqual(aclQueue);
      should(hci._aclConnections).have.keys(4660, 4661);
      should(hci._aclConnections.get(4660)).deepEqual({ pending: 3 });
      should(hci._aclConnections.get(4661)).deepEqual({ pending: 2 });

      should(hci._handleBuffers).be.empty();
    });

    it('should register handle buffer - HCI_ACLDATA_PKT / ACL_START', () => {
      const eventType = 2;
      const subEventTypeP1 = 0xf2;
      const subEventTypeP2 = 0x24;
      const data = Buffer.from([eventType, subEventTypeP1, subEventTypeP2, 0x34, 0x12, 0x03, 0x00, 3, 9, 9, 8]);
      hci.onSocketData(data);

      // called

      // not called
      assert.notCalled(aclDataPktCallback);
      assert.notCalled(hci.flushAcl);
      assert.notCalled(hci.processLeMetaEvent);
      assert.notCalled(encryptChangeCallback);
      assert.notCalled(hci.processCmdCompleteEvent);
      assert.notCalled(disconnCompleteCallback);
      assert.notCalled(leScanEnableSetCmdCallback);

      // hci checks
      should(hci._aclQueue).deepEqual(aclQueue);
      should(hci._aclConnections).have.keys(4660, 4661);
      should(hci._aclConnections.get(4660)).deepEqual({ pending: 3 });
      should(hci._aclConnections.get(4661)).deepEqual({ pending: 2 });

      should(hci._handleBuffers).deepEqual({
        1266: {
          length: 3,
          cid: 2307,
          data: Buffer.from([9, 8])
        }
      });
    });

    it('should do nothing - HCI_ACLDATA_PKT / ACL_CONT', () => {
      const eventType = 2;
      const subEventTypeP1 = 0xf2;
      const subEventTypeP2 = 0x14;
      const data = Buffer.from([eventType, subEventTypeP1, subEventTypeP2, 0x34, 0x12, 0x03, 0x00, 3, 9, 9, 8]);
      hci.onSocketData(data);

      // called

      // not called
      assert.notCalled(aclDataPktCallback);
      assert.notCalled(hci.flushAcl);
      assert.notCalled(hci.processLeMetaEvent);
      assert.notCalled(encryptChangeCallback);
      assert.notCalled(hci.processCmdCompleteEvent);
      assert.notCalled(disconnCompleteCallback);
      assert.notCalled(leScanEnableSetCmdCallback);

      // hci checks
      should(hci._aclQueue).deepEqual(aclQueue);
      should(hci._aclConnections).have.keys(4660, 4661);
      should(hci._aclConnections.get(4660)).deepEqual({ pending: 3 });
      should(hci._aclConnections.get(4661)).deepEqual({ pending: 2 });

      should(hci._handleBuffers).be.empty();
    });

    it('should concat data - HCI_ACLDATA_PKT / ACL_CONT', () => {
      const eventType = 2;
      const subEventTypeP1 = 0xf2;
      const subEventTypeP2 = 0x14;
      const data = Buffer.from([eventType, subEventTypeP1, subEventTypeP2, 0x34, 0x12, 0x03, 0x00, 3, 9, 9, 8]);

      const handleBuffers = {
        1266: {
          length: 3,
          cid: 2307,
          data: Buffer.from([3, 4])
        }
      };
      hci._handleBuffers = handleBuffers;

      hci.onSocketData(data);

      // called

      // not called
      assert.notCalled(aclDataPktCallback);
      assert.notCalled(hci.flushAcl);
      assert.notCalled(hci.processLeMetaEvent);
      assert.notCalled(encryptChangeCallback);
      assert.notCalled(hci.processCmdCompleteEvent);
      assert.notCalled(disconnCompleteCallback);
      assert.notCalled(leScanEnableSetCmdCallback);

      // hci checks
      should(hci._aclQueue).deepEqual(aclQueue);
      should(hci._aclConnections).have.keys(4660, 4661);
      should(hci._aclConnections.get(4660)).deepEqual({ pending: 3 });
      should(hci._aclConnections.get(4661)).deepEqual({ pending: 2 });

      should(hci._handleBuffers).deepEqual({
        1266: {
          length: 3,
          cid: 2307,
          data: Buffer.from([3, 4, 3, 0, 3, 9, 9, 8])
        }
      });
    });

    it('should concat data and emit aclDataPkt - HCI_ACLDATA_PKT / ACL_CONT', () => {
      const eventType = 2;
      const subEventTypeP1 = 0xf2;
      const subEventTypeP2 = 0x14;
      const data = Buffer.from([eventType, subEventTypeP1, subEventTypeP2, 0x34, 0x12, 0x03, 0x00, 3, 9, 9, 8]);

      const handleBuffers = {
        1266: {
          length: 8,
          cid: 2307,
          data: Buffer.from([3, 4])
        }
      };
      hci._handleBuffers = handleBuffers;

      hci.onSocketData(data);

      // called
      assert.calledOnceWithExactly(aclDataPktCallback, 1266, 2307, Buffer.from([3, 4, 3, 0, 3, 9, 9, 8]));

      // not called
      assert.notCalled(hci.flushAcl);
      assert.notCalled(hci.processLeMetaEvent);
      assert.notCalled(encryptChangeCallback);
      assert.notCalled(hci.processCmdCompleteEvent);
      assert.notCalled(disconnCompleteCallback);
      assert.notCalled(leScanEnableSetCmdCallback);

      // hci checks
      should(hci._aclQueue).deepEqual(aclQueue);
      should(hci._aclConnections).have.keys(4660, 4661);
      should(hci._aclConnections.get(4660)).deepEqual({ pending: 3 });
      should(hci._aclConnections.get(4661)).deepEqual({ pending: 2 });

      should(hci._handleBuffers).be.empty();
    });

    it('should do nothing - HCI_ACLDATA_PKT / ??', () => {
      const eventType = 2;
      const subEventType = 122;
      const data = Buffer.from([eventType, subEventType, 0, 1, 0x34, 0x12, 3, 9, 9]);
      hci.onSocketData(data);

      // called

      // not called
      assert.notCalled(hci.flushAcl);
      assert.notCalled(hci.processLeMetaEvent);
      assert.notCalled(encryptChangeCallback);
      assert.notCalled(hci.processCmdCompleteEvent);
      assert.notCalled(disconnCompleteCallback);
      assert.notCalled(aclDataPktCallback);
      assert.notCalled(leScanEnableSetCmdCallback);

      // hci checks
      should(hci._aclQueue).deepEqual(aclQueue);
      should(hci._aclConnections).have.keys(4660, 4661);
      should(hci._aclConnections.get(4660)).deepEqual({ pending: 3 });
      should(hci._aclConnections.get(4661)).deepEqual({ pending: 2 });
    });

    it('should emit leScanEnableSetCmd - HCI_COMMAND_PKT / LE_SET_SCAN_ENABLE_CMD', () => {
      const eventType = 1;
      const subEventTypeP1 = 0x0c;
      const subEventTypeP2 = 0x20;
      const data = Buffer.from([eventType, subEventTypeP1, subEventTypeP2, 0x34, 0x01, 0]);

      const handleBuffers = {
        1266: {
          length: 8,
          cid: 2307,
          data: Buffer.from([3, 4])
        }
      };
      hci._handleBuffers = handleBuffers;

      hci.onSocketData(data);

      // called
      assert.calledOnceWithExactly(leScanEnableSetCmdCallback, true, false);

      // not called
      assert.notCalled(hci.flushAcl);
      assert.notCalled(hci.processLeMetaEvent);
      assert.notCalled(encryptChangeCallback);
      assert.notCalled(hci.processCmdCompleteEvent);
      assert.notCalled(disconnCompleteCallback);
      assert.notCalled(aclDataPktCallback);

      // hci checks
      should(hci._aclQueue).deepEqual(aclQueue);
      should(hci._aclConnections).have.keys(4660, 4661);
    });

    it('should not emit leScanEnableSetCmd - HCI_COMMAND_PKT / ???', () => {
      const eventType = 1;
      const subEventTypeP1 = 0x0c;
      const subEventTypeP2 = 0x21;
      const data = Buffer.from([eventType, subEventTypeP1, subEventTypeP2, 0x34, 0x01, 0]);

      const handleBuffers = {
        1266: {
          length: 8,
          cid: 2307,
          data: Buffer.from([3, 4])
        }
      };
      hci._handleBuffers = handleBuffers;

      hci.onSocketData(data);

      // called

      // not called
      assert.notCalled(leScanEnableSetCmdCallback);
      assert.notCalled(hci.flushAcl);
      assert.notCalled(hci.processLeMetaEvent);
      assert.notCalled(encryptChangeCallback);
      assert.notCalled(hci.processCmdCompleteEvent);
      assert.notCalled(disconnCompleteCallback);
      assert.notCalled(aclDataPktCallback);

      // hci checks
      should(hci._aclQueue).deepEqual(aclQueue);
      should(hci._aclConnections).have.keys(4660, 4661);
    });

    it('should do nothing - ?? / ???', () => {
      const eventType = 122;
      const subEventTypeP1 = 0x0c;
      const subEventTypeP2 = 0x21;
      const data = Buffer.from([eventType, subEventTypeP1, subEventTypeP2, 0x34, 0x01, 0]);

      const handleBuffers = {
        1266: {
          length: 8,
          cid: 2307,
          data: Buffer.from([3, 4])
        }
      };
      hci._handleBuffers = handleBuffers;

      hci.onSocketData(data);

      // called

      // not called
      assert.notCalled(leScanEnableSetCmdCallback);
      assert.notCalled(hci.flushAcl);
      assert.notCalled(hci.processLeMetaEvent);
      assert.notCalled(encryptChangeCallback);
      assert.notCalled(hci.processCmdCompleteEvent);
      assert.notCalled(disconnCompleteCallback);
      assert.notCalled(aclDataPktCallback);

      // hci checks
      should(hci._aclQueue).deepEqual(aclQueue);
      should(hci._aclConnections).have.keys(4660, 4661);
    });
  });

  describe('onSocketError', () => {
    it('should emit stateChange', () => {
      const callback = sinon.spy();

      hci.on('stateChange', callback);
      hci.onSocketError({ code: 'EPERM', message: 'Network is down' });

      assert.calledOnceWithExactly(callback, 'unauthorized');
    });

    it('should do nothing with message', () => {
      const callback = sinon.spy();

      hci.on('stateChange', callback);
      hci.onSocketError({ message: 'Network is down' });

      assert.notCalled(callback);
    });

    it('should do nothing', () => {
      const callback = sinon.spy();

      hci.on('stateChange', callback);
      hci.onSocketError({ });

      assert.notCalled(callback);
    });
  });

  describe('processCmdCompleteEvent', () => {
    const aclBuffers = {
      length: 99,
      num: 88
    };

    let rssiReadCallback;
    let leScanEnableSetCallback;
    let leScanParametersSetCallback;
    let stateChangeCallback;
    let addressChangeCallback;
    let readLocalVersionCallback;

    beforeEach(() => {
      hci.setEventMask = sinon.spy();
      hci.setLeEventMask = sinon.spy();
      hci.readLocalVersion = sinon.spy();
      hci.readBdAddr = sinon.spy();
      hci.setScanEnabled = sinon.spy();
      hci.setScanParameters = sinon.spy();
      hci.readBufferSize = sinon.spy();
      hci.setCodedPhySupport = sinon.spy();

      hci._aclBuffers = aclBuffers;

      rssiReadCallback = sinon.spy();
      leScanEnableSetCallback = sinon.spy();
      leScanParametersSetCallback = sinon.spy();
      stateChangeCallback = sinon.spy();
      addressChangeCallback = sinon.spy();
      readLocalVersionCallback = sinon.spy();

      hci.on('rssiRead', rssiReadCallback);
      hci.on('leScanEnableSet', leScanEnableSetCallback);
      hci.on('leScanParametersSet', leScanParametersSetCallback);
      hci.on('stateChange', stateChangeCallback);
      hci.on('addressChange', addressChangeCallback);
      hci.on('readLocalVersion', readLocalVersionCallback);
    });

    it('should do nothing', () => {
      const cmd = 0;
      const status = 0;
      const result = Buffer.from([]);

      hci.processCmdCompleteEvent(cmd, status, result);

      // called

      // not called
      assert.notCalled(hci.setEventMask);
      assert.notCalled(hci.setLeEventMask);
      assert.notCalled(hci.readLocalVersion);
      assert.notCalled(hci.readBdAddr);
      assert.notCalled(hci.setScanEnabled);
      assert.notCalled(hci.setScanParameters);
      assert.notCalled(hci.readBufferSize);
      assert.notCalled(hci.setCodedPhySupport);
      assert.notCalled(rssiReadCallback);
      assert.notCalled(leScanEnableSetCallback);
      assert.notCalled(leScanParametersSetCallback);
      assert.notCalled(stateChangeCallback);
      assert.notCalled(addressChangeCallback);
      assert.notCalled(readLocalVersionCallback);

      // hci checks
      should(hci._aclBuffers).deepEqual(aclBuffers);
      should(hci._isExtended).equal(false);
    });

    it('should reset', () => {
      const cmd = 3075;
      const status = 0;
      const result = Buffer.from([]);

      hci.processCmdCompleteEvent(cmd, status, result);

      // called
      assert.calledOnceWithExactly(hci.setEventMask);
      assert.calledOnceWithExactly(hci.setLeEventMask);
      assert.calledOnceWithExactly(hci.readLocalVersion);
      assert.calledOnceWithExactly(hci.readBdAddr);

      // not called
      assert.notCalled(hci.setScanEnabled);
      assert.notCalled(hci.setScanParameters);
      assert.notCalled(hci.readBufferSize);
      assert.notCalled(hci.setCodedPhySupport);
      assert.notCalled(rssiReadCallback);
      assert.notCalled(leScanEnableSetCallback);
      assert.notCalled(leScanParametersSetCallback);
      assert.notCalled(stateChangeCallback);
      assert.notCalled(addressChangeCallback);
      assert.notCalled(readLocalVersionCallback);

      // hci checks
      should(hci._aclBuffers).deepEqual(aclBuffers);
      should(hci._isExtended).equal(false);
    });

    it('should reset (extended)', () => {
      const cmd = 3075;
      const status = 0;
      const result = Buffer.from([]);

      hci._isExtended = true;
      hci.processCmdCompleteEvent(cmd, status, result);

      // called
      assert.calledOnceWithExactly(hci.setEventMask);
      assert.calledOnceWithExactly(hci.setLeEventMask);
      assert.calledOnceWithExactly(hci.readLocalVersion);
      assert.calledOnceWithExactly(hci.readBdAddr);
      assert.calledOnceWithExactly(hci.setCodedPhySupport);

      // not called
      assert.notCalled(hci.setScanEnabled);
      assert.notCalled(hci.setScanParameters);
      assert.notCalled(hci.readBufferSize);
      assert.notCalled(rssiReadCallback);
      assert.notCalled(leScanEnableSetCallback);
      assert.notCalled(leScanParametersSetCallback);
      assert.notCalled(stateChangeCallback);
      assert.notCalled(addressChangeCallback);
      assert.notCalled(readLocalVersionCallback);

      // hci checks
      should(hci._aclBuffers).deepEqual(aclBuffers);
      should(hci._isExtended).equal(true);
    });

    it('should only log debug - READ_LE_HOST_SUPPORTED_CMD', () => {
      const cmd = 3180;
      const status = 0;
      const result = Buffer.from([0, 1]);

      hci.processCmdCompleteEvent(cmd, status, result);

      // called

      // not called
      assert.notCalled(hci.setEventMask);
      assert.notCalled(hci.setLeEventMask);
      assert.notCalled(hci.readLocalVersion);
      assert.notCalled(hci.readBdAddr);
      assert.notCalled(hci.setScanEnabled);
      assert.notCalled(hci.setScanParameters);
      assert.notCalled(hci.readBufferSize);
      assert.notCalled(hci.setCodedPhySupport);
      assert.notCalled(rssiReadCallback);
      assert.notCalled(leScanEnableSetCallback);
      assert.notCalled(leScanParametersSetCallback);
      assert.notCalled(stateChangeCallback);
      assert.notCalled(addressChangeCallback);
      assert.notCalled(readLocalVersionCallback);

      // hci checks
      should(hci._aclBuffers).deepEqual(aclBuffers);
      should(hci._isExtended).equal(false);
    });

    it('should do nothing - READ_LE_HOST_SUPPORTED_CMD', () => {
      const cmd = 3180;
      const status = 1;
      const result = Buffer.from([]);

      hci.processCmdCompleteEvent(cmd, status, result);

      // called

      // not called
      assert.notCalled(hci.setEventMask);
      assert.notCalled(hci.setLeEventMask);
      assert.notCalled(hci.readLocalVersion);
      assert.notCalled(hci.readBdAddr);
      assert.notCalled(hci.setScanEnabled);
      assert.notCalled(hci.setScanParameters);
      assert.notCalled(hci.readBufferSize);
      assert.notCalled(hci.setCodedPhySupport);
      assert.notCalled(rssiReadCallback);
      assert.notCalled(leScanEnableSetCallback);
      assert.notCalled(leScanParametersSetCallback);
      assert.notCalled(stateChangeCallback);
      assert.notCalled(addressChangeCallback);
      assert.notCalled(readLocalVersionCallback);

      // hci checks
      should(hci._aclBuffers).deepEqual(aclBuffers);
      should(hci._isExtended).equal(false);
    });

    it('should emit stateChange - READ_LOCAL_VERSION_CMD', () => {
      const cmd = 4097;
      const status = 0;
      const result = Buffer.from([0, 1, 2, 3, 4, 5, 6, 7]);

      hci.processCmdCompleteEvent(cmd, status, result);

      // called
      assert.calledOnceWithExactly(stateChangeCallback, 'unsupported');
      assert.calledOnceWithExactly(readLocalVersionCallback, 0, 513, 3, 1284, 1798);

      // not called
      assert.notCalled(hci.setEventMask);
      assert.notCalled(hci.setLeEventMask);
      assert.notCalled(hci.readLocalVersion);
      assert.notCalled(hci.readBdAddr);
      assert.notCalled(hci.setScanEnabled);
      assert.notCalled(hci.setScanParameters);
      assert.notCalled(hci.readBufferSize);
      assert.notCalled(hci.setCodedPhySupport);
      assert.notCalled(rssiReadCallback);
      assert.notCalled(leScanEnableSetCallback);
      assert.notCalled(leScanParametersSetCallback);
      assert.notCalled(addressChangeCallback);

      // hci checks
      should(hci._aclBuffers).deepEqual(aclBuffers);
      should(hci._isExtended).equal(false);
    });

    it('should not emit stateChange - READ_LOCAL_VERSION_CMD', () => {
      const cmd = 4097;
      const status = 0;
      const result = Buffer.from([9, 1, 2, 3, 4, 5, 6, 7]);

      hci.processCmdCompleteEvent(cmd, status, result);

      // called
      assert.calledOnceWithExactly(readLocalVersionCallback, 9, 513, 3, 1284, 1798);
      assert.calledOnceWithExactly(hci.setScanEnabled, false, true);
      assert.calledOnceWithExactly(hci.setScanParameters);

      // not called
      assert.notCalled(hci.setEventMask);
      assert.notCalled(hci.setLeEventMask);
      assert.notCalled(hci.readLocalVersion);
      assert.notCalled(hci.readBdAddr);
      assert.notCalled(hci.readBufferSize);
      assert.notCalled(hci.setCodedPhySupport);
      assert.notCalled(rssiReadCallback);
      assert.notCalled(stateChangeCallback);
      assert.notCalled(leScanEnableSetCallback);
      assert.notCalled(leScanParametersSetCallback);
      assert.notCalled(addressChangeCallback);

      // hci checks
      should(hci._aclBuffers).deepEqual(aclBuffers);
      should(hci._isExtended).equal(false);
    });

    it('should not scan - READ_LOCAL_VERSION_CMD', () => {
      const cmd = 4097;
      const status = 0;
      const result = Buffer.from([9, 1, 2, 3, 4, 5, 6, 7]);

      hci._state = 'poweredOn';
      hci.processCmdCompleteEvent(cmd, status, result);

      // called
      assert.calledOnceWithExactly(readLocalVersionCallback, 9, 513, 3, 1284, 1798);

      // not called
      assert.notCalled(hci.setEventMask);
      assert.notCalled(hci.setLeEventMask);
      assert.notCalled(hci.readLocalVersion);
      assert.notCalled(hci.readBdAddr);
      assert.notCalled(hci.setScanEnabled);
      assert.notCalled(hci.setScanParameters);
      assert.notCalled(hci.readBufferSize);
      assert.notCalled(hci.setCodedPhySupport);
      assert.notCalled(rssiReadCallback);
      assert.notCalled(stateChangeCallback);
      assert.notCalled(leScanEnableSetCallback);
      assert.notCalled(leScanParametersSetCallback);
      assert.notCalled(addressChangeCallback);

      // hci checks
      should(hci._aclBuffers).deepEqual(aclBuffers);
      should(hci._isExtended).equal(false);
    });

    it('should change extended - READ_SUPPORTED_COMMANDS_CMD', () => {
      const cmd = 4098;
      const status = 0;
      const result = Buffer.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 28, 30, 31, 32, 33, 34, 35, 35, 36, 0xff]);

      hci._state = 'poweredOn';
      hci.processCmdCompleteEvent(cmd, status, result);

      // called

      // not called
      assert.notCalled(readLocalVersionCallback);
      assert.notCalled(hci.setEventMask);
      assert.notCalled(hci.setLeEventMask);
      assert.notCalled(hci.readLocalVersion);
      assert.notCalled(hci.readBdAddr);
      assert.notCalled(hci.setScanEnabled);
      assert.notCalled(hci.setScanParameters);
      assert.notCalled(hci.readBufferSize);
      assert.notCalled(hci.setCodedPhySupport);
      assert.notCalled(rssiReadCallback);
      assert.notCalled(stateChangeCallback);
      assert.notCalled(leScanEnableSetCallback);
      assert.notCalled(leScanParametersSetCallback);
      assert.notCalled(addressChangeCallback);

      // hci checks
      should(hci._aclBuffers).deepEqual(aclBuffers);
      should(hci._isExtended).equal(32);
    });

    it('should emit addressChange - READ_BD_ADDR_CMD', () => {
      const cmd = 4105;
      const status = 0;
      const result = Buffer.from([9, 1, 2, 3, 4, 5, 6, 7]);

      hci.addressType = 'addressType';
      hci.address = 'address';
      hci.processCmdCompleteEvent(cmd, status, result);

      // called
      assert.calledOnceWithExactly(addressChangeCallback, '07:06:05:04:03:02:01:09');

      // not called
      assert.notCalled(hci.setEventMask);
      assert.notCalled(hci.setLeEventMask);
      assert.notCalled(hci.readLocalVersion);
      assert.notCalled(hci.readBdAddr);
      assert.notCalled(hci.setScanEnabled);
      assert.notCalled(hci.setScanParameters);
      assert.notCalled(hci.readBufferSize);
      assert.notCalled(hci.setCodedPhySupport);
      assert.notCalled(rssiReadCallback);
      assert.notCalled(stateChangeCallback);
      assert.notCalled(leScanEnableSetCallback);
      assert.notCalled(leScanParametersSetCallback);
      assert.notCalled(readLocalVersionCallback);

      // hci checks
      should(hci._aclBuffers).deepEqual(aclBuffers);
      should(hci._isExtended).equal(false);
      should(hci.addressType).equal('public');
      should(hci.address).equal('07:06:05:04:03:02:01:09');
    });

    [8203, 8257].forEach((cmd) => {
      it(`should emit stateChange - LE_SET_SCAN_PARAMETERS_CMD - ${cmd}`, () => {
        const status = 0;
        const result = Buffer.from([9, 1, 2, 3, 4, 5, 6, 7]);

        hci.processCmdCompleteEvent(cmd, status, result);

        // called
        assert.calledOnceWithExactly(stateChangeCallback, 'poweredOn');
        assert.calledOnceWithExactly(leScanParametersSetCallback);

        // not called
        assert.notCalled(addressChangeCallback);
        assert.notCalled(hci.setEventMask);
        assert.notCalled(hci.setLeEventMask);
        assert.notCalled(hci.readLocalVersion);
        assert.notCalled(hci.readBdAddr);
        assert.notCalled(hci.setScanEnabled);
        assert.notCalled(hci.setScanParameters);
        assert.notCalled(hci.readBufferSize);
        assert.notCalled(hci.setCodedPhySupport);
        assert.notCalled(rssiReadCallback);
        assert.notCalled(leScanEnableSetCallback);
        assert.notCalled(readLocalVersionCallback);

        // hci checks
        should(hci._aclBuffers).deepEqual(aclBuffers);
        should(hci._isExtended).equal(false);
      });
    });

    [8204, 8258].forEach((cmd) => {
      it(`should emit leScanEnableSet - LE_SET_SCAN_ENABLE_CMD - ${cmd}`, () => {
        const status = 4;
        const result = Buffer.from([9, 1, 2, 3, 4, 5, 6, 7]);

        hci.processCmdCompleteEvent(cmd, status, result);

        // called
        assert.calledOnceWithExactly(leScanEnableSetCallback, status);

        // not called
        assert.notCalled(addressChangeCallback);
        assert.notCalled(hci.setEventMask);
        assert.notCalled(hci.setLeEventMask);
        assert.notCalled(hci.readLocalVersion);
        assert.notCalled(hci.readBdAddr);
        assert.notCalled(hci.setScanEnabled);
        assert.notCalled(hci.setScanParameters);
        assert.notCalled(hci.readBufferSize);
        assert.notCalled(hci.setCodedPhySupport);
        assert.notCalled(rssiReadCallback);
        assert.notCalled(stateChangeCallback);
        assert.notCalled(leScanParametersSetCallback);
        assert.notCalled(readLocalVersionCallback);

        // hci checks
        should(hci._aclBuffers).deepEqual(aclBuffers);
        should(hci._isExtended).equal(false);
      });
    });

    it('should emit rssiRead - READ_RSSI_CMD', () => {
      const cmd = 5125;
      const status = 4;
      const result = Buffer.from([9, 1, 2, 3, 4, 5, 6, 7]);

      hci.processCmdCompleteEvent(cmd, status, result);

      // called
      assert.calledOnceWithExactly(rssiReadCallback, 265, 2);

      // not called
      assert.notCalled(addressChangeCallback);
      assert.notCalled(hci.setEventMask);
      assert.notCalled(hci.setLeEventMask);
      assert.notCalled(hci.readLocalVersion);
      assert.notCalled(hci.readBdAddr);
      assert.notCalled(hci.setScanEnabled);
      assert.notCalled(hci.setScanParameters);
      assert.notCalled(hci.readBufferSize);
      assert.notCalled(hci.setCodedPhySupport);
      assert.notCalled(leScanEnableSetCallback);
      assert.notCalled(stateChangeCallback);
      assert.notCalled(leScanParametersSetCallback);
      assert.notCalled(readLocalVersionCallback);

      // hci checks
      should(hci._aclBuffers).deepEqual(aclBuffers);
      should(hci._isExtended).equal(false);
    });

    it('should read buffer size - LE_READ_BUFFER_SIZE_CMD', () => {
      const cmd = 8194;
      const status = 0;
      const result = Buffer.from([0, 0, 0]);

      hci.processCmdCompleteEvent(cmd, status, result);

      // called
      assert.calledOnceWithExactly(hci.readBufferSize);

      // not called
      assert.notCalled(rssiReadCallback);
      assert.notCalled(addressChangeCallback);
      assert.notCalled(hci.setEventMask);
      assert.notCalled(hci.setLeEventMask);
      assert.notCalled(hci.readLocalVersion);
      assert.notCalled(hci.readBdAddr);
      assert.notCalled(hci.setScanEnabled);
      assert.notCalled(hci.setScanParameters);
      assert.notCalled(hci.setCodedPhySupport);
      assert.notCalled(leScanEnableSetCallback);
      assert.notCalled(stateChangeCallback);
      assert.notCalled(leScanParametersSetCallback);
      assert.notCalled(readLocalVersionCallback);

      // hci checks
      should(hci._aclBuffers).deepEqual(aclBuffers);
      should(hci._isExtended).equal(false);
    });

    it('should change buffers - LE_READ_BUFFER_SIZE_CMD', () => {
      const cmd = 8194;
      const status = 0;
      const result = Buffer.from([1, 0, 2]);

      hci.processCmdCompleteEvent(cmd, status, result);

      // called

      // not called
      assert.notCalled(hci.readBufferSize);
      assert.notCalled(rssiReadCallback);
      assert.notCalled(addressChangeCallback);
      assert.notCalled(hci.setEventMask);
      assert.notCalled(hci.setLeEventMask);
      assert.notCalled(hci.readLocalVersion);
      assert.notCalled(hci.readBdAddr);
      assert.notCalled(hci.setScanEnabled);
      assert.notCalled(hci.setScanParameters);
      assert.notCalled(hci.setCodedPhySupport);
      assert.notCalled(leScanEnableSetCallback);
      assert.notCalled(stateChangeCallback);
      assert.notCalled(leScanParametersSetCallback);
      assert.notCalled(readLocalVersionCallback);

      // hci checks
      should(hci._aclBuffers).deepEqual({
        length: 1,
        num: 2
      });
      should(hci._isExtended).equal(false);
    });

    it('should do nothing - LE_READ_BUFFER_SIZE_CMD', () => {
      const cmd = 8194;
      const status = 0;
      const result = Buffer.from([1, 0, 2]);

      hci.processCmdCompleteEvent(cmd, status, result);

      // called

      // not called
      assert.notCalled(hci.readBufferSize);
      assert.notCalled(rssiReadCallback);
      assert.notCalled(addressChangeCallback);
      assert.notCalled(hci.setEventMask);
      assert.notCalled(hci.setLeEventMask);
      assert.notCalled(hci.readLocalVersion);
      assert.notCalled(hci.readBdAddr);
      assert.notCalled(hci.setScanEnabled);
      assert.notCalled(hci.setScanParameters);
      assert.notCalled(hci.setCodedPhySupport);
      assert.notCalled(leScanEnableSetCallback);
      assert.notCalled(stateChangeCallback);
      assert.notCalled(leScanParametersSetCallback);
      assert.notCalled(readLocalVersionCallback);

      // hci checks
      should(hci._aclBuffers).deepEqual(aclBuffers);
      should(hci._isExtended).equal(false);
    });

    it('should do nothing - READ_BUFFER_SIZE_CMD', () => {
      const cmd = 4101;
      const status = 0;
      const result = Buffer.from([1, 0, 3, 2, 0]);

      hci.processCmdCompleteEvent(cmd, status, result);

      // called

      // not called
      assert.notCalled(hci.readBufferSize);
      assert.notCalled(rssiReadCallback);
      assert.notCalled(addressChangeCallback);
      assert.notCalled(hci.setEventMask);
      assert.notCalled(hci.setLeEventMask);
      assert.notCalled(hci.readLocalVersion);
      assert.notCalled(hci.readBdAddr);
      assert.notCalled(hci.setScanEnabled);
      assert.notCalled(hci.setScanParameters);
      assert.notCalled(hci.setCodedPhySupport);
      assert.notCalled(leScanEnableSetCallback);
      assert.notCalled(stateChangeCallback);
      assert.notCalled(leScanParametersSetCallback);
      assert.notCalled(readLocalVersionCallback);

      // hci checks
      should(hci._aclBuffers).deepEqual({
        length: 1,
        num: 2
      });
      should(hci._isExtended).equal(false);
    });

    it('should do nothing - ??', () => {
      const cmd = 1;
      const status = 0;
      const result = Buffer.from([1, 0, 3, 2, 0]);

      hci.processCmdCompleteEvent(cmd, status, result);

      // called

      // not called
      assert.notCalled(hci.readBufferSize);
      assert.notCalled(rssiReadCallback);
      assert.notCalled(addressChangeCallback);
      assert.notCalled(hci.setEventMask);
      assert.notCalled(hci.setLeEventMask);
      assert.notCalled(hci.readLocalVersion);
      assert.notCalled(hci.readBdAddr);
      assert.notCalled(hci.setScanEnabled);
      assert.notCalled(hci.setScanParameters);
      assert.notCalled(hci.setCodedPhySupport);
      assert.notCalled(leScanEnableSetCallback);
      assert.notCalled(stateChangeCallback);
      assert.notCalled(leScanParametersSetCallback);
      assert.notCalled(readLocalVersionCallback);

      // hci checks
      should(hci._aclBuffers).deepEqual(aclBuffers);
      should(hci._isExtended).equal(false);
    });
  });

  describe('processLeMetaEvent', () => {
    beforeEach(() => {
      hci.processLeConnComplete = sinon.spy();
      hci.processLeAdvertisingReport = sinon.spy();
      hci.processLeConnUpdateComplete = sinon.spy();
    });

    it('should do nothing', () => {
      const eventType = 0;
      const status = 'status';
      const data = 'data';

      hci.processLeMetaEvent(eventType, status, data);

      assert.notCalled(hci.processLeConnComplete);
      assert.notCalled(hci.processLeAdvertisingReport);
      assert.notCalled(hci.processLeConnUpdateComplete);
    });

    it('should processLeConnComplete', () => {
      const eventType = 1;
      const status = 'status';
      const data = 'data';

      hci.processLeMetaEvent(eventType, status, data);

      assert.calledOnceWithExactly(hci.processLeConnComplete, status, data);
      assert.notCalled(hci.processLeAdvertisingReport);
      assert.notCalled(hci.processLeConnUpdateComplete);
    });

    it('should processLeAdvertisingReport', () => {
      const eventType = 2;
      const status = 'status';
      const data = 'data';

      hci.processLeMetaEvent(eventType, status, data);

      assert.calledOnceWithExactly(hci.processLeAdvertisingReport, status, data);
      assert.notCalled(hci.processLeConnComplete);
      assert.notCalled(hci.processLeConnUpdateComplete);
    });

    it('should processLeConnUpdateComplete', () => {
      const eventType = 3;
      const status = 'status';
      const data = 'data';

      hci.processLeMetaEvent(eventType, status, data);

      assert.calledOnceWithExactly(hci.processLeConnUpdateComplete, status, data);
      assert.notCalled(hci.processLeConnComplete);
      assert.notCalled(hci.processLeAdvertisingReport);
    });
  });

  it('should emit leConnComplete', () => {
    const status = 'status';
    const data = Buffer.from([0x34, 0x11, 4, 1, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff, 2, 1, 4, 3, 7, 8, 9]);
    const callback = sinon.spy();

    hci.on('leConnComplete', callback);
    hci.processLeConnComplete(status, data);

    assert.calledOnceWithExactly(callback, status, 4404, 4, 'random', 'ff:ee:dd:cc:bb:aa', 322.5, 772, 20550, 9);
    should(hci._aclConnections).keys(4404);
    should(hci._aclConnections.get(4404)).deepEqual({ pending: 0 });
  });

  it('should emit leConnComplete on processLeEnhancedConnComplete', () => {
    const status = 'status';
    const data = Buffer.from([0x34, 0x11, 4, 1, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff, 2, 1, 4, 3, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22]);
    const callback = sinon.spy();

    hci.on('leConnComplete', callback);
    hci.processLeEnhancedConnComplete(status, data);

    assert.calledOnceWithExactly(callback, status, 4404, 4, 'random', 'ff:ee:dd:cc:bb:aa', 5138.75, 4625, 51390, 21);
    should(hci._aclConnections).keys(4404);
    should(hci._aclConnections.get(4404)).deepEqual({ pending: 0 });
  });

  describe('processLeAdvertisingReport', () => {
    it('should emit without error', () => {
      const count = 2;
      const data1 = Buffer.from([0, 1, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff, 2, 3, 4, 0]);
      const data2 = Buffer.from([1, 0, 0xff, 0xee, 0xdd, 0xcc, 0xbb, 0xaa, 4, 3, 4, 5, 6, 7]);
      const data = Buffer.concat([data1, data2]);
      const callback = sinon.spy();

      hci.on('leAdvertisingReport', callback);
      hci.processLeAdvertisingReport(count, data);

      assert.callCount(callback, 2);
    });

    it('should emit only once with random address', () => {
      const count = 1;
      const data = Buffer.from([0, 1, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff, 2, 3, 4, 0]);
      const callback = sinon.spy();

      hci.on('leAdvertisingReport', callback);
      hci.processLeAdvertisingReport(count, data);

      assert.calledOnceWithExactly(callback, 0, 0, 'ff:ee:dd:cc:bb:aa', 'random', Buffer.from([0x03, 0x04]), 0);
    });

    it('should emit only once with public address', () => {
      const count = 1;
      const data = Buffer.from([1, 0, 0xff, 0xee, 0xdd, 0xcc, 0xbb, 0xaa, 4, 3, 4, 5, 6, 7]);
      const callback = sinon.spy();

      hci.on('leAdvertisingReport', callback);
      hci.processLeAdvertisingReport(count, data);

      assert.calledOnceWithExactly(callback, 0, 1, 'aa:bb:cc:dd:ee:ff', 'public', Buffer.from([0x03, 0x04, 0x05, 0x06]), 7);
    });

    it('should catch error', () => {
      const count = 1;
      const data = Buffer.from([1, 0, 0xff, 0xee]);
      const callback = sinon.spy();

      hci.on('leAdvertisingReport', callback);
      hci.processLeAdvertisingReport(count, data);

      assert.notCalled(callback);
    });
  });

  describe('processLeExtendedAdvertisingReport', () => {
    it('should emit without error', () => {
      const count = 2;
      const data1 = Buffer.from([0, 1, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0]);
      const data2 = Buffer.from([1, 0, 0xff, 0xee, 0xdd, 0xcc, 0xbb, 0xaa, 4, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27]);
      const data = Buffer.concat([data1, data2]);
      const callback = sinon.spy();

      hci.on('leExtendedAdvertisingReport', callback);
      hci.processLeExtendedAdvertisingReport(count, data);

      assert.callCount(callback, 2);
    });

    it('should emit only once with random address', () => {
      const count = 1;
      const data = Buffer.from([0, 1, 1, 0xaa, 0xbb, 0xcc, 0xdd, 0xee, 0xff, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]);
      const callback = sinon.spy();

      hci.on('leExtendedAdvertisingReport', callback);
      hci.processLeExtendedAdvertisingReport(count, data);

      assert.calledOnceWithExactly(callback, 0, 256, 'ff:ee:dd:cc:bb:aa', 'random', 5, 6, Buffer.from([0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17]));
    });

    it('should emit only once with public address', () => {
      const count = 1;
      const data = Buffer.from([0, 1, 2, 0xff, 0xee, 0xdd, 0xcc, 0xbb, 0xaa, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]);
      const callback = sinon.spy();

      hci.on('leExtendedAdvertisingReport', callback);
      hci.processLeExtendedAdvertisingReport(count, data);

      assert.calledOnceWithExactly(callback, 0, 256, 'aa:bb:cc:dd:ee:ff', 'public', 5, 6, Buffer.from([0x11, 0x12, 0x13, 0x14, 0x15, 0x16, 0x17]));
    });

    it('should catch error', () => {
      const count = 1;
      const data = Buffer.from([1, 0, 0xff, 0xee]);
      const callback = sinon.spy();

      hci.on('leExtendedAdvertisingReport', callback);
      hci.processLeExtendedAdvertisingReport(count, data);

      assert.notCalled(callback);
    });
  });

  it('processLeConnUpdateComplete', () => {
    const callback = sinon.spy();
    hci.on('leConnUpdateComplete', callback);
    hci.processLeConnUpdateComplete('status', Buffer.from(([1, 0, 2, 0, 3, 0, 4, 0])));

    assert.calledOnceWithExactly(callback, 'status', 1, 2.5, 3, 40);
  });

  describe('processCmdStatusEvent', () => {
    it('should do nothing on bad cmd', () => {
      const callback = sinon.spy();
      hci.on('leConnComplete', callback);
      hci.processCmdStatusEvent(8206, 'status');

      assert.notCalled(callback);
    });

    [8205, 8259].forEach((cmd) => {
      it(`should do nothing on bad status - cmd = ${cmd}`, () => {
        const callback = sinon.spy();
        hci.on('leConnComplete', callback);
        hci.processCmdStatusEvent(cmd, 0);

        assert.notCalled(callback);
      });

      it(`should emit event - cmd = ${cmd}`, () => {
        const callback = sinon.spy();
        hci.on('leConnComplete', callback);
        hci.processCmdStatusEvent(cmd, 'status');

        assert.calledOnceWithExactly(callback, 'status');
      });
    });
  });

  it('should change state', () => {
    hci.onStateChange('newState');
    should(hci._state).equal('newState');
  });
});
