const proxyquire = require('proxyquire').noCallThru();
const should = require('should');
const sinon = require('sinon');
const { assert, fake } = sinon;

describe('hci-socket bindings', () => {
  const AclStream = sinon.stub();
  const Gap = sinon.stub();

  const gattOnSpy = sinon.spy();
  const gattExchangeMtuSpy = sinon.spy();
  const Gatt = sinon.stub();
  Gatt.prototype.on = gattOnSpy;
  Gatt.prototype.exchangeMtu = gattExchangeMtuSpy;

  const createLeConnSpy = sinon.spy();
  const Hci = sinon.stub();
  Hci.prototype.createLeConn = createLeConnSpy;
  Hci.STATUS_MAPPER = { 1: 'custom mapper' };

  const signalingOnSpy = sinon.spy();

  const Signaling = sinon.stub();
  Signaling.prototype.on = signalingOnSpy;

  const Bindings = proxyquire('../../../lib/hci-socket/bindings', {
    './acl-stream': AclStream,
    './gap': Gap,
    './gatt': Gatt,
    './hci': Hci,
    './signaling': Signaling
  });

  let bindings;
  let clock;
  const options = {};

  beforeEach(() => {
    sinon.stub(process, 'on');
    sinon.stub(process, 'exit');

    bindings = new Bindings(options);
    clock = sinon.useFakeTimers();
  });

  afterEach(() => {
    process.on.restore();
    process.exit.restore();
    clock.restore();
    sinon.reset();
  });

  it('constructor', () => {
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

  describe('onSigInt', () => {
    it('should exit', () => {
      const sigIntListeners = process.listeners('SIGINT');
      bindings.onSigIntBinded = sigIntListeners[sigIntListeners.length - 1];
      bindings.onSigInt();
      assert.calledOnceWithExactly(process.exit, 1);
    });

    it('should not exit', () => {
      bindings.onSigIntBinded = sinon.spy();
      bindings.onSigInt();
      assert.notCalled(process.exit);
    });
  });

  it('setScanParameters', () => {
    bindings._gap.setScanParameters = fake.resolves(null);

    bindings.setScanParameters('interval', 'window');

    assert.calledOnce(bindings._gap.setScanParameters);
    assert.calledWith(bindings._gap.setScanParameters, 'interval', 'window');
  });

  describe('startScanning', () => {
    it('no args', () => {
      bindings._gap.startScanning = fake.resolves(null);

      bindings.startScanning();

      should(bindings._scanServiceUuids).deepEqual([]);

      assert.calledOnce(bindings._gap.startScanning);
      assert.calledWith(bindings._gap.startScanning, undefined);
    });

    it('with args', () => {
      bindings._gap.startScanning = fake.resolves(null);

      bindings.startScanning(['uuid'], true);

      should(bindings._scanServiceUuids).deepEqual(['uuid']);

      assert.calledOnce(bindings._gap.startScanning);
      assert.calledWith(bindings._gap.startScanning, true);
    });
  });

  it('stopScanning', () => {
    bindings._gap.stopScanning = fake.resolves(null);

    bindings.stopScanning();

    assert.calledOnce(bindings._gap.stopScanning);
  });

  describe('connect', () => {
    it('missing peripheral, no queue', () => {
      bindings._hci.createLeConn = fake.resolves(null);

      bindings.connect('peripheralUuid', 'parameters');

      should(bindings._pendingConnectionUuid).eql('peripheralUuid');

      assert.calledOnce(bindings._hci.createLeConn);
      assert.calledWith(bindings._hci.createLeConn, undefined, undefined, 'parameters');
    });

    it('existing peripheral, no queue', () => {
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

    it('missing peripheral, with queue', () => {
      bindings._pendingConnectionUuid = 'pending-uuid';

      bindings.connect('peripheralUuid', 'parameters');

      should(bindings._connectionQueue).deepEqual([{ id: 'peripheralUuid', params: 'parameters' }]);
    });
  });

  describe('disconnect', () => {
    it('missing handle', () => {
      bindings._hci.disconnect = fake.resolves(null);

      bindings.disconnect('peripheralUuid');

      assert.calledOnce(bindings._hci.disconnect);
      assert.calledWith(bindings._hci.disconnect, undefined);
    });

    it('existing handle', () => {
      bindings._handles = {
        peripheralUuid: 'handle'
      };
      bindings._hci.disconnect = fake.resolves(null);

      bindings.disconnect('peripheralUuid');

      assert.calledOnce(bindings._hci.disconnect);
      assert.calledWith(bindings._hci.disconnect, 'handle');
    });
  });

  describe('cancel', () => {
    it('missing handle', () => {
      bindings._connectionQueue.push({ id: 'anotherPeripheralUuid' });

      bindings._hci.cancelConnect = fake.resolves(null);

      bindings.cancelConnect('peripheralUuid');

      should(bindings._connectionQueue).size(1);

      assert.calledOnce(bindings._hci.cancelConnect);
      assert.calledWith(bindings._hci.cancelConnect, undefined);
    });

    it('existing handle', () => {
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
  });

  it('reset', () => {
    bindings._hci.reset = fake.resolves(null);

    bindings.reset();

    assert.calledOnce(bindings._hci.reset);
  });

  describe('updateRssi', () => {
    it('missing handle', () => {
      bindings._hci.readRssi = fake.resolves(null);

      bindings.updateRssi('peripheralUuid');

      assert.calledOnce(bindings._hci.readRssi);
      assert.calledWith(bindings._hci.readRssi, undefined);
    });

    it('existing handle', () => {
      bindings._handles = {
        peripheralUuid: 'handle'
      };
      bindings._hci.readRssi = fake.resolves(null);

      bindings.updateRssi('peripheralUuid');

      assert.calledOnce(bindings._hci.readRssi);
      assert.calledWith(bindings._hci.readRssi, 'handle');
    });
  });

  it('init', () => {
    bindings._gap.on = fake.resolves(null);
    bindings._hci.on = fake.resolves(null);
    bindings._hci.init = fake.resolves(null);

    bindings.init();

    assert.callCount(bindings._gap.on, 4);
    assert.callCount(bindings._hci.on, 8);
    assert.calledOnce(bindings._hci.init);

    assert.calledTwice(process.on);
  });

  describe('onExit', () => {
    it('no handles', () => {
      bindings._gap.stopScanning = fake.resolves(null);

      bindings.onExit();

      assert.calledOnce(bindings._gap.stopScanning);
    });

    it('with handles', () => {
      bindings._gap.stopScanning = fake.resolves(null);
      bindings._hci.disconnect = fake.resolves(null);

      bindings._aclStreams = [1, 2, 3];

      bindings.onExit();

      assert.calledOnce(bindings._gap.stopScanning);
      assert.calledThrice(bindings._hci.disconnect);
    });
  });

  describe('onStateChange', () => {
    it('same state', () => {
      const stateChange = fake.resolves(null);

      bindings._state = 'state';
      bindings.on('stateChange', stateChange);

      bindings.onStateChange('state');

      assert.notCalled(stateChange);
    });

    it('new state', () => {
      const stateChange = fake.resolves(null);

      bindings._state = 'state';
      bindings.on('stateChange', stateChange);

      bindings.onStateChange('newState');

      assert.calledOnce(stateChange);
      assert.calledWith(stateChange, 'newState');
    });

    it('unauthorized', () => {
      const stateChange = fake.resolves(null);

      bindings._state = 'state';
      bindings.on('stateChange', stateChange);

      bindings.onStateChange('unauthorized');

      assert.calledOnce(stateChange);
      assert.calledWith(stateChange, 'unauthorized');
    });

    it('unsupported', () => {
      const stateChange = fake.resolves(null);

      bindings._state = 'state';
      bindings.on('stateChange', stateChange);

      bindings.onStateChange('unsupported');

      assert.calledOnce(stateChange);
      assert.calledWith(stateChange, 'unsupported');
    });
  });

  it('onAddressChange', () => {
    const onAddressChange = fake.resolves(null);

    bindings.on('addressChange', onAddressChange);

    bindings.onAddressChange('newAddress');

    assert.calledOnce(onAddressChange);
    assert.calledWith(onAddressChange, 'newAddress');
  });

  it('onScanParametersSet', () => {
    const onScanParametersSet = fake.resolves(null);

    bindings.on('scanParametersSet', onScanParametersSet);

    bindings.onScanParametersSet();

    assert.calledOnce(onScanParametersSet);
  });

  it('onScanStart', () => {
    const onScanStart = fake.resolves(null);

    bindings.on('scanStart', onScanStart);

    bindings.onScanStart('filterDuplicates');

    assert.calledOnce(onScanStart);
    assert.calledWith(onScanStart, 'filterDuplicates');
  });

  it('onScanStop', () => {
    const onScanStop = fake.resolves(null);

    bindings.on('scanStop', onScanStop);

    bindings.onScanStop();

    assert.calledOnce(onScanStop);
  });

  describe('onDiscover', () => {
    it('new device, no scanServiceUuids', () => {
      const onDiscover = fake.resolves(null);

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

    it('new device, with matching scanServiceUuids', () => {
      const onDiscover = fake.resolves(null);

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

    it('new device, with non-matching scanServiceUuids', () => {
      const onDiscover = fake.resolves(null);

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

    it('new device, with service data on advertisement', () => {
      const onDiscover = fake.resolves(null);

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

    it('new device, non matching service data on advertisement', () => {
      const onDiscover = fake.resolves(null);

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

    it('new device, no services on advertisement', () => {
      const onDiscover = fake.resolves(null);

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

    it('new device, undefined _scanServiceUuids', () => {
      const onDiscover = fake.resolves(null);

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

  describe('onLeConnComplete', () => {
    it('not on master node', () => {
      const status = 1;
      const handle = 'handle';
      const role = 'not-master';
      const addressType = 'addressType';
      const address = 'address';

      const connectCallback = sinon.spy();

      bindings.on('connect', connectCallback);
      bindings.onLeConnComplete(status, handle, role, addressType, address);

      assert.notCalled(connectCallback);
    });

    it('with right status on master node', () => {
      const status = 0;
      const handle = 'handle';
      const role = 0;
      const addressType = 'addressType';
      const address = 'address:split:by:separator';

      const connectCallback = sinon.spy();

      bindings.on('connect', connectCallback);
      bindings.onLeConnComplete(status, handle, role, addressType, address);

      clock.tick(0);

      assert.calledOnce(AclStream);
      assert.calledOnce(Gatt);
      assert.calledOnce(Signaling);

      assert.callCount(gattOnSpy, 17);
      assert.calledWithMatch(gattOnSpy, 'mtu', sinon.match.func);
      assert.calledWithMatch(gattOnSpy, 'servicesDiscover', sinon.match.func);
      assert.calledWithMatch(gattOnSpy, 'servicesDiscovered', sinon.match.func);
      assert.calledWithMatch(gattOnSpy, 'includedServicesDiscover', sinon.match.func);
      assert.calledWithMatch(gattOnSpy, 'characteristicsDiscover', sinon.match.func);
      assert.calledWithMatch(gattOnSpy, 'characteristicsDiscovered', sinon.match.func);
      assert.calledWithMatch(gattOnSpy, 'read', sinon.match.func);
      assert.calledWithMatch(gattOnSpy, 'write', sinon.match.func);
      assert.calledWithMatch(gattOnSpy, 'broadcast', sinon.match.func);
      assert.calledWithMatch(gattOnSpy, 'notify', sinon.match.func);
      assert.calledWithMatch(gattOnSpy, 'notification', sinon.match.func);
      assert.calledWithMatch(gattOnSpy, 'descriptorsDiscover', sinon.match.func);
      assert.calledWithMatch(gattOnSpy, 'valueRead', sinon.match.func);
      assert.calledWithMatch(gattOnSpy, 'valueWrite', sinon.match.func);
      assert.calledWithMatch(gattOnSpy, 'handleRead', sinon.match.func);
      assert.calledWithMatch(gattOnSpy, 'handleWrite', sinon.match.func);
      assert.calledWithMatch(gattOnSpy, 'handleNotify', sinon.match.func);

      assert.calledOnceWithMatch(signalingOnSpy, 'connectionParameterUpdateRequest', sinon.match.func);

      assert.calledOnceWithExactly(gattExchangeMtuSpy);

      assert.calledOnceWithExactly(connectCallback, 'addresssplitbyseparator', null);

      should(bindings._pendingConnectionUuid).equal(null);
    });

    it('with invalid status on master node', () => {
      const status = 1;
      const handle = 'handle';
      const role = 0;
      const addressType = 'addressType';
      const address = 'address:split:by:separator';

      const connectCallback = sinon.spy();

      bindings._pendingConnectionUuid = 'pending_uuid';
      bindings.on('connect', connectCallback);
      bindings.onLeConnComplete(status, handle, role, addressType, address);

      assert.notCalled(AclStream);
      assert.notCalled(Gatt);
      assert.notCalled(Signaling);

      assert.calledOnceWithMatch(connectCallback, 'pending_uuid', sinon.match({ message: 'custom mapper (0x1)' }));

      should(bindings._pendingConnectionUuid).equal(null);
    });

    it('with unmapped status on master node', () => {
      const status = 2;
      const handle = 'handle';
      const role = 0;
      const addressType = 'addressType';
      const address = 'address:split:by:separator';

      const connectCallback = sinon.spy();

      bindings._pendingConnectionUuid = 'pending_uuid';
      bindings.on('connect', connectCallback);
      bindings.onLeConnComplete(status, handle, role, addressType, address);

      assert.notCalled(AclStream);
      assert.notCalled(Gatt);
      assert.notCalled(Signaling);

      assert.calledOnceWithExactly(connectCallback, 'pending_uuid', sinon.match({ message: 'HCI Error: Unknown (0x2)' }));

      should(bindings._pendingConnectionUuid).equal(null);
    });

    it('with connection queue', () => {
      const status = 0;
      const handle = 'handle';
      const role = 0;
      const addressType = 'addressType';
      const address = 'address:split:by:separator';

      const connectCallback = sinon.spy();

      bindings._connectionQueue = [{ id: 'queuedId', params: { p1: 'p1' } }];
      bindings._addresses = { queuedId: 'queuedAddress' };
      bindings._addresseTypes = { queuedId: 'queuedAddressType' };
      bindings.on('connect', connectCallback);
      bindings.onLeConnComplete(status, handle, role, addressType, address);

      assert.calledOnceWithExactly(connectCallback, 'addresssplitbyseparator', null);

      assert.calledOnceWithExactly(createLeConnSpy, 'queuedAddress', 'queuedAddressType', { p1: 'p1' });

      should(bindings._pendingConnectionUuid).equal('queuedId');
    });
  });

  describe('onDisconnComplete', () => {
    it('handle not found', () => {
      const disconnectCallback = sinon.spy();

      bindings.on('disconnect', disconnectCallback);
      bindings.onDisconnComplete('missing', 'reason');

      assert.notCalled(disconnectCallback);
    });

    it('existing handle', () => {
      const disconnectCallback = sinon.spy();
      const handle = 'handle';
      const anotherHandle = 'another_handle';
      const uuid = 'uuid';
      const anotherUuid = 'another_uuid';
      const reason = 'reason';

      const gattSpy = {
        removeAllListeners: sinon.spy()
      };
      const signalingSpy = {
        removeAllListeners: sinon.spy()
      };

      // Init expected
      bindings._handles[uuid] = uuid;
      bindings._handles[handle] = uuid;
      bindings._handles[anotherUuid] = uuid;
      bindings._handles[anotherHandle] = anotherUuid;
      bindings._aclStreams[handle] = [];
      bindings._aclStreams[anotherHandle] = [];
      bindings._gatts[handle] = gattSpy;
      bindings._gatts[uuid] = gattSpy;
      bindings._gatts[anotherHandle] = gattSpy;
      bindings._gatts[anotherUuid] = gattSpy;
      bindings._signalings[uuid] = signalingSpy;
      bindings._signalings[handle] = signalingSpy;
      bindings._signalings[anotherUuid] = signalingSpy;
      bindings._signalings[anotherHandle] = signalingSpy;

      bindings.on('disconnect', disconnectCallback);
      bindings.onDisconnComplete(handle, reason);

      assert.calledOnceWithExactly(disconnectCallback, uuid, reason);
      assert.calledOnceWithExactly(gattSpy.removeAllListeners);
      assert.calledOnceWithExactly(signalingSpy.removeAllListeners);

      should(bindings._handles).not.have.keys(uuid, handle);
      should(bindings._aclStreams).not.have.keys(handle);
      should(bindings._gatts).not.have.keys(uuid, handle);
      should(bindings._signalings).not.have.keys(uuid, handle);
    });
  });

  describe('onEncryptChange', () => {
    it('missing handle', () => {
      const handle = 'handle';
      const anotherHandle = 'another_handle';
      const encrypt = 'encrypt';
      const aclSpy = {
        pushEncrypt: sinon.spy()
      };

      bindings._aclStreams[handle] = aclSpy;
      bindings.onEncryptChange(anotherHandle, encrypt);

      assert.notCalled(aclSpy.pushEncrypt);
    });

    it('existing handle', () => {
      const handle = 'handle';
      const encrypt = 'encrypt';
      const aclSpy = {
        pushEncrypt: sinon.spy()
      };

      bindings._aclStreams[handle] = aclSpy;
      bindings.onEncryptChange(handle, encrypt);

      assert.calledOnceWithExactly(aclSpy.pushEncrypt, encrypt);
    });

    it('existing handle no encrypt', () => {
      const handle = 'handle';
      const aclSpy = {
        pushEncrypt: sinon.spy()
      };

      bindings._aclStreams[handle] = aclSpy;
      bindings.onEncryptChange(handle);

      assert.calledOnceWithExactly(aclSpy.pushEncrypt, undefined);
    });
  });

  it('onMtu', () => {
    const address = 'this:is:an:address';
    const rssi = 'rssi';
    const callback = sinon.spy();

    bindings.on('onMtu', callback);
    bindings.onMtu(address, rssi);

    assert.calledOnceWithExactly(callback, 'thisisanaddress', rssi);
  });

  it('onRssiRead', () => {
    const handle = 'handle';
    const rssi = 'rssi';
    const callback = sinon.spy();

    bindings._handles[handle] = 'binding_handle';
    bindings.on('rssiUpdate', callback);
    bindings.onRssiRead(handle, rssi);

    assert.calledOnceWithExactly(callback, 'binding_handle', rssi);
  });

  describe('onAclDataPkt', () => {
    it('missing handle', () => {
      const handle = 'handle';
      const anotherHandle = 'another_handle';
      const cid = 'cid';
      const data = 'data';
      const aclSpy = {
        push: sinon.spy()
      };

      bindings._aclStreams[handle] = aclSpy;
      bindings.onAclDataPkt(anotherHandle, cid, data);

      assert.notCalled(aclSpy.push);
    });

    it('existing handle', () => {
      const handle = 'handle';
      const cid = 'cid';
      const data = 'data';
      const aclSpy = {
        push: sinon.spy()
      };

      bindings._aclStreams[handle] = aclSpy;
      bindings.onAclDataPkt(handle, cid, data);

      assert.calledOnceWithExactly(aclSpy.push, cid, data);
    });

    it('existing handle no cid no data', () => {
      const handle = 'handle';
      const aclSpy = {
        push: sinon.spy()
      };

      bindings._aclStreams[handle] = aclSpy;
      bindings.onAclDataPkt(handle);

      assert.calledOnceWithExactly(aclSpy.push, undefined, undefined);
    });
  });

  describe('addService', () => {
    it('missing gatt', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const anotherHandle = 'another_handle';
      const service = 'service';
      const gatt = {
        addService: sinon.spy()
      };

      bindings._handles[peripheralUuid] = anotherHandle;
      bindings._gatts[handle] = gatt;
      bindings.addService(peripheralUuid, service);

      assert.notCalled(gatt.addService);
    });

    it('existing gatt', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const service = 'service';
      const gatt = {
        addService: sinon.spy()
      };

      bindings._handles[peripheralUuid] = handle;
      bindings._gatts[handle] = gatt;
      bindings.addService(peripheralUuid, service);

      assert.calledOnceWithExactly(gatt.addService, service);
    });

    it('existing gatt no service', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const gatt = {
        addService: sinon.spy()
      };

      bindings._handles[peripheralUuid] = handle;
      bindings._gatts[handle] = gatt;
      bindings.addService(peripheralUuid);

      assert.calledOnceWithExactly(gatt.addService, undefined);
    });
  });

  describe('discoverServices', () => {
    it('missing gatt', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const anotherHandle = 'another_handle';
      const uuids = 'uuids';
      const gatt = {
        discoverServices: sinon.spy()
      };

      bindings._handles[peripheralUuid] = anotherHandle;
      bindings._gatts[handle] = gatt;
      bindings.discoverServices(peripheralUuid, uuids);

      assert.notCalled(gatt.discoverServices);
    });

    it('existing gatt', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const uuids = 'uuids';
      const gatt = {
        discoverServices: sinon.spy()
      };

      bindings._handles[peripheralUuid] = handle;
      bindings._gatts[handle] = gatt;
      bindings.discoverServices(peripheralUuid, uuids);

      assert.calledOnceWithExactly(gatt.discoverServices, uuids);
    });

    it('existing gatt no uuids', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const gatt = {
        discoverServices: sinon.spy()
      };

      bindings._handles[peripheralUuid] = handle;
      bindings._gatts[handle] = gatt;
      bindings.discoverServices(peripheralUuid);

      assert.calledOnceWithExactly(gatt.discoverServices, []);
    });
  });

  it('onServicesDiscovered', () => {
    const address = 'this:is:an:address';
    const serviceUuids = 'serviceUuids';
    const callback = sinon.spy();

    bindings.on('servicesDiscover', callback);
    bindings.onServicesDiscovered(address, serviceUuids);

    assert.calledOnceWithExactly(callback, 'thisisanaddress', serviceUuids);
  });

  it('onServicesDiscoveredEX', () => {
    const address = 'this:is:an:address';
    const serviceUuids = 'serviceUuids';
    const callback = sinon.spy();

    bindings.on('servicesDiscovered', callback);
    bindings.onServicesDiscoveredEX(address, serviceUuids);

    assert.calledOnceWithExactly(callback, 'thisisanaddress', serviceUuids);
  });

  describe('discoverIncludedServices', () => {
    it('missing gatt', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const anotherHandle = 'another_handle';
      const serviceUuid = 'service-uuid';
      const serviceUuids = 'serviceUuids';
      const gatt = {
        discoverIncludedServices: sinon.spy()
      };

      bindings._handles[peripheralUuid] = anotherHandle;
      bindings._gatts[handle] = gatt;
      bindings.discoverIncludedServices(peripheralUuid, serviceUuid, serviceUuids);

      assert.notCalled(gatt.discoverIncludedServices);
    });

    it('existing gatt', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const serviceUuid = 'service-uuid';
      const serviceUuids = 'serviceUuids';
      const gatt = {
        discoverIncludedServices: sinon.spy()
      };

      bindings._handles[peripheralUuid] = handle;
      bindings._gatts[handle] = gatt;
      bindings.discoverIncludedServices(peripheralUuid, serviceUuid, serviceUuids);

      assert.calledOnceWithExactly(gatt.discoverIncludedServices, serviceUuid, serviceUuids);
    });

    it('existing gatt no uuids', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const serviceUuid = 'service-uuid';
      const gatt = {
        discoverIncludedServices: sinon.spy()
      };

      bindings._handles[peripheralUuid] = handle;
      bindings._gatts[handle] = gatt;
      bindings.discoverIncludedServices(peripheralUuid, serviceUuid);

      assert.calledOnceWithExactly(gatt.discoverIncludedServices, serviceUuid, []);
    });
  });

  it('onIncludedServicesDiscovered', () => {
    const address = 'this:is:an:address';
    const serviceUuid = 'serviceUuid';
    const includedServiceUuids = 'includedServiceUuids';
    const callback = sinon.spy();

    bindings.on('includedServicesDiscover', callback);
    bindings.onIncludedServicesDiscovered(address, serviceUuid, includedServiceUuids);

    assert.calledOnceWithExactly(callback, 'thisisanaddress', serviceUuid, includedServiceUuids);
  });

  describe('addCharacteristics', () => {
    it('missing gatt', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const anotherHandle = 'another_handle';
      const serviceUuid = 'serviceUuid';
      const characteristics = 'characteristics';
      const gatt = {
        addCharacteristics: sinon.spy()
      };

      bindings._handles[peripheralUuid] = anotherHandle;
      bindings._gatts[handle] = gatt;
      bindings.addCharacteristics(peripheralUuid, serviceUuid, characteristics);

      assert.notCalled(gatt.addCharacteristics);
    });

    it('existing gatt', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const serviceUuid = 'serviceUuid';
      const characteristics = 'characteristics';
      const gatt = {
        addCharacteristics: sinon.spy()
      };

      bindings._handles[peripheralUuid] = handle;
      bindings._gatts[handle] = gatt;
      bindings.addCharacteristics(peripheralUuid, serviceUuid, characteristics);

      assert.calledOnceWithExactly(gatt.addCharacteristics, serviceUuid, characteristics);
    });

    it('existing gatt no serviceUuid no characteristics', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const gatt = {
        addCharacteristics: sinon.spy()
      };

      bindings._handles[peripheralUuid] = handle;
      bindings._gatts[handle] = gatt;
      bindings.addCharacteristics(peripheralUuid);

      assert.calledOnceWithExactly(gatt.addCharacteristics, undefined, undefined);
    });
  });

  describe('discoverCharacteristics', () => {
    it('missing gatt', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const anotherHandle = 'another_handle';
      const serviceUuid = 'serviceUuid';
      const characteristicUuids = 'characteristics';
      const gatt = {
        discoverCharacteristics: sinon.spy()
      };

      bindings._handles[peripheralUuid] = anotherHandle;
      bindings._gatts[handle] = gatt;
      bindings.discoverCharacteristics(peripheralUuid, serviceUuid, characteristicUuids);

      assert.notCalled(gatt.discoverCharacteristics);
    });

    it('existing gatt', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const serviceUuid = 'serviceUuid';
      const characteristicUuids = 'characteristics';
      const gatt = {
        discoverCharacteristics: sinon.spy()
      };

      bindings._handles[peripheralUuid] = handle;
      bindings._gatts[handle] = gatt;
      bindings.discoverCharacteristics(peripheralUuid, serviceUuid, characteristicUuids);

      assert.calledOnceWithExactly(gatt.discoverCharacteristics, serviceUuid, characteristicUuids);
    });

    it('existing gatt no uuids', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const serviceUuid = 'serviceUuid';
      const gatt = {
        discoverCharacteristics: sinon.spy()
      };

      bindings._handles[peripheralUuid] = handle;
      bindings._gatts[handle] = gatt;
      bindings.discoverCharacteristics(peripheralUuid, serviceUuid);

      assert.calledOnceWithExactly(gatt.discoverCharacteristics, serviceUuid, []);
    });
  });

  it('onCharacteristicsDiscovered', () => {
    const address = 'this:is:an:address';
    const serviceUuid = 'serviceUuid';
    const characteristics = 'characteristics';
    const callback = sinon.spy();

    bindings.on('characteristicsDiscover', callback);
    bindings.onCharacteristicsDiscovered(address, serviceUuid, characteristics);

    assert.calledOnceWithExactly(callback, 'thisisanaddress', serviceUuid, characteristics);
  });

  it('onCharacteristicsDiscoveredEX', () => {
    const address = 'this:is:an:address';
    const serviceUuid = 'serviceUuid';
    const characteristics = 'characteristics';
    const callback = sinon.spy();

    bindings.on('characteristicsDiscovered', callback);
    bindings.onCharacteristicsDiscoveredEX(address, serviceUuid, characteristics);

    assert.calledOnceWithExactly(callback, 'thisisanaddress', serviceUuid, characteristics);
  });

  describe('read', () => {
    it('missing gatt', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const anotherHandle = 'another_handle';
      const serviceUuid = 'serviceUuid';
      const characteristicUuid = 'characteristic';
      const gatt = {
        read: sinon.spy()
      };

      bindings._handles[peripheralUuid] = anotherHandle;
      bindings._gatts[handle] = gatt;
      bindings.read(peripheralUuid, serviceUuid, characteristicUuid);

      assert.notCalled(gatt.read);
    });

    it('existing gatt', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const serviceUuid = 'serviceUuid';
      const characteristicUuid = 'characteristics';
      const gatt = {
        read: sinon.spy()
      };

      bindings._handles[peripheralUuid] = handle;
      bindings._gatts[handle] = gatt;
      bindings.read(peripheralUuid, serviceUuid, characteristicUuid);

      assert.calledOnceWithExactly(gatt.read, serviceUuid, characteristicUuid);
    });

    it('existing gatt no uuids', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const gatt = {
        read: sinon.spy()
      };

      bindings._handles[peripheralUuid] = handle;
      bindings._gatts[handle] = gatt;
      bindings.read(peripheralUuid);

      assert.calledOnceWithExactly(gatt.read, undefined, undefined);
    });
  });

  it('onRead', () => {
    const address = 'this:is:an:address';
    const serviceUuid = 'serviceUuid';
    const characteristicUuid = 'characteristics';
    const data = 'data';
    const callback = sinon.spy();

    bindings.on('read', callback);
    bindings.onRead(address, serviceUuid, characteristicUuid, data);

    assert.calledOnceWithExactly(callback, 'thisisanaddress', serviceUuid, characteristicUuid, data, false);
  });

  describe('write', () => {
    it('missing gatt', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const anotherHandle = 'another_handle';
      const serviceUuid = 'serviceUuid';
      const characteristicUuid = 'characteristic';
      const data = 'data';
      const withoutResponse = true;

      const gatt = {
        write: sinon.spy()
      };

      bindings._handles[peripheralUuid] = anotherHandle;
      bindings._gatts[handle] = gatt;
      bindings.write(peripheralUuid, serviceUuid, characteristicUuid, data, withoutResponse);

      assert.notCalled(gatt.write);
    });

    it('existing gatt', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const serviceUuid = 'serviceUuid';
      const characteristicUuid = 'characteristics';
      const data = 'data';
      const withoutResponse = true;
      const gatt = {
        write: sinon.spy()
      };

      bindings._handles[peripheralUuid] = handle;
      bindings._gatts[handle] = gatt;
      bindings.write(peripheralUuid, serviceUuid, characteristicUuid, data, withoutResponse);

      assert.calledOnceWithExactly(gatt.write, serviceUuid, characteristicUuid, data, withoutResponse);
    });

    it('existing gatt no uuids', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const gatt = {
        write: sinon.spy()
      };

      bindings._handles[peripheralUuid] = handle;
      bindings._gatts[handle] = gatt;
      bindings.write(peripheralUuid);

      assert.calledOnceWithExactly(gatt.write, undefined, undefined, undefined, undefined);
    });
  });

  it('onWrite', () => {
    const address = 'this:is:an:address';
    const serviceUuid = 'serviceUuid';
    const characteristicUuid = 'characteristics';
    const callback = sinon.spy();

    bindings.on('write', callback);
    bindings.onWrite(address, serviceUuid, characteristicUuid);

    assert.calledOnceWithExactly(callback, 'thisisanaddress', serviceUuid, characteristicUuid);
  });

  describe('broadcast', () => {
    it('missing gatt', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const anotherHandle = 'another_handle';
      const serviceUuid = 'serviceUuid';
      const characteristicUuid = 'characteristic';
      const broadcast = 'broadcast';
      const gatt = {
        broadcast: sinon.spy()
      };

      bindings._handles[peripheralUuid] = anotherHandle;
      bindings._gatts[handle] = gatt;
      bindings.broadcast(peripheralUuid, serviceUuid, characteristicUuid, broadcast);

      assert.notCalled(gatt.broadcast);
    });

    it('existing gatt', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const serviceUuid = 'serviceUuid';
      const characteristicUuid = 'characteristics';
      const broadcast = 'broadcast';
      const gatt = {
        broadcast: sinon.spy()
      };

      bindings._handles[peripheralUuid] = handle;
      bindings._gatts[handle] = gatt;
      bindings.broadcast(peripheralUuid, serviceUuid, characteristicUuid, broadcast);

      assert.calledOnceWithExactly(gatt.broadcast, serviceUuid, characteristicUuid, broadcast);
    });

    it('existing gatt no uuids', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const gatt = {
        broadcast: sinon.spy()
      };

      bindings._handles[peripheralUuid] = handle;
      bindings._gatts[handle] = gatt;
      bindings.broadcast(peripheralUuid);

      assert.calledOnceWithExactly(gatt.broadcast, undefined, undefined, undefined);
    });
  });

  it('onBroadcast', () => {
    const address = 'this:is:an:address';
    const serviceUuid = 'serviceUuid';
    const characteristicUuid = 'characteristics';
    const state = 'data';
    const callback = sinon.spy();

    bindings.on('broadcast', callback);
    bindings.onBroadcast(address, serviceUuid, characteristicUuid, state);

    assert.calledOnceWithExactly(callback, 'thisisanaddress', serviceUuid, characteristicUuid, state);
  });

  describe('notify', () => {
    it('missing gatt', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const anotherHandle = 'another_handle';
      const serviceUuid = 'serviceUuid';
      const characteristicUuid = 'characteristic';
      const notify = 'notify';
      const gatt = {
        notify: sinon.spy()
      };

      bindings._handles[peripheralUuid] = anotherHandle;
      bindings._gatts[handle] = gatt;
      bindings.notify(peripheralUuid, serviceUuid, characteristicUuid, notify);

      assert.notCalled(gatt.notify);
    });

    it('existing gatt', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const serviceUuid = 'serviceUuid';
      const characteristicUuid = 'characteristics';
      const notify = 'notify';
      const gatt = {
        notify: sinon.spy()
      };

      bindings._handles[peripheralUuid] = handle;
      bindings._gatts[handle] = gatt;
      bindings.notify(peripheralUuid, serviceUuid, characteristicUuid, notify);

      assert.calledOnceWithExactly(gatt.notify, serviceUuid, characteristicUuid, notify);
    });

    it('existing gatt no uuids', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const gatt = {
        notify: sinon.spy()
      };

      bindings._handles[peripheralUuid] = handle;
      bindings._gatts[handle] = gatt;
      bindings.notify(peripheralUuid);

      assert.calledOnceWithExactly(gatt.notify, undefined, undefined, undefined);
    });
  });

  it('onNotify', () => {
    const address = 'this:is:an:address';
    const serviceUuid = 'serviceUuid';
    const characteristicUuid = 'characteristics';
    const state = 'data';
    const callback = sinon.spy();

    bindings.on('notify', callback);
    bindings.onNotify(address, serviceUuid, characteristicUuid, state);

    assert.calledOnceWithExactly(callback, 'thisisanaddress', serviceUuid, characteristicUuid, state);
  });

  it('onNotification', () => {
    const address = 'this:is:an:address';
    const serviceUuid = 'serviceUuid';
    const characteristicUuid = 'characteristics';
    const data = 'data';
    const callback = sinon.spy();

    bindings.on('read', callback);
    bindings.onNotification(address, serviceUuid, characteristicUuid, data);

    assert.calledOnceWithExactly(callback, 'thisisanaddress', serviceUuid, characteristicUuid, data, true);
  });

  describe('discoverDescriptors', () => {
    it('missing gatt', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const anotherHandle = 'another_handle';
      const serviceUuid = 'serviceUuid';
      const characteristicUuid = 'characteristic';
      const gatt = {
        discoverDescriptors: sinon.spy()
      };

      bindings._handles[peripheralUuid] = anotherHandle;
      bindings._gatts[handle] = gatt;
      bindings.discoverDescriptors(peripheralUuid, serviceUuid, characteristicUuid);

      assert.notCalled(gatt.discoverDescriptors);
    });

    it('existing gatt', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const serviceUuid = 'serviceUuid';
      const characteristicUuid = 'characteristics';
      const gatt = {
        discoverDescriptors: sinon.spy()
      };

      bindings._handles[peripheralUuid] = handle;
      bindings._gatts[handle] = gatt;
      bindings.discoverDescriptors(peripheralUuid, serviceUuid, characteristicUuid);

      assert.calledOnceWithExactly(gatt.discoverDescriptors, serviceUuid, characteristicUuid);
    });

    it('existing gatt no uuids', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const gatt = {
        discoverDescriptors: sinon.spy()
      };

      bindings._handles[peripheralUuid] = handle;
      bindings._gatts[handle] = gatt;
      bindings.discoverDescriptors(peripheralUuid);

      assert.calledOnceWithExactly(gatt.discoverDescriptors, undefined, undefined);
    });
  });

  it('onDescriptorsDiscovered', () => {
    const address = 'this:is:an:address';
    const serviceUuid = 'serviceUuid';
    const characteristicUuid = 'characteristics';
    const descriptorUuids = 'descriptorUuids';
    const callback = sinon.spy();

    bindings.on('descriptorsDiscover', callback);
    bindings.onDescriptorsDiscovered(address, serviceUuid, characteristicUuid, descriptorUuids);

    assert.calledOnceWithExactly(callback, 'thisisanaddress', serviceUuid, characteristicUuid, descriptorUuids);
  });

  describe('readValue', () => {
    it('missing gatt', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const anotherHandle = 'another_handle';
      const serviceUuid = 'serviceUuid';
      const characteristicUuid = 'characteristic';
      const descriptorUuid = 'descriptorUuid';
      const gatt = {
        readValue: sinon.spy()
      };

      bindings._handles[peripheralUuid] = anotherHandle;
      bindings._gatts[handle] = gatt;
      bindings.readValue(peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid);

      assert.notCalled(gatt.readValue);
    });

    it('existing gatt', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const serviceUuid = 'serviceUuid';
      const characteristicUuid = 'characteristics';
      const descriptorUuid = 'descriptorUuid';
      const gatt = {
        readValue: sinon.spy()
      };

      bindings._handles[peripheralUuid] = handle;
      bindings._gatts[handle] = gatt;
      bindings.readValue(peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid);

      assert.calledOnceWithExactly(gatt.readValue, serviceUuid, characteristicUuid, descriptorUuid);
    });

    it('existing gatt no uuids', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const gatt = {
        readValue: sinon.spy()
      };

      bindings._handles[peripheralUuid] = handle;
      bindings._gatts[handle] = gatt;
      bindings.readValue(peripheralUuid);

      assert.calledOnceWithExactly(gatt.readValue, undefined, undefined, undefined);
    });
  });

  it('onValueRead', () => {
    const address = 'this:is:an:address';
    const serviceUuid = 'serviceUuid';
    const characteristicUuid = 'characteristics';
    const descriptorUuid = 'descriptorUuid';
    const data = 'data';
    const callback = sinon.spy();

    bindings.on('valueRead', callback);
    bindings.onValueRead(address, serviceUuid, characteristicUuid, descriptorUuid, data);

    assert.calledOnceWithExactly(callback, 'thisisanaddress', serviceUuid, characteristicUuid, descriptorUuid, data);
  });

  describe('writeValue', () => {
    it('missing gatt', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const anotherHandle = 'another_handle';
      const serviceUuid = 'serviceUuid';
      const characteristicUuid = 'characteristic';
      const descriptorUuid = 'descriptorUuid';
      const data = 'data';
      const gatt = {
        writeValue: sinon.spy()
      };

      bindings._handles[peripheralUuid] = anotherHandle;
      bindings._gatts[handle] = gatt;
      bindings.writeValue(peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid, data);

      assert.notCalled(gatt.writeValue);
    });

    it('existing gatt', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const serviceUuid = 'serviceUuid';
      const characteristicUuid = 'characteristics';
      const descriptorUuid = 'descriptorUuid';
      const data = 'data';
      const gatt = {
        writeValue: sinon.spy()
      };

      bindings._handles[peripheralUuid] = handle;
      bindings._gatts[handle] = gatt;
      bindings.writeValue(peripheralUuid, serviceUuid, characteristicUuid, descriptorUuid, data);

      assert.calledOnceWithExactly(gatt.writeValue, serviceUuid, characteristicUuid, descriptorUuid, data);
    });

    it('existing gatt no uuids', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const gatt = {
        writeValue: sinon.spy()
      };

      bindings._handles[peripheralUuid] = handle;
      bindings._gatts[handle] = gatt;
      bindings.writeValue(peripheralUuid);

      assert.calledOnceWithExactly(gatt.writeValue, undefined, undefined, undefined, undefined);
    });
  });

  it('onValueWrite', () => {
    const address = 'this:is:an:address';
    const serviceUuid = 'serviceUuid';
    const characteristicUuid = 'characteristics';
    const descriptorUuid = 'descriptorUuid';
    const callback = sinon.spy();

    bindings.on('valueWrite', callback);
    bindings.onValueWrite(address, serviceUuid, characteristicUuid, descriptorUuid);

    assert.calledOnceWithExactly(callback, 'thisisanaddress', serviceUuid, characteristicUuid, descriptorUuid);
  });

  describe('readHandle', () => {
    it('missing gatt', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const anotherHandle = 'another_handle';
      const attHandle = 'attHandle';
      const gatt = {
        readHandle: sinon.spy()
      };

      bindings._handles[peripheralUuid] = anotherHandle;
      bindings._gatts[handle] = gatt;
      bindings.readHandle(peripheralUuid, attHandle);

      assert.notCalled(gatt.readHandle);
    });

    it('existing gatt', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const attHandle = 'attHandle';
      const gatt = {
        readHandle: sinon.spy()
      };

      bindings._handles[peripheralUuid] = handle;
      bindings._gatts[handle] = gatt;
      bindings.readHandle(peripheralUuid, attHandle);

      assert.calledOnceWithExactly(gatt.readHandle, attHandle);
    });

    it('existing gatt no uuids', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const gatt = {
        readHandle: sinon.spy()
      };

      bindings._handles[peripheralUuid] = handle;
      bindings._gatts[handle] = gatt;
      bindings.readHandle(peripheralUuid);

      assert.calledOnceWithExactly(gatt.readHandle, undefined);
    });
  });

  it('onHandleRead', () => {
    const address = 'this:is:an:address';
    const handle = 'handle';
    const data = 'data';
    const callback = sinon.spy();

    bindings.on('handleRead', callback);
    bindings.onHandleRead(address, handle, data);

    assert.calledOnceWithExactly(callback, 'thisisanaddress', handle, data);
  });

  describe('writeHandle', () => {
    it('missing gatt', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const anotherHandle = 'another_handle';
      const attHandle = 'attHandle';
      const data = 'data';
      const withoutResponse = true;
      const gatt = {
        writeHandle: sinon.spy()
      };

      bindings._handles[peripheralUuid] = anotherHandle;
      bindings._gatts[handle] = gatt;
      bindings.writeHandle(peripheralUuid, attHandle, data, withoutResponse);

      assert.notCalled(gatt.writeHandle);
    });

    it('existing gatt', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const attHandle = 'attHandle';
      const data = 'data';
      const withoutResponse = true;
      const gatt = {
        writeHandle: sinon.spy()
      };

      bindings._handles[peripheralUuid] = handle;
      bindings._gatts[handle] = gatt;
      bindings.writeHandle(peripheralUuid, attHandle, data, withoutResponse);

      assert.calledOnceWithExactly(gatt.writeHandle, attHandle, data, withoutResponse);
    });

    it('existing gatt no uuids', () => {
      const peripheralUuid = 'uuid';
      const handle = 'handle';
      const gatt = {
        writeHandle: sinon.spy()
      };

      bindings._handles[peripheralUuid] = handle;
      bindings._gatts[handle] = gatt;
      bindings.writeHandle(peripheralUuid);

      assert.calledOnceWithExactly(gatt.writeHandle, undefined, undefined, undefined);
    });
  });

  it('onHandleWrite', () => {
    const address = 'this:is:an:address';
    const handle = 'handle';
    const callback = sinon.spy();

    bindings.on('handleWrite', callback);
    bindings.onHandleWrite(address, handle);

    assert.calledOnceWithExactly(callback, 'thisisanaddress', handle);
  });

  it('onHandleNotify', () => {
    const address = 'this:is:an:address';
    const handle = 'handle';
    const data = 'data';
    const callback = sinon.spy();

    bindings.on('handleNotify', callback);
    bindings.onHandleNotify(address, handle, data);

    assert.calledOnceWithExactly(callback, 'thisisanaddress', handle, data);
  });

  it('onConnectionParameterUpdateRequest', () => {
    const handle = 'handle';
    const minInterval = 'minInterval';
    const maxInterval = 'maxInterval';
    const latency = 'latency';
    const supervisionTimeout = 'supervisionTimeout';
    const connUpdateLe = sinon.spy();

    bindings._hci.connUpdateLe = connUpdateLe;
    bindings.onConnectionParameterUpdateRequest(handle, minInterval, maxInterval, latency, supervisionTimeout);

    assert.calledOnceWithExactly(connUpdateLe, handle, minInterval, maxInterval, latency, supervisionTimeout);
  });
});
