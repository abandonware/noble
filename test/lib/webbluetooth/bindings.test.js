const sinon = require('sinon');
const should = require('should');

const { assert } = sinon;

const Bindings = require('../../../lib/webbluetooth/bindings');

describe('webbluetooth bindings', () => {
  let bindings;
  let clock;

  beforeEach(() => {
    clock = sinon.useFakeTimers();

    bindings = new Bindings();
  });

  afterEach(() => {
    clock.restore();
    sinon.reset();
  });

  it('constructor', () => {
    should(bindings._ble).equal(null);
    should(bindings._startScanCommand).equal(null);
    should(bindings._peripherals).deepEqual({});
  });

  describe('init', () => {
    it('should use ble arg', () => {
      const errorCallback = sinon.spy();

      bindings.on('error', errorCallback);
      bindings.init({});

      clock.tick(1);

      assert.notCalled(errorCallback);
    });
  });

  it('onClose - should emit stateChange', () => {
    const callback = sinon.spy();

    bindings.on('stateChange', callback);
    bindings.onClose();

    assert.calledOnceWithExactly(callback, 'poweredOff');
  });

  describe('startScanning', () => {
    let scanStopCallback;
    let discoverCallback;
    let errorCallback;
    let scanStartCallback;

    let device;

    beforeEach(() => {
      device = {
        id: 'id',
        name: 'name',
        services: ['1234', 'service9']
      };

      scanStopCallback = sinon.spy();
      discoverCallback = sinon.spy();
      errorCallback = sinon.spy();
      scanStartCallback = sinon.spy();

      bindings._ble = {
        requestDevice: sinon.fake.resolves(device)
      };

      bindings.on('scanStop', scanStopCallback);
      bindings.on('discover', discoverCallback);
      bindings.on('error', errorCallback);
      bindings.on('scanStart', scanStartCallback);
    });

    it('should emit discover with object options', async () => {
      const options = { services: ['1234', '0x5678', 'service'] };
      const allowDuplicates = true;

      bindings.startScanning(options, allowDuplicates);

      await clock.tickAsync(210);

      assert.calledOnceWithExactly(bindings._ble.requestDevice, { filters: [{ services: [4660] }, { services: [22136] }, { services: ['service'] }] });
      assert.calledOnceWithExactly(scanStopCallback, {});
      assert.calledOnceWithExactly(discoverCallback, device.id, device.id, device.addressType, !device.paired, { localName: device.name }, undefined);
      assert.notCalled(errorCallback);
      assert.calledOnceWithExactly(scanStartCallback);

      should(bindings._peripherals).deepEqual({
        [device.id]: {
          uuid: device.id,
          address: device.id,
          advertisement: { localName: device.name }, // advertisement,
          device,
          cachedServices: {},
          localName: device.name,
          serviceUuids: options.services
        }
      });
    });

    it('should emit discover with array options', async () => {
      const options = ['1234', '0x5678', 'service'];
      const allowDuplicates = false;

      device.adData = {
        rssi: 33
      };

      bindings.startScanning(options, allowDuplicates);

      await clock.tickAsync(210);

      assert.calledOnceWithExactly(bindings._ble.requestDevice, { filters: [{ services: [4660] }, { services: [22136] }, { services: ['service'] }] });
      assert.calledOnceWithExactly(scanStopCallback, {});
      assert.calledOnceWithExactly(discoverCallback, device.id, device.id, device.addressType, !device.paired, { localName: device.name }, 33);
      assert.notCalled(errorCallback);
      assert.calledOnceWithExactly(scanStartCallback);

      should(bindings._peripherals).deepEqual({
        [device.id]: {
          uuid: device.id,
          address: device.id,
          advertisement: { localName: device.name }, // advertisement,
          device,
          cachedServices: {},
          localName: device.name,
          serviceUuids: [4660, 22136, 'service'],
          rssi: 33
        }
      });
    });

    it('should not emit discover on null device', async () => {
      const options = ['1234', '0x5678', 'service'];
      const allowDuplicates = false;

      bindings._ble.requestDevice = sinon.fake.resolves(null);

      bindings.startScanning(options, allowDuplicates);

      await clock.tickAsync(210);

      assert.calledOnceWithExactly(bindings._ble.requestDevice, { filters: [{ services: [4660] }, { services: [22136] }, { services: ['service'] }] });
      assert.calledOnceWithExactly(scanStopCallback, {});
      assert.notCalled(discoverCallback);
      assert.notCalled(errorCallback);
      assert.calledOnceWithExactly(scanStartCallback);

      should(bindings._peripherals).deepEqual({});
    });

    it('should emit error', async () => {
      const options = ['1234', '0x5678', 'service'];
      const allowDuplicates = false;

      bindings._ble.requestDevice = sinon.fake.rejects(new Error('err'));

      bindings.startScanning(options, allowDuplicates);

      await clock.tickAsync(210);

      assert.calledOnceWithExactly(bindings._ble.requestDevice, { filters: [{ services: [4660] }, { services: [22136] }, { services: ['service'] }] });
      assert.calledOnceWithExactly(scanStopCallback, {});
      assert.notCalled(discoverCallback);
      assert.calledOnceWithMatch(errorCallback, sinon.match({ message: 'err' }));
      assert.calledOnceWithExactly(scanStartCallback);

      should(bindings._peripherals).deepEqual({});
    });
  });

  it('stopScanning', () => {
    const callback = sinon.spy();

    bindings._startScanCommand = 'not_null';
    bindings.on('scanStop', callback);

    bindings.stopScanning();

    assert.calledOnceWithExactly(callback);
    should(bindings._startScanCommand).equal(null);
  });
});
