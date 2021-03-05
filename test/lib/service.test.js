const should = require('should');
const sinon = require('sinon');

const { assert } = sinon;

const Service = require('../../lib/service');

describe('service', () => {
  let mockNoble = null;
  const mockPeripheralId = 'mock-peripheral-id';
  const mockUuid = 'mock-uuid';

  let service = null;

  beforeEach(() => {
    mockNoble = {};

    service = new Service(mockNoble, mockPeripheralId, mockUuid);
  });

  it('should have a uuid', () => {
    should(service.uuid).equal(mockUuid);
  });

  it('should lookup name and type by uuid', () => {
    service = new Service(mockNoble, mockPeripheralId, '1800');

    should(service.name).equal('Generic Access');
    should(service.type).equal('org.bluetooth.service.generic_access');
  });

  describe('toString', () => {
    it('should be uuid, name, type, includedServiceUuids', () => {
      should(service.toString()).equal('{"uuid":"mock-uuid","name":null,"type":null,"includedServiceUuids":null}');
    });
  });

  describe('discoverIncludedServices', () => {
    beforeEach(() => {
      mockNoble.discoverIncludedServices = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should delegate to noble', () => {
      service.discoverIncludedServices();
      assert.calledOnceWithExactly(mockNoble.discoverIncludedServices, mockPeripheralId, mockUuid, undefined);
    });

    it('should delegate to noble, with uuids', () => {
      const mockUuids = [];
      service.discoverIncludedServices(mockUuids);
      assert.calledOnceWithExactly(mockNoble.discoverIncludedServices, mockPeripheralId, mockUuid, mockUuids);
    });

    it('should callback', () => {
      const callback = sinon.spy();

      service.discoverIncludedServices(null, callback);
      service.emit('includedServicesDiscover');

      assert.calledOnceWithExactly(callback, null, undefined);
      assert.calledOnceWithExactly(mockNoble.discoverIncludedServices, mockPeripheralId, mockUuid, null);
    });

    it('should callback with data', () => {
      const mockIncludedServiceUuids = ['service1'];
      const callback = sinon.spy();

      service.discoverIncludedServices(null, callback);
      service.emit('includedServicesDiscover', mockIncludedServiceUuids);

      assert.calledOnceWithExactly(callback, null, mockIncludedServiceUuids);
      assert.calledOnceWithExactly(mockNoble.discoverIncludedServices, mockPeripheralId, mockUuid, null);
    });
  });

  describe('discoverIncludedServicesAsync', () => {
    beforeEach(() => {
      mockNoble.discoverIncludedServices = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should delegate to noble', async () => {
      const promise = service.discoverIncludedServicesAsync();
      service.emit('includedServicesDiscover');

      should(promise).resolvedWith(undefined);
      assert.calledOnceWithExactly(mockNoble.discoverIncludedServices, mockPeripheralId, mockUuid, undefined);
    });

    it('should delegate to noble, with uuids', async () => {
      const mockUuids = [];
      const promise = service.discoverIncludedServicesAsync(mockUuids);
      service.emit('includedServicesDiscover');

      should(promise).resolvedWith(undefined);
      assert.calledOnceWithExactly(mockNoble.discoverIncludedServices, mockPeripheralId, mockUuid, mockUuids);
    });

    it('should resolve with data', async () => {
      const mockIncludedServiceUuids = ['service1'];

      const promise = service.discoverIncludedServicesAsync();
      service.emit('includedServicesDiscover', mockIncludedServiceUuids);

      should(promise).resolvedWith(mockIncludedServiceUuids);
      assert.calledOnceWithExactly(mockNoble.discoverIncludedServices, mockPeripheralId, mockUuid, undefined);
    });
  });

  describe('discoverCharacteristics', () => {
    beforeEach(() => {
      mockNoble.discoverCharacteristics = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should delegate to noble', () => {
      service.discoverCharacteristics();
      assert.calledOnceWithExactly(mockNoble.discoverCharacteristics, mockPeripheralId, mockUuid, undefined);
    });

    it('should delegate to noble, with uuids', () => {
      const mockUuids = [];
      service.discoverCharacteristics(mockUuids);
      assert.calledOnceWithExactly(mockNoble.discoverCharacteristics, mockPeripheralId, mockUuid, mockUuids);
    });

    it('should callback', () => {
      const callback = sinon.spy();

      service.discoverCharacteristics(null, callback);
      service.emit('characteristicsDiscover');

      assert.calledOnceWithExactly(callback, null, undefined);
      assert.calledOnceWithExactly(mockNoble.discoverCharacteristics, mockPeripheralId, mockUuid, null);
    });

    it('should callback with data', () => {
      const mockCharacteristics = [];
      const callback = sinon.spy();

      service.discoverCharacteristics(null, callback);
      service.emit('characteristicsDiscover', mockCharacteristics);

      assert.calledOnceWithExactly(callback, null, mockCharacteristics);
      assert.calledOnceWithExactly(mockNoble.discoverCharacteristics, mockPeripheralId, mockUuid, null);
    });
  });

  describe('discoverCharacteristicsAsync', () => {
    beforeEach(() => {
      mockNoble.discoverCharacteristics = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should delegate to noble', async () => {
      const promise = service.discoverCharacteristicsAsync();
      service.emit('characteristicsDiscover');

      should(promise).resolvedWith(undefined);
      assert.calledOnceWithExactly(mockNoble.discoverCharacteristics, mockPeripheralId, mockUuid, undefined);
    });

    it('should delegate to noble, with uuids', async () => {
      const mockUuids = [];
      const promise = service.discoverCharacteristicsAsync(mockUuids);
      service.emit('characteristicsDiscover');

      should(promise).resolvedWith(undefined);
      assert.calledOnceWithExactly(mockNoble.discoverCharacteristics, mockPeripheralId, mockUuid, mockUuids);
    });

    it('should resolve with data', async () => {
      const mockCharacteristics = [];

      const promise = service.discoverCharacteristicsAsync();
      service.emit('characteristicsDiscover', mockCharacteristics);

      should(promise).resolvedWith(mockCharacteristics);
      assert.calledOnceWithExactly(mockNoble.discoverCharacteristics, mockPeripheralId, mockUuid, undefined);
    });
  });
});
