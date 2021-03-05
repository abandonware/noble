const should = require('should');
const sinon = require('sinon');

const { assert } = sinon;

const Noble = require('../lib/noble');
const Peripheral = require('../lib/peripheral');
const Service = require('../lib/service');
const Characteristic = require('../lib/characteristic');
const Descriptor = require('../lib/descriptor');

describe('noble', () => {
  /**
   * @type {Noble & import('events').EventEmitter}
   */
  let noble;
  let mockBindings;

  beforeEach(() => {
    mockBindings = {
      init: () => {},
      on: () => {}
    };

    noble = new Noble(mockBindings);
  });

  describe('startScanning', () => {
    beforeEach(() => {
      mockBindings.startScanning = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should emit warning due to serviceUuids', () => {
      const callback = sinon.spy();
      const eventCallback = sinon.spy();
      const expectedAllowDuplicates = true;
      noble.on('warning', eventCallback);

      noble.startScanning(callback, expectedAllowDuplicates);
      noble.emit('stateChange', 'poweredOn');
      // Check for single callback
      noble.emit('stateChange', 'poweredOn');
      noble.emit('scanStart');
      // Check for single callback
      noble.emit('scanStart');

      assert.calledOnceWithExactly(
        mockBindings.startScanning,
        callback,
        expectedAllowDuplicates
      );
      assert.calledOnceWithExactly(
        eventCallback,
        'calling startScanning(callback) is deprecated'
      );
    });

    it('should emit warning due to allowDuplicates', () => {
      const callback = sinon.spy();
      const eventCallback = sinon.spy();
      const expectedServiceUuids = [1, 2, 3];
      noble.on('warning', eventCallback);

      noble.startScanning(expectedServiceUuids, callback);
      noble.emit('stateChange', 'poweredOn');
      // Check for single callback
      noble.emit('stateChange', 'poweredOn');
      noble.emit('scanStart');
      // Check for single callback
      noble.emit('scanStart');

      assert.calledOnceWithExactly(
        mockBindings.startScanning,
        expectedServiceUuids,
        callback
      );
      assert.calledOnceWithExactly(
        eventCallback,
        'calling startScanning(serviceUuids, callback) is deprecated'
      );
    });

    it('should delegate to binding', () => {
      const expectedServiceUuids = [1, 2, 3];
      const expectedAllowDuplicates = true;

      noble.startScanning(expectedServiceUuids, expectedAllowDuplicates);
      noble.emit('stateChange', 'poweredOn');
      // Check for single callback
      noble.emit('stateChange', 'poweredOn');
      noble.emit('scanStart');
      // Check for single callback
      noble.emit('scanStart');

      assert.calledOnceWithExactly(
        mockBindings.startScanning,
        expectedServiceUuids,
        expectedAllowDuplicates
      );
    });

    it('should delegate to callback', async () => {
      const expectedServiceUuids = [1, 2, 3];
      const expectedAllowDuplicates = true;
      const callback = sinon.spy();

      noble.startScanning(
        expectedServiceUuids,
        expectedAllowDuplicates,
        callback
      );
      noble.emit('stateChange', 'poweredOn');
      // Check for single callback
      noble.emit('stateChange', 'poweredOn');
      noble.emit('scanStart');
      // Check for single callback
      noble.emit('scanStart');

      assert.calledOnceWithExactly(callback, null, undefined);
      assert.calledOnceWithExactly(
        mockBindings.startScanning,
        expectedServiceUuids,
        expectedAllowDuplicates
      );
    });

    it('should delegate to callback, already initialized', async () => {
      noble.initialized = true;
      noble._state = 'poweredOn';

      noble.startScanning();

      assert.calledOnceWithExactly(
        mockBindings.startScanning,
        undefined,
        undefined
      );
    });

    it('should delegate to callback with filter', async () => {
      const expectedServiceUuids = [1, 2, 3];
      const expectedAllowDuplicates = true;
      const callback = sinon.spy();

      noble.startScanning(
        expectedServiceUuids,
        expectedAllowDuplicates,
        callback
      );
      noble.emit('stateChange', 'poweredOn');
      // Check for single callback
      noble.emit('stateChange', 'poweredOn');
      noble.emit('scanStart', 'filter');

      assert.calledOnceWithExactly(callback, null, 'filter');
      assert.calledOnceWithExactly(
        mockBindings.startScanning,
        expectedServiceUuids,
        expectedAllowDuplicates
      );
    });

    it('should throw an error if not powered on', async () => {
      try {
        noble.startScanning();
        noble.emit('stateChange', 'poweredOff');
        // Check for single callback
        noble.emit('stateChange', 'poweredOff');
        noble.emit('scanStart');
        // Check for single callback
        noble.emit('scanStart');

        assert.fail();
      } catch (e) {
        should(e.message).equal(
          'Could not start scanning, state is poweredOff (not poweredOn)'
        );
      }
      assert.notCalled(mockBindings.startScanning);
    });
  });

  describe('startScanningAsync', () => {
    beforeEach(() => {
      mockBindings.startScanning = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should delegate to binding', async () => {
      const expectedServiceUuids = [1, 2, 3];
      const expectedAllowDuplicates = true;

      const promise = noble.startScanningAsync(
        expectedServiceUuids,
        expectedAllowDuplicates
      );
      noble.emit('stateChange', 'poweredOn');
      // Check for single callback
      noble.emit('stateChange', 'poweredOn');
      noble.emit('scanStart');
      // Check for single callback
      noble.emit('scanStart');

      should(promise).resolvedWith(undefined);
      assert.calledOnceWithExactly(
        mockBindings.startScanning,
        expectedServiceUuids,
        expectedAllowDuplicates
      );
    });

    it('should throw an error if not powered on', async () => {
      const promise = noble.startScanningAsync();
      noble.emit('stateChange', 'poweredOff');
      // Check for single callback
      noble.emit('stateChange', 'poweredOff');
      noble.emit('scanStart');
      // Check for single callback
      noble.emit('scanStart');

      should(promise).rejectedWith(
        'Could not start scanning, state is poweredOff (not poweredOn)'
      );
      assert.notCalled(mockBindings.startScanning);
    });
  });

  describe('stopScanning', () => {
    beforeEach(() => {
      mockBindings.stopScanning = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should no callback', async () => {
      noble.initialized = true;
      noble.stopScanning();
      assert.calledOnceWithExactly(mockBindings.stopScanning);
    });
  });

  describe('stopScanningAsync', () => {
    beforeEach(() => {
      mockBindings.stopScanning = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should not delegate to binding (not initialized)', async () => {
      const promise = noble.stopScanningAsync();
      noble.emit('scanStop');

      should(promise).resolvedWith(undefined);
      assert.notCalled(mockBindings.stopScanning);
    });

    it('should delegate to binding (initilazed)', async () => {
      noble.initialized = true;
      const promise = noble.stopScanningAsync();
      noble.emit('scanStop');

      should(promise).resolvedWith(undefined);
      assert.calledOnceWithExactly(mockBindings.stopScanning);
    });
  });

  describe('connect', () => {
    beforeEach(() => {
      mockBindings.connect = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });
    it('should delegate to binding', () => {
      const peripheralUuid = 'peripheral-uuid';
      const parameters = {};

      noble.connect(peripheralUuid, parameters);

      assert.calledOnceWithExactly(
        mockBindings.connect,
        peripheralUuid,
        parameters
      );
    });
  });

  describe('onConnect', () => {
    it('should emit connected on existing peripheral', () => {
      const emit = sinon.spy();
      noble._peripherals = {
        uuid: { emit }
      };

      const warningCallback = sinon.spy();

      noble.on('warning', warningCallback);
      noble.onConnect('uuid', false);

      assert.calledOnceWithExactly(emit, 'connect', false);
      assert.notCalled(warningCallback);

      should(noble._peripherals).deepEqual({
        uuid: { state: 'connected', emit }
      });
    });

    it('should emit error on existing peripheral', () => {
      const emit = sinon.spy();
      noble._peripherals = {
        uuid: { emit }
      };

      const warningCallback = sinon.spy();

      noble.on('warning', warningCallback);
      noble.onConnect('uuid', true);

      assert.calledOnceWithExactly(emit, 'connect', true);
      assert.notCalled(warningCallback);

      should(noble._peripherals).deepEqual({
        uuid: { state: 'error', emit }
      });
    });

    it('should emit warning on missing peripheral', () => {
      const warningCallback = sinon.spy();

      noble.on('warning', warningCallback);
      noble.onConnect('uuid', true);

      assert.calledOnceWithExactly(warningCallback, 'unknown peripheral uuid connected!');

      should(noble._peripherals).deepEqual({});
    });
  });

  describe('setScanParameters', () => {
    beforeEach(() => {
      mockBindings.setScanParameters = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should delegate to binding', async () => {
      const interval = 'interval';
      const window = 'window';

      noble.setScanParameters(interval, window);
      noble.emit('scanParametersSet');

      assert.calledOnceWithExactly(
        mockBindings.setScanParameters,
        interval,
        window
      );
    });

    it('should delegate to callback too', async () => {
      const interval = 'interval';
      const window = 'window';
      const callback = sinon.spy();

      noble.setScanParameters(interval, window, callback);
      noble.emit('scanParametersSet');
      // Check for single callback
      noble.emit('scanParametersSet');

      assert.calledOnceWithExactly(
        mockBindings.setScanParameters,
        interval,
        window
      );
      assert.calledOnceWithExactly(callback);
    });
  });

  describe('cancelConnect', () => {
    beforeEach(() => {
      mockBindings.cancelConnect = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should delegate to binding', () => {
      const peripheralUuid = 'peripheral-uuid';
      const parameters = {};

      noble.cancelConnect(peripheralUuid, parameters);

      assert.calledOnceWithExactly(
        mockBindings.cancelConnect,
        peripheralUuid,
        parameters
      );
    });
  });

  it('should emit state', () => {
    const callback = sinon.spy();
    noble.on('stateChange', callback);

    const state = 'newState';
    noble.onStateChange(state);

    should(noble._state).equal(state);
    assert.calledOnceWithExactly(callback, state);
  });

  it('should change address', () => {
    const address = 'newAddress';
    noble.onAddressChange(address);

    should(noble.address).equal(address);
  });

  it('should emit scanParametersSet event', () => {
    const callback = sinon.spy();
    noble.on('scanParametersSet', callback);

    noble.onScanParametersSet();

    assert.calledOnceWithExactly(callback);
  });

  it('should emit scanStart event', () => {
    const callback = sinon.spy();
    noble.on('scanStart', callback);

    noble.onScanStart('filterDuplicates');

    assert.calledOnceWithExactly(callback, 'filterDuplicates');
  });

  it('should emit scanStop event', () => {
    const callback = sinon.spy();
    noble.on('scanStop', callback);

    noble.onScanStop();

    assert.calledOnceWithExactly(callback);
  });

  describe('reset', () => {
    beforeEach(() => {
      mockBindings.reset = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should reset', () => {
      noble.reset();
      assert.calledOnceWithExactly(mockBindings.reset);
    });
  });

  describe('disconnect', () => {
    beforeEach(() => {
      mockBindings.disconnect = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should disconnect', () => {
      noble.disconnect('peripheralUuid');
      assert.calledOnceWithExactly(mockBindings.disconnect, 'peripheralUuid');
    });
  });

  describe('onDisconnect', () => {
    it('should emit disconnect on existing peripheral', () => {
      const emit = sinon.spy();
      noble._peripherals = {
        uuid: { emit }
      };

      const warningCallback = sinon.spy();

      noble.on('warning', warningCallback);
      noble.onDisconnect('uuid', false);

      assert.calledOnceWithExactly(emit, 'disconnect', false);
      assert.notCalled(warningCallback);

      should(noble._peripherals).deepEqual({
        uuid: { state: 'disconnected', emit }
      });
    });

    it('should emit warning on missing peripheral', () => {
      const warningCallback = sinon.spy();

      noble.on('warning', warningCallback);
      noble.onDisconnect('uuid', true);

      assert.calledOnceWithExactly(warningCallback, 'unknown peripheral uuid disconnected!');

      should(noble._peripherals).deepEqual({});
    });
  });

  describe('onDiscover', () => {
    beforeEach(() => {
      mockBindings.disconnect = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should add new peripheral', () => {
      const uuid = 'uuid';
      const address = 'address';
      const addressType = 'addressType';
      const connectable = 'connectable';
      const advertisement = [];
      const rssi = 'rssi';

      const eventCallback = sinon.spy();
      noble.on('discover', eventCallback);

      noble.onDiscover(
        uuid,
        address,
        addressType,
        connectable,
        advertisement,
        rssi
      );

      // Check new peripheral
      should(noble._peripherals).have.keys(uuid);
      const peripheral = noble._peripherals[uuid];
      should(peripheral._noble).equal(noble);
      should(peripheral.id).equal(uuid);
      should(peripheral.address).equal(address);
      should(peripheral.addressType).equal(addressType);
      should(peripheral.connectable).equal(connectable);
      should(peripheral.advertisement).equal(advertisement);
      should(peripheral.rssi).equal(rssi);

      should(noble._services).have.keys(uuid);
      should(noble._characteristics).have.keys(uuid);
      should(noble._descriptors).have.keys(uuid);
      should(noble._discoveredPeripheralUUids).deepEqual([uuid]);

      assert.calledOnceWithExactly(eventCallback, peripheral);
    });

    it('should update existing peripheral', () => {
      const uuid = 'uuid';
      const address = 'address';
      const addressType = 'addressType';
      const connectable = 'connectable';
      const advertisement = [undefined, 'adv2', 'adv3'];
      const rssi = 'rssi';

      // init peripheral
      noble._peripherals[uuid] = new Peripheral(
        noble,
        uuid,
        'originalAddress',
        'originalAddressType',
        'originalConnectable',
        ['adv1'],
        'originalRssi'
      );

      const eventCallback = sinon.spy();
      noble.on('discover', eventCallback);

      noble.onDiscover(
        uuid,
        address,
        addressType,
        connectable,
        advertisement,
        rssi
      );

      // Check new peripheral
      should(noble._peripherals).have.keys(uuid);
      const peripheral = noble._peripherals[uuid];
      should(peripheral._noble).equal(noble);
      should(peripheral.id).equal(uuid);
      should(peripheral.address).equal('originalAddress');
      should(peripheral.addressType).equal('originalAddressType');
      should(peripheral.connectable).equal(connectable);
      should(peripheral.advertisement).deepEqual(['adv1', 'adv2', 'adv3']);
      should(peripheral.rssi).equal(rssi);

      should(noble._services).be.empty();
      should(noble._characteristics).be.empty();
      should(noble._descriptors).be.empty();
      should(noble._discoveredPeripheralUUids).deepEqual([uuid]);

      assert.calledOnceWithExactly(eventCallback, peripheral);
    });

    it('should emit on duplicate', () => {
      const uuid = 'uuid';
      const address = 'address';
      const addressType = 'addressType';
      const connectable = 'connectable';
      const advertisement = ['adv1', 'adv2', 'adv3'];
      const rssi = 'rssi';

      // register peripheral
      noble._discoveredPeripheralUUids = [uuid];
      noble._allowDuplicates = true;

      const eventCallback = sinon.spy();
      noble.on('discover', eventCallback);

      noble.onDiscover(
        uuid,
        address,
        addressType,
        connectable,
        advertisement,
        rssi
      );

      assert.calledOnceWithExactly(eventCallback, noble._peripherals[uuid]);
    });

    it('should not emit on duplicate', () => {
      const uuid = 'uuid';
      const address = 'address';
      const addressType = 'addressType';
      const connectable = 'connectable';
      const advertisement = ['adv1', 'adv2', 'adv3'];
      const rssi = 'rssi';

      // register peripheral
      noble._discoveredPeripheralUUids = [uuid];

      const eventCallback = sinon.spy();
      noble.on('discover', eventCallback);

      noble.onDiscover(
        uuid,
        address,
        addressType,
        connectable,
        advertisement,
        rssi
      );

      assert.notCalled(eventCallback);
    });

    it('should emit on new peripheral (even if duplicates are disallowed)', () => {
      const uuid = 'uuid';
      const address = 'address';
      const addressType = 'addressType';
      const connectable = 'connectable';
      const advertisement = ['adv1', 'adv2', 'adv3'];
      const rssi = 'rssi';

      const eventCallback = sinon.spy();
      noble.on('discover', eventCallback);

      noble.onDiscover(
        uuid,
        address,
        addressType,
        connectable,
        advertisement,
        rssi
      );

      assert.calledOnceWithExactly(eventCallback, noble._peripherals[uuid]);
    });
  });

  describe('updateRssi', () => {
    beforeEach(() => {
      mockBindings.updateRssi = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should updateRssi', () => {
      noble.updateRssi('peripheralUuid');
      assert.calledOnceWithExactly(mockBindings.updateRssi, 'peripheralUuid');
    });
  });

  describe('onRssiUpdate', () => {
    it('should emit rssiUpdate on existing peripheral', () => {
      const emit = sinon.spy();
      noble._peripherals = {
        uuid: { emit }
      };

      const warningCallback = sinon.spy();

      noble.on('warning', warningCallback);
      noble.onRssiUpdate('uuid', 3);

      assert.calledOnceWithExactly(emit, 'rssiUpdate', 3);
      assert.notCalled(warningCallback);

      should(noble._peripherals).deepEqual({
        uuid: { rssi: 3, emit }
      });
    });

    it('should emit warning on missing peripheral', () => {
      const warningCallback = sinon.spy();

      noble.on('warning', warningCallback);
      noble.onRssiUpdate('uuid', 4);

      assert.calledOnceWithExactly(warningCallback, 'unknown peripheral uuid RSSI update!');

      should(noble._peripherals).deepEqual({});
    });
  });

  it('should add multiple services', () => {
    noble.addService = sinon.stub().returnsArg(1);

    const peripheralUuid = 'peripheralUuid';
    const services = ['service1', 'service2'];
    const result = noble.addServices(peripheralUuid, services);

    assert.callCount(noble.addService, 2);
    assert.calledWithExactly(noble.addService, peripheralUuid, 'service1');
    assert.calledWithExactly(noble.addService, peripheralUuid, 'service2');

    should(result).deepEqual(services);
  });

  describe('addService', () => {
    const peripheralUuid = 'peripheralUuid';
    const service = {
      uuid: 'serviceUuid'
    };
    const peripheral = {};

    beforeEach(() => {
      noble._peripherals = { [peripheralUuid]: peripheral };
      noble._services = { [peripheralUuid]: {} };
      noble._characteristics = { [peripheralUuid]: {} };
      noble._descriptors = { [peripheralUuid]: {} };
    });

    it('should add service to lower layer', () => {
      noble._bindings.addService = sinon.spy();

      const result = noble.addService(peripheralUuid, service);

      assert.calledOnceWithExactly(noble._bindings.addService, peripheralUuid, service);

      const expectedService = new Service(noble, peripheralUuid, service.uuid);
      should(result).deepEqual(expectedService);
      should(peripheral.services).deepEqual([expectedService]);
      should(noble._services).deepEqual({
        [peripheralUuid]: {
          [service.uuid]: expectedService
        }
      });
      should(noble._characteristics).deepEqual({
        [peripheralUuid]: {
          [service.uuid]: {}
        }
      });
      should(noble._descriptors).deepEqual({
        [peripheralUuid]: {
          [service.uuid]: {}
        }
      });
    });

    it('should add service only to noble', () => {
      peripheral.services = [];

      const result = noble.addService(peripheralUuid, service);

      const expectedService = new Service(noble, peripheralUuid, service.uuid);
      should(result).deepEqual(expectedService);
      should(peripheral.services).deepEqual([expectedService]);
      should(noble._services).deepEqual({
        [peripheralUuid]: {
          [service.uuid]: expectedService
        }
      });
      should(noble._characteristics).deepEqual({
        [peripheralUuid]: {
          [service.uuid]: {}
        }
      });
      should(noble._descriptors).deepEqual({
        [peripheralUuid]: {
          [service.uuid]: {}
        }
      });
    });
  });

  describe('onServicesDiscovered', () => {
    const peripheralUuid = 'peripheralUuid';
    const services = ['service1', 'service2'];

    it('should not emit servicesDiscovered', () => {
      const callback = sinon.spy();
      noble.on('servicesDiscovered', callback);

      noble.onServicesDiscovered(peripheralUuid, services);

      assert.notCalled(callback);
    });

    it('should emit servicesDiscovered', () => {
      const emit = sinon.spy();
      noble._peripherals = { [peripheralUuid]: { uuid: 'peripheral', emit } };

      noble.onServicesDiscovered(peripheralUuid, services);

      assert.calledOnceWithExactly(emit, 'servicesDiscovered', { uuid: 'peripheral', emit }, services);
    });
  });

  it('discoverServices - should delegate to bindings', () => {
    noble._bindings.discoverServices = sinon.spy();
    noble.discoverServices('peripheral', 'uuids');
    assert.calledOnceWithExactly(noble._bindings.discoverServices, 'peripheral', 'uuids');
  });

  describe('onServicesDiscover', () => {
    it('should emit warning', () => {
      const warningCallback = sinon.spy();

      noble.on('warning', warningCallback);

      noble.onServicesDiscover('pUuid', ['service1', 'service2']);

      assert.calledOnceWithExactly(warningCallback, 'unknown peripheral pUuid services discover!');
    });

    it('should emit servicesDiscover and store services', () => {
      const warningCallback = sinon.spy();
      const discoverCallback = sinon.spy();

      const peripheralUuid = 'peripheralUuid';

      noble._peripherals = { [peripheralUuid]: { emit: discoverCallback } };
      noble._services = { [peripheralUuid]: {} };
      noble._characteristics = { [peripheralUuid]: {} };
      noble._descriptors = { [peripheralUuid]: {} };

      noble.on('warning', warningCallback);

      noble.onServicesDiscover(peripheralUuid, ['service1', 'service2']);

      const services = [new Service(noble, peripheralUuid, 'service1'), new Service(noble, peripheralUuid, 'service2')];

      assert.calledOnceWithExactly(discoverCallback, 'servicesDiscover', services);
      assert.notCalled(warningCallback);

      should(noble._peripherals).deepEqual({
        [peripheralUuid]: { services, emit: discoverCallback }
      });
      should(noble._services).deepEqual({
        [peripheralUuid]: { service1: services[0], service2: services[1] }
      });
      should(noble._characteristics).deepEqual({
        [peripheralUuid]: { service1: {}, service2: {} }
      });
      should(noble._descriptors).deepEqual({
        [peripheralUuid]: { service1: {}, service2: {} }
      });
    });
  });

  describe('discoverIncludedServices', () => {
    beforeEach(() => {
      mockBindings.discoverIncludedServices = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should disconnect', () => {
      noble.discoverIncludedServices('peripheralUuid', 'serviceUuid', 'serviceUuids');
      assert.calledOnceWithExactly(mockBindings.discoverIncludedServices, 'peripheralUuid', 'serviceUuid', 'serviceUuids');
    });
  });

  describe('addCharacteristics', () => {
    const peripheralUuid = 'peripheralUuid';
    const serviceUuid = 'serviceUuid';
    const characteristic1 = {
      uuid: 'characteristic1',
      properties: 'properties1'
    };
    const characteristic2 = {
      uuid: 'characteristic2',
      properties: 'properties2'
    };
    const characteristics = [characteristic1, characteristic2];

    beforeEach(() => {
      noble._services = { [peripheralUuid]: { [serviceUuid]: {} } };
      noble._characteristics = { [peripheralUuid]: { [serviceUuid]: {} } };
      noble._descriptors = { [peripheralUuid]: { [serviceUuid]: {} } };
    });

    it('should delegate to bindings', () => {
      const warningCallback = sinon.spy();

      noble._bindings.addCharacteristics = sinon.spy();
      noble.on('warning', warningCallback);

      const result = noble.addCharacteristics(peripheralUuid, serviceUuid, characteristics);

      assert.notCalled(warningCallback);
      assert.calledOnceWithExactly(noble._bindings.addCharacteristics, peripheralUuid, serviceUuid, characteristics);

      const expectedCharacteristics = [
        new Characteristic(noble, peripheralUuid, serviceUuid, 'characteristic1', 'properties1'),
        new Characteristic(noble, peripheralUuid, serviceUuid, 'characteristic2', 'properties2')
      ];
      should(result).deepEqual(expectedCharacteristics);
      should(noble._services).deepEqual({ [peripheralUuid]: { [serviceUuid]: { characteristics: expectedCharacteristics } } });
      should(noble._characteristics).deepEqual({ [peripheralUuid]: { [serviceUuid]: { characteristic1: expectedCharacteristics[0], characteristic2: expectedCharacteristics[1] } } });
      should(noble._descriptors).deepEqual({ [peripheralUuid]: { [serviceUuid]: { characteristic1: {}, characteristic2: {} } } });
    });

    it('should not delegate to bindings', () => {
      const warningCallback = sinon.spy();

      noble.on('warning', warningCallback);

      const result = noble.addCharacteristics(peripheralUuid, serviceUuid, characteristics);

      assert.notCalled(warningCallback);

      const expectedCharacteristics = [
        new Characteristic(noble, peripheralUuid, serviceUuid, 'characteristic1', 'properties1'),
        new Characteristic(noble, peripheralUuid, serviceUuid, 'characteristic2', 'properties2')
      ];
      should(result).deepEqual(expectedCharacteristics);
      should(noble._services).deepEqual({ [peripheralUuid]: { [serviceUuid]: { characteristics: expectedCharacteristics } } });
      should(noble._characteristics).deepEqual({ [peripheralUuid]: { [serviceUuid]: { characteristic1: expectedCharacteristics[0], characteristic2: expectedCharacteristics[1] } } });
      should(noble._descriptors).deepEqual({ [peripheralUuid]: { [serviceUuid]: { characteristic1: {}, characteristic2: {} } } });
    });

    it('should emit warning', () => {
      const warningCallback = sinon.spy();

      noble.on('warning', warningCallback);

      noble._services = { peripheralUuid: {} };
      const result = noble.addCharacteristics(peripheralUuid, serviceUuid, characteristics);

      assert.calledOnceWithExactly(warningCallback, 'unknown service peripheralUuid, serviceUuid characteristics discover!');

      should(result).equal(undefined);
      should(noble._services).deepEqual({ [peripheralUuid]: { } });
      should(noble._characteristics).deepEqual({ [peripheralUuid]: { [serviceUuid]: { } } });
      should(noble._descriptors).deepEqual({ [peripheralUuid]: { [serviceUuid]: { } } });
    });
  });

  it('onCharacteristicsDiscovered - should emit event', () => {
    const emit = sinon.spy();

    noble._services = {
      peripheralUuid: {
        serviceUuid: {
          emit
        }
      }
    };

    noble.onCharacteristicsDiscovered('peripheralUuid', 'serviceUuid', 'characteristics');

    assert.calledOnceWithExactly(emit, 'characteristicsDiscovered', 'characteristics');
  });

  it('discoverCharacteristics - should delegate', () => {
    noble._bindings.discoverCharacteristics = sinon.spy();

    noble.discoverCharacteristics('peripheralUuid', 'serviceUuid', 'characteristicUuids');

    assert.calledOnceWithExactly(noble._bindings.discoverCharacteristics, 'peripheralUuid', 'serviceUuid', 'characteristicUuids');
  });

  describe('onCharacteristicsDiscover', () => {
    it('should emit warning', () => {
      const warningCallback = sinon.spy();

      const peripheralUuid = 'peripheralUuid';
      const serviceUuid = 'serviceUuid';
      const characteristics = ['characteristic1', 'characteristic2'];

      noble.on('warning', warningCallback);

      noble._services[peripheralUuid] = {};
      noble.onCharacteristicsDiscover(peripheralUuid, serviceUuid, characteristics);

      assert.calledOnceWithExactly(warningCallback, 'unknown peripheral peripheralUuid, serviceUuid characteristics discover!');
    });

    it('should emit characteristicsDiscover and store characteristics', () => {
      const warningCallback = sinon.spy();
      const emit = sinon.spy();

      const peripheralUuid = 'peripheralUuid';
      const serviceUuid = 'serviceUuid';
      const characteristics = [
        { uuid: 'characteristic1', properties: 'properties1' },
        { uuid: 'characteristic2', properties: 'properties2' }
      ];

      noble._services = { [peripheralUuid]: { [serviceUuid]: { emit } } };
      noble._characteristics = { [peripheralUuid]: { [serviceUuid]: {} } };
      noble._descriptors = { [peripheralUuid]: { [serviceUuid]: {} } };

      noble.on('warning', warningCallback);

      noble.onCharacteristicsDiscover(peripheralUuid, serviceUuid, characteristics);

      const expectedCharacteristics = [
        new Characteristic(noble, peripheralUuid, serviceUuid, characteristics[0].uuid, characteristics[0].properties),
        new Characteristic(noble, peripheralUuid, serviceUuid, characteristics[1].uuid, characteristics[1].properties)
      ];

      assert.calledOnceWithExactly(emit, 'characteristicsDiscover', expectedCharacteristics);
      assert.notCalled(warningCallback);

      should(noble._services).deepEqual({
        [peripheralUuid]: {
          [serviceUuid]: {
            emit, characteristics: expectedCharacteristics
          }
        }
      });
      should(noble._characteristics).deepEqual({
        [peripheralUuid]: {
          [serviceUuid]: { characteristic1: expectedCharacteristics[0], characteristic2: expectedCharacteristics[1] }
        }
      });
      should(noble._descriptors).deepEqual({
        [peripheralUuid]: { [serviceUuid]: { characteristic1: {}, characteristic2: {} } }
      });
    });
  });

  it('read - should delegate to bindings', () => {
    noble._bindings.read = sinon.spy();
    noble.read('peripheralUuid', 'serviceUuid', 'characteristicUuid');
    assert.calledOnceWithExactly(noble._bindings.read, 'peripheralUuid', 'serviceUuid', 'characteristicUuid');
  });

  describe('onRead', () => {
    it('should emit warning', () => {
      const warningCallback = sinon.spy();
      noble.on('warning', warningCallback);

      noble._characteristics = {
        peripheralUuid: {
          serviceUuid: {
          }
        }
      };
      noble.onRead('peripheralUuid', 'serviceUuid', 'characteristicUuid', 'data', 'isNotification');

      assert.calledOnceWithExactly(warningCallback, 'unknown peripheral peripheralUuid, serviceUuid, characteristicUuid read!');
    });

    it('should emit data and read', () => {
      const warningCallback = sinon.spy();
      const emit = sinon.spy();

      noble.on('warning', warningCallback);

      noble._characteristics = {
        peripheralUuid: {
          serviceUuid: {
            characteristicUuid: {
              emit
            }
          }
        }
      };
      noble.onRead('peripheralUuid', 'serviceUuid', 'characteristicUuid', 'dataArg', 'isNotification');

      assert.notCalled(warningCallback);
      assert.callCount(emit, 2);
      assert.calledWithExactly(emit, 'data', 'dataArg', 'isNotification');
      assert.calledWithExactly(emit, 'read', 'dataArg', 'isNotification');
    });
  });

  it('write - should delegate to bindings', () => {
    noble._bindings.write = sinon.spy();
    noble.write('peripheralUuid', 'serviceUuid', 'characteristicUuid', 'dataArg', 'isNotification');
    assert.calledOnceWithExactly(noble._bindings.write, 'peripheralUuid', 'serviceUuid', 'characteristicUuid', 'dataArg', 'isNotification');
  });

  describe('onWrite', () => {
    it('should emit warning', () => {
      const warningCallback = sinon.spy();
      noble.on('warning', warningCallback);

      noble._characteristics = {
        peripheralUuid: {
          serviceUuid: {
          }
        }
      };
      noble.onWrite('peripheralUuid', 'serviceUuid', 'characteristicUuid');

      assert.calledOnceWithExactly(warningCallback, 'unknown peripheral peripheralUuid, serviceUuid, characteristicUuid write!');
    });

    it('should emit write', () => {
      const warningCallback = sinon.spy();
      const emit = sinon.spy();

      noble.on('warning', warningCallback);

      noble._characteristics = {
        peripheralUuid: {
          serviceUuid: {
            characteristicUuid: {
              emit
            }
          }
        }
      };
      noble.onWrite('peripheralUuid', 'serviceUuid', 'characteristicUuid');

      assert.notCalled(warningCallback);
      assert.calledOnceWithExactly(emit, 'write');
    });
  });

  it('broadcast - should delegate to bindings', () => {
    noble._bindings.broadcast = sinon.spy();
    noble.broadcast('peripheralUuid', 'serviceUuid', 'characteristicUuid', 'broadcast');
    assert.calledOnceWithExactly(noble._bindings.broadcast, 'peripheralUuid', 'serviceUuid', 'characteristicUuid', 'broadcast');
  });

  describe('onBroadcast', () => {
    it('should emit warning', () => {
      const warningCallback = sinon.spy();
      noble.on('warning', warningCallback);

      noble._characteristics = {
        peripheralUuid: {
          serviceUuid: {
          }
        }
      };
      noble.onBroadcast('peripheralUuid', 'serviceUuid', 'characteristicUuid', 'state');

      assert.calledOnceWithExactly(warningCallback, 'unknown peripheral peripheralUuid, serviceUuid, characteristicUuid broadcast!');
    });

    it('should emit broadcast', () => {
      const warningCallback = sinon.spy();
      const emit = sinon.spy();

      noble.on('warning', warningCallback);

      noble._characteristics = {
        peripheralUuid: {
          serviceUuid: {
            characteristicUuid: {
              emit
            }
          }
        }
      };
      noble.onBroadcast('peripheralUuid', 'serviceUuid', 'characteristicUuid', 'state');

      assert.notCalled(warningCallback);
      assert.calledOnceWithExactly(emit, 'broadcast', 'state');
    });
  });

  it('notify - should delegate to bindings', () => {
    noble._bindings.notify = sinon.spy();
    noble.notify('peripheralUuid', 'serviceUuid', 'characteristicUuid', 'notify');
    assert.calledOnceWithExactly(noble._bindings.notify, 'peripheralUuid', 'serviceUuid', 'characteristicUuid', 'notify');
  });

  describe('onNotify', () => {
    it('should emit warning', () => {
      const warningCallback = sinon.spy();
      noble.on('warning', warningCallback);

      noble._characteristics = {
        peripheralUuid: {
          serviceUuid: {
          }
        }
      };
      noble.onNotify('peripheralUuid', 'serviceUuid', 'characteristicUuid', 'state');

      assert.calledOnceWithExactly(warningCallback, 'unknown peripheral peripheralUuid, serviceUuid, characteristicUuid notify!');
    });

    it('should emit notify', () => {
      const warningCallback = sinon.spy();
      const emit = sinon.spy();

      noble.on('warning', warningCallback);

      noble._characteristics = {
        peripheralUuid: {
          serviceUuid: {
            characteristicUuid: {
              emit
            }
          }
        }
      };
      noble.onNotify('peripheralUuid', 'serviceUuid', 'characteristicUuid', 'state');

      assert.notCalled(warningCallback);
      assert.calledOnceWithExactly(emit, 'notify', 'state');
    });
  });

  it('discoverDescriptors - should delegate', () => {
    noble._bindings.discoverDescriptors = sinon.spy();

    noble.discoverDescriptors('peripheralUuid', 'serviceUuid', 'characteristicUuid');

    assert.calledOnceWithExactly(noble._bindings.discoverDescriptors, 'peripheralUuid', 'serviceUuid', 'characteristicUuid');
  });

  describe('onDescriptorsDiscover', () => {
    it('should emit warning', () => {
      const warningCallback = sinon.spy();

      const peripheralUuid = 'peripheralUuid';
      const serviceUuid = 'serviceUuid';
      const characteristicUuid = 'characteristicUuid';
      const descriptors = ['descriptor1', 'descriptor2'];

      noble.on('warning', warningCallback);

      noble._characteristics[peripheralUuid] = {
        [serviceUuid]: {}
      };
      noble.onDescriptorsDiscover(peripheralUuid, serviceUuid, characteristicUuid, descriptors);

      assert.calledOnceWithExactly(warningCallback, 'unknown peripheral peripheralUuid, serviceUuid, characteristicUuid descriptors discover!');
    });

    it('should emit characteristicsDiscover and store characteristics', () => {
      const warningCallback = sinon.spy();
      const emit = sinon.spy();

      const peripheralUuid = 'peripheralUuid';
      const serviceUuid = 'serviceUuid';
      const characteristicUuid = 'characteristicUuid';
      const descriptors = ['descriptor1', 'descriptor2'];

      noble._characteristics = { [peripheralUuid]: { [serviceUuid]: { [characteristicUuid]: { emit } } } };
      noble._descriptors = { [peripheralUuid]: { [serviceUuid]: { [characteristicUuid]: {} } } };

      noble.on('warning', warningCallback);

      noble.onDescriptorsDiscover(peripheralUuid, serviceUuid, characteristicUuid, descriptors);

      const expectedDescriptors = [
        new Descriptor(noble, peripheralUuid, serviceUuid, characteristicUuid, descriptors[0]),
        new Descriptor(noble, peripheralUuid, serviceUuid, characteristicUuid, descriptors[1])
      ];

      assert.calledOnceWithExactly(emit, 'descriptorsDiscover', expectedDescriptors);
      assert.notCalled(warningCallback);

      should(noble._characteristics).deepEqual({
        [peripheralUuid]: { [serviceUuid]: { [characteristicUuid]: { emit, descriptors: expectedDescriptors } } }
      });
      should(noble._descriptors).deepEqual({
        [peripheralUuid]: { [serviceUuid]: { [characteristicUuid]: { descriptor1: expectedDescriptors[0], descriptor2: expectedDescriptors[1] } } }
      });
    });
  });

  it('readValue - should delegate to bindings', () => {
    noble._bindings.readValue = sinon.spy();
    noble.readValue('peripheralUuid', 'serviceUuid', 'characteristicUuid', 'descriptorUuid');
    assert.calledOnceWithExactly(noble._bindings.readValue, 'peripheralUuid', 'serviceUuid', 'characteristicUuid', 'descriptorUuid');
  });

  describe('onValueRead', () => {
    it('should emit warning', () => {
      const warningCallback = sinon.spy();
      noble.on('warning', warningCallback);

      noble._descriptors = {
        peripheralUuid: {
          serviceUuid: {
            characteristicUuid: {}
          }
        }
      };
      noble.onValueRead('peripheralUuid', 'serviceUuid', 'characteristicUuid', 'descriptorUuid', 'data');

      assert.calledOnceWithExactly(warningCallback, 'unknown peripheral peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid value read!');
    });

    it('should emit valueRead', () => {
      const warningCallback = sinon.spy();
      const emit = sinon.spy();

      noble.on('warning', warningCallback);

      noble._descriptors = {
        peripheralUuid: {
          serviceUuid: {
            characteristicUuid: {
              descriptorUuid: {
                emit
              }
            }
          }
        }
      };
      noble.onValueRead('peripheralUuid', 'serviceUuid', 'characteristicUuid', 'descriptorUuid', 'data');

      assert.notCalled(warningCallback);
      assert.calledOnceWithExactly(emit, 'valueRead', 'data');
    });
  });

  it('writeValue - should delegate to bindings', () => {
    noble._bindings.writeValue = sinon.spy();
    noble.writeValue('peripheralUuid', 'serviceUuid', 'characteristicUuid', 'descriptorUuid', 'data');
    assert.calledOnceWithExactly(noble._bindings.writeValue, 'peripheralUuid', 'serviceUuid', 'characteristicUuid', 'descriptorUuid', 'data');
  });

  describe('onValueWrite', () => {
    it('should emit warning', () => {
      const warningCallback = sinon.spy();
      noble.on('warning', warningCallback);

      noble._descriptors = {
        peripheralUuid: {
          serviceUuid: {
            characteristicUuid: {}
          }
        }
      };
      noble.onValueWrite('peripheralUuid', 'serviceUuid', 'characteristicUuid', 'descriptorUuid');

      assert.calledOnceWithExactly(warningCallback, 'unknown peripheral peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid value write!');
    });

    it('should emit valueWrite', () => {
      const warningCallback = sinon.spy();
      const emit = sinon.spy();

      noble.on('warning', warningCallback);

      noble._descriptors = {
        peripheralUuid: {
          serviceUuid: {
            characteristicUuid: {
              descriptorUuid: {
                emit
              }
            }
          }
        }
      };
      noble.onValueWrite('peripheralUuid', 'serviceUuid', 'characteristicUuid', 'descriptorUuid');

      assert.notCalled(warningCallback);
      assert.calledOnceWithExactly(emit, 'valueWrite');
    });
  });

  it('readHandle - should delegate to bindings', () => {
    noble._bindings.readHandle = sinon.spy();
    noble.readHandle('peripheralUuid', 'handle');
    assert.calledOnceWithExactly(noble._bindings.readHandle, 'peripheralUuid', 'handle');
  });

  describe('onHandleRead', () => {
    it('should emit warning', () => {
      const warningCallback = sinon.spy();
      noble.on('warning', warningCallback);

      noble._peripherals = {
      };
      noble.onHandleRead('peripheralUuid', 'nameOfHandle', 'data');

      assert.calledOnceWithExactly(warningCallback, 'unknown peripheral peripheralUuid handle read!');
    });

    it('should emit handleWrite', () => {
      const warningCallback = sinon.spy();
      const emit = sinon.spy();

      noble.on('warning', warningCallback);

      noble._peripherals = {
        peripheralUuid: {
          emit
        }
      };
      noble.onHandleRead('peripheralUuid', 'nameOfHandle', 'data');

      assert.notCalled(warningCallback);
      assert.calledOnceWithExactly(emit, 'handleReadnameOfHandle', 'data');
    });
  });

  it('writeHandle - should delegate to bindings', () => {
    noble._bindings.writeHandle = sinon.spy();
    noble.writeHandle('peripheralUuid', 'handle', 'data', 'withoutResponse');
    assert.calledOnceWithExactly(noble._bindings.writeHandle, 'peripheralUuid', 'handle', 'data', 'withoutResponse');
  });

  describe('onHandleWrite', () => {
    it('should emit warning', () => {
      const warningCallback = sinon.spy();
      noble.on('warning', warningCallback);

      noble._peripherals = {
      };
      noble.onHandleWrite('peripheralUuid', 'nameOfHandle');

      assert.calledOnceWithExactly(warningCallback, 'unknown peripheral peripheralUuid handle write!');
    });

    it('should emit handleRead', () => {
      const warningCallback = sinon.spy();
      const emit = sinon.spy();

      noble.on('warning', warningCallback);

      noble._peripherals = {
        peripheralUuid: {
          emit
        }
      };
      noble.onHandleWrite('peripheralUuid', 'nameOfHandle');

      assert.notCalled(warningCallback);
      assert.calledOnceWithExactly(emit, 'handleWritenameOfHandle');
    });
  });

  describe('onHandleNotify', () => {
    it('should emit warning', () => {
      const warningCallback = sinon.spy();
      noble.on('warning', warningCallback);

      noble._peripherals = {
      };
      noble.onHandleNotify('peripheralUuid', 'nameOfHandle', 'data');

      assert.calledOnceWithExactly(warningCallback, 'unknown peripheral peripheralUuid handle notify!');
    });

    it('should emit handleNotify', () => {
      const warningCallback = sinon.spy();
      const emit = sinon.spy();

      noble.on('warning', warningCallback);

      noble._peripherals = {
        peripheralUuid: {
          emit
        }
      };
      noble.onHandleNotify('peripheralUuid', 'nameOfHandle', 'data');

      assert.notCalled(warningCallback);
      assert.calledOnceWithExactly(emit, 'handleNotify', 'nameOfHandle', 'data');
    });
  });

  it('onMtu - should update peripheral mtu', () => {
    const peripheral = {
      mtu: 'nan'
    };

    noble._peripherals = { uuid: peripheral };
    noble.onMtu('uuid', 'mtu');

    should(peripheral).deepEqual({ mtu: 'mtu' });
  });

  it('onMtu - should not update peripheral mtu', () => {
    const peripheral = {
    };

    noble._peripherals = { uuid: peripheral };
    noble.onMtu('uuid', 'mtu');

    should(peripheral).deepEqual({ });
  });

  describe('onIncludedServicesDiscover', () => {
    it('should emit connected on existing peripheral', () => {
      const emit = sinon.spy();
      noble._services = {
        uuid: { serviceUuid: { emit } }
      };

      const warningCallback = sinon.spy();

      noble.on('warning', warningCallback);
      noble.onIncludedServicesDiscover('uuid', 'serviceUuid', 'serviceUuids');

      assert.calledOnceWithExactly(emit, 'includedServicesDiscover', 'serviceUuids');
      assert.notCalled(warningCallback);

      should(noble._services).deepEqual({
        uuid: { serviceUuid: { includedServiceUuids: 'serviceUuids', emit } }
      });
    });

    it('should emit warning on missing peripheral', () => {
      noble._services = { uuid: {} };

      const warningCallback = sinon.spy();

      noble.on('warning', warningCallback);
      noble.onIncludedServicesDiscover('uuid', 'serviceUuid', 'serviceUuids');

      assert.calledOnceWithExactly(warningCallback, 'unknown peripheral uuid, serviceUuid included services discover!');

      should(noble._services).deepEqual({ uuid: {} });
    });
  });
});
