const should = require('should');
const sinon = require('sinon');
const { fake, assert } = sinon;

const Peripheral = require('../../lib/peripheral');

describe('peripheral', () => {
  let mockNoble = null;
  const mockId = 'mock-id';
  const mockAddress = 'mock-address';
  const mockAddressType = 'mock-address-type';
  const mockConnectable = 'mock-connectable';
  const mockAdvertisement = 'mock-advertisement';
  const mockRssi = 'mock-rssi';
  const mockHandle = 'mock-handle';
  const mockData = 'mock-data';

  let peripheral = null;

  beforeEach(() => {
    mockNoble = {};
    peripheral = new Peripheral(mockNoble, mockId, mockAddress, mockAddressType, mockConnectable, mockAdvertisement, mockRssi);
  });

  it('should have a id', () => {
    should(peripheral.id).equal(mockId);
  });

  it('should have an address', () => {
    should(peripheral.address).equal(mockAddress);
  });

  it('should have an address type', () => {
    should(peripheral.addressType).equal(mockAddressType);
  });

  it('should have connectable', () => {
    should(peripheral.connectable).equal(mockConnectable);
  });

  it('should have advertisement', () => {
    should(peripheral.advertisement).equal(mockAdvertisement);
  });

  it('should have rssi', () => {
    should(peripheral.rssi).equal(mockRssi);
  });

  describe('toString', () => {
    it('should be id, address, address type, connectable, advertisement, rssi, state', () => {
      should(peripheral.toString()).equal('{"id":"mock-id","address":"mock-address","addressType":"mock-address-type","connectable":"mock-connectable","advertisement":"mock-advertisement","rssi":"mock-rssi","mtu":null,"state":"disconnected"}');
    });
  });

  describe('connect', () => {
    beforeEach(() => {
      mockNoble.connect = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should delegate to noble', () => {
      peripheral.connect();

      assert.calledOnceWithExactly(mockNoble.connect, mockId, undefined);
    });

    it('should callback', () => {
      const callback = sinon.spy();

      peripheral.connect(callback);
      peripheral.emit('connect', 'error');

      assert.calledOnceWithExactly(callback, 'error');
      assert.calledOnceWithExactly(mockNoble.connect, mockId, undefined);
    });

    it('with options, no callback', () => {
      const options = { options: true };

      peripheral.connect(options);
      peripheral.emit('connect');

      assert.calledOnceWithExactly(mockNoble.connect, mockId, options);
    });

    it('both options and callback', () => {
      const options = { options: true };
      const callback = fake.returns(null);

      peripheral.connect(options, callback);
      peripheral.emit('connect');

      assert.calledOnceWithExactly(callback, undefined);
      assert.calledOnceWithExactly(mockNoble.connect, mockId, options);
    });
  });

  describe('connectAsync', () => {
    beforeEach(() => {
      mockNoble.connect = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should resolve', async () => {
      const promise = peripheral.connectAsync();
      peripheral.emit('connect');

      should(promise).resolvedWith(undefined);
    });

    it('should reject on error', async () => {
      const promise = peripheral.connectAsync();
      peripheral.emit('connect', new Error('error'));

      should(promise).rejectedWith('error');
    });

    it('should delegate to noble', async () => {
      const promise = peripheral.connectAsync();
      peripheral.emit('connect');

      should(promise).resolvedWith(undefined);
      assert.calledOnceWithExactly(mockNoble.connect, mockId, undefined);
    });

    it('with options', async () => {
      const options = { options: true };

      const promise = peripheral.connectAsync(options);
      peripheral.emit('connect');

      should(promise).resolvedWith(undefined);
      assert.calledOnceWithExactly(mockNoble.connect, mockId, options);
    });
  });

  describe('cancelConnect', () => {
    beforeEach(() => {
      mockNoble.connect = sinon.spy();
      mockNoble.cancelConnect = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('not connecting, should resolve', async () => {
      await peripheral.cancelConnect();

      assert.notCalled(mockNoble.cancelConnect);
    });

    it('connecting, should emit connect with error', async () => {
      const options = { options: true };
      const connectCallback = sinon.spy();

      peripheral.connect(connectCallback);
      peripheral.cancelConnect(options);

      assert.calledOnceWithMatch(connectCallback, sinon.match({ message: 'connection canceled!' }));
      assert.calledOnceWithExactly(mockNoble.cancelConnect, mockId, options);
    });
  });

  describe('disconnect', () => {
    beforeEach(() => {
      mockNoble.disconnect = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should delegate to noble', () => {
      peripheral.disconnect();
      assert.calledOnceWithExactly(mockNoble.disconnect, mockId);
    });

    it('should callback', () => {
      const callback = sinon.spy();

      peripheral.disconnect(callback);
      peripheral.emit('disconnect');

      assert.calledOnceWithExactly(callback, null);
      assert.calledOnceWithExactly(mockNoble.disconnect, mockId);
    });
  });

  describe('disconnectAsync', () => {
    beforeEach(() => {
      mockNoble.disconnect = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should delegate to noble', () => {
      const promise = peripheral.disconnectAsync();
      peripheral.emit('disconnect');

      should(promise).resolvedWith(undefined);
      assert.calledOnceWithExactly(mockNoble.disconnect, mockId);
    });
  });

  describe('updateRssi', () => {
    beforeEach(() => {
      mockNoble.updateRssi = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should delegate to noble', () => {
      peripheral.updateRssi();
      assert.calledOnceWithExactly(mockNoble.updateRssi, mockId);
    });

    it('should callback', () => {
      const callback = sinon.spy();

      peripheral.updateRssi(callback);
      peripheral.emit('rssiUpdate', 'new-rssi');

      assert.calledOnceWithExactly(callback, null, 'new-rssi');
      assert.calledOnceWithExactly(mockNoble.updateRssi, mockId);
    });
  });

  describe('updateRssiAsync', () => {
    beforeEach(() => {
      mockNoble.updateRssi = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should resolve with rssi', async () => {
      const promise = peripheral.updateRssiAsync();
      peripheral.emit('rssiUpdate', 'new-rssi');
      should(promise).resolvedWith('new-rssi');
    });
  });

  describe('discoverServices', () => {
    beforeEach(() => {
      mockNoble.discoverServices = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should delegate to noble', () => {
      peripheral.discoverServices();
      assert.calledOnceWithExactly(mockNoble.discoverServices, mockId, undefined);
    });

    it('should delegate to noble, service uuids', () => {
      const mockServiceUuids = [];
      peripheral.discoverServices(mockServiceUuids);
      assert.calledOnceWithExactly(mockNoble.discoverServices, mockId, mockServiceUuids);
    });

    it('should callback', () => {
      const callback = sinon.spy();
      peripheral.discoverServices('uuids', callback);
      peripheral.emit('servicesDiscover', 'services');

      assert.alwaysCalledWithExactly(callback, null, 'services');
      assert.calledOnceWithExactly(mockNoble.discoverServices, mockId, 'uuids');
    });
  });

  describe('discoverServicesAsync', () => {
    beforeEach(() => {
      mockNoble.discoverServices = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should resolve with services', async () => {
      const mockServices = 'discoveredServices';

      const promise = peripheral.discoverServicesAsync('uuids');
      peripheral.emit('servicesDiscover', mockServices);

      should(promise).resolvedWith(mockServices);
      assert.calledOnceWithExactly(mockNoble.discoverServices, mockId, 'uuids');
    });
  });

  describe('discoverSomeServicesAndCharacteristics', () => {
    const mockServiceUuids = [];
    const mockCharacteristicUuids = [];
    let mockServices = null;

    beforeEach(() => {
      peripheral.discoverServices = sinon.stub();

      mockServices = [
        {
          uuid: '1',
          discoverCharacteristics: sinon.spy()
        },
        {
          uuid: '2',
          discoverCharacteristics: sinon.spy()
        }
      ];
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should call discoverServices', () => {
      peripheral.discoverSomeServicesAndCharacteristics(mockServiceUuids);
      peripheral.discoverServices.callArg(1, null, mockServices);

      assert.calledOnceWithMatch(peripheral.discoverServices, mockServiceUuids, sinon.match.func);
    });

    it('should call discoverCharacteristics on each service discovered', () => {
      peripheral.discoverSomeServicesAndCharacteristics(mockServiceUuids, mockCharacteristicUuids);
      peripheral.discoverServices.callArg(1, null, mockServices);

      assert.calledOnceWithMatch(peripheral.discoverServices, mockServiceUuids, sinon.match.func);
      assert.calledOnceWithMatch(mockServices[0].discoverCharacteristics, mockCharacteristicUuids, sinon.match.func);
      assert.calledOnceWithMatch(mockServices[1].discoverCharacteristics, mockCharacteristicUuids, sinon.match.func);
    });

    it('should callback', () => {
      const callback = sinon.spy();

      peripheral.discoverSomeServicesAndCharacteristics(mockServiceUuids, mockCharacteristicUuids, callback);
      peripheral.discoverServices.callArg(1, null, mockServices);

      assert.calledOnceWithMatch(peripheral.discoverServices, mockServiceUuids, sinon.match.func);
      assert.calledOnceWithMatch(mockServices[0].discoverCharacteristics, mockCharacteristicUuids, sinon.match.func);
      assert.calledOnceWithMatch(mockServices[1].discoverCharacteristics, mockCharacteristicUuids, sinon.match.func);

      mockServices[0].discoverCharacteristics.callArg(1, null, mockCharacteristicUuids);
      mockServices[1].discoverCharacteristics.callArg(1, null, mockCharacteristicUuids);

      assert.calledOnceWithExactly(callback, null, mockServices, mockCharacteristicUuids);
    });

    it('should callback with the services and characteristics discovered', () => {
      const callback = sinon.spy();

      peripheral.discoverSomeServicesAndCharacteristics(mockServiceUuids, mockCharacteristicUuids, callback);
      peripheral.discoverServices.callArg(1, null, mockServices);

      const mockCharacteristic1 = { uuid: '1' };
      const mockCharacteristic2 = { uuid: '2' };
      const mockCharacteristic3 = { uuid: '3' };

      assert.calledOnceWithMatch(peripheral.discoverServices, mockServiceUuids, sinon.match.func);
      assert.calledOnceWithMatch(mockServices[0].discoverCharacteristics, mockCharacteristicUuids, sinon.match.func);
      assert.calledOnceWithMatch(mockServices[1].discoverCharacteristics, mockCharacteristicUuids, sinon.match.func);

      mockServices[0].discoverCharacteristics.callArg(1, null, [mockCharacteristic1]);
      mockServices[1].discoverCharacteristics.callArg(1, null, [mockCharacteristic2, mockCharacteristic3]);

      assert.calledOnceWithExactly(callback, null, mockServices, [mockCharacteristic1, mockCharacteristic2, mockCharacteristic3]);
    });
  });

  describe('discoverSomeServicesAndCharacteristicsAsync', () => {
    const mockServiceUuids = [];
    const mockCharacteristicUuids = [];
    let mockServices = null;

    beforeEach(() => {
      peripheral.discoverServices = sinon.stub();

      mockServices = [
        {
          uuid: '1',
          discoverCharacteristics: sinon.spy()
        },
        {
          uuid: '2',
          discoverCharacteristics: sinon.spy()
        }
      ];
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should call discoverServices', async () => {
      const promise = peripheral.discoverSomeServicesAndCharacteristicsAsync(mockServiceUuids);
      peripheral.discoverServices.callArg(1, null, mockServices);

      should(promise).resolvedWith([]);
      assert.calledOnceWithMatch(peripheral.discoverServices, mockServiceUuids, sinon.match.func);
    });

    it('should call discoverCharacteristics on each service discovered', () => {
      const promise = peripheral.discoverSomeServicesAndCharacteristicsAsync(mockServiceUuids, mockCharacteristicUuids);
      peripheral.discoverServices.callArg(1, null, mockServices);

      should(promise).resolvedWith([]);
      assert.calledOnceWithMatch(peripheral.discoverServices, mockServiceUuids, sinon.match.func);
      assert.calledOnceWithMatch(mockServices[0].discoverCharacteristics, mockCharacteristicUuids, sinon.match.func);
      assert.calledOnceWithMatch(mockServices[1].discoverCharacteristics, mockCharacteristicUuids, sinon.match.func);
    });

    it('should reject on error', async () => {
      const promise = peripheral.discoverSomeServicesAndCharacteristicsAsync(mockServiceUuids, mockCharacteristicUuids);
      peripheral.discoverServices.callArg(1, 'error', null);

      should(promise).rejectedWith('error');
      assert.calledOnceWithMatch(peripheral.discoverServices, mockServiceUuids, sinon.match.func);
      assert.notCalled(mockServices[0].discoverCharacteristics);
    });

    it('should resolve with the services and characteristics discovered', async () => {
      const callback = sinon.spy();

      const promise = peripheral.discoverSomeServicesAndCharacteristicsAsync(mockServiceUuids, mockCharacteristicUuids, callback);
      peripheral.discoverServices.callArg(1, null, mockServices);

      const mockCharacteristic1 = { uuid: '1' };
      const mockCharacteristic2 = { uuid: '2' };
      const mockCharacteristic3 = { uuid: '3' };

      assert.calledOnceWithMatch(peripheral.discoverServices, mockServiceUuids, sinon.match.func);
      assert.calledOnceWithMatch(mockServices[0].discoverCharacteristics, mockCharacteristicUuids, sinon.match.func);
      assert.calledOnceWithMatch(mockServices[1].discoverCharacteristics, mockCharacteristicUuids, sinon.match.func);

      mockServices[0].discoverCharacteristics.callArg(1, null, [mockCharacteristic1]);
      mockServices[1].discoverCharacteristics.callArg(1, null, [mockCharacteristic2, mockCharacteristic3]);

      should(promise).resolvedWith([mockCharacteristic1, mockCharacteristic2, mockCharacteristic3]);
    });
  });

  describe('discoverAllServicesAndCharacteristics', () => {
    beforeEach(() => {
      peripheral.discoverSomeServicesAndCharacteristics = sinon.stub();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should call discoverSomeServicesAndCharacteristics', () => {
      const callback = sinon.spy();
      peripheral.discoverAllServicesAndCharacteristics(callback);
      assert.calledOnceWithExactly(peripheral.discoverSomeServicesAndCharacteristics, [], [], callback);
    });
  });

  describe('discoverAllServicesAndCharacteristicsAsync', () => {
    beforeEach(() => {
      peripheral.discoverSomeServicesAndCharacteristics = sinon.stub();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should call discoverSomeServicesAndCharacteristics', async () => {
      const promise = peripheral.discoverAllServicesAndCharacteristicsAsync();
      peripheral.discoverSomeServicesAndCharacteristics.callArg(2, null);
      should(promise).resolvedWith([]);
    });
  });

  describe('readHandle', () => {
    beforeEach(() => {
      mockNoble.readHandle = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should delegate to noble', () => {
      peripheral.readHandle(mockHandle);
      assert.calledOnceWithExactly(mockNoble.readHandle, mockId, mockHandle);
    });

    it('should callback', () => {
      const callback = sinon.spy();

      peripheral.readHandle(mockHandle, callback);
      peripheral.emit(`handleRead${mockHandle}`);

      assert.calledOnceWithExactly(callback, null, undefined);
      assert.calledOnceWithExactly(mockNoble.readHandle, mockId, mockHandle);
    });

    it('should callback with data', () => {
      const callback = sinon.spy();

      peripheral.readHandle(mockHandle, callback);
      peripheral.emit(`handleRead${mockHandle}`, mockData);

      assert.calledOnceWithExactly(callback, null, mockData);
      assert.calledOnceWithExactly(mockNoble.readHandle, mockId, mockHandle);
    });
  });

  describe('readHandleAsync', () => {
    beforeEach(() => {
      mockNoble.readHandle = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should delegate to noble', async () => {
      const promise = peripheral.readHandleAsync(mockHandle);
      peripheral.emit(`handleRead${mockHandle}`);

      should(promise).resolvedWith(undefined);
      assert.calledOnceWithExactly(mockNoble.readHandle, mockId, mockHandle);
    });

    it('should resolve with data', async () => {
      const promise = peripheral.readHandleAsync(mockHandle);
      peripheral.emit(`handleRead${mockHandle}`, mockData);

      should(promise).resolvedWith(mockData);
      assert.calledOnceWithExactly(mockNoble.readHandle, mockId, mockHandle);
    });
  });

  describe('writeHandle', () => {
    beforeEach(() => {
      mockNoble.writeHandle = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should only accept data as a buffer', () => {
      const mockData = {};
      should(() => peripheral.writeHandle(mockHandle, mockData)).throw('data must be a Buffer');
      assert.notCalled(mockNoble.writeHandle);
    });

    it('should delegate to noble, withoutResponse false', () => {
      const mockData = Buffer.alloc(0);
      peripheral.writeHandle(mockHandle, mockData, false);

      assert.alwaysCalledWithExactly(mockNoble.writeHandle, mockId, mockHandle, mockData, false);
    });

    it('should delegate to noble, withoutResponse true', () => {
      const mockData = Buffer.alloc(0);
      peripheral.writeHandle(mockHandle, mockData, true);

      assert.alwaysCalledWithExactly(mockNoble.writeHandle, mockId, mockHandle, mockData, true);
    });

    it('should callback', () => {
      const mockData = Buffer.alloc(0);
      const callback = sinon.spy();

      peripheral.writeHandle(mockHandle, mockData, false, callback);
      peripheral.emit(`handleWrite${mockHandle}`);

      assert.calledOnceWithExactly(callback, null);
      assert.alwaysCalledWithExactly(mockNoble.writeHandle, mockId, mockHandle, mockData, false);
    });
  });

  describe('writeHandleAsync', () => {
    beforeEach(() => {
      mockNoble.writeHandle = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should only accept data as a buffer', async () => {
      const mockData = {};
      const promise = peripheral.writeHandleAsync(mockHandle, mockData);

      should(promise).rejectedWith('data must be a Buffer');
      assert.notCalled(mockNoble.writeHandle);
    });

    it('should delegate to noble, withoutResponse false', async () => {
      const mockData = Buffer.alloc(0);
      const promise = peripheral.writeHandleAsync(mockHandle, mockData, false);
      peripheral.emit(`handleWrite${mockHandle}`);

      should(promise).resolvedWith(null);
      assert.alwaysCalledWithExactly(mockNoble.writeHandle, mockId, mockHandle, mockData, false);
    });

    it('should delegate to noble, withoutResponse true', async () => {
      const mockData = Buffer.alloc(0);
      const promise = peripheral.writeHandleAsync(mockHandle, mockData, true);
      peripheral.emit(`handleWrite${mockHandle}`);

      should(promise).resolvedWith(null);
      assert.alwaysCalledWithExactly(mockNoble.writeHandle, mockId, mockHandle, mockData, true);
    });
  });
});
