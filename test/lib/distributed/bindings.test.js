const proxyquire = require('proxyquire').noCallThru();
const should = require('should');
const sinon = require('sinon');
const { assert, fake } = sinon;

describe('distributed bindings', () => {
  const wssOn = sinon.stub().resolves(null);

  const WebSocketServerStub = sinon.stub();
  WebSocketServerStub.prototype.on = wssOn;

  const Bindings = proxyquire('../../../lib/distributed/bindings', {
    ws: { Server: WebSocketServerStub }
  });

  const baseMessage = {
    peripheralUuid: 'peripheralUuid',
    address: 'address',
    addressType: 'addressType',
    connectable: 'connectable',
    advertisement: {
      localName: 'advertisement.localName',
      txPowerLevel: 'advertisement.txPowerLevel',
      serviceUuids: 'advertisement.serviceUuids',
      manufacturerData: '000102',
      serviceData: '030405'
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

  let clock;

  beforeEach(() => {
    clock = sinon.useFakeTimers({ toFake: ['nextTick'] });
  });

  afterEach(() => {
    clock.restore();
    sinon.reset();
  });

  it('Constructor initialization', () => {
    const bindings = new Bindings();

    assert.calledOnce(WebSocketServerStub);
    assert.calledWith(WebSocketServerStub, {
      port: 0xB1e
    });

    assert.calledOnce(wssOn);
    assert.calledWith(wssOn, 'connection', sinon.match.typeOf('function'));

    should(bindings.eventNames()).eql(['close', 'message']);
  });

  it('Constructor stateChange event', () => {
    const stateChange = fake.resolves(null);

    const bindings = new Bindings();
    bindings.on('stateChange', stateChange);

    clock.tick(1);

    assert.calledOnce(stateChange);
    assert.calledWith(stateChange, 'poweredOff');
  });

  it('_onConnection single client', () => {
    const stateChange = fake.resolves(null);
    const fakeWs = {
      on: fake.resolves(null)
    };

    const bindings = new Bindings();
    bindings._wss = {
      clients: [0]
    };
    bindings.on('stateChange', stateChange);

    bindings._onConnection(fakeWs);

    assert.calledOnce(stateChange);
    assert.calledWith(stateChange, 'poweredOn');

    assert.calledTwice(fakeWs.on);
    assert.calledWith(fakeWs.on, 'close', sinon.match.func);
    assert.calledWith(fakeWs.on, 'message', sinon.match.func);
  });

  it('_onConnection start scan', () => {
    const stateChange = fake.resolves(null);
    const fakeWs = {
      on: fake.resolves(null),
      send: fake.resolves(null)
    };

    const bindings = new Bindings();
    bindings._startScanCommand = {};
    bindings._wss = {
      clients: []
    };
    bindings.on('stateChange', stateChange);

    bindings._onConnection(fakeWs);

    assert.notCalled(stateChange);

    assert.calledOnce(fakeWs.send);
    assert.calledWith(fakeWs.send, '{}');

    assert.calledTwice(fakeWs.on);
    assert.calledWith(fakeWs.on, 'close', sinon.match.func);
    assert.calledWith(fakeWs.on, 'message', sinon.match.func);
  });

  it('_onClose no clients', () => {
    const stateChange = fake.resolves(null);

    const bindings = new Bindings();
    bindings._wss = {
      clients: []
    };
    bindings.on('stateChange', stateChange);

    bindings._onClose(null);

    assert.calledOnce(stateChange);
    assert.calledWith(stateChange, 'poweredOff');
  });

  it('_onClose with clients', () => {
    const stateChange = fake.resolves(null);

    const bindings = new Bindings();
    bindings._wss = {
      clients: [0]
    };
    bindings.on('stateChange', stateChange);

    bindings._onClose(null);

    assert.notCalled(stateChange);
  });

  it('_onMessage -> discover', () => {
    const eventFunc = fake.resolves(null);

    const bindings = new Bindings();
    bindings.on('discover', eventFunc);

    const message = Object.assign({}, baseMessage, { type: 'discover' });
    bindings._onMessage('ws', message);

    assert.calledOnce(eventFunc);

    const expectedAdvertisement = {
      localName: message.advertisement.localName,
      txPowerLevel: message.advertisement.txPowerLevel,
      serviceUuids: message.advertisement.serviceUuids,
      manufacturerData: Buffer.from([0, 1, 2]),
      serviceData: Buffer.from([3, 4, 5])
    };
    assert.calledWith(eventFunc, message.peripheralUuid, message.address, message.addressType, message.connectable, expectedAdvertisement, message.rssi);

    should(bindings._peripherals).keys([message.peripheralUuid]);
  });

  it('_onMessage -> connect', () => {
    const eventFunc = fake.resolves(null);

    const bindings = new Bindings();
    bindings.on('connect', eventFunc);

    const message = Object.assign({}, baseMessage, { type: 'connect' });
    bindings._onMessage('ws', message);

    assert.calledOnce(eventFunc);
    assert.calledWith(eventFunc, message.peripheralUuid);
  });

  it('_onMessage -> disconnect', () => {
    const eventFunc = fake.resolves(null);

    const bindings = new Bindings();
    bindings.on('disconnect', eventFunc);

    const message = Object.assign({}, baseMessage, { type: 'disconnect' });
    bindings._onMessage('ws', message);

    assert.calledOnce(eventFunc);
    assert.calledWith(eventFunc, message.peripheralUuid);
  });

  it('_onMessage -> rssiUpdate', () => {
    const eventFunc = fake.resolves(null);

    const bindings = new Bindings();
    bindings.on('rssiUpdate', eventFunc);

    const message = Object.assign({}, baseMessage, { type: 'rssiUpdate' });
    bindings._onMessage('ws', message);

    assert.calledOnce(eventFunc);
    assert.calledWith(eventFunc, message.peripheralUuid, message.rssi);
  });

  it('_onMessage -> servicesDiscover', () => {
    const eventFunc = fake.resolves(null);

    const bindings = new Bindings();
    bindings.on('servicesDiscover', eventFunc);

    const message = Object.assign({}, baseMessage, { type: 'servicesDiscover' });
    bindings._onMessage('ws', message);

    assert.calledOnce(eventFunc);
    assert.calledWith(eventFunc, message.peripheralUuid, message.serviceUuids);
  });

  it('_onMessage -> includedServicesDiscover', () => {
    const eventFunc = fake.resolves(null);

    const bindings = new Bindings();
    bindings.on('includedServicesDiscover', eventFunc);

    const message = Object.assign({}, baseMessage, { type: 'includedServicesDiscover' });
    bindings._onMessage('ws', message);

    assert.calledOnce(eventFunc);
    assert.calledWith(eventFunc, message.peripheralUuid, message.serviceUuid, message.includedServiceUuids);
  });

  it('_onMessage -> characteristicsDiscover', () => {
    const eventFunc = fake.resolves(null);

    const bindings = new Bindings();
    bindings.on('characteristicsDiscover', eventFunc);

    const message = Object.assign({}, baseMessage, { type: 'characteristicsDiscover' });
    bindings._onMessage('ws', message);

    assert.calledOnce(eventFunc);
    assert.calledWith(eventFunc, message.peripheralUuid, message.serviceUuid, message.characteristics);
  });

  it('_onMessage -> read', () => {
    const eventFunc = fake.resolves(null);

    const bindings = new Bindings();
    bindings.on('read', eventFunc);

    const message = Object.assign({}, baseMessage, { type: 'read', data: '070809' });
    bindings._onMessage('ws', message);

    assert.calledOnce(eventFunc);
    assert.calledWith(eventFunc, message.peripheralUuid, message.serviceUuid, message.characteristicUuid, Buffer.from([7, 8, 9]), message.isNotification);
  });

  it('_onMessage -> write', () => {
    const eventFunc = fake.resolves(null);

    const bindings = new Bindings();
    bindings.on('write', eventFunc);

    const message = Object.assign({}, baseMessage, { type: 'write' });
    bindings._onMessage('ws', message);

    assert.calledOnce(eventFunc);
    assert.calledWith(eventFunc, message.peripheralUuid, message.serviceUuid, message.characteristicUuid);
  });

  it('_onMessage -> broadcast', () => {
    const eventFunc = fake.resolves(null);

    const bindings = new Bindings();
    bindings.on('broadcast', eventFunc);

    const message = Object.assign({}, baseMessage, { type: 'broadcast' });
    bindings._onMessage('ws', message);

    assert.calledOnce(eventFunc);
    assert.calledWith(eventFunc, message.peripheralUuid, message.serviceUuid, message.characteristicUuid, message.state);
  });

  it('_onMessage -> notify', () => {
    const eventFunc = fake.resolves(null);

    const bindings = new Bindings();
    bindings.on('notify', eventFunc);

    const message = Object.assign({}, baseMessage, { type: 'notify' });
    bindings._onMessage('ws', message);

    assert.calledOnce(eventFunc);
    assert.calledWith(eventFunc, message.peripheralUuid, message.serviceUuid, message.characteristicUuid, message.state);
  });

  it('_onMessage -> descriptorsDiscover', () => {
    const eventFunc = fake.resolves(null);

    const bindings = new Bindings();
    bindings.on('descriptorsDiscover', eventFunc);

    const message = Object.assign({}, baseMessage, { type: 'descriptorsDiscover' });
    bindings._onMessage('ws', message);

    assert.calledOnce(eventFunc);
    assert.calledWith(eventFunc, message.peripheralUuid, message.serviceUuid, message.characteristicUuid, message.descriptors);
  });

  it('_onMessage -> valueRead', () => {
    const eventFunc = fake.resolves(null);

    const bindings = new Bindings();
    bindings.on('valueRead', eventFunc);

    const message = Object.assign({}, baseMessage, { type: 'valueRead', data: '070809' });
    bindings._onMessage('ws', message);

    assert.calledOnce(eventFunc);
    assert.calledWith(eventFunc, message.peripheralUuid, message.serviceUuid, message.characteristicUuid, message.descriptorUuid, Buffer.from([7, 8, 9]));
  });

  it('_onMessage -> valueWrite', () => {
    const eventFunc = fake.resolves(null);

    const bindings = new Bindings();
    bindings.on('valueWrite', eventFunc);

    const message = Object.assign({}, baseMessage, { type: 'valueWrite' });
    bindings._onMessage('ws', message);

    assert.calledOnce(eventFunc);
    assert.calledWith(eventFunc, message.peripheralUuid, message.serviceUuid, message.characteristicUuid, message.descriptorUuid);
  });

  it('_onMessage -> handleRead', () => {
    const eventFunc = fake.resolves(null);

    const bindings = new Bindings();
    bindings.on('handleRead', eventFunc);

    const message = Object.assign({}, baseMessage, { type: 'handleRead', data: '070809' });
    bindings._onMessage('ws', message);

    assert.calledOnce(eventFunc);
    assert.calledWith(eventFunc, message.peripheralUuid, message.handle, Buffer.from([7, 8, 9]));
  });

  it('_onMessage -> handleWrite', () => {
    const eventFunc = fake.resolves(null);

    const bindings = new Bindings();
    bindings.on('handleWrite', eventFunc);

    const message = Object.assign({}, baseMessage, { type: 'handleWrite' });
    bindings._onMessage('ws', message);

    assert.calledOnce(eventFunc);
    assert.calledWith(eventFunc, message.peripheralUuid, message.handle);
  });

  it('_onMessage -> handleNotify', () => {
    const eventFunc = fake.resolves(null);

    const bindings = new Bindings();
    bindings.on('handleNotify', eventFunc);

    const message = Object.assign({}, baseMessage, { type: 'handleNotify', data: '070809' });
    bindings._onMessage('ws', message);

    assert.calledOnce(eventFunc);
    assert.calledWith(eventFunc, message.peripheralUuid, message.handle, Buffer.from([7, 8, 9]));
  });

  it('startScanning', () => {
    const fakeSend = fake.returns(null);
    const scanStart = fake.returns(null);

    const bindings = new Bindings();
    bindings._wss = { clients: [{ send: fakeSend }] };
    bindings.on('scanStart', scanStart);

    bindings.startScanning('service-uuids', 'allowDuplicates');

    assert.calledOnce(fakeSend);
    assert.calledWith(fakeSend, JSON.stringify({
      action: 'startScanning',
      serviceUuids: 'service-uuids',
      allowDuplicates: 'allowDuplicates'
    }));

    assert.calledOnce(scanStart);
  });

  it('stopScanning', () => {
    const fakeSend = fake.returns(null);
    const scanStop = fake.returns(null);

    const bindings = new Bindings();
    bindings._wss = { clients: [{ send: fakeSend }] };
    bindings.on('scanStop', scanStop);

    bindings.stopScanning('device-uuid');

    assert.calledOnce(fakeSend);
    assert.calledWith(fakeSend, JSON.stringify({
      action: 'stopScanning'
    }));

    assert.calledOnce(scanStop);
  });

  it('connect missing peripheral', () => {
    try {
      const bindings = new Bindings();
      bindings.connect('device-uuid');
      assert.fail('Should throw an error');
    } catch (e) {
      should(e).instanceOf(Error);
      should(e.message).eql('Cannot read property \'ws\' of undefined');
    }
  });

  it('connect on existing peripheral', () => {
    const fakeSend = fake.returns(null);

    const bindings = new Bindings();
    bindings._peripherals['device-uuid'] = {
      ws: {
        send: fakeSend
      },
      uuid: 'peripheral-uuid'
    };

    bindings.connect('device-uuid');

    assert.calledOnce(fakeSend);
    assert.calledWith(fakeSend, JSON.stringify({
      action: 'connect',
      peripheralUuid: 'peripheral-uuid'
    }));
  });

  it('disconnect missing peripheral', () => {
    try {
      const bindings = new Bindings();
      bindings.disconnect('device-uuid');
      assert.fail('Should throw an error');
    } catch (e) {
      should(e).instanceOf(Error);
      should(e.message).eql('Cannot read property \'ws\' of undefined');
    }
  });

  it('disconnect on existing peripheral', () => {
    const fakeSend = fake.returns(null);

    const bindings = new Bindings();
    bindings._peripherals['device-uuid'] = {
      ws: {
        send: fakeSend
      },
      uuid: 'peripheral-uuid'
    };

    bindings.disconnect('device-uuid');

    assert.calledOnce(fakeSend);
    assert.calledWith(fakeSend, JSON.stringify({
      action: 'disconnect',
      peripheralUuid: 'peripheral-uuid'
    }));
  });

  it('updateRssi missing peripheral', () => {
    try {
      const bindings = new Bindings();
      bindings.updateRssi('device-uuid');
      assert.fail('Should throw an error');
    } catch (e) {
      should(e).instanceOf(Error);
      should(e.message).eql('Cannot read property \'ws\' of undefined');
    }
  });

  it('updateRssi on existing peripheral', () => {
    const fakeSend = fake.returns(null);

    const bindings = new Bindings();
    bindings._peripherals['device-uuid'] = {
      ws: {
        send: fakeSend
      },
      uuid: 'peripheral-uuid'
    };

    bindings.updateRssi('device-uuid');

    assert.calledOnce(fakeSend);
    assert.calledWith(fakeSend, JSON.stringify({
      action: 'updateRssi',
      peripheralUuid: 'peripheral-uuid'
    }));
  });

  it('discoverServices missing peripheral', () => {
    try {
      const bindings = new Bindings();
      bindings.discoverServices('device-uuid', 'service-uuids');
      assert.fail('Should throw an error');
    } catch (e) {
      should(e).instanceOf(Error);
      should(e.message).eql('Cannot read property \'ws\' of undefined');
    }
  });

  it('discoverServices on existing peripheral', () => {
    const fakeSend = fake.returns(null);

    const bindings = new Bindings();
    bindings._peripherals['device-uuid'] = {
      ws: {
        send: fakeSend
      },
      uuid: 'peripheral-uuid'
    };

    bindings.discoverServices('device-uuid', 'service-uuids');

    assert.calledOnce(fakeSend);
    assert.calledWith(fakeSend, JSON.stringify({
      action: 'discoverServices',
      peripheralUuid: 'peripheral-uuid',
      uuids: 'service-uuids'
    }));
  });

  it('discoverIncludedServices missing peripheral', () => {
    try {
      const bindings = new Bindings();
      bindings.discoverIncludedServices('device-uuid', 'service-uuid', 'service-uuids');
      assert.fail('Should throw an error');
    } catch (e) {
      should(e).instanceOf(Error);
      should(e.message).eql('Cannot read property \'ws\' of undefined');
    }
  });

  it('discoverIncludedServices on existing peripheral', () => {
    const fakeSend = fake.returns(null);

    const bindings = new Bindings();
    bindings._peripherals['device-uuid'] = {
      ws: {
        send: fakeSend
      },
      uuid: 'peripheral-uuid'
    };

    bindings.discoverIncludedServices('device-uuid', 'service-uuid', 'service-uuids');

    assert.calledOnce(fakeSend);
    assert.calledWith(fakeSend, JSON.stringify({
      action: 'discoverIncludedServices',
      peripheralUuid: 'peripheral-uuid',
      serviceUuid: 'service-uuid',
      serviceUuids: 'service-uuids'
    }));
  });

  it('discoverCharacteristics missing peripheral', () => {
    try {
      const bindings = new Bindings();
      bindings.discoverCharacteristics('device-uuid', 'service-uuid', 'char-uuid');
      assert.fail('Should throw an error');
    } catch (e) {
      should(e).instanceOf(Error);
      should(e.message).eql('Cannot read property \'ws\' of undefined');
    }
  });

  it('discoverCharacteristics on existing peripheral', () => {
    const fakeSend = fake.returns(null);

    const bindings = new Bindings();
    bindings._peripherals['device-uuid'] = {
      ws: {
        send: fakeSend
      },
      uuid: 'peripheral-uuid'
    };

    bindings.discoverCharacteristics('device-uuid', 'service-uuid', 'char-uuid');

    assert.calledOnce(fakeSend);
    assert.calledWith(fakeSend, JSON.stringify({
      action: 'discoverCharacteristics',
      peripheralUuid: 'peripheral-uuid',
      serviceUuid: 'service-uuid',
      characteristicUuids: 'char-uuid'
    }));
  });

  it('read missing peripheral', () => {
    try {
      const bindings = new Bindings();
      bindings.read('device-uuid', 'service-uuid', 'char-uuid');
      assert.fail('Should throw an error');
    } catch (e) {
      should(e).instanceOf(Error);
      should(e.message).eql('Cannot read property \'ws\' of undefined');
    }
  });

  it('read on existing peripheral', () => {
    const fakeSend = fake.returns(null);

    const bindings = new Bindings();
    bindings._peripherals['device-uuid'] = {
      ws: {
        send: fakeSend
      },
      uuid: 'peripheral-uuid'
    };

    bindings.read('device-uuid', 'service-uuid', 'char-uuid');

    assert.calledOnce(fakeSend);
    assert.calledWith(fakeSend, JSON.stringify({
      action: 'read',
      peripheralUuid: 'peripheral-uuid',
      serviceUuid: 'service-uuid',
      characteristicUuid: 'char-uuid'
    }));
  });

  it('write missing peripheral', () => {
    try {
      const bindings = new Bindings();
      bindings.write('device-uuid', 'service-uuid', 'char-uuid', 'data', 'withoutReponse');
      assert.fail('Should throw an error');
    } catch (e) {
      should(e).instanceOf(Error);
      should(e.message).eql('Cannot read property \'ws\' of undefined');
    }
  });

  it('write on existing peripheral', () => {
    const fakeSend = fake.returns(null);

    const bindings = new Bindings();
    bindings._peripherals['device-uuid'] = {
      ws: {
        send: fakeSend
      },
      uuid: 'peripheral-uuid'
    };

    bindings.write('device-uuid', 'service-uuid', 'char-uuid', '01', 'withoutResponse');

    assert.calledOnce(fakeSend);
    assert.calledWith(fakeSend, JSON.stringify({
      action: 'write',
      peripheralUuid: 'peripheral-uuid',
      serviceUuid: 'service-uuid',
      characteristicUuid: 'char-uuid',
      data: '01',
      withoutResponse: 'withoutResponse'
    }));
  });

  it('broadcast missing peripheral', () => {
    try {
      const bindings = new Bindings();
      bindings.broadcast('device-uuid', 'service-uuid', 'char-uuid', 'broadcast');
      assert.fail('Should throw an error');
    } catch (e) {
      should(e).instanceOf(Error);
      should(e.message).eql('Cannot read property \'ws\' of undefined');
    }
  });

  it('broadcast on existing peripheral', () => {
    const fakeSend = fake.returns(null);

    const bindings = new Bindings();
    bindings._peripherals['device-uuid'] = {
      ws: {
        send: fakeSend
      },
      uuid: 'peripheral-uuid'
    };

    bindings.broadcast('device-uuid', 'service-uuid', 'char-uuid', '01');

    assert.calledOnce(fakeSend);
    assert.calledWith(fakeSend, JSON.stringify({
      action: 'broadcast',
      peripheralUuid: 'peripheral-uuid',
      serviceUuid: 'service-uuid',
      characteristicUuid: 'char-uuid',
      broadcast: '01'
    }));
  });

  it('notify missing peripheral', () => {
    try {
      const bindings = new Bindings();
      bindings.notify('device-uuid', 'service-uuid', 'char-uuid', 'notify');
      assert.fail('Should throw an error');
    } catch (e) {
      should(e).instanceOf(Error);
      should(e.message).eql('Cannot read property \'ws\' of undefined');
    }
  });

  it('notify on existing peripheral', () => {
    const fakeSend = fake.returns(null);

    const bindings = new Bindings();
    bindings._peripherals['device-uuid'] = {
      ws: {
        send: fakeSend
      },
      uuid: 'peripheral-uuid'
    };

    bindings.notify('device-uuid', 'service-uuid', 'char-uuid', '01');

    assert.calledOnce(fakeSend);
    assert.calledWith(fakeSend, JSON.stringify({
      action: 'notify',
      peripheralUuid: 'peripheral-uuid',
      serviceUuid: 'service-uuid',
      characteristicUuid: 'char-uuid',
      notify: '01'
    }));
  });

  it('discoverDescriptors missing peripheral', () => {
    try {
      const bindings = new Bindings();
      bindings.discoverDescriptors('device-uuid', 'service-uuid', 'char-uuid');
      assert.fail('Should throw an error');
    } catch (e) {
      should(e).instanceOf(Error);
      should(e.message).eql('Cannot read property \'ws\' of undefined');
    }
  });

  it('discoverDescriptors on existing peripheral', () => {
    const fakeSend = fake.returns(null);

    const bindings = new Bindings();
    bindings._peripherals['device-uuid'] = {
      ws: {
        send: fakeSend
      },
      uuid: 'peripheral-uuid'
    };

    bindings.discoverDescriptors('device-uuid', 'service-uuid', 'char-uuid');

    assert.calledOnce(fakeSend);
    assert.calledWith(fakeSend, JSON.stringify({
      action: 'discoverDescriptors',
      peripheralUuid: 'peripheral-uuid',
      serviceUuid: 'service-uuid',
      characteristicUuid: 'char-uuid'
    }));
  });

  it('readValue missing peripheral', () => {
    try {
      const bindings = new Bindings();
      bindings.readValue('device-uuid', 'service-uuid', 'char-uuid', 'descr-uuid');
      assert.fail('Should throw an error');
    } catch (e) {
      should(e).instanceOf(Error);
      should(e.message).eql('Cannot read property \'ws\' of undefined');
    }
  });

  it('readValue on existing peripheral', () => {
    const fakeSend = fake.returns(null);

    const bindings = new Bindings();
    bindings._peripherals['device-uuid'] = {
      ws: {
        send: fakeSend
      },
      uuid: 'peripheral-uuid'
    };

    bindings.readValue('device-uuid', 'service-uuid', 'char-uuid', 'descr-uuid');

    assert.calledOnce(fakeSend);
    assert.calledWith(fakeSend, JSON.stringify({
      action: 'readValue',
      peripheralUuid: 'peripheral-uuid',
      serviceUuid: 'service-uuid',
      characteristicUuid: 'char-uuid',
      descriptorUuid: 'descr-uuid'
    }));
  });

  it('writeValue missing peripheral', () => {
    try {
      const bindings = new Bindings();
      bindings.writeValue('device-uuid', 'service-uuid', 'char-uuid', 'descr-uuid', '01');
      assert.fail('Should throw an error');
    } catch (e) {
      should(e).instanceOf(Error);
      should(e.message).eql('Cannot read property \'ws\' of undefined');
    }
  });

  it('writeValue on existing peripheral', () => {
    const fakeSend = fake.returns(null);

    const bindings = new Bindings();
    bindings._peripherals['device-uuid'] = {
      ws: {
        send: fakeSend
      },
      uuid: 'peripheral-uuid'
    };

    bindings.writeValue('device-uuid', 'service-uuid', 'char-uuid', 'descr-uuid', '01');

    assert.calledOnce(fakeSend);
    assert.calledWith(fakeSend, JSON.stringify({
      action: 'writeValue',
      peripheralUuid: 'peripheral-uuid',
      serviceUuid: 'service-uuid',
      characteristicUuid: 'char-uuid',
      descriptorUuid: 'descr-uuid',
      data: '01'
    }));
  });

  it('readHandle missing peripheral', () => {
    try {
      const bindings = new Bindings();
      bindings.readHandle('device-uuid', 'handle');
      assert.fail('Should throw an error');
    } catch (e) {
      should(e).instanceOf(Error);
      should(e.message).eql('Cannot read property \'ws\' of undefined');
    }
  });

  it('readHandle on existing peripheral', () => {
    const fakeSend = fake.returns(null);

    const bindings = new Bindings();
    bindings._peripherals['device-uuid'] = {
      ws: {
        send: fakeSend
      },
      uuid: 'peripheral-uuid'
    };

    bindings.readHandle('device-uuid', 'handle');

    assert.calledOnce(fakeSend);
    assert.calledWith(fakeSend, JSON.stringify({
      action: 'readHandle',
      peripheralUuid: 'peripheral-uuid',
      handle: 'handle'
    }));
  });

  it('writeHandle missing peripheral', () => {
    try {
      const bindings = new Bindings();
      bindings.writeHandle('device-uuid', 'handle', 'data', 'withoutResponse');
      assert.fail('Should throw an error');
    } catch (e) {
      should(e).instanceOf(Error);
      should(e.message).eql('Cannot read property \'ws\' of undefined');
    }
  });

  it('writeHandle on existing peripheral', () => {
    const fakeSend = fake.returns(null);

    const bindings = new Bindings();
    bindings._peripherals['device-uuid'] = {
      ws: {
        send: fakeSend
      },
      uuid: 'peripheral-uuid'
    };

    bindings.writeHandle('device-uuid', 'handle', 'data', 'withoutResponse');

    assert.calledOnce(fakeSend);
    assert.calledWith(fakeSend, JSON.stringify({
      action: 'readHandle',
      peripheralUuid: 'peripheral-uuid',
      handle: 'handle',
      data: 'data',
      withoutResponse: 'withoutResponse'
    }));
  });
});
