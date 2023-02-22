const should = require('should');
const sinon = require('sinon');

const { assert } = sinon;

const Gap = require('../../../lib/hci-socket/gap');

describe('hci-socket gap', () => {
  it('constructor', () => {
    const hci = {
      on: sinon.spy()
    };

    const gap = new Gap(hci);

    should(gap._hci).equal(hci);
    should(gap._scanState).equal(null);
    should(gap._scanFilterDuplicates).equal(null);
    should(gap._discoveries).deepEqual({});

    assert.callCount(hci.on, 6);
    assert.calledWithMatch(hci.on, 'error', sinon.match.func);
    assert.calledWithMatch(hci.on, 'leScanParametersSet', sinon.match.func);
    assert.calledWithMatch(hci.on, 'leScanEnableSet', sinon.match.func);
    assert.calledWithMatch(hci.on, 'leAdvertisingReport', sinon.match.func);
    assert.calledWithMatch(hci.on, 'leScanEnableSetCmd', sinon.match.func);
    assert.calledWithMatch(hci.on, 'leExtendedAdvertisingReport', sinon.match.func);
  });

  it('setScanParameters', () => {
    const hci = {
      on: sinon.spy(),
      setScanParameters: sinon.spy()
    };

    const interval = 'interval';
    const window = 'window';

    const gap = new Gap(hci);
    gap.setScanParameters(interval, window);

    assert.calledOnceWithExactly(hci.setScanParameters, interval, window);
  });

  it('startScanning', () => {
    const hci = {
      on: sinon.spy(),
      setScanEnabled: sinon.spy(),
      setScanParameters: sinon.spy()
    };

    const gap = new Gap(hci);
    gap.startScanning(true);

    should(gap._scanState).equal('starting');
    should(gap._scanFilterDuplicates).equal(false);

    assert.callCount(hci.setScanEnabled, 2);
    assert.calledWithExactly(hci.setScanEnabled, false, true);
    assert.calledWithExactly(hci.setScanEnabled, true, false);
    assert.calledOnceWithExactly(hci.setScanParameters);
  });

  it('stopScanning', () => {
    const hci = {
      on: sinon.spy(),
      setScanEnabled: sinon.spy()
    };

    const gap = new Gap(hci);
    gap.stopScanning();

    should(gap._scanState).equal('stopping');

    assert.calledOnceWithExactly(hci.setScanEnabled, false, true);
  });

  it('onHciLeScanParametersSet', () => {
    const hci = {
      on: sinon.spy()
    };
    const callback = sinon.spy();

    const gap = new Gap(hci);
    gap.on('scanParametersSet', callback);
    gap.onHciLeScanParametersSet();

    assert.calledOnceWithExactly(callback);
  });

  describe('onHciLeScanEnableSet', () => {
    it('status 1', () => {
      const hci = {
        on: sinon.spy()
      };
      const scanStartCallback = sinon.spy();
      const scanStopCallback = sinon.spy();

      const gap = new Gap(hci);
      gap.on('scanStart', scanStartCallback);
      gap.on('scanStop', scanStopCallback);
      gap.onHciLeScanEnableSet(1);

      assert.notCalled(scanStartCallback);
      assert.notCalled(scanStopCallback);
    });

    it('status 0 but invalid state', () => {
      const hci = {
        on: sinon.spy()
      };
      const scanStartCallback = sinon.spy();
      const scanStopCallback = sinon.spy();

      const gap = new Gap(hci);
      gap._scanState = 'unknown';
      gap.on('scanStart', scanStartCallback);
      gap.on('scanStop', scanStopCallback);
      gap.onHciLeScanEnableSet(0);

      should(gap._scanState).equal('unknown');

      assert.notCalled(scanStartCallback);
      assert.notCalled(scanStopCallback);
    });

    it('status 0 state starting', () => {
      const hci = {
        on: sinon.spy()
      };
      const scanStartCallback = sinon.spy();
      const scanStopCallback = sinon.spy();

      const gap = new Gap(hci);
      gap._scanFilterDuplicates = true;
      gap._scanState = 'starting';
      gap.on('scanStart', scanStartCallback);
      gap.on('scanStop', scanStopCallback);
      gap.onHciLeScanEnableSet(0);

      should(gap._scanState).equal('started');

      assert.calledOnceWithExactly(scanStartCallback, true);
      assert.notCalled(scanStopCallback);
    });

    it('status 0 state stopping', () => {
      const hci = {
        on: sinon.spy()
      };
      const scanStartCallback = sinon.spy();
      const scanStopCallback = sinon.spy();

      const gap = new Gap(hci);
      gap._scanState = 'stopping';
      gap.on('scanStart', scanStartCallback);
      gap.on('scanStop', scanStopCallback);
      gap.onHciLeScanEnableSet(0);

      should(gap._scanState).equal('stopped');

      assert.notCalled(scanStartCallback);
      assert.calledOnceWithExactly(scanStopCallback);
    });
  });

  describe('onLeScanEnableSetCmd', () => {
    it('invalid state', () => {
      const hci = {
        on: sinon.spy()
      };
      const scanStartCallback = sinon.spy();
      const scanStopCallback = sinon.spy();

      const enable = false;
      const filterDuplicates = false;

      const gap = new Gap(hci);
      gap._scanState = 'unknown';
      gap.on('scanStart', scanStartCallback);
      gap.on('scanStop', scanStopCallback);
      gap.onLeScanEnableSetCmd(enable, filterDuplicates);

      should(gap._scanState).equal('unknown');
      should(gap._scanFilterDuplicates).equal(null);

      assert.notCalled(scanStartCallback);
      assert.notCalled(scanStopCallback);
    });

    ['starting', 'started'].forEach(state => {
      it(`state ${state}, do not enable`, () => {
        const hci = {
          on: sinon.spy()
        };
        const scanStartCallback = sinon.spy();
        const scanStopCallback = sinon.spy();

        const enable = false;
        const filterDuplicates = false;

        const gap = new Gap(hci);
        gap._scanState = state;
        gap.on('scanStart', scanStartCallback);
        gap.on('scanStop', scanStopCallback);
        gap.onLeScanEnableSetCmd(enable, filterDuplicates);

        should(gap._scanState).equal(state);
        should(gap._scanFilterDuplicates).equal(null);

        assert.notCalled(scanStartCallback);
        assert.calledOnceWithExactly(scanStopCallback);
      });
    });

    ['starting', 'started'].forEach(state => {
      it(`state ${state}, do enable`, () => {
        const hci = {
          on: sinon.spy()
        };
        const scanStartCallback = sinon.spy();
        const scanStopCallback = sinon.spy();

        const enable = true;
        const filterDuplicates = false;

        const gap = new Gap(hci);
        gap._scanState = state;
        gap.on('scanStart', scanStartCallback);
        gap.on('scanStop', scanStopCallback);
        gap.onLeScanEnableSetCmd(enable, filterDuplicates);

        should(gap._scanState).equal(state);
        should(gap._scanFilterDuplicates).equal(filterDuplicates);

        assert.calledOnceWithExactly(scanStartCallback, filterDuplicates);
        assert.notCalled(scanStopCallback);
      });
    });

    ['starting', 'started'].forEach(state => {
      it(`state ${state}, do enable, same filter`, () => {
        const hci = {
          on: sinon.spy()
        };
        const scanStartCallback = sinon.spy();
        const scanStopCallback = sinon.spy();

        const enable = true;
        const filterDuplicates = false;

        const gap = new Gap(hci);
        gap._scanState = state;
        gap._scanFilterDuplicates = filterDuplicates;
        gap.on('scanStart', scanStartCallback);
        gap.on('scanStop', scanStopCallback);
        gap.onLeScanEnableSetCmd(enable, filterDuplicates);

        should(gap._scanState).equal(state);
        should(gap._scanFilterDuplicates).equal(filterDuplicates);

        assert.notCalled(scanStartCallback);
        assert.notCalled(scanStopCallback);
      });
    });

    ['stopping', 'stopped'].forEach(state => {
      it(`state ${state}, do not enable`, () => {
        const hci = {
          on: sinon.spy()
        };
        const scanStartCallback = sinon.spy();
        const scanStopCallback = sinon.spy();

        const enable = false;
        const filterDuplicates = false;

        const gap = new Gap(hci);
        gap._scanState = state;
        gap.on('scanStart', scanStartCallback);
        gap.on('scanStop', scanStopCallback);
        gap.onLeScanEnableSetCmd(enable, filterDuplicates);

        should(gap._scanState).equal(state);
        should(gap._scanFilterDuplicates).equal(null);

        assert.notCalled(scanStartCallback);
        assert.notCalled(scanStopCallback);
      });
    });

    ['stopping', 'stopped'].forEach(state => {
      it(`state ${state}, do enable`, () => {
        const hci = {
          on: sinon.spy()
        };
        const scanStartCallback = sinon.spy();
        const scanStopCallback = sinon.spy();

        const enable = true;
        const filterDuplicates = false;

        const gap = new Gap(hci);
        gap._scanState = state;
        gap.on('scanStart', scanStartCallback);
        gap.on('scanStop', scanStopCallback);
        gap.onLeScanEnableSetCmd(enable, filterDuplicates);

        should(gap._scanState).equal(state);
        should(gap._scanFilterDuplicates).equal(null);

        assert.calledOnceWithExactly(scanStartCallback, null);
        assert.notCalled(scanStopCallback);
      });
    });
  });

  describe('onHciLeAdvertisingReport', () => {
    it('type === 0x04 / no eir', () => {
      const hci = {
        on: sinon.spy()
      };

      const status = 'status';
      const type = 0x04;
      const address = 'a:d:d:r:e:s:s';
      const addressType = 'addressType';
      const eir = [];
      const rssi = 'rssi';

      const discoverCallback = sinon.spy();

      const gap = new Gap(hci);
      gap.on('discover', discoverCallback);
      gap.onHciLeAdvertisingReport(status, type, address, addressType, eir, rssi);

      const expectedDiscovery = {
        address,
        addressType,
        connectable: true,
        advertisement: {
          localName: undefined,
          txPowerLevel: undefined,
          manufacturerData: undefined,
          serviceData: [],
          serviceUuids: [],
          solicitationServiceUuids: []
        },
        rssi,
        count: 1,
        hasScanResponse: true
      };
      should(gap._discoveries[address]).deepEqual(expectedDiscovery);

      assert.calledOnceWithExactly(discoverCallback, status, address, addressType, expectedDiscovery.connectable, expectedDiscovery.advertisement, rssi, false);
    });

    it('type === 0x04 / no eir / previously discovered', () => {
      const hci = {
        on: sinon.spy()
      };

      const status = 'status';
      const type = 0x04;
      const address = 'a:d:d:r:e:s:s';
      const addressType = 'addressType';
      const eir = [];
      const rssi = 'rssi';

      const discoverCallback = sinon.spy();

      const advertisement = {
        localName: 'localName',
        txPowerLevel: 'txPowerLevel',
        manufacturerData: 'manufacturerData',
        serviceData: ['data'],
        serviceUuids: ['uuids'],
        solicitationServiceUuids: ['solicitation']
      };
      const count = 8;
      const hasScanResponse = true;
      const connectable = false;

      const gap = new Gap(hci);
      gap._discoveries[address] = { advertisement, count, hasScanResponse, connectable };
      gap.on('discover', discoverCallback);
      gap.onHciLeAdvertisingReport(status, type, address, addressType, eir, rssi);

      const expectedDiscovery = {
        address,
        addressType,
        connectable,
        advertisement,
        rssi,
        count: count + 1,
        hasScanResponse
      };
      should(gap._discoveries[address]).deepEqual(expectedDiscovery);

      assert.calledOnceWithExactly(discoverCallback, status, address, addressType, expectedDiscovery.connectable, expectedDiscovery.advertisement, rssi, false);
    });

    it('type === 0x06 / scannable', () => {
      const hci = {
        on: sinon.spy()
      };

      const status = 'status';
      const type = 0x06;
      const address = 'a:d:d:r:e:s:s';
      const addressType = 'addressType';
      const eir = [];
      const rssi = 'rssi';

      const discoverCallback = sinon.spy();

      const advertisement = {
        localName: 'localName',
        txPowerLevel: 'txPowerLevel',
        manufacturerData: 'manufacturerData',
        serviceData: ['data'],
        serviceUuids: ['uuids'],
        solicitationServiceUuids: ['solicitation']
      };
      const count = 8;
      const hasScanResponse = false;
      const connectable = false;

      const gap = new Gap(hci);
      gap._discoveries[address] = { advertisement, count, hasScanResponse, connectable };
      gap.on('discover', discoverCallback);
      gap.onHciLeAdvertisingReport(status, type, address, addressType, eir, rssi);

      const expectedDiscovery = {
        address,
        addressType,
        connectable: true,
        advertisement,
        rssi,
        count: count + 1,
        hasScanResponse
      };
      should(gap._discoveries[address]).deepEqual(expectedDiscovery);

      assert.calledOnceWithExactly(discoverCallback, status, address, addressType, expectedDiscovery.connectable, expectedDiscovery.advertisement, rssi, true);
    });

    it('type !== 0x04 / no eir', () => {
      const hci = {
        on: sinon.spy()
      };

      const status = 'status';
      const type = 0x01;
      const address = 'a:d:d:r:e:s:s';
      const addressType = 'addressType';
      const eir = [];
      const rssi = 'rssi';

      const discoverCallback = sinon.spy();

      const gap = new Gap(hci);
      gap.on('discover', discoverCallback);
      gap.onHciLeAdvertisingReport(status, type, address, addressType, eir, rssi);

      const expectedDiscovery = {
        address,
        addressType,
        connectable: true,
        advertisement: {
          localName: undefined,
          txPowerLevel: undefined,
          manufacturerData: undefined,
          serviceData: [],
          serviceUuids: [],
          solicitationServiceUuids: [],
          serviceSolicitationUuids: []
        },
        rssi,
        count: 1,
        hasScanResponse: false
      };
      should(gap._discoveries[address]).deepEqual(expectedDiscovery);

      assert.notCalled(discoverCallback);
    });

    it('invalid EIR data, length === 0', () => {
      const hci = {
        on: sinon.spy()
      };

      const status = 'status';
      const type = 0x01;
      const address = 'a:d:d:r:e:s:s';
      const addressType = 'addressType';
      const eir = Buffer.from([0x00, 0x00]);
      const rssi = 'rssi';

      const discoverCallback = sinon.spy();

      const gap = new Gap(hci);
      gap.on('discover', discoverCallback);
      gap.onHciLeAdvertisingReport(status, type, address, addressType, eir, rssi);

      const expectedDiscovery = {
        address,
        addressType,
        connectable: true,
        advertisement: {
          localName: undefined,
          txPowerLevel: undefined,
          manufacturerData: undefined,
          serviceData: [],
          serviceUuids: [],
          solicitationServiceUuids: [],
          serviceSolicitationUuids: []
        },
        rssi,
        count: 1,
        hasScanResponse: false
      };
      should(gap._discoveries[address]).deepEqual(expectedDiscovery);

      assert.notCalled(discoverCallback);
    });

    it('invalid EIR data, out of range of buffer length', () => {
      const hci = {
        on: sinon.spy()
      };

      const status = 'status';
      const type = 0x01;
      const address = 'a:d:d:r:e:s:s';
      const addressType = 'addressType';
      const eir = Buffer.from([0x03, 0x01, 0x02]);
      const rssi = 'rssi';

      const discoverCallback = sinon.spy();

      const gap = new Gap(hci);
      gap.on('discover', discoverCallback);
      gap.onHciLeAdvertisingReport(status, type, address, addressType, eir, rssi);

      const expectedDiscovery = {
        address,
        addressType,
        connectable: true,
        advertisement: {
          localName: undefined,
          txPowerLevel: undefined,
          manufacturerData: undefined,
          serviceData: [],
          serviceUuids: [],
          solicitationServiceUuids: [],
          serviceSolicitationUuids: []
        },
        rssi,
        count: 1,
        hasScanResponse: false
      };
      should(gap._discoveries[address]).deepEqual(expectedDiscovery);

      assert.notCalled(discoverCallback);
    });

    [0x02, 0x03].forEach(eirType => {
      it(`List of 16-bit Service Class UUIDs (EIR type = ${eirType})`, () => {
        const hci = {
          on: sinon.spy()
        };

        const status = 'status';
        const type = 0x01;
        const address = 'a:d:d:r:e:s:s';
        const addressType = 'addressType';
        const rssi = 'rssi';

        const serviceUuid = Buffer.from([0x01, 0x02]);
        const eirLength = (serviceUuid.length * 2) + 1;
        const eirLengthAndType = Buffer.from([eirLength, eirType]);
        // Add service twice to check unicity
        const eir = Buffer.concat([eirLengthAndType, serviceUuid, serviceUuid]);

        const discoverCallback = sinon.spy();

        const gap = new Gap(hci);
        gap.on('discover', discoverCallback);
        gap.onHciLeAdvertisingReport(status, type, address, addressType, eir, rssi);

        const expectedDiscovery = {
          address,
          addressType,
          connectable: true,
          advertisement: {
            localName: undefined,
            txPowerLevel: undefined,
            manufacturerData: undefined,
            serviceData: [],
            serviceUuids: ['201'],
            solicitationServiceUuids: [],
            serviceSolicitationUuids: []
          },
          rssi,
          count: 1,
          hasScanResponse: false
        };
        should(gap._discoveries[address]).deepEqual(expectedDiscovery);

        assert.notCalled(discoverCallback);
      });
    });

    [0x06, 0x07].forEach(eirType => {
      it(`List of 128-bit Service Class UUIDs (EIR type = ${eirType})`, () => {
        const hci = {
          on: sinon.spy()
        };

        const status = 'status';
        const type = 0x01;
        const address = 'a:d:d:r:e:s:s';
        const addressType = 'addressType';
        const rssi = 'rssi';

        const serviceUuid = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f]);
        const eirLength = (serviceUuid.length * 2) + 1;
        const eirLengthAndType = Buffer.from([eirLength, eirType]);
        // Add service twice to check unicity
        const eir = Buffer.concat([eirLengthAndType, serviceUuid, serviceUuid]);

        const discoverCallback = sinon.spy();

        const gap = new Gap(hci);
        gap.on('discover', discoverCallback);
        gap.onHciLeAdvertisingReport(status, type, address, addressType, eir, rssi);

        const expectedDiscovery = {
          address,
          addressType,
          connectable: true,
          advertisement: {
            localName: undefined,
            txPowerLevel: undefined,
            manufacturerData: undefined,
            serviceData: [],
            serviceUuids: ['0f0e0d0c0b0a09080706050403020100'],
            solicitationServiceUuids: [],
            serviceSolicitationUuids: []
          },
          rssi,
          count: 1,
          hasScanResponse: false
        };
        should(gap._discoveries[address]).deepEqual(expectedDiscovery);

        assert.notCalled(discoverCallback);
      });
    });

    [0x08, 0x09].forEach(eirType => {
      it(`Local name (EIR type = ${eirType})`, () => {
        const hci = {
          on: sinon.spy()
        };

        const status = 'status';
        const type = 0x01;
        const address = 'a:d:d:r:e:s:s';
        const addressType = 'addressType';
        const rssi = 'rssi';

        const localNameHex = Buffer.from([0x6d, 0x79, 0x2d, 0x6e, 0x61, 0x6d, 0x65]);
        const eirLength = localNameHex.length + 1;
        const eirLengthAndType = Buffer.from([eirLength, eirType]);
        const eir = Buffer.concat([eirLengthAndType, localNameHex]);

        const discoverCallback = sinon.spy();

        const gap = new Gap(hci);
        gap.on('discover', discoverCallback);
        gap.onHciLeAdvertisingReport(status, type, address, addressType, eir, rssi);

        const expectedDiscovery = {
          address,
          addressType,
          connectable: true,
          advertisement: {
            localName: 'my-name',
            txPowerLevel: undefined,
            manufacturerData: undefined,
            serviceData: [],
            serviceUuids: [],
            solicitationServiceUuids: [],
            serviceSolicitationUuids: []
          },
          rssi,
          count: 1,
          hasScanResponse: false
        };
        should(gap._discoveries[address]).deepEqual(expectedDiscovery);

        assert.notCalled(discoverCallback);
      });
    });

    it('txPowerLevel (EIR type = 10)', () => {
      const hci = {
        on: sinon.spy()
      };

      const status = 'status';
      const type = 0x01;
      const address = 'a:d:d:r:e:s:s';
      const addressType = 'addressType';
      const rssi = 'rssi';

      const eirType = 0x0a;
      const localNameHex = Buffer.from([0x20]);
      const eirLength = localNameHex.length + 1;
      const eirLengthAndType = Buffer.from([eirLength, eirType]);
      const eir = Buffer.concat([eirLengthAndType, localNameHex]);

      const discoverCallback = sinon.spy();

      const gap = new Gap(hci);
      gap.on('discover', discoverCallback);
      gap.onHciLeAdvertisingReport(status, type, address, addressType, eir, rssi);

      const expectedDiscovery = {
        address,
        addressType,
        connectable: true,
        advertisement: {
          localName: undefined,
          txPowerLevel: 32,
          manufacturerData: undefined,
          serviceData: [],
          serviceUuids: [],
          solicitationServiceUuids: [],
          serviceSolicitationUuids: []
        },
        rssi,
        count: 1,
        hasScanResponse: false
      };
      should(gap._discoveries[address]).deepEqual(expectedDiscovery);

      assert.notCalled(discoverCallback);
    });

    it('List of 16 bit solicitation UUIDs (EIR type = 20)', () => {
      const hci = {
        on: sinon.spy()
      };

      const status = 'status';
      const type = 0x01;
      const address = 'a:d:d:r:e:s:s';
      const addressType = 'addressType';
      const rssi = 'rssi';

      const eirType = 0x14;
      const serviceUuid = Buffer.from([0x01, 0x02]);
      const eirLength = (serviceUuid.length * 2) + 1;
      const eirLengthAndType = Buffer.from([eirLength, eirType]);
      // Add service twice to check unicity
      const eir = Buffer.concat([eirLengthAndType, serviceUuid, serviceUuid]);

      const discoverCallback = sinon.spy();

      const gap = new Gap(hci);
      gap.on('discover', discoverCallback);
      gap.onHciLeAdvertisingReport(status, type, address, addressType, eir, rssi);

      const expectedDiscovery = {
        address,
        addressType,
        connectable: true,
        advertisement: {
          localName: undefined,
          txPowerLevel: undefined,
          manufacturerData: undefined,
          serviceData: [],
          serviceUuids: [],
          solicitationServiceUuids: [],
          serviceSolicitationUuids: ['201']
        },
        rssi,
        count: 1,
        hasScanResponse: false
      };
      should(gap._discoveries[address]).deepEqual(expectedDiscovery);

      assert.notCalled(discoverCallback);
    });

    it('List of 128 bit solicitation UUIDs (EIR type = 21)', () => {
      const hci = {
        on: sinon.spy()
      };

      const status = 'status';
      const type = 0x01;
      const address = 'a:d:d:r:e:s:s';
      const addressType = 'addressType';
      const rssi = 'rssi';

      const eirType = 0x15;
      const serviceUuid = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f]);
      const eirLength = (serviceUuid.length * 2) + 1;
      const eirLengthAndType = Buffer.from([eirLength, eirType]);
      // Add service twice to check unicity
      const eir = Buffer.concat([eirLengthAndType, serviceUuid, serviceUuid]);

      const discoverCallback = sinon.spy();

      const gap = new Gap(hci);
      gap.on('discover', discoverCallback);
      gap.onHciLeAdvertisingReport(status, type, address, addressType, eir, rssi);

      const expectedDiscovery = {
        address,
        addressType,
        connectable: true,
        advertisement: {
          localName: undefined,
          txPowerLevel: undefined,
          manufacturerData: undefined,
          serviceData: [],
          serviceUuids: [],
          solicitationServiceUuids: [],
          serviceSolicitationUuids: ['0f0e0d0c0b0a09080706050403020100']
        },
        rssi,
        count: 1,
        hasScanResponse: false
      };
      should(gap._discoveries[address]).deepEqual(expectedDiscovery);

      assert.notCalled(discoverCallback);
    });

    it('16-bit Service Data (EIR type = 22)', () => {
      const hci = {
        on: sinon.spy()
      };

      const status = 'status';
      const type = 0x01;
      const address = 'a:d:d:r:e:s:s';
      const addressType = 'addressType';
      const rssi = 'rssi';

      const eirType = 0x16;
      const serviceUuid = Buffer.from([0x01, 0x02]);
      const serviceData = Buffer.from([0x03, 0x04]);
      const eirLength = serviceUuid.length + serviceData.length + 1;
      const eirLengthAndType = Buffer.from([eirLength, eirType]);
      const eir = Buffer.concat([eirLengthAndType, serviceUuid, serviceData]);

      const discoverCallback = sinon.spy();

      const gap = new Gap(hci);
      gap.on('discover', discoverCallback);
      gap.onHciLeAdvertisingReport(status, type, address, addressType, eir, rssi);

      const expectedDiscovery = {
        address,
        addressType,
        connectable: true,
        advertisement: {
          localName: undefined,
          txPowerLevel: undefined,
          manufacturerData: undefined,
          serviceData: [
            {
              uuid: '0201',
              data: serviceData
            }
          ],
          serviceUuids: [],
          solicitationServiceUuids: [],
          serviceSolicitationUuids: []
        },
        rssi,
        count: 1,
        hasScanResponse: false
      };
      should(gap._discoveries[address]).deepEqual(expectedDiscovery);

      assert.notCalled(discoverCallback);
    });

    it('32-bit Service Data (EIR type = 32)', () => {
      const hci = {
        on: sinon.spy()
      };

      const status = 'status';
      const type = 0x01;
      const address = 'a:d:d:r:e:s:s';
      const addressType = 'addressType';
      const rssi = 'rssi';

      const eirType = 0x20;
      const serviceUuid = Buffer.from([0x01, 0x02, 0x03, 0x04]);
      const serviceData = Buffer.from([0x05, 0x06]);
      const eirLength = serviceUuid.length + serviceData.length + 1;
      const eirLengthAndType = Buffer.from([eirLength, eirType]);
      const eir = Buffer.concat([eirLengthAndType, serviceUuid, serviceData]);

      const discoverCallback = sinon.spy();

      const gap = new Gap(hci);
      gap.on('discover', discoverCallback);
      gap.onHciLeAdvertisingReport(status, type, address, addressType, eir, rssi);

      const expectedDiscovery = {
        address,
        addressType,
        connectable: true,
        advertisement: {
          localName: undefined,
          txPowerLevel: undefined,
          manufacturerData: undefined,
          serviceData: [
            {
              uuid: '04030201',
              data: serviceData
            }
          ],
          serviceUuids: [],
          solicitationServiceUuids: [],
          serviceSolicitationUuids: []
        },
        rssi,
        count: 1,
        hasScanResponse: false
      };
      should(gap._discoveries[address]).deepEqual(expectedDiscovery);

      assert.notCalled(discoverCallback);
    });

    it('128-bit Service Data (EIR type = 33)', () => {
      const hci = {
        on: sinon.spy()
      };

      const status = 'status';
      const type = 0x01;
      const address = 'a:d:d:r:e:s:s';
      const addressType = 'addressType';
      const rssi = 'rssi';

      const eirType = 0x21;
      const serviceUuid = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f]);
      const serviceData = Buffer.from([0x05, 0x06]);
      const eirLength = serviceUuid.length + serviceData.length + 1;
      const eirLengthAndType = Buffer.from([eirLength, eirType]);
      const eir = Buffer.concat([eirLengthAndType, serviceUuid, serviceData]);

      const discoverCallback = sinon.spy();

      const gap = new Gap(hci);
      gap.on('discover', discoverCallback);
      gap.onHciLeAdvertisingReport(status, type, address, addressType, eir, rssi);

      const expectedDiscovery = {
        address,
        addressType,
        connectable: true,
        advertisement: {
          localName: undefined,
          txPowerLevel: undefined,
          manufacturerData: undefined,
          serviceData: [
            {
              uuid: '0f0e0d0c0b0a09080706050403020100',
              data: serviceData
            }
          ],
          serviceUuids: [],
          solicitationServiceUuids: [],
          serviceSolicitationUuids: []
        },
        rssi,
        count: 1,
        hasScanResponse: false
      };
      should(gap._discoveries[address]).deepEqual(expectedDiscovery);

      assert.notCalled(discoverCallback);
    });

    it('List of 32 bit solicitation UUIDs (EIR type = 31)', () => {
      const hci = {
        on: sinon.spy()
      };

      const status = 'status';
      const type = 0x01;
      const address = 'a:d:d:r:e:s:s';
      const addressType = 'addressType';
      const rssi = 'rssi';

      const eirType = 0x1f;
      const serviceUuid = Buffer.from([0x01, 0x02, 0x03, 0x04]);
      const eirLength = (serviceUuid.length * 2) + 1;
      const eirLengthAndType = Buffer.from([eirLength, eirType]);
      // Add service twice to check unicity
      const eir = Buffer.concat([eirLengthAndType, serviceUuid, serviceUuid]);

      const discoverCallback = sinon.spy();

      const gap = new Gap(hci);
      gap.on('discover', discoverCallback);
      gap.onHciLeAdvertisingReport(status, type, address, addressType, eir, rssi);

      const expectedDiscovery = {
        address,
        addressType,
        connectable: true,
        advertisement: {
          localName: undefined,
          txPowerLevel: undefined,
          manufacturerData: undefined,
          serviceData: [],
          serviceUuids: [],
          solicitationServiceUuids: [],
          serviceSolicitationUuids: ['4030201']
        },
        rssi,
        count: 1,
        hasScanResponse: false
      };
      should(gap._discoveries[address]).deepEqual(expectedDiscovery);

      assert.notCalled(discoverCallback);
    });

    it('Manufacturer Specific Data (EIR type = 255)', () => {
      const hci = {
        on: sinon.spy()
      };

      const status = 'status';
      const type = 0x01;
      const address = 'a:d:d:r:e:s:s';
      const addressType = 'addressType';
      const rssi = 'rssi';

      const eirType = 0xff;
      const manufacturerData = Buffer.from([0x01, 0x02, 0x03, 0x04]);
      const eirLength = manufacturerData.length + 1;
      const eirLengthAndType = Buffer.from([eirLength, eirType]);
      const eir = Buffer.concat([eirLengthAndType, manufacturerData, manufacturerData]);

      const discoverCallback = sinon.spy();

      const gap = new Gap(hci);
      gap.on('discover', discoverCallback);
      gap.onHciLeAdvertisingReport(status, type, address, addressType, eir, rssi);

      const expectedDiscovery = {
        address,
        addressType,
        connectable: true,
        advertisement: {
          localName: undefined,
          txPowerLevel: undefined,
          manufacturerData,
          serviceData: [],
          serviceUuids: [],
          solicitationServiceUuids: [],
          serviceSolicitationUuids: []
        },
        rssi,
        count: 1,
        hasScanResponse: false
      };
      should(gap._discoveries[address]).deepEqual(expectedDiscovery);

      assert.notCalled(discoverCallback);
    });
  });

  it('should reset the service data on non scan responses', () => {
    const hci = {
      on: sinon.spy()
    };

    const status = 'status';
    const address = 'a:d:d:r:e:s:s';
    const addressType = 'addressType';
    const rssi = 'rssi';

    const eirType = 0x21;
    const serviceUuid = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0x0c, 0x0d, 0x0e, 0x0f]);
    const serviceData = Buffer.from([0x05, 0x06]);
    const eirLength = serviceUuid.length + serviceData.length + 1;
    const eirLengthAndType = Buffer.from([eirLength, eirType]);
    const eir = Buffer.concat([eirLengthAndType, serviceUuid, serviceData]);

    const discoverCallback = sinon.spy();

    const gap = new Gap(hci);
    gap.on('discover', discoverCallback);
    gap.onHciLeAdvertisingReport(status, 0x04, address, addressType, eir, rssi);

    const expectedServiceData = [
      {
        uuid: '0f0e0d0c0b0a09080706050403020100',
        data: serviceData
      }
    ];

    should(gap._discoveries[address].advertisement.serviceData).deepEqual(expectedServiceData);

    gap.onHciLeAdvertisingReport(status, 0x01, address, addressType, eir, rssi);

    should(gap._discoveries[address].advertisement.serviceData).deepEqual(expectedServiceData);

    assert.calledOnce(discoverCallback);
  });
});
