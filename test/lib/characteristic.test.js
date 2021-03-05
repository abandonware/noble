const sinon = require('sinon');
const should = require('should');

const { assert } = sinon;

const Characteristic = require('../../lib/characteristic');

describe('characteristic', () => {
  let mockNoble = null;
  const mockPeripheralId = 'mock-peripheral-id';
  const mockServiceUuid = 'mock-service-uuid';
  const mockUuid = 'mock-uuid';
  const mockProperties = ['mock-property-1', 'mock-property-2'];

  let characteristic = null;

  beforeEach(() => {
    mockNoble = {};

    characteristic = new Characteristic(
      mockNoble,
      mockPeripheralId,
      mockServiceUuid,
      mockUuid,
      mockProperties
    );
  });

  it('should have a uuid', () => {
    should(characteristic.uuid).equal(mockUuid);
  });

  it('should lookup name and type by uuid', () => {
    characteristic = new Characteristic(
      mockNoble,
      mockPeripheralId,
      mockServiceUuid,
      '2a00',
      mockProperties
    );

    should(characteristic.name).equal('Device Name');
    should(characteristic.type).equal(
      'org.bluetooth.characteristic.gap.device_name'
    );
  });

  it('should have properties', () => {
    should(characteristic.properties).equal(mockProperties);
  });

  describe('toString', () => {
    it('should be uuid, name, type, properties', () => {
      should(characteristic.toString()).equal(
        '{"uuid":"mock-uuid","name":null,"type":null,"properties":["mock-property-1","mock-property-2"]}'
      );
    });
  });

  describe('read', () => {
    beforeEach(() => {
      mockNoble.read = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should delegate to noble', () => {
      characteristic.read();
      assert.calledOnceWithExactly(
        mockNoble.read,
        mockPeripheralId,
        mockServiceUuid,
        mockUuid
      );
    });

    it('should callback without data', () => {
      const callback = sinon.spy();

      characteristic.read(callback);
      characteristic.emit('read');
      // Check for single callback
      characteristic.emit('read');

      assert.calledOnceWithExactly(callback, null, undefined);
      assert.calledOnceWithExactly(
        mockNoble.read,
        mockPeripheralId,
        mockServiceUuid,
        mockUuid
      );
    });

    it('should callback with data', () => {
      const callback = sinon.spy();
      const data = 'data';

      characteristic.read(callback);
      characteristic.emit('read', data);
      // Check for single callback
      characteristic.emit('read', data);

      assert.calledOnceWithExactly(callback, null, data);
      assert.calledOnceWithExactly(
        mockNoble.read,
        mockPeripheralId,
        mockServiceUuid,
        mockUuid
      );
    });

    it('should not callback as it is notification', () => {
      const callback = sinon.spy();
      const data = 'data';

      characteristic.read(callback);
      characteristic.emit('read', data, true);
      // Check for single callback
      characteristic.emit('read', data, true);

      assert.notCalled(callback);
      assert.calledOnceWithExactly(
        mockNoble.read,
        mockPeripheralId,
        mockServiceUuid,
        mockUuid
      );
    });
  });

  describe('readAsync', () => {
    beforeEach(() => {
      mockNoble.read = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should delegate to noble', async () => {
      const promise = characteristic.readAsync();
      characteristic.emit('read');
      // Check for single callback
      characteristic.emit('read');

      should(promise).resolvedWith(undefined);
      assert.calledOnceWithExactly(
        mockNoble.read,
        mockPeripheralId,
        mockServiceUuid,
        mockUuid
      );
    });

    it('should returns without data', async () => {
      const promise = characteristic.readAsync();
      characteristic.emit('read');
      // Check for single callback
      characteristic.emit('read');

      should(promise).resolvedWith(undefined);
      assert.calledOnceWithExactly(
        mockNoble.read,
        mockPeripheralId,
        mockServiceUuid,
        mockUuid
      );
    });

    it('should callback with data', async () => {
      const data = 'data';

      const promise = characteristic.readAsync();
      characteristic.emit('read', data);
      // Check for single callback
      characteristic.emit('read', data);

      should(promise).resolvedWith(data);
      assert.calledOnceWithExactly(
        mockNoble.read,
        mockPeripheralId,
        mockServiceUuid,
        mockUuid
      );
    });

    // This shows that async notification never ends
    it.skip('should not callback as it is notification', async () => {
      const data = 'data';

      const promise = characteristic.readAsync();
      characteristic.emit('read', data, true);
      // Check for single callback
      characteristic.emit('read', data, true);

      should(promise).resolvedWith(undefined);
      assert.calledOnceWithExactly(
        mockNoble.read,
        mockPeripheralId,
        mockServiceUuid,
        mockUuid
      );
    });
  });

  describe('write', () => {
    let processTitle = null;
    beforeEach(() => {
      mockNoble.write = sinon.spy();
      processTitle = process.title;
    });

    afterEach(() => {
      sinon.reset();
      process.title = processTitle;
    });

    it('should only accept data as a buffer', () => {
      should(() => characteristic.write({})).throw(
        'data must be a Buffer or Uint8Array or Uint16Array or Uint32Array'
      );

      assert.notCalled(mockNoble.write);
    });

    it('should accept any kind of data as process is browser', () => {
      process.title = 'browser';

      const mockData = {};
      characteristic.write(mockData);

      assert.calledOnceWithExactly(
        mockNoble.write,
        mockPeripheralId,
        mockServiceUuid,
        mockUuid,
        mockData,
        undefined
      );
    });

    it('should delegate to noble, withoutResponse false', () => {
      const mockData = Buffer.alloc(0);
      characteristic.write(mockData, false);

      assert.calledOnceWithExactly(
        mockNoble.write,
        mockPeripheralId,
        mockServiceUuid,
        mockUuid,
        mockData,
        false
      );
    });

    it('should delegate to noble, withoutResponse true', () => {
      const mockData = Buffer.alloc(0);
      characteristic.write(mockData, true);

      assert.calledOnceWithExactly(
        mockNoble.write,
        mockPeripheralId,
        mockServiceUuid,
        mockUuid,
        mockData,
        true
      );
    });

    it('should callback', () => {
      const mockData = Buffer.alloc(0);
      const callback = sinon.spy();

      characteristic.write(mockData, true, callback);
      characteristic.emit('write');
      // Check for single callback
      characteristic.emit('write');

      assert.calledOnceWithExactly(callback, null);
      assert.calledOnceWithExactly(
        mockNoble.write,
        mockPeripheralId,
        mockServiceUuid,
        mockUuid,
        mockData,
        true
      );
    });
  });

  describe('writeAsync', () => {
    beforeEach(() => {
      mockNoble.write = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should only accept data as a buffer', async () => {
      const promise = characteristic.writeAsync({});
      should(promise).rejectedWith(
        'data must be a Buffer or Uint8Array or Uint16Array or Uint32Array'
      );

      assert.notCalled(mockNoble.write);
    });

    it('should delegate to noble, withoutResponse false', async () => {
      const mockData = Buffer.alloc(0);
      const promise = characteristic.writeAsync(mockData, false);
      characteristic.emit('write');
      // Check for single callback
      characteristic.emit('write');

      should(promise).resolvedWith(undefined);
      assert.calledOnceWithExactly(
        mockNoble.write,
        mockPeripheralId,
        mockServiceUuid,
        mockUuid,
        mockData,
        false
      );
    });

    it('should delegate to noble, withoutResponse true', async () => {
      const mockData = Buffer.alloc(0);
      const promise = characteristic.writeAsync(mockData, true);
      characteristic.emit('write');
      // Check for single callback
      characteristic.emit('write');

      should(promise).resolvedWith(undefined);
      assert.calledOnceWithExactly(
        mockNoble.write,
        mockPeripheralId,
        mockServiceUuid,
        mockUuid,
        mockData,
        true
      );
    });

    it('should resolve', async () => {
      const mockData = Buffer.alloc(0);
      const promise = characteristic.writeAsync(mockData, true);
      characteristic.emit('write');
      // Check for single callback
      characteristic.emit('write');

      should(promise).resolvedWith(undefined);
    });
  });

  describe('broadcast', () => {
    beforeEach(() => {
      mockNoble.broadcast = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should delegate to noble, true', () => {
      characteristic.broadcast(true);

      assert.calledOnceWithExactly(
        mockNoble.broadcast,
        mockPeripheralId,
        mockServiceUuid,
        mockUuid,
        true
      );
    });

    it('should delegate to noble, false', () => {
      characteristic.broadcast(false);

      assert.calledOnceWithExactly(
        mockNoble.broadcast,
        mockPeripheralId,
        mockServiceUuid,
        mockUuid,
        false
      );
    });

    it('should callback', () => {
      const callback = sinon.spy();

      characteristic.broadcast(true, callback);
      characteristic.emit('broadcast');
      // Check for single callback
      characteristic.emit('broadcast');

      assert.calledOnceWithExactly(callback, null);
      assert.calledOnceWithExactly(
        mockNoble.broadcast,
        mockPeripheralId,
        mockServiceUuid,
        mockUuid,
        true
      );
    });
  });

  describe('broadcastAsync', () => {
    beforeEach(() => {
      mockNoble.broadcast = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should delegate to noble, true', async () => {
      const promise = characteristic.broadcastAsync(true);
      characteristic.emit('broadcast');
      // Check for single callback
      characteristic.emit('broadcast');

      should(promise).resolvedWith(undefined);
      assert.calledOnceWithExactly(
        mockNoble.broadcast,
        mockPeripheralId,
        mockServiceUuid,
        mockUuid,
        true
      );
    });

    it('should delegate to noble, false', async () => {
      const promise = characteristic.broadcastAsync(false);
      characteristic.emit('broadcast');
      // Check for single callback
      characteristic.emit('broadcast');

      should(promise).resolvedWith(undefined);
      assert.calledOnceWithExactly(
        mockNoble.broadcast,
        mockPeripheralId,
        mockServiceUuid,
        mockUuid,
        false
      );
    });

    it('should resolve', async () => {
      const promise = characteristic.broadcastAsync(true);
      characteristic.emit('broadcast');
      // Check for single callback
      characteristic.emit('broadcast');

      should(promise).resolvedWith(undefined);
      assert.calledOnceWithExactly(
        mockNoble.broadcast,
        mockPeripheralId,
        mockServiceUuid,
        mockUuid,
        true
      );
    });
  });

  describe('notify', () => {
    beforeEach(() => {
      mockNoble.notify = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should delegate to noble, true', () => {
      characteristic.notify(true);

      assert.calledOnceWithExactly(
        mockNoble.notify,
        mockPeripheralId,
        mockServiceUuid,
        mockUuid,
        true
      );
    });

    it('should delegate to noble, false', () => {
      characteristic.notify(false);

      assert.calledOnceWithExactly(
        mockNoble.notify,
        mockPeripheralId,
        mockServiceUuid,
        mockUuid,
        false
      );
    });

    it('should callback', () => {
      const callback = sinon.spy();

      characteristic.notify(true, callback);
      characteristic.emit('notify');
      // Check for single callback
      characteristic.emit('notify');

      assert.calledOnceWithExactly(callback, null);
      assert.calledOnceWithExactly(
        mockNoble.notify,
        mockPeripheralId,
        mockServiceUuid,
        mockUuid,
        true
      );
    });
  });

  describe('notifyAsync', () => {
    beforeEach(() => {
      mockNoble.notify = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should delegate to noble, true', async () => {
      const promise = characteristic.notifyAsync(true);
      characteristic.emit('notify');
      // Check for single callback
      characteristic.emit('notify');

      should(promise).resolvedWith(undefined);
      assert.calledOnceWithExactly(
        mockNoble.notify,
        mockPeripheralId,
        mockServiceUuid,
        mockUuid,
        true
      );
    });

    it('should delegate to noble, false', async () => {
      const promise = characteristic.notifyAsync(false);
      characteristic.emit('notify');
      // Check for single callback
      characteristic.emit('notify');

      should(promise).resolvedWith(undefined);
      assert.calledOnceWithExactly(
        mockNoble.notify,
        mockPeripheralId,
        mockServiceUuid,
        mockUuid,
        false
      );
    });
  });

  describe('subscribe', () => {
    beforeEach(() => {
      mockNoble.notify = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should delegate to noble notify, true', () => {
      characteristic.subscribe();

      assert.calledOnceWithExactly(
        mockNoble.notify,
        mockPeripheralId,
        mockServiceUuid,
        mockUuid,
        true
      );
    });

    it('should callback', () => {
      const callback = sinon.spy();

      characteristic.subscribe(callback);
      characteristic.emit('notify');
      // Check for single callback
      characteristic.emit('notify');

      assert.calledOnceWithExactly(callback, null);
      assert.calledOnceWithExactly(
        mockNoble.notify,
        mockPeripheralId,
        mockServiceUuid,
        mockUuid,
        true
      );
    });
  });

  describe('subscribeAsync', () => {
    beforeEach(() => {
      mockNoble.notify = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should delegate to noble notify, true', async () => {
      const promise = characteristic.subscribeAsync();
      characteristic.emit('notify');
      // Check for single callback
      characteristic.emit('notify');

      should(promise).resolvedWith(undefined);
      assert.calledOnceWithExactly(
        mockNoble.notify,
        mockPeripheralId,
        mockServiceUuid,
        mockUuid,
        true
      );
    });
  });

  describe('unsubscribe', () => {
    beforeEach(() => {
      mockNoble.notify = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should delegate to noble notify, false', () => {
      characteristic.unsubscribe();

      assert.calledOnceWithExactly(
        mockNoble.notify,
        mockPeripheralId,
        mockServiceUuid,
        mockUuid,
        false
      );
    });

    it('should callback', () => {
      const callback = sinon.spy();

      characteristic.unsubscribe(callback);
      characteristic.emit('notify');
      // Check for single callback
      characteristic.emit('notify');

      assert.calledOnceWithExactly(callback, null);
      assert.calledOnceWithExactly(
        mockNoble.notify,
        mockPeripheralId,
        mockServiceUuid,
        mockUuid,
        false
      );
    });
  });

  describe('unsubscribeAsync', () => {
    beforeEach(() => {
      mockNoble.notify = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should delegate to noble notify, false', async () => {
      const promise = characteristic.unsubscribeAsync();
      characteristic.emit('notify');
      // Check for single callback
      characteristic.emit('notify');

      should(promise).resolvedWith(undefined);
      assert.calledOnceWithExactly(
        mockNoble.notify,
        mockPeripheralId,
        mockServiceUuid,
        mockUuid,
        false
      );
    });
  });

  describe('discoverDescriptors', () => {
    beforeEach(() => {
      mockNoble.discoverDescriptors = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should delegate to noble', () => {
      characteristic.discoverDescriptors();

      assert.calledOnceWithExactly(
        mockNoble.discoverDescriptors,
        mockPeripheralId,
        mockServiceUuid,
        mockUuid
      );
    });

    it('should callback, undefined descriptors', () => {
      const callback = sinon.spy();

      characteristic.discoverDescriptors(callback);
      characteristic.emit('descriptorsDiscover');
      // Check for single callback
      characteristic.emit('descriptorsDiscover');

      assert.calledOnceWithExactly(callback, null, undefined);
      assert.calledOnceWithExactly(
        mockNoble.discoverDescriptors,
        mockPeripheralId,
        mockServiceUuid,
        mockUuid
      );
    });

    it('should callback with descriptors', () => {
      const callback = sinon.spy();
      const descriptors = 'descriptors';

      characteristic.discoverDescriptors(callback);
      characteristic.emit('descriptorsDiscover', descriptors);
      // Check for single callback
      characteristic.emit('descriptorsDiscover', descriptors);

      assert.calledOnceWithExactly(callback, null, descriptors);
      assert.calledOnceWithExactly(
        mockNoble.discoverDescriptors,
        mockPeripheralId,
        mockServiceUuid,
        mockUuid
      );
    });
  });

  describe('discoverDescriptorsAsync', () => {
    beforeEach(() => {
      mockNoble.discoverDescriptors = sinon.spy();
    });

    afterEach(() => {
      sinon.reset();
    });

    it('should delegate to noble', async () => {
      const promise = characteristic.discoverDescriptorsAsync();
      characteristic.emit('descriptorsDiscover');
      // Check for single callback
      characteristic.emit('descriptorsDiscover');

      should(promise).resolvedWith(null, undefined);
      assert.calledOnceWithExactly(
        mockNoble.discoverDescriptors,
        mockPeripheralId,
        mockServiceUuid,
        mockUuid
      );
    });

    it('should resolve with descriptors', async () => {
      const descriptors = 'descriptors';

      const promise = characteristic.discoverDescriptorsAsync();
      characteristic.emit('descriptorsDiscover', descriptors);
      // Check for single callback
      characteristic.emit('descriptorsDiscover', descriptors);

      should(promise).resolvedWith(null, descriptors);
      assert.calledOnceWithExactly(
        mockNoble.discoverDescriptors,
        mockPeripheralId,
        mockServiceUuid,
        mockUuid
      );
    });
  });
});
