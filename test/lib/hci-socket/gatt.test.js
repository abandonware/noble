const should = require('should');
const sinon = require('sinon');

const { assert } = sinon;

const Gatt = require('../../../lib/hci-socket/gatt');

describe('hci-socket gatt', () => {
  let gatt;
  const address = 'address';
  const aclStream = {
    on: sinon.spy()
  };

  beforeEach(() => {
    gatt = new Gatt(address, aclStream);
  });

  afterEach(() => {
    sinon.reset();
  });

  it('constructor', () => {
    should(gatt._address).equal(address);
    should(gatt._aclStream).deepEqual(aclStream);
    should(gatt._services).deepEqual({});
    should(gatt._characteristics).deepEqual({});
    should(gatt._descriptors).deepEqual({});
    should(gatt._currentCommand).equal(null);
    should(gatt._commandQueue).deepEqual([]);
    should(gatt._mtu).equal(23);
    should(gatt._security).equal('low');

    assert.callCount(aclStream.on, 4);
    assert.calledWithMatch(aclStream.on, 'data', sinon.match.func);
    assert.calledWithMatch(aclStream.on, 'encrypt', sinon.match.func);
    assert.calledWithMatch(aclStream.on, 'encryptFail', sinon.match.func);
    assert.calledWithMatch(aclStream.on, 'end', sinon.match.func);
  });

  describe('onAclStreamData', () => {
    const handleNotifyCallback = sinon.spy();
    const handleConfirmationCallback = sinon.spy();
    const notificationCallback = sinon.spy();

    it('cid !== ATT_CID', () => {
      const cid = 'NOT_ATT_CID';
      const data = Buffer.from([0x00]);

      // Register events
      gatt.on('handleNotify', handleNotifyCallback);
      gatt.on('handleConfirmation', handleConfirmationCallback);
      gatt.on('notification', notificationCallback);
      gatt.onAclStreamData(cid, data);

      // No changes
      should(gatt._address).equal(address);
      should(gatt._aclStream).deepEqual(aclStream);
      should(gatt._services).deepEqual({});
      should(gatt._characteristics).deepEqual({});
      should(gatt._descriptors).deepEqual({});
      should(gatt._currentCommand).equal(null);
      should(gatt._commandQueue).deepEqual([]);
      should(gatt._mtu).equal(23);
      should(gatt._security).equal('low');

      // No events
      assert.notCalled(handleNotifyCallback);
      assert.notCalled(handleConfirmationCallback);
      assert.notCalled(notificationCallback);
    });

    it('send same current command', () => {
      // ATT_CID
      const cid = 0x0004;
      const data = Buffer.from([0x00]);
      const currentCommand = {
        buffer: data
      };

      // Setup current command
      gatt._currentCommand = currentCommand;
      // Register events
      gatt.on('handleNotify', handleNotifyCallback);
      gatt.on('handleConfirmation', handleConfirmationCallback);
      gatt.on('notification', notificationCallback);
      gatt.onAclStreamData(cid, data);

      // No changes
      should(gatt._address).equal(address);
      should(gatt._aclStream).deepEqual(aclStream);
      should(gatt._services).deepEqual({});
      should(gatt._characteristics).deepEqual({});
      should(gatt._descriptors).deepEqual({});
      should(gatt._currentCommand).equal(currentCommand);
      should(gatt._commandQueue).deepEqual([]);
      should(gatt._mtu).equal(23);
      should(gatt._security).equal('low');

      // No events
      assert.notCalled(handleNotifyCallback);
      assert.notCalled(handleConfirmationCallback);
      assert.notCalled(notificationCallback);
    });

    it('REQ_NOT_SUPP - not same as current', () => {
      aclStream.write = sinon.spy();

      // ATT_CID
      const cid = 0x0004;
      const data = Buffer.from([0x00]);
      const currentCommand = {
        buffer: Buffer.from([0xff])
      };

      // Setup current command
      gatt._currentCommand = currentCommand;
      // Register events
      gatt.on('handleNotify', handleNotifyCallback);
      gatt.on('handleConfirmation', handleConfirmationCallback);
      gatt.on('notification', notificationCallback);
      gatt.onAclStreamData(cid, data);

      // No changes
      should(gatt._address).equal(address);
      should(gatt._aclStream).deepEqual(aclStream);
      should(gatt._services).deepEqual({});
      should(gatt._characteristics).deepEqual({});
      should(gatt._descriptors).deepEqual({});
      should(gatt._currentCommand).equal(currentCommand);
      should(gatt._commandQueue).deepEqual([]);
      should(gatt._mtu).equal(23);
      should(gatt._security).equal('low');

      // No events
      assert.notCalled(handleNotifyCallback);
      assert.notCalled(handleConfirmationCallback);
      assert.notCalled(notificationCallback);

      assert.calledOnceWithExactly(
        aclStream.write,
        4,
        Buffer.from([0x01, 0x00, 0x00, 0x00, 0x06])
      );
    });

    it('ATT_OP_HANDLE_NOTIFY', () => {
      // ATT_CID
      const cid = 0x0004;
      const data = Buffer.from([0x1b, 0x01, 0x02, 0x03, 0x04]);

      const services = { service1: {}, service2: {} };
      const characteristics = {
        service1: {
          char1: {
            valueHandle: 0
          },
          char2: {
            valueHandle: 513
          }
        },
        service2: {
          char3: {
            valueHandle: 513
          }
        }
      };

      // Setup
      gatt._services = services;
      gatt._characteristics = characteristics;
      // Register events
      gatt.on('handleNotify', handleNotifyCallback);
      gatt.on('handleConfirmation', handleConfirmationCallback);
      gatt.on('notification', notificationCallback);
      gatt.onAclStreamData(cid, data);

      // No changes
      should(gatt._address).equal(address);
      should(gatt._aclStream).deepEqual(aclStream);
      should(gatt._services).deepEqual(services);
      should(gatt._characteristics).deepEqual(characteristics);
      should(gatt._descriptors).deepEqual({});
      should(gatt._currentCommand).equal(null);
      should(gatt._commandQueue).deepEqual([]);
      should(gatt._mtu).equal(23);
      should(gatt._security).equal('low');

      // Events
      assert.calledOnceWithExactly(
        handleNotifyCallback,
        address,
        513,
        Buffer.from([0x03, 0x04])
      );
      assert.notCalled(handleConfirmationCallback);
      assert.callCount(notificationCallback, 2);
      assert.calledWithExactly(
        notificationCallback,
        address,
        'service1',
        'char2',
        Buffer.from([0x03, 0x04])
      );
      assert.calledWithExactly(
        notificationCallback,
        address,
        'service1',
        'char2',
        Buffer.from([0x03, 0x04])
      );
    });

    it('ATT_OP_HANDLE_IND', () => {
      // ATT_CID
      const cid = 0x0004;
      const data = Buffer.from([0x1d, 0x01, 0x02, 0x03, 0x04]);

      const services = { service1: {}, service2: {} };
      const characteristics = {
        service1: {
          char1: {
            valueHandle: 0
          },
          char2: {
            valueHandle: 513
          }
        },
        service2: {
          char3: {
            valueHandle: 513
          }
        }
      };

      // Setup
      gatt._currentCommand = { buffer: Buffer.from([0x01]) };
      gatt._services = services;
      gatt._characteristics = characteristics;
      // Register events
      gatt.on('handleNotify', handleNotifyCallback);
      gatt.on('handleConfirmation', handleConfirmationCallback);
      gatt.on('notification', notificationCallback);
      gatt.onAclStreamData(cid, data);

      // No changes
      should(gatt._address).equal(address);
      should(gatt._aclStream).deepEqual(aclStream);
      should(gatt._services).deepEqual(services);
      should(gatt._characteristics).deepEqual(characteristics);
      should(gatt._descriptors).deepEqual({});
      should(gatt._currentCommand).deepEqual({ buffer: Buffer.from([0x01]) });
      should(gatt._commandQueue).has.size(1);
      should(gatt._mtu).equal(23);
      should(gatt._security).equal('low');

      // Events
      assert.calledOnceWithExactly(
        handleNotifyCallback,
        address,
        513,
        Buffer.from([0x03, 0x04])
      );
      assert.notCalled(handleConfirmationCallback);
      assert.callCount(notificationCallback, 2);
      assert.calledWithExactly(
        notificationCallback,
        address,
        'service1',
        'char2',
        Buffer.from([0x03, 0x04])
      );
      assert.calledWithExactly(
        notificationCallback,
        address,
        'service1',
        'char2',
        Buffer.from([0x03, 0x04])
      );
    });

    it('no current command', () => {
      // ATT_CID
      const cid = 0x0004;
      const data = Buffer.from([0xFF, 0x01, 0x02, 0x03, 0x04]);

      // Register events
      gatt.on('handleNotify', handleNotifyCallback);
      gatt.on('handleConfirmation', handleConfirmationCallback);
      gatt.on('notification', notificationCallback);
      gatt.onAclStreamData(cid, data);

      // No changes
      should(gatt._address).equal(address);
      should(gatt._aclStream).deepEqual(aclStream);
      should(gatt._services).deepEqual({});
      should(gatt._characteristics).deepEqual({});
      should(gatt._descriptors).deepEqual({});
      should(gatt._currentCommand).equal(null);
      should(gatt._commandQueue).deepEqual([]);
      should(gatt._mtu).equal(23);
      should(gatt._security).equal('low');

      // Events
      assert.notCalled(handleNotifyCallback);
      assert.notCalled(handleConfirmationCallback);
      assert.notCalled(notificationCallback);
    });

    [0x05, 0x08, 0x0f].forEach((errorCode) => {
      it(`ATT_OP_ERROR ${errorCode} and security low`, () => {
        aclStream.encrypt = sinon.spy();

        // ATT_CID
        const cid = 0x0004;
        const data = Buffer.from([0x01, 0x01, 0x02, 0x03, errorCode]);

        // Setup
        gatt._currentCommand = { buffer: Buffer.from([0x00]) };
        // Register events
        gatt.on('handleNotify', handleNotifyCallback);
        gatt.on('handleConfirmation', handleConfirmationCallback);
        gatt.on('notification', notificationCallback);
        gatt.onAclStreamData(cid, data);

        // No changes
        should(gatt._address).equal(address);
        should(gatt._aclStream).deepEqual(aclStream);
        should(gatt._services).deepEqual({});
        should(gatt._characteristics).deepEqual({});
        should(gatt._descriptors).deepEqual({});
        should(gatt._currentCommand).deepEqual({ buffer: Buffer.from([0x00]) });
        should(gatt._commandQueue).deepEqual([]);
        should(gatt._mtu).equal(23);
        should(gatt._security).equal('low');

        // Events
        assert.notCalled(handleNotifyCallback);
        assert.notCalled(handleConfirmationCallback);
        assert.notCalled(notificationCallback);

        assert.calledOnceWithExactly(aclStream.encrypt);
      });

      it(`ATT_OP_ERROR ${errorCode} and security medium`, () => {
        // ATT_CID
        const cid = 0x0004;
        const data = Buffer.from([0x01, 0x01, 0x02, 0x03, errorCode]);

        const callback = sinon.spy();
        const currentCommand = { buffer: Buffer.from([0x00]), callback };

        // Setup
        gatt._currentCommand = currentCommand;
        gatt._security = 'medium';
        // Register events
        gatt.on('handleNotify', handleNotifyCallback);
        gatt.on('handleConfirmation', handleConfirmationCallback);
        gatt.on('notification', notificationCallback);
        gatt.onAclStreamData(cid, data);

        // No changes
        should(gatt._address).equal(address);
        should(gatt._aclStream).deepEqual(aclStream);
        should(gatt._services).deepEqual({});
        should(gatt._characteristics).deepEqual({});
        should(gatt._descriptors).deepEqual({});
        should(gatt._currentCommand).equal(null);
        should(gatt._commandQueue).deepEqual([]);
        should(gatt._mtu).equal(23);
        should(gatt._security).equal('medium');

        // Events
        assert.notCalled(handleNotifyCallback);
        assert.notCalled(handleConfirmationCallback);
        assert.notCalled(notificationCallback);

        assert.calledOnceWithExactly(callback, data);
      });
    });

    it('command callback with queue', () => {
      // ATT_CID
      const cid = 0x0004;
      const data = Buffer.from([0x01, 0x01, 0x02, 0x03, 0x00]);

      const callback = sinon.spy();
      const currentCommand = { buffer: Buffer.from([0x00]), callback };
      const queueCallback = sinon.spy();
      const queueWriteCallback = sinon.spy();
      const commandQueue = [{ buffer: Buffer.from([0x98]), callback: queueCallback }, { buffer: Buffer.from([0x99]), writeCallback: queueWriteCallback }];

      // Setup
      gatt._currentCommand = currentCommand;
      gatt._commandQueue = [...commandQueue];
      // Register events
      gatt.on('handleNotify', handleNotifyCallback);
      gatt.on('handleConfirmation', handleConfirmationCallback);
      gatt.on('notification', notificationCallback);
      gatt.onAclStreamData(cid, data);

      // No changes
      should(gatt._address).equal(address);
      should(gatt._aclStream).deepEqual(aclStream);
      should(gatt._services).deepEqual({});
      should(gatt._characteristics).deepEqual({});
      should(gatt._descriptors).deepEqual({});
      should(gatt._currentCommand).deepEqual(commandQueue[0]);
      should(gatt._commandQueue).deepEqual([commandQueue[1]]);
      should(gatt._mtu).equal(23);
      should(gatt._security).equal('low');

      // Events
      assert.notCalled(handleNotifyCallback);
      assert.notCalled(handleConfirmationCallback);
      assert.notCalled(notificationCallback);

      assert.calledOnceWithExactly(callback, data);
      assert.notCalled(queueCallback);
      assert.notCalled(queueWriteCallback);

      assert.calledOnceWithExactly(aclStream.write, 4, Buffer.from([0x98]));
    });

    it('write command callback with queue', () => {
      // ATT_CID
      const cid = 0x0004;
      const data = Buffer.from([0x01, 0x01, 0x02, 0x03, 0x00]);

      const callback = sinon.spy();
      const currentCommand = { buffer: Buffer.from([0x00]), callback };
      const queueCallback = sinon.spy();
      const queueWriteCallback = sinon.spy();
      const commandQueue = [{ buffer: Buffer.from([0x99]), writeCallback: queueWriteCallback }, { buffer: Buffer.from([0x98]), callback: queueCallback }];

      // Setup
      gatt._currentCommand = currentCommand;
      gatt._commandQueue = [...commandQueue];
      // Register events
      gatt.on('handleNotify', handleNotifyCallback);
      gatt.on('handleConfirmation', handleConfirmationCallback);
      gatt.on('notification', notificationCallback);
      gatt.onAclStreamData(cid, data);

      // No changes
      should(gatt._address).equal(address);
      should(gatt._aclStream).deepEqual(aclStream);
      should(gatt._services).deepEqual({});
      should(gatt._characteristics).deepEqual({});
      should(gatt._descriptors).deepEqual({});
      should(gatt._currentCommand).deepEqual(commandQueue[1]);
      should(gatt._commandQueue).deepEqual([]);
      should(gatt._mtu).equal(23);
      should(gatt._security).equal('low');

      // Events
      assert.notCalled(handleNotifyCallback);
      assert.notCalled(handleConfirmationCallback);
      assert.notCalled(notificationCallback);

      assert.calledOnceWithExactly(callback, data);
      assert.notCalled(queueCallback);
      assert.calledOnceWithExactly(queueWriteCallback);

      assert.callCount(aclStream.write, 2);
      assert.calledWithExactly(aclStream.write, 4, Buffer.from([0x98]));
      assert.calledWithExactly(aclStream.write, 4, Buffer.from([0x99]));
    });
  });

  describe('onAclStreamEncrypt', () => {
    it('should not write attribute', () => {
      aclStream.write = sinon.spy();

      // Setup
      gatt._security = 'low';
      gatt.onAclStreamEncrypt(false);

      should(gatt._security).equal('low');
      assert.notCalled(aclStream.write);
    });

    it('should write attribute', () => {
      aclStream.write = sinon.spy();

      const buffer = Buffer.from([0x01, 0x99]);

      // Setup
      gatt._security = 'low';
      gatt._currentCommand = { buffer };
      gatt.onAclStreamEncrypt(true);

      should(gatt._security).equal('medium');
      assert.calledOnceWithExactly(aclStream.write, 4, buffer);
    });
  });

  it('onAclStreamEnd should remove listeners', () => {
    aclStream.removeListener = sinon.spy();

    gatt.onAclStreamEnd();

    assert.callCount(aclStream.removeListener, 4);
    assert.calledWithMatch(aclStream.removeListener, 'data', sinon.match.func);
    assert.calledWithMatch(aclStream.removeListener, 'encrypt', sinon.match.func);
    assert.calledWithMatch(aclStream.removeListener, 'encryptFail', sinon.match.func);
    assert.calledWithMatch(aclStream.removeListener, 'end', sinon.match.func);
  });

  it('writeAtt should call acl write', () => {
    aclStream.write = sinon.spy();

    gatt.writeAtt('data');

    assert.calledOnceWithMatch(aclStream.write, 4, 'data');
  });

  it('errorResponse', () => {
    aclStream.write = sinon.spy();

    const opcode = 8;
    const handle = 3000;
    const status = 7;

    const result = gatt.errorResponse(opcode, handle, status);

    should(result).deepEqual(Buffer.from([0x01, 0x08, 0xb8, 0x0b, 0x07]));
  });

  describe('queueCommand', () => {
    it('should only queue', () => {
      const buffer = Buffer.from([0x01, 0x01, 0x02, 0x03, 0x00]);
      const callback = sinon.spy();
      const writeCallback = sinon.spy();

      // Setup
      gatt._currentCommand = 'command';
      gatt._queueCommand(buffer, callback, writeCallback);

      // No changes
      should(gatt._address).equal(address);
      should(gatt._aclStream).deepEqual(aclStream);
      should(gatt._services).deepEqual({});
      should(gatt._characteristics).deepEqual({});
      should(gatt._descriptors).deepEqual({});
      should(gatt._currentCommand).equal('command');
      should(gatt._commandQueue).deepEqual([{ buffer, callback, writeCallback }]);
      should(gatt._mtu).equal(23);

      assert.notCalled(callback);
      assert.notCalled(writeCallback);
    });

    it('should queue and unqueue', () => {
      aclStream.write = sinon.spy();

      const buffer = Buffer.from([0x01, 0x01, 0x02, 0x03, 0x00]);
      const callback = sinon.spy();
      const writeCallback = sinon.spy();

      const queueCallback = sinon.spy();
      const queueWriteCallback = sinon.spy();
      const commandQueue = [{ buffer: Buffer.from([0x98]), callback: queueCallback }, { buffer: Buffer.from([0x99]), writeCallback: queueWriteCallback }];

      // Setup
      gatt._commandQueue = [...commandQueue];
      gatt._queueCommand(buffer, callback, writeCallback);

      // No changes
      should(gatt._address).equal(address);
      should(gatt._aclStream).deepEqual(aclStream);
      should(gatt._services).deepEqual({});
      should(gatt._characteristics).deepEqual({});
      should(gatt._descriptors).deepEqual({});
      should(gatt._currentCommand).deepEqual(commandQueue[0]);
      should(gatt._commandQueue).deepEqual([commandQueue[1], { buffer, callback, writeCallback }]);
      should(gatt._mtu).equal(23);
      should(gatt._security).equal('low');

      assert.notCalled(queueCallback);
      assert.notCalled(queueWriteCallback);

      assert.calledOnceWithExactly(aclStream.write, 4, Buffer.from([0x98]));
    });

    it('write command callback with queue', () => {
      aclStream.write = sinon.spy();

      const buffer = Buffer.from([0x01, 0x01, 0x02, 0x03, 0x00]);
      const callback = sinon.spy();
      const writeCallback = sinon.spy();

      const queueCallback = sinon.spy();
      const queueWriteCallback = sinon.spy();
      const commandQueue = [{ buffer: Buffer.from([0x99]), writeCallback: queueWriteCallback }, { buffer: Buffer.from([0x98]), callback: queueCallback }];

      // Setup
      gatt._commandQueue = [...commandQueue];
      gatt._queueCommand(buffer, callback, writeCallback);

      // No changes
      should(gatt._address).equal(address);
      should(gatt._aclStream).deepEqual(aclStream);
      should(gatt._services).deepEqual({});
      should(gatt._characteristics).deepEqual({});
      should(gatt._descriptors).deepEqual({});
      should(gatt._currentCommand).deepEqual(commandQueue[1]);
      should(gatt._commandQueue).deepEqual([{ buffer, callback, writeCallback }]);
      should(gatt._mtu).equal(23);
      should(gatt._security).equal('low');

      assert.notCalled(queueCallback);
      assert.calledOnceWithExactly(queueWriteCallback);

      assert.callCount(aclStream.write, 2);
      assert.calledWithExactly(aclStream.write, 4, Buffer.from([0x98]));
      assert.calledWithExactly(aclStream.write, 4, Buffer.from([0x99]));
    });
  });

  it('mtuRequest', () => {
    const mtu = 67;

    const result = gatt.mtuRequest(mtu);

    should(result).deepEqual(Buffer.from([0x02, 0x43, 0x00]));
  });

  it('readByGroupRequest', () => {
    const startHandle = 8;
    const endHandle = 3000;
    const groupUuid = 7;

    const result = gatt.readByGroupRequest(startHandle, endHandle, groupUuid);

    should(result).deepEqual(Buffer.from([0x10, 0x08, 0x00, 0xb8, 0x0b, 0x07, 0x00]));
  });

  it('readByTypeRequest', () => {
    const startHandle = 8;
    const endHandle = 3000;
    const groupUuid = 7;

    const result = gatt.readByTypeRequest(startHandle, endHandle, groupUuid);

    should(result).deepEqual(Buffer.from([0x08, 0x08, 0x00, 0xb8, 0x0b, 0x07, 0x00]));
  });

  it('readRequest', () => {
    const handle = 67;

    const result = gatt.readRequest(handle);

    should(result).deepEqual(Buffer.from([0x0a, 0x43, 0x00]));
  });

  it('readBlobRequest', () => {
    const handle = 67;
    const offset = 68;

    const result = gatt.readBlobRequest(handle, offset);

    should(result).deepEqual(Buffer.from([0x0c, 0x43, 0x00, 0x44, 0x00]));
  });

  it('findInfoRequest', () => {
    const startHandle = 67;
    const endHandle = 68;

    const result = gatt.findInfoRequest(startHandle, endHandle);

    should(result).deepEqual(Buffer.from([0x04, 0x43, 0x00, 0x44, 0x00]));
  });

  it('writeRequest withoutResponse', () => {
    const handle = 67;
    const data = Buffer.from([0x05, 0x06, 0x07]);
    const withoutResponse = true;

    const result = gatt.writeRequest(handle, data, withoutResponse);

    should(result).deepEqual(Buffer.from([0x52, 0x43, 0x00, 0x05, 0x06, 0x07]));
  });

  it('writeRequest withResponse', () => {
    const handle = 67;
    const data = Buffer.from([0x05, 0x06, 0x07]);
    const withResponse = false;

    const result = gatt.writeRequest(handle, data, withResponse);

    should(result).deepEqual(Buffer.from([0x12, 0x43, 0x00, 0x05, 0x06, 0x07]));
  });

  it('prepareWriteRequest', () => {
    const handle = 67;
    const offset = 68;
    const data = Buffer.from([0x05, 0x06, 0x07]);

    const result = gatt.prepareWriteRequest(handle, offset, data);

    should(result).deepEqual(Buffer.from([0x16, 0x43, 0x00, 0x44, 0x00, 0x05, 0x06, 0x07]));
  });

  it('executeWriteRequest cancelPreparedWrites', () => {
    const handle = 67;
    const cancelPreparedWrites = true;

    const result = gatt.executeWriteRequest(handle, cancelPreparedWrites);

    should(result).deepEqual(Buffer.from([0x18, 0x00]));
  });

  it('executeWriteRequest preparedWrites', () => {
    const handle = 67;
    const cancelPreparedWrites = false;

    const result = gatt.executeWriteRequest(handle, cancelPreparedWrites);

    should(result).deepEqual(Buffer.from([0x18, 0x01]));
  });

  it('handleConfirmation', () => {
    const result = gatt.handleConfirmation();

    should(result).deepEqual(Buffer.from([0x1e]));
  });

  it('exchangeMtu', () => {
    const mtu = 63;
    const queueCommand = sinon.spy();
    const callback = sinon.stub();

    gatt._queueCommand = queueCommand;
    gatt._mtu = 22;
    gatt.on('mtu', callback);
    gatt.exchangeMtu(mtu);

    assert.calledOnce(queueCommand);

    queueCommand.callArgWith(1, ['d', 'a', 't', 'a']);
    assert.calledOnceWithExactly(callback, address, 22);
    should(gatt._mtu).equal(22);
  });

  it('exchangeMtu ATT_OP_MTU_RESP', () => {
    const mtu = 63;
    const queueCommand = sinon.spy();
    const callback = sinon.stub();

    gatt._queueCommand = queueCommand;
    gatt._mtu = 22;
    gatt.on('mtu', callback);
    gatt.exchangeMtu(mtu);

    assert.calledOnce(queueCommand);

    queueCommand.callArgWith(1, Buffer.from([0x03, 0x12, 0x33]));
    assert.calledOnceWithExactly(callback, address, 13074);
    should(gatt._mtu).equal(13074);
  });

  it('addService', () => {
    const service = { uuid: 'service' };

    gatt.addService(service);

    should(gatt._services).deepEqual({ service });
  });

  describe('discoverServices', () => {
    beforeEach(() => {
      gatt._queueCommand = sinon.spy();
      gatt.readByGroupRequest = sinon.spy();
    });

    it('not ATT_OP_READ_BY_GROUP_RESP > non discovered', () => {
      const callbackDiscovered = sinon.stub();
      const callbackDiscover = sinon.stub();

      gatt.on('servicesDiscovered', callbackDiscovered);
      gatt.on('servicesDiscover', callbackDiscover);
      gatt.discoverServices(['service1']);

      gatt._queueCommand.callArgWith(1, Buffer.from([0x00]));

      assert.calledOnceWithExactly(callbackDiscovered, address, []);
      assert.calledOnceWithExactly(callbackDiscover, address, []);
      assert.callCount(gatt._queueCommand, 1);
      assert.calledOnceWithExactly(gatt.readByGroupRequest, 0x0001, 0xffff, 10240);
    });

    it('ATT_OP_READ_BY_GROUP_RESP > queue', () => {
      const callbackDiscovered = sinon.stub();
      const callbackDiscover = sinon.stub();

      gatt.on('servicesDiscovered', callbackDiscovered);
      gatt.on('servicesDiscover', callbackDiscover);
      gatt.discoverServices(['service1']);

      // Build data
      const data = [17, 6];
      for (let i = 0; i < data[1]; i++) {
        for (let j = 0; j < 8; j++) {
          data.push(i * 10 + j);
        }
      }

      gatt._queueCommand.callArgWith(1, Buffer.from(data));

      assert.notCalled(callbackDiscovered);
      assert.notCalled(callbackDiscover);
      assert.callCount(gatt._queueCommand, 2);
      assert.callCount(gatt.readByGroupRequest, 2);
      assert.calledWithExactly(gatt.readByGroupRequest, 0x0001, 0xffff, 10240);
      assert.calledWithExactly(gatt.readByGroupRequest, 14135, 0xffff, 10240);
    });

    it('ATT_OP_READ_BY_GROUP_RESP > event', () => {
      const callbackDiscovered = sinon.stub();
      const callbackDiscover = sinon.stub();

      gatt.on('servicesDiscovered', callbackDiscovered);
      gatt.on('servicesDiscover', callbackDiscover);
      gatt.discoverServices([]);

      // Build data
      const data = [17, 7];
      for (let i = 0; i < data[1]; i++) {
        for (let j = 0; j < 8; j++) {
          data.push(255);
        }
      }

      gatt._queueCommand.callArgWith(1, Buffer.from(data));

      const services = [{
        startHandle: 65535,
        endHandle: 65535,
        uuid: 'ffffffffffffffffffffffffffffffff'
      },
      {
        startHandle: 65535,
        endHandle: 65535,
        uuid: 'ffffffffffffffffffffffffffffffff'
      },
      {
        startHandle: 65535,
        endHandle: 65535,
        uuid: 'ffffffffffffffffffffffffffffffff'
      },
      {
        startHandle: 65535,
        endHandle: 65535,
        uuid: 'ffffffffffffffffffffffffffffffff'
      },
      {
        startHandle: 65535,
        endHandle: 65535,
        uuid: 'ffffffffffffffffffffffffffffffff'
      },
      {
        startHandle: 65535,
        endHandle: 65535,
        uuid: 'ffffffffffffffffffffffffffffffff'
      },
      {
        startHandle: 65535,
        endHandle: 65535,
        uuid: 'ffffffffffffffffffff'
      },
      { startHandle: 65535, endHandle: 65535, uuid: 'ffffff' }];

      assert.calledOnceWithExactly(callbackDiscovered, address, services);
      const serviceUuids = [
        'ffffffffffffffffffffffffffffffff',
        'ffffffffffffffffffff',
        'ffffff'
      ];
      assert.calledOnceWithExactly(callbackDiscover, address, serviceUuids);
      assert.callCount(gatt._queueCommand, 1);
      assert.calledOnceWithExactly(gatt.readByGroupRequest, 0x0001, 0xffff, 10240);

      should(gatt._services).deepEqual({
        ffffffffffffffffffffffffffffffff: {
          startHandle: 65535,
          endHandle: 65535,
          uuid: 'ffffffffffffffffffffffffffffffff'
        },
        ffffffffffffffffffff: {
          startHandle: 65535,
          endHandle: 65535,
          uuid: 'ffffffffffffffffffff'
        },
        ffffff: {
          startHandle: 65535,
          endHandle: 65535,
          uuid: 'ffffff'
        }
      });
    });

    it('ATT_OP_READ_BY_GROUP_RESP > event matching uuid', () => {
      const callbackDiscovered = sinon.stub();
      const callbackDiscover = sinon.stub();

      gatt.on('servicesDiscovered', callbackDiscovered);
      gatt.on('servicesDiscover', callbackDiscover);
      gatt.discoverServices(['ffffffffffffffffffff']);

      // Build data
      const data = [17, 7];
      for (let i = 0; i < data[1]; i++) {
        for (let j = 0; j < 8; j++) {
          data.push(255);
        }
      }

      gatt._queueCommand.callArgWith(1, Buffer.from(data));

      const services = [{
        startHandle: 65535,
        endHandle: 65535,
        uuid: 'ffffffffffffffffffffffffffffffff'
      },
      {
        startHandle: 65535,
        endHandle: 65535,
        uuid: 'ffffffffffffffffffffffffffffffff'
      },
      {
        startHandle: 65535,
        endHandle: 65535,
        uuid: 'ffffffffffffffffffffffffffffffff'
      },
      {
        startHandle: 65535,
        endHandle: 65535,
        uuid: 'ffffffffffffffffffffffffffffffff'
      },
      {
        startHandle: 65535,
        endHandle: 65535,
        uuid: 'ffffffffffffffffffffffffffffffff'
      },
      {
        startHandle: 65535,
        endHandle: 65535,
        uuid: 'ffffffffffffffffffffffffffffffff'
      },
      {
        startHandle: 65535,
        endHandle: 65535,
        uuid: 'ffffffffffffffffffff'
      },
      { startHandle: 65535, endHandle: 65535, uuid: 'ffffff' }];

      assert.calledOnceWithExactly(callbackDiscovered, address, services);
      const serviceUuids = [
        'ffffffffffffffffffff'
      ];
      assert.calledOnceWithExactly(callbackDiscover, address, serviceUuids);
      assert.callCount(gatt._queueCommand, 1);
      assert.calledOnceWithExactly(gatt.readByGroupRequest, 0x0001, 0xffff, 10240);

      should(gatt._services).deepEqual({
        ffffffffffffffffffffffffffffffff: {
          startHandle: 65535,
          endHandle: 65535,
          uuid: 'ffffffffffffffffffffffffffffffff'
        },
        ffffffffffffffffffff: {
          startHandle: 65535,
          endHandle: 65535,
          uuid: 'ffffffffffffffffffff'
        },
        ffffff: {
          startHandle: 65535,
          endHandle: 65535,
          uuid: 'ffffff'
        }
      });
    });

    it('ATT_OP_READ_BY_GROUP_RESP > event not matching uuid', () => {
      const callbackDiscovered = sinon.stub();
      const callbackDiscover = sinon.stub();

      gatt.on('servicesDiscovered', callbackDiscovered);
      gatt.on('servicesDiscover', callbackDiscover);
      gatt.discoverServices(['bbbbbbbbbbbbbbbbbbbbbbbbbbb']);

      // Build data
      const data = [17, 7];
      for (let i = 0; i < data[1]; i++) {
        for (let j = 0; j < 8; j++) {
          data.push(255);
        }
      }

      gatt._queueCommand.callArgWith(1, Buffer.from(data));

      const services = [{
        startHandle: 65535,
        endHandle: 65535,
        uuid: 'ffffffffffffffffffffffffffffffff'
      },
      {
        startHandle: 65535,
        endHandle: 65535,
        uuid: 'ffffffffffffffffffffffffffffffff'
      },
      {
        startHandle: 65535,
        endHandle: 65535,
        uuid: 'ffffffffffffffffffffffffffffffff'
      },
      {
        startHandle: 65535,
        endHandle: 65535,
        uuid: 'ffffffffffffffffffffffffffffffff'
      },
      {
        startHandle: 65535,
        endHandle: 65535,
        uuid: 'ffffffffffffffffffffffffffffffff'
      },
      {
        startHandle: 65535,
        endHandle: 65535,
        uuid: 'ffffffffffffffffffffffffffffffff'
      },
      {
        startHandle: 65535,
        endHandle: 65535,
        uuid: 'ffffffffffffffffffff'
      },
      { startHandle: 65535, endHandle: 65535, uuid: 'ffffff' }];

      assert.calledOnceWithExactly(callbackDiscovered, address, services);
      const serviceUuids = [];
      assert.calledOnceWithExactly(callbackDiscover, address, serviceUuids);
      assert.callCount(gatt._queueCommand, 1);
      assert.calledOnceWithExactly(gatt.readByGroupRequest, 0x0001, 0xffff, 10240);

      should(gatt._services).deepEqual({
        ffffffffffffffffffffffffffffffff: {
          startHandle: 65535,
          endHandle: 65535,
          uuid: 'ffffffffffffffffffffffffffffffff'
        },
        ffffffffffffffffffff: {
          startHandle: 65535,
          endHandle: 65535,
          uuid: 'ffffffffffffffffffff'
        },
        ffffff: {
          startHandle: 65535,
          endHandle: 65535,
          uuid: 'ffffff'
        }
      });
    });
  });

  describe('discoverIncludedServices', () => {
    beforeEach(() => {
      gatt._queueCommand = sinon.spy();
      gatt.readByTypeRequest = sinon.spy();
    });
    it('not ATT_OP_READ_BY_TYPE_RESP > non discovered', () => {
      const callback = sinon.stub();

      const service = {
        startHandle: 0xaaaa,
        endHandle: 0xdddd,
        uuid: 'uuid'
      };

      gatt._services[service.uuid] = service;
      gatt.on('includedServicesDiscover', callback);
      gatt.discoverIncludedServices(service.uuid);

      gatt._queueCommand.callArgWith(1, Buffer.from([0x00]));
      assert.calledOnceWithExactly(callback, address, service.uuid, []);
      assert.callCount(gatt._queueCommand, 1);
      assert.calledOnceWithExactly(gatt.readByTypeRequest, service.startHandle, service.endHandle, 10242);
    });

    it('ATT_OP_READ_BY_TYPE_RESP > queue', () => {
      const callback = sinon.stub();

      const service = {
        startHandle: 0xaaaa,
        endHandle: 0xdddd,
        uuid: 'uuid'
      };

      gatt._services[service.uuid] = service;
      gatt.on('includedServicesDiscover', callback);
      gatt.discoverIncludedServices(service.uuid);

      // Build data
      const data = [9, 8];
      for (let i = 0; i < data[1]; i++) {
        for (let j = 0; j < 10; j++) {
          data.push(i * 10 + j);
        }
      }

      gatt._queueCommand.callArgWith(1, Buffer.from(data));

      assert.notCalled(callback);
      assert.callCount(gatt._queueCommand, 2);
      assert.callCount(gatt.readByTypeRequest, 2);
      assert.calledWithExactly(gatt.readByTypeRequest, service.startHandle, service.endHandle, 10242);
      assert.calledWithExactly(gatt.readByTypeRequest, 18761, 56797, 10242);
    });

    it('ATT_OP_READ_BY_TYPE_RESP > event', () => {
      const callback = sinon.stub();

      const service = {
        startHandle: 0xaaaa,
        endHandle: 0xffff,
        uuid: 'uuid'
      };

      gatt._services[service.uuid] = service;
      gatt.on('includedServicesDiscover', callback);
      gatt.discoverIncludedServices(service.uuid, []);

      // Build data
      const data = [9, 7];
      for (let i = 0; i < data[1]; i++) {
        for (let j = 0; j < 10; j++) {
          data.push(255);
        }
      }

      gatt._queueCommand.callArgWith(1, Buffer.from(data));

      const includedServiceUuids = [
        'ffffffffffffffffffffffffffffffff',
        'ffffffffffffffffffffffffffffffff',
        'ffffffffffffffffffffffffffffffff',
        'ffffffffffffffffffffffffffffffff',
        'ffffffffffffffffffffffffffffffff',
        'ffffffffffffffffffffffffffffffff',
        'ffffffffffffffffffffffffffffffff',
        'ffffffffffffffffffffffffffffff',
        'ffffffffffffffff',
        'ff'
      ];
      assert.calledOnceWithExactly(callback, address, service.uuid, includedServiceUuids);
      assert.callCount(gatt._queueCommand, 1);
      assert.calledOnceWithExactly(gatt.readByTypeRequest, service.startHandle, service.endHandle, 10242);
    });

    it('ATT_OP_READ_BY_TYPE_RESP > event matching uuid', () => {
      const callback = sinon.stub();

      const service = {
        startHandle: 0xaaaa,
        endHandle: 0xffff,
        uuid: 'uuid'
      };

      gatt._services[service.uuid] = service;
      gatt.on('includedServicesDiscover', callback);
      gatt.discoverIncludedServices(service.uuid, ['ff']);

      // Build data
      const data = [9, 7];
      for (let i = 0; i < data[1]; i++) {
        for (let j = 0; j < 10; j++) {
          data.push(255);
        }
      }

      gatt._queueCommand.callArgWith(1, Buffer.from(data));

      assert.calledOnceWithExactly(callback, address, service.uuid, ['ff']);
      assert.callCount(gatt._queueCommand, 1);
      assert.calledOnceWithExactly(gatt.readByTypeRequest, service.startHandle, service.endHandle, 10242);
    });

    it('ATT_OP_READ_BY_TYPE_RESP > event not matching uuid', () => {
      const callback = sinon.stub();

      const service = {
        startHandle: 0xaaaa,
        endHandle: 0xcccc,
        uuid: 'uuid'
      };

      gatt._services[service.uuid] = service;
      gatt.on('includedServicesDiscover', callback);
      gatt.discoverIncludedServices(service.uuid, ['ff']);

      // Build data
      const data = [9, 7];
      for (let i = 0; i < data[1]; i++) {
        for (let j = 0; j < 10; j++) {
          data.push(255);
        }
      }

      gatt._queueCommand.callArgWith(1, Buffer.from(data));

      assert.notCalled(callback);
      assert.callCount(gatt._queueCommand, 2);
      assert.callCount(gatt.readByTypeRequest, 2);
      assert.calledWithExactly(gatt.readByTypeRequest, service.startHandle, service.endHandle, 10242);
      assert.calledWithExactly(gatt.readByTypeRequest, service.startHandle, service.endHandle, 10242);
    });
  });

  describe('addCharacteristics', () => {
    it('register none', () => {
      const callback = sinon.stub();

      const serviceUuid = 'uuid';
      const characteristics = [];

      gatt.on('includedServicesDiscover', callback);
      gatt.addCharacteristics(serviceUuid, characteristics);

      should(gatt._characteristics).deepEqual({ [serviceUuid]: {} });
      should(gatt._descriptors).deepEqual({ [serviceUuid]: {} });
    });

    it('register new', () => {
      const callback = sinon.stub();

      const serviceUuid = 'uuid';
      const characteristics = [
        {
          uuid: 'c_uuid',
          number: 1
        },
        {
          uuid: 'c_uuid',
          number: 2
        },
        {
          uuid: 'c_uuid_2'
        }
      ];

      gatt.on('includedServicesDiscover', callback);
      gatt.addCharacteristics(serviceUuid, characteristics);

      should(gatt._characteristics).deepEqual({
        [serviceUuid]: {
          c_uuid: {
            uuid: 'c_uuid',
            number: 2
          },
          c_uuid_2: {
            uuid: 'c_uuid_2'
          }
        }
      });
      should(gatt._descriptors).deepEqual({ [serviceUuid]: {} });
    });

    it('replace existing', () => {
      const callback = sinon.stub();

      const serviceUuid = 'uuid';
      const characteristics = [
        {
          uuid: 'c_uuid',
          number: 2
        }
      ];

      gatt._characteristics[serviceUuid] = {
        c_uuid: {
          uuid: 'c_uuid',
          number: 1
        }
      };
      gatt.on('includedServicesDiscover', callback);
      gatt.addCharacteristics(serviceUuid, characteristics);

      should(gatt._characteristics).deepEqual({
        [serviceUuid]: {
          c_uuid: {
            uuid: 'c_uuid',
            number: 2
          }
        }
      });
      should(gatt._descriptors).deepEqual({ [serviceUuid]: {} });
    });
  });

  describe('discoverCharacteristics', () => {
    beforeEach(() => {
      gatt._queueCommand = sinon.spy();
      gatt.readByTypeRequest = sinon.spy();
    });

    it('not ATT_OP_READ_BY_TYPE_RESP > non discovered', () => {
      const callbackDiscovered = sinon.stub();
      const callbackDiscover = sinon.stub();

      const service = {
        startHandle: 0xaaaa,
        endHandle: 0xdddd,
        uuid: 'uuid'
      };

      gatt._services[service.uuid] = service;
      gatt.on('characteristicsDiscovered', callbackDiscovered);
      gatt.on('characteristicsDiscover', callbackDiscover);
      gatt.discoverCharacteristics(service.uuid);

      gatt._queueCommand.callArgWith(1, Buffer.from([0x00]));

      assert.calledOnceWithExactly(callbackDiscovered, address, service.uuid, []);
      assert.calledOnceWithExactly(callbackDiscover, address, service.uuid, []);
      assert.callCount(gatt._queueCommand, 1);
      assert.calledOnceWithExactly(gatt.readByTypeRequest, service.startHandle, service.endHandle, 10243);
    });

    it('ATT_OP_READ_BY_TYPE_RESP > queue', () => {
      const callbackDiscovered = sinon.stub();
      const callbackDiscover = sinon.stub();

      const service = {
        startHandle: 0xaaaa,
        endHandle: 0xdddd,
        uuid: 'uuid'
      };

      gatt._services[service.uuid] = service;
      gatt.on('characteristicsDiscovered', callbackDiscovered);
      gatt.on('characteristicsDiscover', callbackDiscover);
      gatt.discoverCharacteristics(service.uuid);

      // Build data
      const data = [9, 8];
      for (let i = 0; i < data[1]; i++) {
        for (let j = 0; j < 10; j++) {
          data.push(i * 10 + j);
        }
      }

      gatt._queueCommand.callArgWith(1, Buffer.from(data));

      assert.notCalled(callbackDiscovered);
      assert.notCalled(callbackDiscover);
      assert.callCount(gatt._queueCommand, 2);
      assert.callCount(gatt.readByTypeRequest, 2);
      assert.calledWithExactly(gatt.readByTypeRequest, service.startHandle, service.endHandle, 10243);
      assert.calledWithExactly(gatt.readByTypeRequest, 19532, 56797, 10243);
    });

    it('ATT_OP_READ_BY_TYPE_RESP > event', () => {
      const callbackDiscovered = sinon.stub();
      const callbackDiscover = sinon.stub();

      const service = {
        startHandle: 0xaaaa,
        endHandle: 0xffff,
        uuid: 'uuid'
      };

      gatt._services[service.uuid] = service;
      gatt.on('characteristicsDiscovered', callbackDiscovered);
      gatt.on('characteristicsDiscover', callbackDiscover);
      gatt.discoverCharacteristics(service.uuid, []);

      // Build data
      const data = [9, 8];
      for (let i = 0; i < data[1]; i++) {
        for (let j = 0; j < 7; j++) {
          data.push(255);
        }
      }

      gatt._queueCommand.callArgWith(1, Buffer.from(data));

      const characteristics = [
        {
          properties: [
            'broadcast',
            'read',
            'writeWithoutResponse',
            'write',
            'notify',
            'indicate',
            'authenticatedSignedWrites',
            'extendedProperties'
          ],
          uuid: 'ffffffffffffffffffffffffffffffff'
        },
        {
          properties: [
            'broadcast',
            'read',
            'writeWithoutResponse',
            'write',
            'notify',
            'indicate',
            'authenticatedSignedWrites',
            'extendedProperties'
          ],
          uuid: 'ffffffffffffffffffffffffffffffff'
        },
        {
          properties: [
            'broadcast',
            'read',
            'writeWithoutResponse',
            'write',
            'notify',
            'indicate',
            'authenticatedSignedWrites',
            'extendedProperties'
          ],
          uuid: 'ffffffffffffffffffffffffffffffff'
        },
        {
          properties: [
            'broadcast',
            'read',
            'writeWithoutResponse',
            'write',
            'notify',
            'indicate',
            'authenticatedSignedWrites',
            'extendedProperties'
          ],
          uuid: 'ffffffffffffffffffffffffffffffff'
        },
        {
          properties: [
            'broadcast',
            'read',
            'writeWithoutResponse',
            'write',
            'notify',
            'indicate',
            'authenticatedSignedWrites',
            'extendedProperties'
          ],
          uuid: 'ffffffffffffffffffffffffffffffff'
        },
        {
          properties: [
            'broadcast',
            'read',
            'writeWithoutResponse',
            'write',
            'notify',
            'indicate',
            'authenticatedSignedWrites',
            'extendedProperties'
          ],
          uuid: 'ffffffffffffffffffffff'
        },
        {
          properties: [
            'broadcast',
            'read',
            'writeWithoutResponse',
            'write',
            'notify',
            'indicate',
            'authenticatedSignedWrites',
            'extendedProperties'
          ],
          uuid: 'ffffff'
        }
      ];
      assert.calledOnceWithExactly(callbackDiscover, address, service.uuid, characteristics);

      const discoveredChars = [
        {
          startHandle: 65535,
          properties: 255,
          valueHandle: 65535,
          uuid: 'ffffffffffffffffffffffffffffffff',
          propsDecoded: [
            'broadcast',
            'read',
            'writeWithoutResponse',
            'write',
            'notify',
            'indicate',
            'authenticatedSignedWrites',
            'extendedProperties'
          ],
          rawProps: 255,
          endHandle: 65534
        },
        {
          startHandle: 65535,
          properties: 255,
          valueHandle: 65535,
          uuid: 'ffffffffffffffffffffffffffffffff',
          propsDecoded: [
            'broadcast',
            'read',
            'writeWithoutResponse',
            'write',
            'notify',
            'indicate',
            'authenticatedSignedWrites',
            'extendedProperties'
          ],
          rawProps: 255,
          endHandle: 65534
        },
        {
          startHandle: 65535,
          properties: 255,
          valueHandle: 65535,
          uuid: 'ffffffffffffffffffffffffffffffff',
          propsDecoded: [
            'broadcast',
            'read',
            'writeWithoutResponse',
            'write',
            'notify',
            'indicate',
            'authenticatedSignedWrites',
            'extendedProperties'
          ],
          rawProps: 255,
          endHandle: 65534
        },
        {
          startHandle: 65535,
          properties: 255,
          valueHandle: 65535,
          uuid: 'ffffffffffffffffffffffffffffffff',
          propsDecoded: [
            'broadcast',
            'read',
            'writeWithoutResponse',
            'write',
            'notify',
            'indicate',
            'authenticatedSignedWrites',
            'extendedProperties'
          ],
          rawProps: 255,
          endHandle: 65534
        },
        {
          startHandle: 65535,
          properties: 255,
          valueHandle: 65535,
          uuid: 'ffffffffffffffffffffffffffffffff',
          propsDecoded: [
            'broadcast',
            'read',
            'writeWithoutResponse',
            'write',
            'notify',
            'indicate',
            'authenticatedSignedWrites',
            'extendedProperties'
          ],
          rawProps: 255,
          endHandle: 65534
        },
        {
          startHandle: 65535,
          properties: 255,
          valueHandle: 65535,
          uuid: 'ffffffffffffffffffffff',
          propsDecoded: [
            'broadcast',
            'read',
            'writeWithoutResponse',
            'write',
            'notify',
            'indicate',
            'authenticatedSignedWrites',
            'extendedProperties'
          ],
          rawProps: 255,
          endHandle: 65534
        },
        {
          startHandle: 65535,
          properties: 255,
          valueHandle: 65535,
          uuid: 'ffffff',
          propsDecoded: [
            'broadcast',
            'read',
            'writeWithoutResponse',
            'write',
            'notify',
            'indicate',
            'authenticatedSignedWrites',
            'extendedProperties'
          ],
          rawProps: 255,
          endHandle: 65535
        }
      ];
      assert.calledOnceWithExactly(callbackDiscovered, address, service.uuid, discoveredChars);
      assert.callCount(gatt._queueCommand, 1);
      assert.calledOnceWithExactly(gatt.readByTypeRequest, service.startHandle, service.endHandle, 10243);
    });

    it('ATT_OP_READ_BY_TYPE_RESP > event not matching uuid', () => {
      const callbackDiscover = sinon.stub();

      const service = {
        startHandle: 0xaaaa,
        endHandle: 0xffff,
        uuid: 'uuid'
      };

      gatt._services[service.uuid] = service;
      gatt.on('characteristicsDiscover', callbackDiscover);
      gatt.discoverCharacteristics(service.uuid, ['ffffff']);

      // Build data
      const data = [9, 8];
      for (let i = 0; i < data[1]; i++) {
        for (let j = 0; j < 7; j++) {
          data.push(255);
        }
      }

      gatt._queueCommand.callArgWith(1, Buffer.from(data));

      const discoveredChars = [
        {
          properties: [
            'broadcast',
            'read',
            'writeWithoutResponse',
            'write',
            'notify',
            'indicate',
            'authenticatedSignedWrites',
            'extendedProperties'
          ],
          uuid: 'ffffff'
        }
      ];
      assert.calledOnceWithExactly(callbackDiscover, address, service.uuid, discoveredChars);
      assert.callCount(gatt._queueCommand, 1);
      assert.calledOnceWithExactly(gatt.readByTypeRequest, service.startHandle, service.endHandle, 10243);
    });

    [{ prop: 'broadcast', byte: 1 }, { prop: 'read', byte: 2 }, { prop: 'writeWithoutResponse', byte: 4 }, { prop: 'write', byte: 8 }, { prop: 'notify', byte: 16 }, { prop: 'indicate', byte: 32 }, { prop: 'authenticatedSignedWrites', byte: 64 }, { prop: 'extendedProperties', byte: 128 }].forEach(data => {
      const { prop, byte } = data;
      it(`ATT_OP_READ_BY_TYPE_RESP > event - ${prop}`, () => {
        const callbackDiscover = sinon.stub();

        const service = {
          startHandle: 0xaaaa,
          endHandle: 0xffff,
          uuid: 'uuid'
        };

        gatt._services[service.uuid] = service;
        gatt.on('characteristicsDiscover', callbackDiscover);
        gatt.discoverCharacteristics(service.uuid, []);

        // Build data
        const data = [9, 7];
        for (let i = 0; i < data[1]; i++) {
          data.push(255);
          data.push(255);
          data.push(byte);
          data.push(255);
          data.push(255);
          data.push(255);
          data.push(255);
        }

        gatt._queueCommand.callArgWith(1, Buffer.from(data));

        assert.calledOnceWithMatch(callbackDiscover, address, service.uuid, sinon.match.every(sinon.match({
          properties: [prop]
        })));
      });
    });
  });

  describe('read', () => {
    const serviceUuid = 'serviceUuid';
    const characteristic = {
      valueHandle: 0xaaaa,
      uuid: 'cUuid'
    };

    beforeEach(() => {
      gatt._queueCommand = sinon.spy();
      gatt.readRequest = sinon.spy();
      gatt._characteristics = {
        [serviceUuid]: {
          [characteristic.uuid]: characteristic
        }
      };
    });

    it('not ATT_OP_READ_RESP not ATT_OP_READ_BLOB_RESP', () => {
      const callback = sinon.stub();

      gatt.on('read', callback);
      gatt.read(serviceUuid, characteristic.uuid);

      const data = Buffer.from([0]);
      gatt._queueCommand.callArgWith(1, Buffer.from(data));

      assert.calledOnce(gatt._queueCommand);
      assert.calledOnceWithExactly(gatt.readRequest, characteristic.valueHandle);

      assert.calledOnceWithExactly(callback, address, serviceUuid, characteristic.uuid, Buffer.alloc(0));
    });

    [11, 13].forEach(opcode => {
      it(`opcode = ${opcode} should send event`, () => {
        const callback = sinon.stub();

        gatt.on('read', callback);
        gatt.read(serviceUuid, characteristic.uuid);

        const data = Buffer.from([opcode, 1, 2, 3]);
        gatt._queueCommand.callArgWith(1, Buffer.from(data));

        assert.calledOnce(gatt._queueCommand);
        assert.calledOnceWithExactly(gatt.readRequest, characteristic.valueHandle);

        assert.calledOnceWithExactly(callback, address, serviceUuid, characteristic.uuid, Buffer.from([1, 2, 3]));
      });

      it(`opcode = ${opcode} should queueCommand`, () => {
        const callback = sinon.stub();
        const readBlobRequest = sinon.stub();

        const data = Buffer.from([opcode, 1, 2, 3]);

        gatt._mtu = data.length;
        gatt.readBlobRequest = readBlobRequest;
        gatt.on('read', callback);
        gatt.read(serviceUuid, characteristic.uuid);

        gatt._queueCommand.callArgWith(1, Buffer.from(data));

        assert.callCount(gatt._queueCommand, 2);
        assert.calledOnceWithExactly(gatt.readRequest, characteristic.valueHandle);

        assert.calledOnceWithExactly(readBlobRequest, characteristic.valueHandle, 3);
        assert.notCalled(callback);
      });
    });
  });

  describe('write', () => {
    const serviceUuid = 'serviceUuid';
    const characteristic = {
      valueHandle: 0xaaaa,
      uuid: 'cUuid'
    };

    beforeEach(() => {
      gatt._characteristics = {
        [serviceUuid]: {
          [characteristic.uuid]: characteristic
        }
      };
      gatt._queueCommand = sinon.spy();
      gatt.writeRequest = sinon.spy();
    });

    it('withoutReponse should queue and emit event', () => {
      const callback = sinon.stub();

      const data = Buffer.from([1, 2, 3]);

      gatt._mtu = data.length;
      gatt.on('write', callback);
      gatt.write(serviceUuid, characteristic.uuid, data, true);

      gatt._queueCommand.callArg(2);

      assert.calledOnce(gatt._queueCommand);
      assert.calledOnceWithExactly(gatt.writeRequest, characteristic.valueHandle, data, true);

      assert.calledOnceWithExactly(callback, address, serviceUuid, characteristic.uuid);
    });

    it('should delegate to longWrite', () => {
      const callback = sinon.stub();

      const data = Buffer.from([1, 2, 3]);

      gatt._mtu = data.length;
      gatt.longWrite = sinon.stub();
      gatt.on('write', callback);
      gatt.write(serviceUuid, characteristic.uuid, data, false);

      assert.notCalled(gatt._queueCommand);
      assert.notCalled(gatt.writeRequest);
      assert.notCalled(callback);

      assert.calledOnceWithExactly(gatt.longWrite, serviceUuid, characteristic.uuid, data, false);
    });

    it('withReponse should not emit event', () => {
      const callback = sinon.stub();

      const data = Buffer.from([1, 2, 3]);

      gatt._mtu = data.length + 5;
      gatt.on('write', callback);
      gatt.write(serviceUuid, characteristic.uuid, data, false);

      gatt._queueCommand.callArgWith(1, data);

      assert.calledOnce(gatt._queueCommand);
      assert.calledOnceWithExactly(gatt.writeRequest, characteristic.valueHandle, data, false);

      assert.notCalled(callback);
    });

    it('withReponse should emit event', () => {
      const callback = sinon.stub();

      const data = Buffer.from([19, 2, 3]);

      gatt._mtu = data.length + 5;
      gatt.on('write', callback);
      gatt.write(serviceUuid, characteristic.uuid, data, false);

      gatt._queueCommand.callArgWith(1, data);

      assert.calledOnce(gatt._queueCommand);
      assert.calledOnceWithExactly(gatt.writeRequest, characteristic.valueHandle, data, false);

      assert.calledWithExactly(callback, address, serviceUuid, characteristic.uuid);
    });
  });

  describe('longWrite', () => {
    const serviceUuid = 'serviceUuid';
    const characteristic = {
      valueHandle: 0xaaaa,
      uuid: 'cUuid'
    };

    beforeEach(() => {
      gatt._queueCommand = sinon.spy();
      gatt.prepareWriteRequest = sinon.spy();
      gatt.executeWriteRequest = sinon.spy();

      gatt._characteristics = {
        [serviceUuid]: {
          [characteristic.uuid]: characteristic
        }
      };
    });

    it('should queue but not emit event', () => {
      const callback = sinon.stub();
      const data = Buffer.from([19, 2, 3, 4, 5, 6]);

      gatt._mtu = 10;
      gatt.on('write', callback);
      gatt.longWrite(serviceUuid, characteristic.uuid, data, false);

      assert.callCount(gatt._queueCommand, 3);

      assert.callCount(gatt.prepareWriteRequest, 2);
      assert.calledWithExactly(gatt.prepareWriteRequest, characteristic.valueHandle, 0, Buffer.from([19, 2, 3, 4, 5]));
      assert.calledWithExactly(gatt.prepareWriteRequest, characteristic.valueHandle, 5, Buffer.from([6]));

      assert.calledOnceWithExactly(gatt.executeWriteRequest, characteristic.valueHandle);

      const resp = Buffer.from([0]);
      gatt._queueCommand.getCall(2).callArgWith(1, resp);

      assert.notCalled(callback);
    });

    it('should queue not emit event (withoutResponse)', () => {
      const callback = sinon.stub();

      const data = Buffer.from([19, 2, 3, 4, 5, 6]);

      gatt._mtu = 10;
      gatt.on('write', callback);
      gatt.longWrite(serviceUuid, characteristic.uuid, data, true);

      assert.callCount(gatt._queueCommand, 3);

      assert.callCount(gatt.prepareWriteRequest, 2);
      assert.calledWithExactly(gatt.prepareWriteRequest, characteristic.valueHandle, 0, Buffer.from([19, 2, 3, 4, 5]));
      assert.calledWithExactly(gatt.prepareWriteRequest, characteristic.valueHandle, 5, Buffer.from([6]));

      assert.calledOnceWithExactly(gatt.executeWriteRequest, characteristic.valueHandle);

      const resp = Buffer.from([25]);
      gatt._queueCommand.getCall(2).callArgWith(1, resp);

      assert.notCalled(callback);
    });

    it('should queue and emit event', () => {
      const callback = sinon.stub();
      const data = Buffer.from([19, 2, 3, 4, 5, 6]);

      gatt._mtu = 10;
      gatt.on('write', callback);
      gatt.longWrite(serviceUuid, characteristic.uuid, data, false);

      assert.callCount(gatt._queueCommand, 3);

      assert.callCount(gatt.prepareWriteRequest, 2);
      assert.calledWithExactly(gatt.prepareWriteRequest, characteristic.valueHandle, 0, Buffer.from([19, 2, 3, 4, 5]));
      assert.calledWithExactly(gatt.prepareWriteRequest, characteristic.valueHandle, 5, Buffer.from([6]));

      assert.calledOnceWithExactly(gatt.executeWriteRequest, characteristic.valueHandle);

      const resp = Buffer.from([25]);
      gatt._queueCommand.getCall(2).callArgWith(1, resp);

      assert.calledOnceWithExactly(callback, address, serviceUuid, characteristic.uuid);
    });
  });

  describe('broadcast', () => {
    const serviceUuid = 'serviceUuid';
    const characteristic = {
      startHandle: 0xaaaa,
      endHandle: 0xcccc,
      valueHandle: 0xbbbb,
      uuid: 'cUuid'
    };

    beforeEach(() => {
      gatt._queueCommand = sinon.spy();
      gatt.readByTypeRequest = sinon.spy();

      gatt._characteristics = {
        [serviceUuid]: {
          [characteristic.uuid]: characteristic
        }
      };
    });

    it('no queue, no event', () => {
      const callback = sinon.stub();

      gatt.on('broadcast', callback);
      gatt.broadcast(serviceUuid, characteristic.uuid, true);

      const data = Buffer.from([0]);
      gatt._queueCommand.callArgWith(1, data);

      assert.calledOnce(gatt._queueCommand);
      assert.calledOnceWithExactly(gatt.readByTypeRequest, characteristic.startHandle, characteristic.endHandle, 10499);

      assert.notCalled(callback);
    });

    it('queue, no event', () => {
      const writeRequest = sinon.spy();
      const callback = sinon.stub();

      gatt.writeRequest = writeRequest;
      gatt.on('broadcast', callback);
      gatt.broadcast(serviceUuid, characteristic.uuid, true);

      const data = Buffer.from([9, 2, 3, 4, 5, 6, 7, 8]);
      gatt._queueCommand.getCall(0).callArgWith(1, data);

      const writeData = Buffer.from([9, 2, 3, 4]);
      gatt._queueCommand.getCall(1).callArgWith(1, writeData);

      assert.callCount(gatt._queueCommand, 2);
      assert.calledOnceWithExactly(gatt.readByTypeRequest, characteristic.startHandle, characteristic.endHandle, 10499);
      assert.calledOnceWithExactly(writeRequest, 1027, Buffer.from([5, 6]), false);

      assert.notCalled(callback);
    });

    it('queue and event', () => {
      const writeRequest = sinon.spy();
      const callback = sinon.stub();

      gatt.writeRequest = writeRequest;
      gatt.on('broadcast', callback);
      gatt.broadcast(serviceUuid, characteristic.uuid, false);

      const data = Buffer.from([9, 2, 3, 4, 5, 6, 7, 8]);
      gatt._queueCommand.getCall(0).callArgWith(1, data);

      const writeData = Buffer.from([19, 2, 3, 4]);
      gatt._queueCommand.getCall(1).callArgWith(1, writeData);

      assert.callCount(gatt._queueCommand, 2);
      assert.calledOnceWithExactly(gatt.readByTypeRequest, characteristic.startHandle, characteristic.endHandle, 10499);
      assert.calledOnceWithExactly(writeRequest, 1027, Buffer.from([4, 6]), false);

      assert.calledOnceWithExactly(callback, address, serviceUuid, characteristic.uuid, false);
    });
  });

  describe('notify', () => {
    const serviceUuid = 'serviceUuid';
    let characteristic;

    beforeEach(() => {
      characteristic = {
        uuid: 'cUuid',
        startHandle: 0xaaaa,
        endHandle: 0xdddd
      };

      gatt._queueCommand = sinon.spy();
      gatt.readByTypeRequest = sinon.spy();

      gatt._characteristics = {
        [serviceUuid]: {
          [characteristic.uuid]: characteristic
        }
      };
    });

    it('not ATT_OP_READ_BY_TYPE_RESP, no queue, no event', () => {
      const callback = sinon.spy();

      gatt.on('notify', callback);
      gatt.notify(serviceUuid, characteristic.uuid, true);

      const data = Buffer.from([0]);
      gatt._queueCommand.callArgWith(1, data);

      assert.calledOnceWithExactly(gatt.readByTypeRequest, characteristic.startHandle, characteristic.endHandle, 10498);
      assert.callCount(gatt._queueCommand, 1);
      assert.notCalled(callback);
    });

    [
      { name: 'notify, no properties', notify: true, properties: 0x0, expectedValue: [4, 5] },
      { name: 'notify, useNotify', notify: true, properties: 0x10, expectedValue: [5, 5] },
      { name: 'notify, useIndicate', notify: true, properties: 0x20, expectedValue: [6, 5] },
      { name: 'not notify, no properties', notify: false, properties: 0x0, expectedValue: [4, 5] },
      { name: 'not notify, useNotify', notify: false, properties: 0x10, expectedValue: [4, 5] },
      { name: 'not notify, useIndicate', notify: false, properties: 0x20, expectedValue: [4, 5] }
    ].forEach(props => {
      const { name, notify, expectedValue, properties } = props;

      it(`no event with ${name}`, () => {
        characteristic.properties = properties;
        const callback = sinon.spy();

        gatt.on('notify', callback);
        gatt.writeRequest = sinon.spy();
        gatt.notify(serviceUuid, characteristic.uuid, notify);

        const data = Buffer.from([9, 1, 2, 3, 4, 5]);
        gatt._queueCommand.getCall(0).callArgWith(1, data);
        gatt._queueCommand.getCall(1).callArgWith(1, data);

        assert.calledOnceWithExactly(gatt.readByTypeRequest, characteristic.startHandle, characteristic.endHandle, 10498);
        assert.callCount(gatt._queueCommand, 2);
        assert.calledOnceWithExactly(gatt.writeRequest, 770, Buffer.from(expectedValue), false);
        assert.notCalled(callback);
      });
    });

    it('should emit event', () => {
      const callback = sinon.spy();

      gatt.on('notify', callback);
      gatt.writeRequest = sinon.spy();
      gatt.notify(serviceUuid, characteristic.uuid, true);

      const data = Buffer.from([9, 1, 2, 3, 4, 5]);
      gatt._queueCommand.callArgWith(1, data);
      const eventData = Buffer.from([19]);
      gatt._queueCommand.getCall(1).callArgWith(1, eventData);

      assert.calledOnceWithExactly(gatt.readByTypeRequest, characteristic.startHandle, characteristic.endHandle, 10498);
      assert.callCount(gatt._queueCommand, 2);
      assert.calledOnceWithExactly(gatt.writeRequest, 770, Buffer.from([4, 5]), false);
      assert.calledOnceWithExactly(callback, address, serviceUuid, characteristic.uuid, true);
    });
  });

  describe('discoverDescriptors', () => {
    const serviceUuid = 'serviceUuid';
    const characteristic = {
      uuid: 'cUuid',
      valueHandle: 0xcccc,
      endHandle: 0xeeee
    };

    beforeEach(() => {
      gatt._characteristics = {
        [serviceUuid]: {
          [characteristic.uuid]: characteristic
        }
      };
      gatt._descriptors = {
        [serviceUuid]: {
        }
      };

      gatt._queueCommand = sinon.spy();
      gatt.findInfoRequest = sinon.spy();
    });

    it('should enqueue command', () => {
      const callback = sinon.spy();

      gatt.on('descriptorsDiscover', callback);
      gatt.discoverDescriptors(serviceUuid, characteristic.uuid);

      // Build data
      const data = [5, 1];
      for (let i = 0; i < data[1]; i++) {
        for (let j = 0; j < 4; j++) {
          data.push(i * 10 + j);
        }
      }
      gatt._queueCommand.callArgWith(1, Buffer.from(data));

      assert.callCount(gatt._queueCommand, 2);
      assert.callCount(gatt.findInfoRequest, 2);
      assert.calledWithExactly(gatt.findInfoRequest, characteristic.valueHandle + 1, characteristic.endHandle);
      assert.calledWithExactly(gatt.findInfoRequest, 257, characteristic.endHandle);
      assert.notCalled(callback);
    });

    it('should enqueue command mismatch descriptor handle', () => {
      const callback = sinon.spy();

      gatt.on('descriptorsDiscover', callback);
      gatt.discoverDescriptors(serviceUuid, characteristic.uuid);

      // Build data
      const data = [5, 1];
      for (let i = 0; i < data[1]; i++) {
        for (let j = 0; j < 4; j++) {
          data.push(i * 10 + j);
        }
      }
      gatt._queueCommand.callArgWith(1, Buffer.from(data));

      assert.callCount(gatt._queueCommand, 2);
      assert.callCount(gatt.findInfoRequest, 2);
      assert.calledWithExactly(gatt.findInfoRequest, characteristic.valueHandle + 1, characteristic.endHandle);
      assert.calledWithExactly(gatt.findInfoRequest, 257, characteristic.endHandle);
      assert.notCalled(callback);
    });

    it('should emit event', () => {
      const callback = sinon.spy();

      gatt.on('descriptorsDiscover', callback);
      gatt.discoverDescriptors(serviceUuid, characteristic.uuid);

      // Build data
      const data = [5, 1];
      for (let i = 0; i < data[1]; i++) {
        for (let j = 0; j < 4; j++) {
          data.push(238);
        }
      }
      gatt._queueCommand.callArgWith(1, Buffer.from(data));

      assert.callCount(gatt._queueCommand, 1);
      assert.calledOnceWithExactly(gatt.findInfoRequest, characteristic.valueHandle + 1, characteristic.endHandle);
      assert.calledOnceWithExactly(callback, address, serviceUuid, characteristic.uuid, ['eeee']);
    });
  });

  describe('readValue', () => {
    const serviceUuid = 'serviceUuid';
    const characteristicUuid = 'characteristicUuid';
    const descriptor = {
      uuid: 'descriptorUuid',
      handle: 0x3344
    };
    let callback;

    beforeEach(() => {
      callback = sinon.spy();

      gatt._descriptors = {
        [serviceUuid]: {
          [characteristicUuid]: {
            [descriptor.uuid]: descriptor
          }
        }
      };

      gatt._queueCommand = sinon.spy();
      gatt.readRequest = sinon.spy();
      gatt.readBlobRequest = sinon.spy();
      gatt.on('valueRead', callback);
    });

    it('should emit event by default', () => {
      gatt.readValue(serviceUuid, characteristicUuid, descriptor.uuid);

      const data = Buffer.from([0]);
      gatt._queueCommand.callArgWith(1, data);

      assert.callCount(gatt._queueCommand, 1);
      assert.calledOnceWithExactly(gatt.readRequest, descriptor.handle);
      assert.calledOnceWithExactly(callback, address, serviceUuid, characteristicUuid, descriptor.uuid, Buffer.alloc(0));
    });

    it('should emit event on different data.length/mtu', () => {
      gatt._mtu = 80;
      gatt.readValue(serviceUuid, characteristicUuid, descriptor.uuid);

      const data = Buffer.from([11]);
      gatt._queueCommand.callArgWith(1, data);

      assert.callCount(gatt._queueCommand, 1);
      assert.calledOnceWithExactly(gatt.readRequest, descriptor.handle);
      assert.calledOnceWithExactly(callback, address, serviceUuid, characteristicUuid, descriptor.uuid, Buffer.alloc(0));
    });

    it('should enqueue on same data.length/mtu', () => {
      gatt._mtu = 7;
      gatt.readValue(serviceUuid, characteristicUuid, descriptor.uuid);

      const data = Buffer.from([13, 1, 2, 3, 4, 5, 6]);
      gatt._queueCommand.callArgWith(1, data);

      assert.callCount(gatt._queueCommand, 2);
      assert.calledOnceWithExactly(gatt.readRequest, descriptor.handle);
      assert.calledOnceWithExactly(gatt.readBlobRequest, descriptor.handle, 6);
      assert.notCalled(callback);
    });
  });

  describe('writeValue', () => {
    const serviceUuid = 'serviceUuid';
    const characteristicUuid = 'characteristicUuid';
    const descriptor = {
      uuid: 'descriptorUuid',
      handle: 0x3344
    };
    let callback;

    beforeEach(() => {
      callback = sinon.spy();

      gatt._descriptors = {
        [serviceUuid]: {
          [characteristicUuid]: {
            [descriptor.uuid]: descriptor
          }
        }
      };

      gatt._queueCommand = sinon.spy();
      gatt.writeRequest = sinon.spy();
      gatt.on('valueWrite', callback);
    });

    it('should not emit event', () => {
      const data = Buffer.from([0]);
      gatt.writeValue(serviceUuid, characteristicUuid, descriptor.uuid, data);

      gatt._queueCommand.callArgWith(1, data);

      assert.callCount(gatt._queueCommand, 1);
      assert.calledOnceWithExactly(gatt.writeRequest, descriptor.handle, data, false);
      assert.notCalled(callback);
    });

    it('should emit event', () => {
      const data = Buffer.from([19]);
      gatt.writeValue(serviceUuid, characteristicUuid, descriptor.uuid, data);

      gatt._queueCommand.callArgWith(1, data);

      assert.callCount(gatt._queueCommand, 1);
      assert.calledOnceWithExactly(gatt.writeRequest, descriptor.handle, data, false);
      assert.calledOnceWithExactly(callback, address, serviceUuid, characteristicUuid, descriptor.uuid);
    });
  });

  describe('readHandle', () => {
    let callback;
    const handle = 'handle';

    beforeEach(() => {
      callback = sinon.spy();

      gatt._queueCommand = sinon.spy();
      gatt.readRequest = sinon.spy();
      gatt.readBlobRequest = sinon.spy();
      gatt.on('handleRead', callback);
    });

    it('should emit event by default', () => {
      gatt.readHandle(handle);

      const data = Buffer.from([0]);
      gatt._queueCommand.callArgWith(1, data);

      assert.callCount(gatt._queueCommand, 1);
      assert.calledOnceWithExactly(gatt.readRequest, handle);
      assert.calledOnceWithExactly(callback, address, handle, Buffer.alloc(0));
    });

    it('should emit event on different data.length/mtu', () => {
      gatt._mtu = 80;
      gatt.readHandle(handle);

      const data = Buffer.from([11]);
      gatt._queueCommand.callArgWith(1, data);

      assert.callCount(gatt._queueCommand, 1);
      assert.calledOnceWithExactly(gatt.readRequest, handle);
      assert.calledOnceWithExactly(callback, address, handle, Buffer.alloc(0));
    });

    it('should enqueue on same data.length/mtu', () => {
      gatt._mtu = 7;
      gatt.readHandle(handle);

      const data = Buffer.from([13, 1, 2, 3, 4, 5, 6]);
      gatt._queueCommand.callArgWith(1, data);

      assert.callCount(gatt._queueCommand, 2);
      assert.calledOnceWithExactly(gatt.readRequest, handle);
      assert.calledOnceWithExactly(gatt.readBlobRequest, handle, 6);
      assert.notCalled(callback);
    });
  });

  describe('writeHandle', () => {
    const handle = 'handle';
    let callback;

    beforeEach(() => {
      callback = sinon.spy();

      gatt._queueCommand = sinon.spy();
      gatt.writeRequest = sinon.spy();
      gatt.on('handleWrite', callback);
    });

    it('should not emit event', () => {
      const data = Buffer.from([0]);
      gatt.writeHandle(handle, data, false);

      gatt._queueCommand.callArgWith(1, data);

      assert.callCount(gatt._queueCommand, 1);
      assert.calledOnceWithExactly(gatt.writeRequest, handle, data, false);
      assert.notCalled(callback);
    });

    it('should emit event', () => {
      const data = Buffer.from([19]);
      gatt.writeHandle(handle, data, false);

      gatt._queueCommand.callArgWith(1, data);

      assert.callCount(gatt._queueCommand, 1);
      assert.calledOnceWithExactly(gatt.writeRequest, handle, data, false);
      assert.calledOnceWithExactly(callback, address, handle);
    });

    it('should emit event on withoutResponse', () => {
      const data = Buffer.from([0]);
      gatt.writeHandle(handle, data, true);

      gatt._queueCommand.callArgWith(2, data);

      assert.callCount(gatt._queueCommand, 1);
      assert.calledOnceWithExactly(gatt.writeRequest, handle, data, true);
      assert.calledOnceWithExactly(callback, address, handle);
    });
  });
});
