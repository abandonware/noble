const proxyquire = require('proxyquire').noCallThru();
const should = require('should');
const sinon = require('sinon');
const { assert, fake } = sinon;

describe('hci-socket bindings', () => {
  const Gap = sinon.stub();
  const Hci = sinon.stub();

  const Bindings = proxyquire('../../../lib/hci-socket/bindings', {
    './gap': Gap,
    './hci': Hci
  });

  beforeEach(() => {
    sinon.stub(process, 'on');
  });

  afterEach(() => {
    process.on.restore();
    sinon.reset();
  });

  it('constructor', () => {
    const options = {};
    const bindings = new Bindings(options);

    should(bindings._state).eql(null);

    should(bindings._addresses).deepEqual({});
    should(bindings._addresseTypes).deepEqual({});
    should(bindings._connectable).deepEqual({});

    should(bindings._pendingConnectionUuid).eql(null);
    should(bindings._connectionQueue).deepEqual([]);

    should(bindings._handles).deepEqual({});
    should(bindings._gatts).deepEqual({});
    should(bindings._aclStreams).deepEqual({});
    should(bindings._signalings).deepEqual({});

    should(bindings._hci).instanceOf(Hci);
    should(bindings._gap).instanceOf(Gap);

    assert.calledOnce(Hci);
    assert.calledWith(Hci, options);

    assert.calledOnce(Gap);
    assert.calledWith(Gap, bindings._hci);
  });

  it('setScanParameters', () => {
    const bindings = new Bindings();
    bindings._gap.setScanParameters = fake.resolves(null);

    bindings.setScanParameters('interval', 'window');

    assert.calledOnce(bindings._gap.setScanParameters);
    assert.calledWith(bindings._gap.setScanParameters, 'interval', 'window');
  });

  it('startScanning no args', () => {
    const bindings = new Bindings();
    bindings._gap.startScanning = fake.resolves(null);

    bindings.startScanning();

    should(bindings._scanServiceUuids).deepEqual([]);

    assert.calledOnce(bindings._gap.startScanning);
    assert.calledWith(bindings._gap.startScanning, undefined);
  });

  it('startScanning with args', () => {
    const bindings = new Bindings();
    bindings._gap.startScanning = fake.resolves(null);

    bindings.startScanning(['uuid'], true);

    should(bindings._scanServiceUuids).deepEqual(['uuid']);

    assert.calledOnce(bindings._gap.startScanning);
    assert.calledWith(bindings._gap.startScanning, true);
  });

  it('stopScanning', () => {
    const bindings = new Bindings();
    bindings._gap.stopScanning = fake.resolves(null);

    bindings.stopScanning();

    assert.calledOnce(bindings._gap.stopScanning);
  });

  it('connect missing peripheral, no queue', () => {
    const bindings = new Bindings();
    bindings._hci.createLeConn = fake.resolves(null);

    bindings.connect('peripheralUuid', 'parameters');

    should(bindings._pendingConnectionUuid).eql('peripheralUuid');

    assert.calledOnce(bindings._hci.createLeConn);
    assert.calledWith(bindings._hci.createLeConn, undefined, undefined, 'parameters');
  });

  it('connect existing peripheral, no queue', () => {
    const bindings = new Bindings();
    bindings._hci.createLeConn = fake.resolves(null);
    bindings._addresses = {
      peripheralUuid: 'address'
    };
    bindings._addresseTypes = {
      peripheralUuid: 'addressType'
    };

    bindings.connect('peripheralUuid', 'parameters');

    should(bindings._pendingConnectionUuid).eql('peripheralUuid');

    assert.calledOnce(bindings._hci.createLeConn);
    assert.calledWith(bindings._hci.createLeConn, 'address', 'addressType', 'parameters');
  });

  it('connect missing peripheral, with queue', () => {
    const bindings = new Bindings();
    bindings._pendingConnectionUuid = 'pending-uuid';

    bindings.connect('peripheralUuid', 'parameters');

    should(bindings._connectionQueue).deepEqual([{ id: 'peripheralUuid', params: 'parameters' }]);
  });

  it('disconnect missing handle', () => {
    const bindings = new Bindings();
    bindings._hci.disconnect = fake.resolves(null);

    bindings.disconnect('peripheralUuid');

    assert.calledOnce(bindings._hci.disconnect);
    assert.calledWith(bindings._hci.disconnect, undefined);
  });

  it('disconnect existing handle', () => {
    const bindings = new Bindings();
    bindings._handles = {
      peripheralUuid: 'handle'
    };
    bindings._hci.disconnect = fake.resolves(null);

    bindings.disconnect('peripheralUuid');

    assert.calledOnce(bindings._hci.disconnect);
    assert.calledWith(bindings._hci.disconnect, 'handle');
  });

  it('cancel missing handle', () => {
    const bindings = new Bindings();
    bindings._connectionQueue.push({ id: 'anotherPeripheralUuid' });

    bindings._hci.cancelConnect = fake.resolves(null);

    bindings.cancelConnect('peripheralUuid');

    should(bindings._connectionQueue).size(1);

    assert.calledOnce(bindings._hci.cancelConnect);
    assert.calledWith(bindings._hci.cancelConnect, undefined);
  });

  it('cancel existing handle', () => {
    const bindings = new Bindings();
    bindings._handles = {
      peripheralUuid: 'handle'
    };
    bindings._connectionQueue.push({ id: 'anotherPeripheralUuid' });
    bindings._connectionQueue.push({ id: 'peripheralUuid' });
    bindings._hci.cancelConnect = fake.resolves(null);

    bindings.cancelConnect('peripheralUuid');

    should(bindings._connectionQueue).size(1);

    assert.calledOnce(bindings._hci.cancelConnect);
    assert.calledWith(bindings._hci.cancelConnect, 'handle');
  });

  it('reset', () => {
    const bindings = new Bindings();
    bindings._hci.reset = fake.resolves(null);

    bindings.reset();

    assert.calledOnce(bindings._hci.reset);
  });

  it('updateRssi missing handle', () => {
    const bindings = new Bindings();

    bindings._hci.readRssi = fake.resolves(null);

    bindings.updateRssi('peripheralUuid');

    assert.calledOnce(bindings._hci.readRssi);
    assert.calledWith(bindings._hci.readRssi, undefined);
  });

  it('updateRssi existing handle', () => {
    const bindings = new Bindings();
    bindings._handles = {
      peripheralUuid: 'handle'
    };
    bindings._hci.readRssi = fake.resolves(null);

    bindings.updateRssi('peripheralUuid');

    assert.calledOnce(bindings._hci.readRssi);
    assert.calledWith(bindings._hci.readRssi, 'handle');
  });

  it('init', () => {
    const bindings = new Bindings();
    bindings._gap.on = fake.resolves(null);
    bindings._hci.on = fake.resolves(null);
    bindings._hci.init = fake.resolves(null);

    bindings.init();

    assert.callCount(bindings._gap.on, 4);
    assert.callCount(bindings._hci.on, 8);
    assert.calledOnce(bindings._hci.init);

    assert.calledTwice(process.on);
  });

  it('onExit no handles', () => {
    const bindings = new Bindings();
    bindings._gap.stopScanning = fake.resolves(null);

    bindings.onExit();

    assert.calledOnce(bindings._gap.stopScanning);
  });

  it('onExit with handles', () => {
    const bindings = new Bindings();
    bindings._gap.stopScanning = fake.resolves(null);
    bindings._hci.disconnect = fake.resolves(null);

    bindings._aclStreams = [1, 2, 3];

    bindings.onExit();

    assert.calledOnce(bindings._gap.stopScanning);
    assert.calledThrice(bindings._hci.disconnect);
  });

  it('onStateChange same state', () => {
    const stateChange = fake.resolves(null);

    const bindings = new Bindings();
    bindings._state = 'state';
    bindings.on('stateChange', stateChange);

    bindings.onStateChange('state');

    assert.notCalled(stateChange);
  });

  it('onStateChange new state', () => {
    const stateChange = fake.resolves(null);

    const bindings = new Bindings();
    bindings._state = 'state';
    bindings.on('stateChange', stateChange);

    bindings.onStateChange('newState');

    assert.calledOnce(stateChange);
    assert.calledWith(stateChange, 'newState');
  });

  it('onAddressChange', () => {
    const onAddressChange = fake.resolves(null);

    const bindings = new Bindings();
    bindings.on('addressChange', onAddressChange);

    bindings.onAddressChange('newAddress');

    assert.calledOnce(onAddressChange);
    assert.calledWith(onAddressChange, 'newAddress');
  });

  it('onScanParametersSet', () => {
    const onScanParametersSet = fake.resolves(null);

    const bindings = new Bindings();
    bindings.on('scanParametersSet', onScanParametersSet);

    bindings.onScanParametersSet();

    assert.calledOnce(onScanParametersSet);
  });

  it('onScanStart', () => {
    const onScanStart = fake.resolves(null);

    const bindings = new Bindings();
    bindings.on('scanStart', onScanStart);

    bindings.onScanStart('filterDuplicates');

    assert.calledOnce(onScanStart);
    assert.calledWith(onScanStart, 'filterDuplicates');
  });

  it('onScanStop', () => {
    const onScanStop = fake.resolves(null);

    const bindings = new Bindings();
    bindings.on('scanStop', onScanStop);

    bindings.onScanStop();

    assert.calledOnce(onScanStop);
  });

  it('onDiscover new device, no scanServiceUuids', () => {
    const onDiscover = fake.resolves(null);

    const bindings = new Bindings();
    bindings.on('discover', onDiscover);

    bindings._scanServiceUuids = [];

    const status = 'status';
    const address = 'address:as:mac';
    const addressType = 'addressType';
    const connectable = 'connectable';
    const advertisement = 'advertisement';
    const rssi = 'rssi';
    bindings.onDiscover(status, address, addressType, connectable, advertisement, rssi);

    const uuid = 'addressasmac';
    should(bindings._addresses).deepEqual({ [uuid]: address });
    should(bindings._addresseTypes).deepEqual({ [uuid]: addressType });
    should(bindings._connectable).deepEqual({ [uuid]: connectable });

    assert.calledOnce(onDiscover);
    assert.calledWith(onDiscover, uuid, address, addressType, connectable, advertisement, rssi);
  });

  it('onDiscover new device, with matching scanServiceUuids', () => {
    const onDiscover = fake.resolves(null);

    const bindings = new Bindings();
    bindings.on('discover', onDiscover);

    bindings._scanServiceUuids = ['service-uuid'];

    const status = 'status';
    const address = 'address:as:mac';
    const addressType = 'addressType';
    const connectable = 'connectable';
    const advertisement = {
      serviceUuids: ['service-uuid']
    };
    const rssi = 'rssi';
    bindings.onDiscover(status, address, addressType, connectable, advertisement, rssi);

    const uuid = 'addressasmac';
    should(bindings._addresses).deepEqual({ [uuid]: address });
    should(bindings._addresseTypes).deepEqual({ [uuid]: addressType });
    should(bindings._connectable).deepEqual({ [uuid]: connectable });

    assert.calledOnce(onDiscover);
    assert.calledWith(onDiscover, uuid, address, addressType, connectable, advertisement, rssi);
  });

  it('onDiscover new device, with non-matching scanServiceUuids', () => {
    const onDiscover = fake.resolves(null);

    const bindings = new Bindings();
    bindings.on('discover', onDiscover);

    bindings._scanServiceUuids = ['service-uuid'];

    const status = 'status';
    const address = 'address:as:mac';
    const addressType = 'addressType';
    const connectable = 'connectable';
    const advertisement = {
      serviceUuids: ['another-service-uuid']
    };
    const rssi = 'rssi';
    bindings.onDiscover(status, address, addressType, connectable, advertisement, rssi);

    should(bindings._addresses).deepEqual({});
    should(bindings._addresseTypes).deepEqual({});
    should(bindings._connectable).deepEqual({});

    assert.notCalled(onDiscover);
  });

  it('onDiscover new device, with service data on advertisement', () => {
    const onDiscover = fake.resolves(null);

    const bindings = new Bindings();
    bindings.on('discover', onDiscover);

    bindings._scanServiceUuids = ['service-uuid'];

    const status = 'status';
    const address = 'address:as:mac';
    const addressType = 'addressType';
    const connectable = 'connectable';
    const advertisement = {
      serviceData: [{ uuid: 'service-uuid' }]
    };
    const rssi = 'rssi';
    bindings.onDiscover(status, address, addressType, connectable, advertisement, rssi);

    const uuid = 'addressasmac';
    should(bindings._addresses).deepEqual({ [uuid]: address });
    should(bindings._addresseTypes).deepEqual({ [uuid]: addressType });
    should(bindings._connectable).deepEqual({ [uuid]: connectable });

    assert.calledOnce(onDiscover);
    assert.calledWith(onDiscover, uuid, address, addressType, connectable, advertisement, rssi);
  });

  it('onDiscover new device, non matching service data on advertisement', () => {
    const onDiscover = fake.resolves(null);

    const bindings = new Bindings();
    bindings.on('discover', onDiscover);

    bindings._scanServiceUuids = ['service-uuid'];

    const status = 'status';
    const address = 'address:as:mac';
    const addressType = 'addressType';
    const connectable = 'connectable';
    const advertisement = {
      serviceData: [{ uuid: 'another-service-uuid' }]
    };
    const rssi = 'rssi';
    bindings.onDiscover(status, address, addressType, connectable, advertisement, rssi);

    should(bindings._addresses).deepEqual({});
    should(bindings._addresseTypes).deepEqual({});
    should(bindings._connectable).deepEqual({});

    assert.notCalled(onDiscover);
  });

  it('onDiscover new device, no services on advertisement', () => {
    const onDiscover = fake.resolves(null);

    const bindings = new Bindings();
    bindings.on('discover', onDiscover);

    bindings._scanServiceUuids = ['service-uuid'];

    const status = 'status';
    const address = 'address:as:mac';
    const addressType = 'addressType';
    const connectable = 'connectable';
    const advertisement = {};
    const rssi = 'rssi';
    bindings.onDiscover(status, address, addressType, connectable, advertisement, rssi);

    should(bindings._addresses).deepEqual({});
    should(bindings._addresseTypes).deepEqual({});
    should(bindings._connectable).deepEqual({});

    assert.notCalled(onDiscover);
  });

  it('onDiscover new device, undefined _scanServiceUuids', () => {
    const onDiscover = fake.resolves(null);

    const bindings = new Bindings();
    bindings.on('discover', onDiscover);

    bindings._scanServiceUuids = undefined;

    const status = 'status';
    const address = 'address:as:mac';
    const addressType = 'addressType';
    const connectable = 'connectable';
    const advertisement = {
      serviceData: [{ uuid: 'service-uuid' }]
    };
    const rssi = 'rssi';
    bindings.onDiscover(status, address, addressType, connectable, advertisement, rssi);

    should(bindings._addresses).deepEqual({});
    should(bindings._addresseTypes).deepEqual({});
    should(bindings._connectable).deepEqual({});

    assert.notCalled(onDiscover);
  });
});
