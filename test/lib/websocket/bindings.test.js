const sinon = require('sinon');
const should = require('should');
const proxyquire = require('proxyquire').noCallThru();

const { assert } = sinon;

describe('webbluetooth bindings', () => {
  const FakeWebsocket = sinon.spy();

  const Bindings = proxyquire('../../../lib/websocket/bindings', {
    ws: FakeWebsocket
  });

  let bindings;

  beforeEach(() => {
    FakeWebsocket.prototype.on = sinon.spy();

    bindings = new Bindings();
  });

  afterEach(() => {
    sinon.reset();
  });

  it('constructor', () => {
    assert.calledOnceWithExactly(FakeWebsocket, 'ws://localhost:2846');
    assert.callCount(bindings._ws.on, 4);
    assert.calledWithMatch(bindings._ws.on, 'open', sinon.match.func);
    assert.calledWithMatch(bindings._ws.on, 'close', sinon.match.func);
    assert.calledWithMatch(bindings._ws.on, 'error', sinon.match.func);
    assert.calledWithMatch(bindings._ws.on, 'message', sinon.match.func);
  });

  it('onClose - should emit stateChange', () => {
    const callback = sinon.spy();

    bindings.on('stateChange', callback);
    bindings._onClose();

    assert.calledOnceWithExactly(callback, 'poweredOff');
  });

  describe('_onMessage', () => {
    const mainEvent = {
      peripheralUuid: 'peripheralUuid',
      address: 'address',
      addressType: 'addressType',
      connectable: 'connectable',
      advertisement: {
        localName: 'localName',
        txPowerLevel: 34,
        serviceUuids: 'ad.serviceUuids',
        manufacturerData: null,
        serviceData: null
      },
      rssi: 'rssi',
      serviceUuids: 'serviceUuids',
      serviceUuid: 'serviceUuid',
      includedServiceUuids: 'includedServiceUuids',
      characteristics: 'characteristics',
      characteristicUuid: 'characteristicUuid',
      isNotification: 'isNotification',
      state: 'state',
      descriptors: 'descriptors',
      descriptorUuid: 'descriptorUuid',
      handle: 'handle'
    };

    [
      { type: 'stateChange', event: ['stateChange', mainEvent.state] },
      { type: 'discover', event: ['discover', mainEvent.peripheralUuid, mainEvent.address, mainEvent.addressType, mainEvent.connectable, mainEvent.advertisement, mainEvent.rssi] },
      { type: 'connect', event: ['connect', mainEvent.peripheralUuid] },
      { type: 'disconnect', event: ['disconnect', mainEvent.peripheralUuid] },
      { type: 'rssiUpdate', event: ['rssiUpdate', mainEvent.peripheralUuid, mainEvent.rssi] },
      { type: 'servicesDiscover', event: ['servicesDiscover', mainEvent.peripheralUuid, mainEvent.serviceUuids] },
      { type: 'includedServicesDiscover', event: ['includedServicesDiscover', mainEvent.peripheralUuid, mainEvent.serviceUuid, mainEvent.includedServiceUuids] },
      { type: 'characteristicsDiscover', event: ['characteristicsDiscover', mainEvent.peripheralUuid, mainEvent.serviceUuid, mainEvent.characteristics] },
      { type: 'read', event: ['read', mainEvent.peripheralUuid, mainEvent.serviceUuid, mainEvent.characteristicUuid, null, mainEvent.isNotification] },
      { type: 'write', event: ['write', mainEvent.peripheralUuid, mainEvent.serviceUuid, mainEvent.characteristicUuid] },
      { type: 'broadcast', event: ['broadcast', mainEvent.peripheralUuid, mainEvent.serviceUuid, mainEvent.characteristicUuid, mainEvent.state] },
      { type: 'notify', event: ['notify', mainEvent.peripheralUuid, mainEvent.serviceUuid, mainEvent.characteristicUuid, mainEvent.state] },
      { type: 'descriptorsDiscover', event: ['descriptorsDiscover', mainEvent.peripheralUuid, mainEvent.serviceUuid, mainEvent.characteristicUuid, mainEvent.descriptors] },
      { type: 'valueRead', event: ['valueRead', mainEvent.peripheralUuid, mainEvent.serviceUuid, mainEvent.characteristicUuid, mainEvent.descriptorUuid, null] },
      { type: 'valueWrite', event: ['valueWrite', mainEvent.peripheralUuid, mainEvent.serviceUuid, mainEvent.characteristicUuid, mainEvent.descriptorUuid] },
      { type: 'handleRead', event: ['handleRead', mainEvent.peripheralUuid, mainEvent.handle, null] },
      { type: 'handleWrite', event: ['handleWrite', mainEvent.peripheralUuid, mainEvent.handle] },
      { type: 'handleNotify', event: ['handleNotify', mainEvent.peripheralUuid, mainEvent.handle, null] }
    ].forEach(args => {
      const { type, event } = args;
      it(`should emit ${type}`, () => {
        bindings.emit = sinon.spy();

        const eventMsg = Object.assign({ type }, mainEvent);
        bindings._onMessage(eventMsg);

        assert.calledOnceWithExactly(bindings.emit, ...event);
      });
    });
  });

  describe('sendCommand', () => {
    it('should not callback without error', () => {
      const errorCallback = sinon.spy();

      bindings._ws.send = sinon.spy();
      bindings._sendCommand({ command: 3 }, errorCallback);

      bindings._ws.send.callArgWith(1, null);

      assert.calledOnceWithMatch(bindings._ws.send, '{"command":3}', sinon.match.func);
      assert.notCalled(errorCallback);
    });

    it('should callback error', () => {
      const errorCallback = sinon.spy();

      bindings._ws.send = sinon.spy();
      bindings._sendCommand({ command: 3 }, errorCallback);

      bindings._ws.send.callArgWith(1, 'error');

      assert.calledOnceWithMatch(bindings._ws.send, '{"command":3}', sinon.match.func);
      assert.calledOnceWithExactly(errorCallback, 'error');
    });

    it('should not callback error as it is missing', () => {
      bindings._ws.send = sinon.spy();
      bindings._sendCommand({ command: 3 });

      bindings._ws.send.callArgWith(1, 'error');

      assert.calledOnceWithMatch(bindings._ws.send, '{"command":3}', sinon.match.func);
    });
  });

  it('startScanning - should emit scanStart', () => {
    const callback = sinon.spy();
    const serviceUuids = ['service'];
    const allowDuplicates = true;

    bindings._sendCommand = sinon.spy();
    bindings.on('scanStart', callback);
    bindings.startScanning(serviceUuids, allowDuplicates);

    const startCommand = {
      action: 'startScanning',
      serviceUuids,
      allowDuplicates
    };
    assert.calledOnceWithExactly(callback);
    assert.calledOnceWithExactly(bindings._sendCommand, startCommand);
    should(bindings._startScanCommand).deepEqual(startCommand);
  });

  it('stopScanning - should emit scanStop', () => {
    const callback = sinon.spy();

    bindings._startScanCommand = 'command';
    bindings._sendCommand = sinon.spy();
    bindings.on('scanStop', callback);
    bindings.stopScanning();

    const startCommand = {
      action: 'stopScanning'
    };
    assert.calledOnceWithExactly(callback);
    assert.calledOnceWithExactly(bindings._sendCommand, startCommand);
    should(bindings._startScanCommand).equal(null);
  });

  it('connect - should send connect command', () => {
    const deviceUuid = 'deviceUuid';

    bindings._peripherals[deviceUuid] = { uuid: 'uuid' };
    bindings._startScanCommand = 'command';
    bindings._sendCommand = sinon.spy();
    bindings.connect(deviceUuid);

    const startCommand = {
      action: 'connect',
      peripheralUuid: 'uuid'
    };
    assert.calledOnceWithExactly(bindings._sendCommand, startCommand);
  });

  it('disconnect - should send disconnect command', () => {
    const deviceUuid = 'deviceUuid';

    bindings._peripherals[deviceUuid] = { uuid: 'uuid' };
    bindings._startScanCommand = 'command';
    bindings._sendCommand = sinon.spy();
    bindings.disconnect(deviceUuid);

    const startCommand = {
      action: 'disconnect',
      peripheralUuid: 'uuid'
    };
    assert.calledOnceWithExactly(bindings._sendCommand, startCommand);
  });

  it('updateRssi - should send updateRssi command', () => {
    const deviceUuid = 'deviceUuid';

    bindings._peripherals[deviceUuid] = { uuid: 'uuid' };
    bindings._startScanCommand = 'command';
    bindings._sendCommand = sinon.spy();
    bindings.updateRssi(deviceUuid);

    const startCommand = {
      action: 'updateRssi',
      peripheralUuid: 'uuid'
    };
    assert.calledOnceWithExactly(bindings._sendCommand, startCommand);
  });

  it('discoverServices - should send discoverServices command', () => {
    const deviceUuid = 'deviceUuid';
    const uuids = 'uuids';

    bindings._peripherals[deviceUuid] = { uuid: 'uuid' };
    bindings._startScanCommand = 'command';
    bindings._sendCommand = sinon.spy();
    bindings.discoverServices(deviceUuid, uuids);

    const startCommand = {
      action: 'discoverServices',
      peripheralUuid: 'uuid',
      uuids
    };
    assert.calledOnceWithExactly(bindings._sendCommand, startCommand);
  });

  it('discoverIncludedServices - should send discoverIncludedServices command', () => {
    const deviceUuid = 'deviceUuid';
    const serviceUuid = 'serviceUuid';
    const serviceUuids = 'serviceUuids';

    bindings._peripherals[deviceUuid] = { uuid: 'uuid' };
    bindings._startScanCommand = 'command';
    bindings._sendCommand = sinon.spy();
    bindings.discoverIncludedServices(deviceUuid, serviceUuid, serviceUuids);

    const startCommand = {
      action: 'discoverIncludedServices',
      peripheralUuid: 'uuid',
      serviceUuid,
      serviceUuids
    };
    assert.calledOnceWithExactly(bindings._sendCommand, startCommand);
  });

  it('discoverCharacteristics - should send discoverIncludedServices command', () => {
    const deviceUuid = 'deviceUuid';
    const serviceUuid = 'serviceUuid';
    const characteristicUuids = 'characteristicUuids';

    bindings._peripherals[deviceUuid] = { uuid: 'uuid' };
    bindings._startScanCommand = 'command';
    bindings._sendCommand = sinon.spy();
    bindings.discoverCharacteristics(deviceUuid, serviceUuid, characteristicUuids);

    const startCommand = {
      action: 'discoverCharacteristics',
      peripheralUuid: 'uuid',
      serviceUuid,
      characteristicUuids
    };
    assert.calledOnceWithExactly(bindings._sendCommand, startCommand);
  });

  it('read - should send read command', () => {
    const deviceUuid = 'deviceUuid';
    const serviceUuid = 'serviceUuid';
    const characteristicUuid = 'characteristicUuid';

    bindings._peripherals[deviceUuid] = { uuid: 'uuid' };
    bindings._startScanCommand = 'command';
    bindings._sendCommand = sinon.spy();
    bindings.read(deviceUuid, serviceUuid, characteristicUuid);

    const startCommand = {
      action: 'read',
      peripheralUuid: 'uuid',
      serviceUuid,
      characteristicUuid
    };
    assert.calledOnceWithExactly(bindings._sendCommand, startCommand);
  });

  it('write - should send write command', () => {
    const deviceUuid = 'deviceUuid';
    const serviceUuid = 'serviceUuid';
    const characteristicUuid = 'characteristicUuid';
    const data = Buffer.from([0x34, 0x12]);
    const withoutResponse = true;

    bindings._peripherals[deviceUuid] = { uuid: 'uuid' };
    bindings._startScanCommand = 'command';
    bindings._sendCommand = sinon.spy();
    bindings.write(deviceUuid, serviceUuid, characteristicUuid, data, withoutResponse);

    const startCommand = {
      action: 'write',
      peripheralUuid: 'uuid',
      serviceUuid,
      characteristicUuid,
      data: '3412',
      withoutResponse
    };
    assert.calledOnceWithExactly(bindings._sendCommand, startCommand);
  });

  it('broadcast - should send broadcast command', () => {
    const deviceUuid = 'deviceUuid';
    const serviceUuid = 'serviceUuid';
    const characteristicUuid = 'characteristicUuid';
    const broadcast = true;

    bindings._peripherals[deviceUuid] = { uuid: 'uuid' };
    bindings._startScanCommand = 'command';
    bindings._sendCommand = sinon.spy();
    bindings.broadcast(deviceUuid, serviceUuid, characteristicUuid, broadcast);

    const startCommand = {
      action: 'broadcast',
      peripheralUuid: 'uuid',
      serviceUuid,
      characteristicUuid,
      broadcast
    };
    assert.calledOnceWithExactly(bindings._sendCommand, startCommand);
  });

  it('notify - should send notify command', () => {
    const deviceUuid = 'deviceUuid';
    const serviceUuid = 'serviceUuid';
    const characteristicUuid = 'characteristicUuid';
    const notify = true;

    bindings._peripherals[deviceUuid] = { uuid: 'uuid' };
    bindings._startScanCommand = 'command';
    bindings._sendCommand = sinon.spy();
    bindings.notify(deviceUuid, serviceUuid, characteristicUuid, notify);

    const startCommand = {
      action: 'notify',
      peripheralUuid: 'uuid',
      serviceUuid,
      characteristicUuid,
      notify
    };
    assert.calledOnceWithExactly(bindings._sendCommand, startCommand);
  });

  it('discoverDescriptors - should send discoverDescriptors command', () => {
    const deviceUuid = 'deviceUuid';
    const serviceUuid = 'serviceUuid';
    const characteristicUuid = 'characteristicUuid';

    bindings._peripherals[deviceUuid] = { uuid: 'uuid' };
    bindings._startScanCommand = 'command';
    bindings._sendCommand = sinon.spy();
    bindings.discoverDescriptors(deviceUuid, serviceUuid, characteristicUuid);

    const startCommand = {
      action: 'discoverDescriptors',
      peripheralUuid: 'uuid',
      serviceUuid,
      characteristicUuid
    };
    assert.calledOnceWithExactly(bindings._sendCommand, startCommand);
  });

  it('readValue - should send readValue command', () => {
    const deviceUuid = 'deviceUuid';
    const serviceUuid = 'serviceUuid';
    const characteristicUuid = 'characteristicUuid';
    const descriptorUuid = 'descriptorUuid';

    bindings._peripherals[deviceUuid] = { uuid: 'uuid' };
    bindings._startScanCommand = 'command';
    bindings._sendCommand = sinon.spy();
    bindings.readValue(deviceUuid, serviceUuid, characteristicUuid, descriptorUuid);

    const startCommand = {
      action: 'readValue',
      peripheralUuid: 'uuid',
      serviceUuid,
      characteristicUuid,
      descriptorUuid
    };
    assert.calledOnceWithExactly(bindings._sendCommand, startCommand);
  });

  it('writeValue - should send writeValue command', () => {
    const deviceUuid = 'deviceUuid';
    const serviceUuid = 'serviceUuid';
    const characteristicUuid = 'characteristicUuid';
    const descriptorUuid = 'descriptorUuid';
    const data = Buffer.from([0x34, 0x12]);

    bindings._peripherals[deviceUuid] = { uuid: 'uuid' };
    bindings._startScanCommand = 'command';
    bindings._sendCommand = sinon.spy();
    bindings.writeValue(deviceUuid, serviceUuid, characteristicUuid, descriptorUuid, data);

    const startCommand = {
      action: 'writeValue',
      peripheralUuid: 'uuid',
      serviceUuid,
      characteristicUuid,
      descriptorUuid,
      data: '3412'
    };
    assert.calledOnceWithExactly(bindings._sendCommand, startCommand);
  });

  it('readHandle - should send readHandle command', () => {
    const deviceUuid = 'deviceUuid';
    const handle = 'handle';

    bindings._peripherals[deviceUuid] = { uuid: 'uuid' };
    bindings._startScanCommand = 'command';
    bindings._sendCommand = sinon.spy();
    bindings.readHandle(deviceUuid, handle);

    const startCommand = {
      action: 'readHandle',
      peripheralUuid: 'uuid',
      handle
    };
    assert.calledOnceWithExactly(bindings._sendCommand, startCommand);
  });

  it('writeHandle - should send writeHandle command', () => {
    const deviceUuid = 'deviceUuid';
    const handle = 'handle';
    const data = Buffer.from([0x34, 0x12]);
    const withoutResponse = true;

    bindings._peripherals[deviceUuid] = { uuid: 'uuid' };
    bindings._startScanCommand = 'command';
    bindings._sendCommand = sinon.spy();
    bindings.writeHandle(deviceUuid, handle, data, withoutResponse);

    const startCommand = {
      action: 'writeHandle',
      peripheralUuid: 'uuid',
      handle,
      data: '3412',
      withoutResponse
    };
    assert.calledOnceWithExactly(bindings._sendCommand, startCommand);
  });
});
