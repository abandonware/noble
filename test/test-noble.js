require('should');
const sinon = require('sinon');
const { fake, assert } = sinon;

const Noble = require('../lib/noble');

describe('Noble', () => {
  /**
   * @type {Noble & import('events').EventEmitter}
   */
  let noble;
  let mockBindings;

  beforeEach(() => {
    mockBindings = {
      init: () => {},
      on: () => {},
      setScanParameters: fake.returns(null),
      connect: fake.returns(true),
      cancelConnect: fake.returns(null),
      startScanning: sinon.spy(),
      stopScanning: sinon.spy()
    };

    noble = new Noble(mockBindings);
  });

  afterEach(() => {
    sinon.reset();
  });

  describe('startScanningAsync', () => {
    it('should delegate to binding', async () => {
      const expectedServiceUuids = [1, 2, 3];
      const expectedAllowDuplicates = true;
      const promise = noble.startScanningAsync(expectedServiceUuids, expectedAllowDuplicates);
      noble.emit('stateChange', 'poweredOn');
      noble.emit('scanStart');
      await promise;

      mockBindings.startScanning.calledWithExactly(expectedServiceUuids, expectedAllowDuplicates).should.equal(true);

      assert.notCalled(mockBindings.connect);
    });

    it('should throw an error if not powered on', async () => {
      const promise = noble.startScanningAsync();
      noble.emit('stateChange', 'poweredOff');
      noble.emit('scanStart');

      await promise.should.be.rejectedWith('Could not start scanning, state is poweredOff (not poweredOn)');

      assert.notCalled(mockBindings.connect);
    });

    it('should resolve', async () => {
      const promise = noble.startScanningAsync();
      noble.emit('stateChange', 'poweredOn');
      noble.emit('scanStart');

      await promise.should.be.resolved();

      assert.notCalled(mockBindings.connect);
    });
  });

  describe('stopScanningAsync', () => {
    it('should delegate to binding', async () => {
      noble.initialized = true;
      const promise = noble.stopScanningAsync();
      noble.emit('scanStop');
      await promise;

      mockBindings.stopScanning.calledWithExactly().should.equal(true);

      assert.notCalled(mockBindings.connect);
    });

    it('should resolve', async () => {
      const promise = noble.stopScanningAsync();
      noble.emit('scanStop');
      await promise.should.be.resolved();

      assert.notCalled(mockBindings.connect);
    });
  });

  describe('connect', () => {
    it('should delegate to binding', () => {
      const peripheralUuid = 'peripheral-uuid';
      const parameters = {};

      noble.connect(peripheralUuid, parameters);

      assert.calledOnce(mockBindings.connect);
      assert.calledWith(mockBindings.connect, peripheralUuid, parameters);
    });
  });

  describe('setScanParameters', () => {
    it('should delegate to binding', async () => {
      const interval = 'interval';
      const window = 'window';

      const promise = noble.setScanParameters(interval, window);
      noble.emit('scanParametersSet');
      await promise;

      assert.calledOnce(mockBindings.setScanParameters);
      assert.calledWith(mockBindings.setScanParameters, interval, window);
    });
  });

  describe('cancelConnect', () => {
    it('should delegate to binding', () => {
      const peripheralUuid = 'peripheral-uuid';
      const parameters = {};

      noble.cancelConnect(peripheralUuid, parameters);

      assert.calledOnce(mockBindings.cancelConnect);
      assert.calledWith(mockBindings.cancelConnect, peripheralUuid, parameters);
    });
  });
});
