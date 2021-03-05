const sinon = require('sinon');
const should = require('should');

const { assert } = sinon;

const Descriptor = require('../../lib/descriptor');

describe('descriptor', () => {
  let mockNoble = null;
  const mockPeripheralId = 'mock-peripheral-id';
  const mockServiceUuid = 'mock-service-uuid';
  const mockCharacteristicUuid = 'mock-characteristic-uuid';
  const mockUuid = 'mock-uuid';

  let descriptor = null;

  beforeEach(() => {
    mockNoble = {};

    descriptor = new Descriptor(
      mockNoble,
      mockPeripheralId,
      mockServiceUuid,
      mockCharacteristicUuid,
      mockUuid
    );
  });

  it('should have a uuid', () => {
    should(descriptor.uuid).equal(mockUuid);
  });

  it('should lookup name and type by uuid', () => {
    descriptor = new Descriptor(
      mockNoble,
      mockPeripheralId,
      mockServiceUuid,
      mockCharacteristicUuid,
      '2900'
    );

    should(descriptor.name).equal('Characteristic Extended Properties');
    should(descriptor.type).equal(
      'org.bluetooth.descriptor.gatt.characteristic_extended_properties'
    );
  });

  describe('toString', () => {
    it('should be uuid, name, type', () => {
      should(descriptor.toString()).equal(
        '{"uuid":"mock-uuid","name":null,"type":null}'
      );
    });
  });

  describe('readValue', () => {
    beforeEach(() => {
      mockNoble.readValue = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should delegate to noble', () => {
      descriptor.readValue();

      assert.calledOnceWithExactly(
        mockNoble.readValue,
        mockPeripheralId,
        mockServiceUuid,
        mockCharacteristicUuid,
        mockUuid
      );
    });

    it('should callback', () => {
      const callback = sinon.spy();

      descriptor.readValue(callback);
      descriptor.emit('valueRead');
      // Check for single callback
      descriptor.emit('valueRead');

      assert.calledOnceWithExactly(callback, null, undefined);
      assert.calledOnceWithExactly(
        mockNoble.readValue,
        mockPeripheralId,
        mockServiceUuid,
        mockCharacteristicUuid,
        mockUuid
      );
    });

    it('should callback with error, data', () => {
      const mockData = Buffer.alloc(0);
      const callback = sinon.spy();

      descriptor.readValue(callback);
      descriptor.emit('valueRead', mockData);
      // Check for single callback
      descriptor.emit('valueRead', mockData);

      assert.calledOnceWithExactly(callback, null, mockData);
      assert.calledOnceWithExactly(
        mockNoble.readValue,
        mockPeripheralId,
        mockServiceUuid,
        mockCharacteristicUuid,
        mockUuid
      );
    });
  });

  describe('readValueAsync', () => {
    beforeEach(() => {
      mockNoble.readValue = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should delegate to noble', async () => {
      const promise = descriptor.readValueAsync();
      descriptor.emit('valueRead');
      // Check for single callback
      descriptor.emit('valueRead');

      should(promise).resolvedWith(undefined);
      assert.calledOnceWithExactly(
        mockNoble.readValue,
        mockPeripheralId,
        mockServiceUuid,
        mockCharacteristicUuid,
        mockUuid
      );
    });

    it('should resolve with data', async () => {
      const mockData = Buffer.alloc(0);

      const promise = descriptor.readValueAsync();
      descriptor.emit('valueRead', mockData);
      // Check for single callback
      descriptor.emit('valueRead', mockData);

      should(promise).resolvedWith(mockData);
      assert.calledOnceWithExactly(
        mockNoble.readValue,
        mockPeripheralId,
        mockServiceUuid,
        mockCharacteristicUuid,
        mockUuid
      );
    });
  });

  describe('writeValue', () => {
    beforeEach(() => {
      mockNoble.writeValue = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should only accept data as a buffer', () => {
      const mockData = {};

      should(() => descriptor.writeValue(mockData)).throw(
        'data must be a Buffer'
      );

      assert.notCalled(mockNoble.writeValue);
    });

    it('should delegate to noble', () => {
      const mockData = Buffer.alloc(0);
      descriptor.writeValue(mockData);

      assert.calledOnceWithExactly(
        mockNoble.writeValue,
        mockPeripheralId,
        mockServiceUuid,
        mockCharacteristicUuid,
        mockUuid,
        mockData
      );
    });

    it('should callback', () => {
      const mockData = Buffer.alloc(0);
      const callback = sinon.spy();

      descriptor.writeValue(mockData, callback);
      descriptor.emit('valueWrite');
      // Check for single callback
      descriptor.emit('valueWrite');

      assert.calledOnceWithExactly(callback, null);
      assert.calledOnceWithExactly(
        mockNoble.writeValue,
        mockPeripheralId,
        mockServiceUuid,
        mockCharacteristicUuid,
        mockUuid,
        mockData
      );
    });
  });

  describe('writeValueAsync', () => {
    beforeEach(() => {
      mockNoble.writeValue = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should only accept data as a buffer', async () => {
      const mockData = {};

      const promise = descriptor.writeValueAsync(mockData);

      should(promise).rejectedWith('data must be a Buffer');
    });

    it('should delegate to noble', async () => {
      const mockData = Buffer.alloc(0);

      const promise = descriptor.writeValueAsync(mockData);
      descriptor.emit('valueWrite');
      // Check for single callback
      descriptor.emit('valueWrite');

      should(promise).resolvedWith(undefined);
      assert.calledOnceWithExactly(
        mockNoble.writeValue,
        mockPeripheralId,
        mockServiceUuid,
        mockCharacteristicUuid,
        mockUuid,
        mockData
      );
    });
  });
});
