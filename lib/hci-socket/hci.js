const debug = require('debug')('hci');

const events = require('events');
const util = require('util');

const BluetoothHciSocket = require('@abandonware/bluetooth-hci-socket');

const HCI_COMMAND_PKT = 0x01;
const HCI_ACLDATA_PKT = 0x02;
const HCI_EVENT_PKT = 0x04;

const ACL_START_NO_FLUSH = 0x00;
const ACL_CONT = 0x01;
const ACL_START = 0x02;

const EVT_DISCONN_COMPLETE = 0x05;
const EVT_ENCRYPT_CHANGE = 0x08;
const EVT_CMD_COMPLETE = 0x0e;
const EVT_CMD_STATUS = 0x0f;
const EVT_NUMBER_OF_COMPLETED_PACKETS = 0x13;
const EVT_LE_META_EVENT = 0x3e;

const EVT_LE_CONN_COMPLETE = 0x01;
const EVT_LE_ADVERTISING_REPORT = 0x02;
const EVT_LE_ENHANCED_CONN_COMPLETE = 0x0a;
const EVT_LE_EXTENDED_ADVERTISING_REPORT = 0x0d;
const EVT_LE_CONN_UPDATE_COMPLETE = 0x03;

const OGF_LINK_CTL = 0x01;
const OCF_DISCONNECT = 0x0006;

const OGF_HOST_CTL = 0x03;
const OCF_SET_EVENT_MASK = 0x0001;
const OCF_RESET = 0x0003;
const OCF_SET_RANDOM_MAC = 0x0005;
const OCF_SET_PHY = 0x0031;
const OCF_READ_LE_HOST_SUPPORTED = 0x006c;
const OCF_WRITE_LE_HOST_SUPPORTED = 0x006d;

const OGF_INFO_PARAM = 0x04;
const OCF_READ_LOCAL_VERSION = 0x0001;
const OCF_READ_SUPPORTED_COMMANDS = 0x0002;
const OCF_READ_BUFFER_SIZE = 0x0005;
const OCF_READ_BD_ADDR = 0x0009;

const OGF_STATUS_PARAM = 0x05;
const OCF_READ_RSSI = 0x0005;

const OGF_LE_CTL = 0x08;
const OCF_LE_SET_EVENT_MASK = 0x0001;
const OCF_LE_READ_BUFFER_SIZE = 0x0002;
const OCF_LE_SET_EXTENDED_SCAN_PARAMETERS = 0x0041;
const OCF_LE_SET_EXTENDED_SCAN_ENABLE = 0x0042;
const OCF_LE_SET_SCAN_PARAMETERS = 0x000b;
const OCF_LE_SET_SCAN_ENABLE = 0x000c;
const OCF_LE_CREATE_CONN = 0x000d;
const OCF_LE_CREATE_EXTENDED_CONN = 0x0043;
const OCF_LE_CANCEL_CONN = 0x000e;
const OCF_LE_CONN_UPDATE = 0x0013;
const OCF_LE_START_ENCRYPTION = 0x0019;
const DISCONNECT_CMD = OCF_DISCONNECT | (OGF_LINK_CTL << 10);

const SET_EVENT_MASK_CMD = OCF_SET_EVENT_MASK | (OGF_HOST_CTL << 10);
const RESET_CMD = OCF_RESET | (OGF_HOST_CTL << 10);
const READ_LE_HOST_SUPPORTED_CMD =
  OCF_READ_LE_HOST_SUPPORTED | (OGF_HOST_CTL << 10);
const WRITE_LE_HOST_SUPPORTED_CMD =
  OCF_WRITE_LE_HOST_SUPPORTED | (OGF_HOST_CTL << 10);

const READ_LOCAL_VERSION_CMD = OCF_READ_LOCAL_VERSION | (OGF_INFO_PARAM << 10);
const READ_SUPPORTED_COMMANDS_CMD =
  OCF_READ_SUPPORTED_COMMANDS | (OGF_INFO_PARAM << 10);
const READ_BUFFER_SIZE_CMD = OCF_READ_BUFFER_SIZE | (OGF_INFO_PARAM << 10);
const READ_BD_ADDR_CMD = OCF_READ_BD_ADDR | (OGF_INFO_PARAM << 10);

const READ_RSSI_CMD = OCF_READ_RSSI | (OGF_STATUS_PARAM << 10);

const LE_SET_EVENT_MASK_CMD = OCF_LE_SET_EVENT_MASK | (OGF_LE_CTL << 10);
const LE_READ_BUFFER_SIZE_CMD = OCF_LE_READ_BUFFER_SIZE | (OGF_LE_CTL << 10);
const LE_SET_EXTENDED_SCAN_PARAMETERS_CMD =
  OCF_LE_SET_EXTENDED_SCAN_PARAMETERS | (OGF_LE_CTL << 10);
const LE_SET_EXTENDED_SCAN_ENABLE_CMD =
  OCF_LE_SET_EXTENDED_SCAN_ENABLE | (OGF_LE_CTL << 10);
const LE_SET_SCAN_PARAMETERS_CMD =
  OCF_LE_SET_SCAN_PARAMETERS | (OGF_LE_CTL << 10);
const LE_SET_SCAN_ENABLE_CMD = OCF_LE_SET_SCAN_ENABLE | (OGF_LE_CTL << 10);
const LE_CREATE_CONN_CMD = OCF_LE_CREATE_CONN | (OGF_LE_CTL << 10);
const LE_CREATE_EXTENDED_CONN_CMD =
  OCF_LE_CREATE_EXTENDED_CONN | (OGF_LE_CTL << 10);
const LE_CONN_UPDATE_CMD = OCF_LE_CONN_UPDATE | (OGF_LE_CTL << 10);
const LE_CANCEL_CONN_CMD = OCF_LE_CANCEL_CONN | (OGF_LE_CTL << 10);
const LE_START_ENCRYPTION_CMD = OCF_LE_START_ENCRYPTION | (OGF_LE_CTL << 10);
const HCI_OE_USER_ENDED_CONNECTION = 0x13;

const STATUS_MAPPER = require('./hci-status');

const Hci = function (options) {
  options = options || {};
  this._socket = new BluetoothHciSocket();
  this._isDevUp = null;
  this._isExtended = 'extended' in options && options.extended;
  this._state = null;

  this._handleBuffers = {};

  this._aclBuffers = undefined;
  this._resolveAclBuffers = undefined;
  const aclBuffersPromise = new Promise((resolve) => {
    this._resolveAclBuffers = resolve;
  });
  this.getAclBuffers = async function () {
    if (this._aclBuffers) return this._aclBuffers;
    return await aclBuffersPromise;
  }.bind(this);
  this.setAclBuffers = function (length, num) {
    if (this._aclBuffers) {
      this._aclBuffers.length = length;
      this._aclBuffers.num = num;
      return;
    }
    this._aclBuffers = {
      length,
      num
    };
    this._resolveAclBuffers(this._aclBuffers);
  }.bind(this);

  this._aclConnections = new Map();

  this._aclQueue = [];

  this._deviceId = options.deviceId != null
    ? parseInt(options.deviceId, 10)
    : process.env.NOBLE_HCI_DEVICE_ID
      ? parseInt(process.env.NOBLE_HCI_DEVICE_ID, 10)
      : undefined;

  this._userChannel =
    (typeof options.userChannel === 'undefined' && options.userChannel) ||
    process.env.HCI_CHANNEL_USER;

  this.on('stateChange', this.onStateChange.bind(this));
};

util.inherits(Hci, events.EventEmitter);

Hci.STATUS_MAPPER = STATUS_MAPPER;

Hci.prototype.init = function (options) {
  this._socket.on('data', this.onSocketData.bind(this));
  this._socket.on('error', this.onSocketError.bind(this));

  if (this._userChannel) {
    this._socket.bindUser(this._deviceId);
    this._socket.start();

    this.reset();
  } else {
    if (!this._bound) {
      this._socket.bindRaw(this._deviceId);
      this._bound = true;
    }
    this._socket.start();

    this.pollIsDevUp();
  }
};

Hci.prototype.pollIsDevUp = function () {
  const isDevUp = this._socket.isDevUp();

  if (this._isDevUp !== isDevUp) {
    if (isDevUp) {
      if (this._state === 'poweredOff') {
        this._socket.removeAllListeners();
        this._state = null;
        this.init();
        return;
      }

      if (this._isExtended) {
        this.setCodedPhySupport();
      }
      this.setSocketFilter();
      this.setEventMask();
      this.setLeEventMask();
      this.readLocalVersion();
      this.writeLeHostSupported();
      this.readLeHostSupported();
      this.readLeBufferSize();
      this.readBdAddr();
    } else {
      this.emit('stateChange', 'poweredOff');
    }

    this._isDevUp = isDevUp;
  }

  setTimeout(this.pollIsDevUp.bind(this), 1000);
};

Hci.prototype.setCodedPhySupport = function () {
  const cmd = Buffer.alloc(7);

  // header
  cmd.writeUInt8(HCI_COMMAND_PKT, 0);
  cmd.writeUInt16LE(OCF_SET_PHY | (OGF_LE_CTL << 10), 1);

  // length
  cmd.writeUInt8(0x03, 3);

  // data
  cmd.writeUInt8(0x00, 4); // all phy prefs
  cmd.writeUInt8(0x05, 5); // tx phy: 0x01 - LE 1M, 0x03 - LE 1M + LE 2M, 0x05 - LE 1M + LE CODED, 0x07 -  LE 1M + LE 2M +  LE CODED
  cmd.writeUInt8(0x05, 6); // rx phy: 0x01 - LE 1M, 0x03 - LE 1M + LE 2M, 0x05 - LE 1M + LE CODED, 0x07 -  LE 1M + LE 2M +  LE CODED

  debug(`set all phys supporting - writing: ${cmd.toString('hex')}`);
  this._socket.write(cmd);
};

Hci.prototype.setRandomMAC = function () {
  const cmd = Buffer.alloc(10);

  // header
  cmd.writeUInt8(HCI_COMMAND_PKT, 0);
  cmd.writeUInt16LE(OCF_SET_RANDOM_MAC | (OGF_LE_CTL << 10), 1);

  // length
  cmd.writeUInt8(0x06, 3);

  // data
  cmd.writeUInt8(0x05, 4); // mac 6 byte
  cmd.writeUInt8(0x04, 5); // mac 5 byte
  cmd.writeUInt8(0x03, 6); // mac 4 byte
  cmd.writeUInt8(0x02, 7); // mac 3 byte
  cmd.writeUInt8(0x01, 8); // mac 2 byte
  cmd.writeUInt8(0x00, 9); // mac 1 byte

  debug(`set random mac address - writing: ${cmd.toString('hex')}`);
  this._socket.write(cmd);
};

Hci.prototype.setSocketFilter = function () {
  const filter = Buffer.alloc(14);
  const typeMask =
    (1 << HCI_COMMAND_PKT) | (1 << HCI_EVENT_PKT) | (1 << HCI_ACLDATA_PKT);
  const eventMask1 =
    (1 << EVT_DISCONN_COMPLETE) |
    (1 << EVT_ENCRYPT_CHANGE) |
    (1 << EVT_CMD_COMPLETE) |
    (1 << EVT_CMD_STATUS) |
    (1 << EVT_NUMBER_OF_COMPLETED_PACKETS);
  const eventMask2 = 1 << (EVT_LE_META_EVENT - 32);
  const opcode = 0;

  filter.writeUInt32LE(typeMask, 0);
  filter.writeUInt32LE(eventMask1, 4);
  filter.writeUInt32LE(eventMask2, 8);
  filter.writeUInt16LE(opcode, 12);

  debug(`setting filter to: ${filter.toString('hex')}`);
  this._socket.setFilter(filter);
};

Hci.prototype.setEventMask = function () {
  const cmd = Buffer.alloc(12);
  const eventMask = Buffer.from('fffffbff07f8bf3d', 'hex');

  // header
  cmd.writeUInt8(HCI_COMMAND_PKT, 0);
  cmd.writeUInt16LE(SET_EVENT_MASK_CMD, 1);

  // length
  cmd.writeUInt8(eventMask.length, 3);

  eventMask.copy(cmd, 4);

  debug(`set event mask - writing: ${cmd.toString('hex')}`);
  this._socket.write(cmd);
};

Hci.prototype.reset = function () {
  const cmd = Buffer.alloc(4);

  // header
  cmd.writeUInt8(HCI_COMMAND_PKT, 0);
  cmd.writeUInt16LE(RESET_CMD, 1);

  // length
  cmd.writeUInt8(0x00, 3);

  debug(`reset - writing: ${cmd.toString('hex')}`);
  this._socket.write(cmd);
};

Hci.prototype.readSupportedCommands = function () {
  const cmd = Buffer.alloc(4);

  // header
  cmd.writeUInt8(HCI_COMMAND_PKT, 0);
  cmd.writeUInt16LE(READ_SUPPORTED_COMMANDS_CMD, 1);

  // length
  cmd.writeUInt8(0x0, 3);

  debug(`read supported commands - writing: ${cmd.toString('hex')}`);
  this._socket.write(cmd);
};

Hci.prototype.readLocalVersion = function () {
  const cmd = Buffer.alloc(4);

  // header
  cmd.writeUInt8(HCI_COMMAND_PKT, 0);
  cmd.writeUInt16LE(READ_LOCAL_VERSION_CMD, 1);

  // length
  cmd.writeUInt8(0x0, 3);

  debug(`read local version - writing: ${cmd.toString('hex')}`);
  this._socket.write(cmd);
};

Hci.prototype.readBufferSize = function () {
  const cmd = Buffer.alloc(4);

  // header
  cmd.writeUInt8(HCI_COMMAND_PKT, 0);
  cmd.writeUInt16LE(READ_BUFFER_SIZE_CMD, 1);

  // length
  cmd.writeUInt8(0x0, 3);

  debug(`read buffer size - writing: ${cmd.toString('hex')}`);
  this._socket.write(cmd);
};

Hci.prototype.readBdAddr = function () {
  const cmd = Buffer.alloc(4);

  // header
  cmd.writeUInt8(HCI_COMMAND_PKT, 0);
  cmd.writeUInt16LE(READ_BD_ADDR_CMD, 1);

  // length
  cmd.writeUInt8(0x0, 3);

  debug(`read bd addr - writing: ${cmd.toString('hex')}`);
  this._socket.write(cmd);
};

Hci.prototype.setLeEventMask = function () {
  const cmd = Buffer.alloc(12);
  const leEventMask = this._isExtended
    ? Buffer.from('1fff000000000000', 'hex')
    : Buffer.from('1f00000000000000', 'hex');

  // header
  cmd.writeUInt8(HCI_COMMAND_PKT, 0);
  cmd.writeUInt16LE(LE_SET_EVENT_MASK_CMD, 1);

  // length
  cmd.writeUInt8(leEventMask.length, 3);

  leEventMask.copy(cmd, 4);

  debug(`set le event mask - writing: ${cmd.toString('hex')}`);
  this._socket.write(cmd);
};

Hci.prototype.readLeBufferSize = function () {
  const cmd = Buffer.alloc(4);

  // header
  cmd.writeUInt8(HCI_COMMAND_PKT, 0);
  cmd.writeUInt16LE(LE_READ_BUFFER_SIZE_CMD, 1);

  // length
  cmd.writeUInt8(0x0, 3);

  debug(`le read buffer size - writing: ${cmd.toString('hex')}`);
  this._socket.write(cmd);
};

Hci.prototype.readLeHostSupported = function () {
  const cmd = Buffer.alloc(4);

  // header
  cmd.writeUInt8(HCI_COMMAND_PKT, 0);
  cmd.writeUInt16LE(READ_LE_HOST_SUPPORTED_CMD, 1);

  // length
  cmd.writeUInt8(0x00, 3);

  debug(`read LE host supported - writing: ${cmd.toString('hex')}`);
  this._socket.write(cmd);
};

Hci.prototype.writeLeHostSupported = function () {
  const cmd = Buffer.alloc(6);

  // header
  cmd.writeUInt8(HCI_COMMAND_PKT, 0);
  cmd.writeUInt16LE(WRITE_LE_HOST_SUPPORTED_CMD, 1);

  // length
  cmd.writeUInt8(0x02, 3);

  // data
  cmd.writeUInt8(0x01, 4); // le
  cmd.writeUInt8(0x00, 5); // simul

  debug(`write LE host supported - writing: ${cmd.toString('hex')}`);
  this._socket.write(cmd);
};

Hci.prototype.setScanParameters = function (
  interval = 0x0012,
  window = 0x0012
) {
  const cmd = Buffer.alloc(this._isExtended ? 17 : 11);

  // header
  cmd.writeUInt8(HCI_COMMAND_PKT, 0);
  cmd.writeUInt16LE(
    this._isExtended
      ? LE_SET_EXTENDED_SCAN_PARAMETERS_CMD
      : LE_SET_SCAN_PARAMETERS_CMD,
    1
  );

  if (this._isExtended) {
    // length
    cmd.writeUInt8(0x0d, 3);

    // data
    cmd.writeUInt8(0x00, 4); // own address type: 0 -> public, 1 -> random
    cmd.writeUInt8(0x00, 5); // filter: 0 -> all event types
    cmd.writeUInt8(0x05, 6); // phy: LE 1M + LE CODED
    // phy 1M
    cmd.writeUInt8(0x01, 7); // type: 0 -> passive, 1 -> active
    cmd.writeUInt16LE(interval, 8); // interval, ms * 1.6
    cmd.writeUInt16LE(window, 10); // window, ms * 1.6
    // phy coded
    cmd.writeUInt8(0x01, 12); // type: 0 -> passive, 1 -> active
    cmd.writeUInt16LE(interval, 13); // interval, ms * 1.6
    cmd.writeUInt16LE(window, 15); // window, ms * 1.6
  } else {
    // length
    cmd.writeUInt8(0x07, 3);

    // data
    cmd.writeUInt8(0x01, 4); // type: 0 -> passive, 1 -> active
    cmd.writeUInt16LE(interval, 5); // interval, ms * 1.6
    cmd.writeUInt16LE(window, 7); // window, ms * 1.6
    cmd.writeUInt8(0x00, 9); // own address type: 0 -> public, 1 -> random
    cmd.writeUInt8(0x00, 10); // filter: 0 -> all event types
  }

  debug(`set scan parameters - writing: ${cmd.toString('hex')}`);
  this._socket.write(cmd);
};

Hci.prototype.setScanEnabled = function (enabled, filterDuplicates) {
  const cmd = Buffer.alloc(this._isExtended ? 10 : 6);

  // header
  cmd.writeUInt8(HCI_COMMAND_PKT, 0);
  cmd.writeUInt16LE(
    this._isExtended ? LE_SET_EXTENDED_SCAN_ENABLE_CMD : LE_SET_SCAN_ENABLE_CMD,
    1
  );

  if (this._isExtended) {
    // length
    cmd.writeUInt8(0x06, 3);

    // data
    cmd.writeUInt8(enabled ? 0x01 : 0x00, 4); // enable: 0 -> disabled, 1 -> enabled
    cmd.writeUInt8(filterDuplicates ? 0x01 : 0x00, 5); // duplicates: 0 -> duplicates, 1 -> all
    cmd.writeUInt16LE(0x0000, 6); // duration
    cmd.writeUInt16LE(0x0000, 8); // period
  } else {
    // length
    cmd.writeUInt8(0x02, 3);

    // data
    cmd.writeUInt8(enabled ? 0x01 : 0x00, 4); // enable: 0 -> disabled, 1 -> enabled
    cmd.writeUInt8(filterDuplicates ? 0x01 : 0x00, 5); // duplicates: 0 -> duplicates, 0 -> duplicates
  }

  debug(`set scan enabled - writing: ${cmd.toString('hex')}`);
  this._socket.write(cmd);
};

Hci.prototype.createLeConn = function (address, addressType, parameters = {}) {
  const {
    minInterval = 0x0006,
    maxInterval = 0x0012,
    latency = 0x0000,
    timeout = 0x002a
  } = parameters;

  const cmd = Buffer.alloc(this._isExtended ? 46 : 29);

  // header
  cmd.writeUInt8(HCI_COMMAND_PKT, 0);
  cmd.writeUInt16LE(
    this._isExtended
      ? LE_CREATE_EXTENDED_CONN_CMD
      : LE_CREATE_CONN_CMD,
    1
  );

  if (this._isExtended) {
    // length
    cmd.writeUInt8(0x2a, 3);

    // data
    cmd.writeUInt8(0x00, 4); // filter policy: white list is not used
    cmd.writeUInt8(0x00, 5); // own address type
    cmd.writeUInt8(addressType === 'random' ? 0x01 : 0x00, 6); // peer address type
    Buffer.from(address.split(':').reverse().join(''), 'hex').copy(cmd, 7); // peer address
    cmd.writeUInt8(0x05, 13); // initiating PHYs: LE 1M + LE Coded

    // LE 1M PHY
    cmd.writeUInt16LE(0x0060, 14); // scan interval 60 msec
    cmd.writeUInt16LE(0x0060, 16); // scan window 60 msec
    cmd.writeUInt16LE(minInterval, 18); // min interval
    cmd.writeUInt16LE(maxInterval, 20); // max interval
    cmd.writeUInt16LE(latency, 22); // latency
    cmd.writeUInt16LE(timeout, 24); // supervision timeout
    cmd.writeUInt16LE(0x0000, 26); // min ce length
    cmd.writeUInt16LE(0x0000, 28); // max ce length

    // LE Coded PHY
    cmd.writeUInt16LE(0x0060, 30); // scan interval 60 msec
    cmd.writeUInt16LE(0x0060, 32); // scan window 60 msec
    cmd.writeUInt16LE(minInterval, 34); // min interval
    cmd.writeUInt16LE(maxInterval, 36); // max interval
    cmd.writeUInt16LE(latency, 38); // latency
    cmd.writeUInt16LE(timeout, 40); // supervision timeout
    cmd.writeUInt16LE(0x0000, 42); // min ce length
    cmd.writeUInt16LE(0x0000, 44); // max ce length
  } else {
    // length
    cmd.writeUInt8(0x19, 3);

    // data
    cmd.writeUInt16LE(0x0060, 4); // interval
    cmd.writeUInt16LE(0x0030, 6); // window
    cmd.writeUInt8(0x00, 8); // initiator filter

    cmd.writeUInt8(addressType === 'random' ? 0x01 : 0x00, 9); // peer address type
    Buffer.from(address.split(':').reverse().join(''), 'hex').copy(cmd, 10); // peer address

    cmd.writeUInt8(0x00, 16); // own address type

    cmd.writeUInt16LE(minInterval, 17); // min interval
    cmd.writeUInt16LE(maxInterval, 19); // max interval
    cmd.writeUInt16LE(latency, 21); // latency
    cmd.writeUInt16LE(timeout, 23); // supervision timeout
    cmd.writeUInt16LE(0x0004, 25); // min ce length
    cmd.writeUInt16LE(0x0006, 27); // max ce length
  }

  debug(`create le conn - writing: ${cmd.toString('hex')}`);
  this._socket.write(cmd);
};

Hci.prototype.connUpdateLe = function (
  handle,
  minInterval,
  maxInterval,
  latency,
  supervisionTimeout
) {
  const cmd = Buffer.alloc(18);

  // header
  cmd.writeUInt8(HCI_COMMAND_PKT, 0);
  cmd.writeUInt16LE(LE_CONN_UPDATE_CMD, 1);

  // length
  cmd.writeUInt8(0x0e, 3);

  // data
  cmd.writeUInt16LE(handle, 4);
  cmd.writeUInt16LE(Math.floor(minInterval / 1.25), 6); // min interval
  cmd.writeUInt16LE(Math.floor(maxInterval / 1.25), 8); // max interval
  cmd.writeUInt16LE(latency, 10); // latency
  cmd.writeUInt16LE(Math.floor(supervisionTimeout / 10), 12); // supervision timeout
  cmd.writeUInt16LE(0x0000, 14); // min ce length
  cmd.writeUInt16LE(0x0000, 16); // max ce length

  debug(`conn update le - writing: ${cmd.toString('hex')}`);
  this._socket.write(cmd);
};

Hci.prototype.cancelConnect = function () {
  const cmd = Buffer.alloc(4);

  // header
  cmd.writeUInt8(HCI_COMMAND_PKT, 0);
  cmd.writeUInt16LE(LE_CANCEL_CONN_CMD, 1);

  // length
  cmd.writeUInt8(0x0, 3);

  debug('cancel le conn - writing: ' + cmd.toString('hex'));
  this._socket.write(cmd);
};

Hci.prototype.startLeEncryption = function (handle, random, diversifier, key) {
  const cmd = Buffer.alloc(32);

  // header
  cmd.writeUInt8(HCI_COMMAND_PKT, 0);
  cmd.writeUInt16LE(LE_START_ENCRYPTION_CMD, 1);

  // length
  cmd.writeUInt8(0x1c, 3);

  // data
  cmd.writeUInt16LE(handle, 4); // handle
  random.copy(cmd, 6);
  diversifier.copy(cmd, 14);
  key.copy(cmd, 16);

  debug(`start le encryption - writing: ${cmd.toString('hex')}`);
  this._socket.write(cmd);
};

Hci.prototype.disconnect = function (handle, reason) {
  const cmd = Buffer.alloc(7);

  reason = reason || HCI_OE_USER_ENDED_CONNECTION;

  // header
  cmd.writeUInt8(HCI_COMMAND_PKT, 0);
  cmd.writeUInt16LE(DISCONNECT_CMD, 1);

  // length
  cmd.writeUInt8(0x03, 3);

  // data
  cmd.writeUInt16LE(handle, 4); // handle
  cmd.writeUInt8(reason, 6); // reason

  debug(`disconnect - writing: ${cmd.toString('hex')}`);
  this._socket.write(cmd);
};

Hci.prototype.readRssi = function (handle) {
  const cmd = Buffer.alloc(6);

  // header
  cmd.writeUInt8(HCI_COMMAND_PKT, 0);
  cmd.writeUInt16LE(READ_RSSI_CMD, 1);

  // length
  cmd.writeUInt8(0x02, 3);

  // data
  cmd.writeUInt16LE(handle, 4); // handle

  debug(`read rssi - writing: ${cmd.toString('hex')}`);
  this._socket.write(cmd);
};

Hci.prototype.writeAclDataPkt = async function (handle, cid, data) {
  const l2capLength = 4 /* l2cap header */ + data.length;

  const aclBuffers = await this.getAclBuffers();
  const aclLength = Math.min(l2capLength, aclBuffers.length);

  const minFirstLength = Math.max(aclLength + 5 /* acl header */, 9 /* prevent buffer overflow */);
  const first = Buffer.alloc(minFirstLength);

  // acl header
  first.writeUInt8(HCI_ACLDATA_PKT, 0);
  first.writeUInt16LE(handle | (ACL_START_NO_FLUSH << 12), 1);
  first.writeUInt16LE(aclLength, 3);

  // l2cap header
  first.writeUInt16LE(data.length, 5);
  first.writeUInt16LE(cid, 7);

  data.copy(first, 9);
  data = data.slice(first.length - 9);

  debug(`push to acl queue: ${first.toString('hex')}`);
  this._aclQueue.push({ handle, packet: first });

  while (data.length > 0) {
    const fragAclLength = Math.min(data.length, aclBuffers.length);
    const frag = Buffer.alloc(fragAclLength + 5 /* acl header */);
    // acl header
    frag.writeUInt8(HCI_ACLDATA_PKT, 0);
    frag.writeUInt16LE(handle | (ACL_CONT << 12), 1);
    frag.writeUInt16LE(fragAclLength, 3);

    data.copy(frag, 5);
    data = data.slice(frag.length - 5);

    debug(`push fragment to acl queue: ${frag.toString('hex')}`);
    this._aclQueue.push({ handle, packet: frag });
  }

  this.flushAcl();
};

Hci.prototype.flushAcl = async function () {
  const pendingPackets = () => {
    let totalPending = 0;
    for (const { pending } of this._aclConnections.values()) {
      totalPending += pending;
    }
    return totalPending;
  };

  debug(
    `flush - pending: ${pendingPackets()} queue length: ${
      this._aclQueue.length
    }`
  );

  const aclBuffers = await this.getAclBuffers();
  while (this._aclQueue.length > 0 && pendingPackets() < aclBuffers.num) {
    const { handle, packet } = this._aclQueue.shift();
    this._aclConnections.get(handle).pending++;
    debug(`write acl data packet - writing: ${packet.toString('hex')}`);
    this._socket.write(packet);
  }
};

Hci.prototype.onSocketData = function (data) {
  debug(`onSocketData: ${data.toString('hex')}`);

  const eventType = data.readUInt8(0);
  let handle;
  let cmd;
  let status;

  debug(`\tevent type = ${eventType}`);

  if (HCI_EVENT_PKT === eventType) {
    const subEventType = data.readUInt8(1);

    debug(`\tsub event type = ${subEventType}`);

    if (subEventType === EVT_DISCONN_COMPLETE) {
      handle = data.readUInt16LE(4);
      const reason = data.readUInt8(6);

      debug(`\t\thandle = ${handle}`);
      debug(`\t\treason = ${reason}`);

      this._aclQueue = this._aclQueue.filter((acl) => acl.handle !== handle);
      this._aclConnections.delete(handle);
      this.flushAcl();

      this.emit('disconnComplete', handle, reason);
    } else if (subEventType === EVT_ENCRYPT_CHANGE) {
      handle = data.readUInt16LE(4);
      const encrypt = data.readUInt8(6);

      debug(`\t\thandle = ${handle}`);
      debug(`\t\tencrypt = ${encrypt}`);

      this.emit('encryptChange', handle, encrypt);
    } else if (subEventType === EVT_CMD_COMPLETE) {
      cmd = data.readUInt16LE(4);
      status = data.readUInt8(6);
      const result = data.slice(7);

      debug(`\t\tcmd = ${cmd}`);
      debug(`\t\tstatus = ${status}`);
      debug(`\t\tresult = ${result.toString('hex')}`);

      this.processCmdCompleteEvent(cmd, status, result);
    } else if (subEventType === EVT_CMD_STATUS) {
      status = data.readUInt8(3);
      cmd = data.readUInt16LE(5);

      debug(`\t\tstatus = ${status}`);
      debug(`\t\tcmd = ${cmd}`);

      this.processCmdStatusEvent(cmd, status);
    } else if (subEventType === EVT_LE_META_EVENT) {
      const leMetaEventLength = data.readUInt8(2);
      const leMetaEventType = data.readUInt8(3);
      const leMetaEventNumReports = data.readUInt8(4);
      const leMetaEventData = data.slice(5);

      debug(`\t\tLE meta event type = ${leMetaEventType}`);
      debug(`\t\tLE meta event data length = ${leMetaEventLength}`);
      debug(`\t\tLE meta event num reports = ${leMetaEventNumReports}`);
      debug(`\t\tLE meta event data = ${leMetaEventData.toString('hex')}`);

      this.processLeMetaEvent(
        leMetaEventType,
        leMetaEventNumReports,
        leMetaEventData
      );
    } else if (subEventType === EVT_NUMBER_OF_COMPLETED_PACKETS) {
      const handles = data.readUInt8(3);
      for (let h = 0; h < handles; h++) {
        const handle = data.readUInt16LE(4 + h * 4);
        const pkts = data.readUInt16LE(6 + h * 4);
        debug(`\thandle = ${handle}`);
        debug(`\t\tcompleted = ${pkts}`);

        if (!this._aclConnections.has(handle)) {
          debug('\t\tclosed');
          continue;
        }

        const connection = this._aclConnections.get(handle);

        connection.pending -= pkts;

        if (connection.pending < 0) {
          connection.pending = 0;
        }
      }
      this.flushAcl();
    }
  } else if (HCI_ACLDATA_PKT === eventType) {
    const flags = data.readUInt16LE(1) >> 12;
    handle = data.readUInt16LE(1) & 0x0fff;

    if (ACL_START === flags) {
      const cid = data.readUInt16LE(7);

      const length = data.readUInt16LE(5);
      const pktData = data.slice(9);

      debug(`\t\tcid = ${cid}`);

      if (length === pktData.length) {
        debug(`\t\thandle = ${handle}`);
        debug(`\t\tdata = ${pktData.toString('hex')}`);

        this.emit('aclDataPkt', handle, cid, pktData);
      } else {
        this._handleBuffers[handle] = {
          length,
          cid,
          data: pktData
        };
      }
    } else if (ACL_CONT === flags) {
      if (!this._handleBuffers[handle] || !this._handleBuffers[handle].data) {
        return;
      }

      this._handleBuffers[handle].data = Buffer.concat([
        this._handleBuffers[handle].data,
        data.slice(5)
      ]);

      if (
        this._handleBuffers[handle].data.length ===
        this._handleBuffers[handle].length
      ) {
        this.emit(
          'aclDataPkt',
          handle,
          this._handleBuffers[handle].cid,
          this._handleBuffers[handle].data
        );

        delete this._handleBuffers[handle];
      }
    }
  } else if (HCI_COMMAND_PKT === eventType) {
    cmd = data.readUInt16LE(1);
    const len = data.readUInt8(3);

    debug(`\t\tcmd = ${cmd}`);
    debug(`\t\tdata len = ${len}`);

    if (
      cmd === LE_SET_SCAN_ENABLE_CMD ||
      cmd === LE_SET_EXTENDED_SCAN_ENABLE_CMD
    ) {
      const enable = data.readUInt8(4) === 0x1;
      const filterDuplicates = data.readUInt8(5) === 0x1;

      debug('\t\t\tLE enable scan command');
      debug(`\t\t\tenable scanning = ${enable}`);
      debug(`\t\t\tfilter duplicates = ${filterDuplicates}`);

      this.emit('leScanEnableSetCmd', enable, filterDuplicates);
    }
  }
};

Hci.prototype.onSocketError = function (error) {
  debug(`onSocketError: ${error.message}`);

  if (error.code === 'EPERM') {
    this.emit('stateChange', 'unauthorized');
  } else if (error.message === 'Network is down') {
    // no-op
  }
};

Hci.prototype.processCmdCompleteEvent = function (cmd, status, result) {
  if (cmd === RESET_CMD) {
    if (this._isExtended) {
      this.setCodedPhySupport();
    }
    this.setEventMask();
    this.setLeEventMask();
    this.readLocalVersion();
    this.readBdAddr();
  } else if (cmd === READ_LE_HOST_SUPPORTED_CMD) {
    if (status === 0) {
      const le = result.readUInt8(0);
      const simul = result.readUInt8(1);

      debug(`\t\t\tle = ${le}`);
      debug(`\t\t\tsimul = ${simul}`);
    }
  } else if (cmd === READ_LOCAL_VERSION_CMD) {
    const hciVer = result.readUInt8(0);
    const hciRev = result.readUInt16LE(1);
    const lmpVer = result.readInt8(3);
    const manufacturer = result.readUInt16LE(4);
    const lmpSubVer = result.readUInt16LE(6);

    if (hciVer < 0x06) {
      this.emit('stateChange', 'unsupported');
    } else if (this._state !== 'poweredOn') {
      this.setScanEnabled(false, true);
      this.setScanParameters();
    }

    this.emit(
      'readLocalVersion',
      hciVer,
      hciRev,
      lmpVer,
      manufacturer,
      lmpSubVer
    );
  } else if (cmd === READ_SUPPORTED_COMMANDS_CMD) {
    const extendedScanParameters = result.readUInt8(37) & 0x10; // LE Set Extended Scan Parameters (Octet 37 - Bit 5)
    const extendedScan = result.readUInt8(37) & 0x20; // LE Set Extended Scan Enable (Octet 37 - Bit 6)

    debug(
      `Extended advertising features: parameters = ${
        extendedScanParameters ? 'true' : 'false'
      }, num = ${extendedScan ? 'true' : 'false'}`
    );

    this._isExtended = extendedScanParameters && extendedScan;
  } else if (cmd === READ_BD_ADDR_CMD) {
    this.addressType = 'public';
    this.address = result
      .toString('hex')
      .match(/.{1,2}/g)
      .reverse()
      .join(':');

    debug(`address = ${this.address}`);

    this.emit('addressChange', this.address);
  } else if (
    cmd === LE_SET_SCAN_PARAMETERS_CMD ||
    cmd === LE_SET_EXTENDED_SCAN_PARAMETERS_CMD
  ) {
    this.emit('stateChange', 'poweredOn');

    this.emit('leScanParametersSet');
  } else if (
    cmd === LE_SET_SCAN_ENABLE_CMD ||
    cmd === LE_SET_EXTENDED_SCAN_ENABLE_CMD
  ) {
    this.emit('leScanEnableSet', status);
  } else if (cmd === READ_RSSI_CMD) {
    const handle = result.readUInt16LE(0);
    const rssi = result.readInt8(2);

    debug(`\t\t\thandle = ${handle}`);
    debug(`\t\t\trssi = ${rssi}`);

    this.emit('rssiRead', handle, rssi);
  } else if (cmd === LE_READ_BUFFER_SIZE_CMD) {
    if (status === 0) {
      const aclLength = result.readUInt16LE(0);
      const aclNum = result.readUInt8(2);

      /* Spec Vol 4 Part E.7.8
      /* No dedicated LE Buffer exists. Use the HCI_Read_Buffer_Size command. */
      if (aclLength === 0 || aclNum === 0) {
        debug('using br/edr buffer size');
        this.readBufferSize();
      } else {
        debug(`le buffer size: length = ${aclLength}, num = ${aclNum}`);
        this.setAclBuffers(aclLength, aclNum);
      }
    }
  } else if (cmd === READ_BUFFER_SIZE_CMD) {
    const aclLength = result.readUInt16LE(0);
    const aclNum = result.readUInt16LE(3);

    debug(`buffer size: length = ${aclLength}, num = ${aclNum}`);
    this.setAclBuffers(aclLength, aclNum);
  }
};

Hci.prototype.processLeMetaEvent = function (eventType, numReports, data) {
  if (eventType === EVT_LE_CONN_COMPLETE) {
    this.processLeConnComplete(numReports, data);
  } else if (eventType === EVT_LE_ENHANCED_CONN_COMPLETE) {
    this.processLeEnhancedConnComplete(numReports, data);
  } else if (eventType === EVT_LE_ADVERTISING_REPORT) {
    this.processLeAdvertisingReport(numReports, data);
  } else if (eventType === EVT_LE_EXTENDED_ADVERTISING_REPORT) {
    this.processLeExtendedAdvertisingReport(numReports, data);
  } else if (eventType === EVT_LE_CONN_UPDATE_COMPLETE) {
    this.processLeConnUpdateComplete(numReports, data);
  }
};

Hci.prototype.processLeConnComplete = function (status, data) {
  const handle = data.readUInt16LE(0);
  const role = data.readUInt8(2);
  const addressType = data.readUInt8(3) === 0x01 ? 'random' : 'public';
  const address = data
    .slice(4, 10)
    .toString('hex')
    .match(/.{1,2}/g)
    .reverse()
    .join(':');
  const interval = data.readUInt16LE(10) * 1.25;
  const latency = data.readUInt16LE(12); // TODO: multiplier?
  const supervisionTimeout = data.readUInt16LE(14) * 10;
  const masterClockAccuracy = data.readUInt8(16); // TODO: multiplier?

  debug(`\t\t\thandle = ${handle}`);
  debug(`\t\t\trole = ${role}`);
  debug(`\t\t\taddress type = ${addressType}`);
  debug(`\t\t\taddress = ${address}`);
  debug(`\t\t\tinterval = ${interval}`);
  debug(`\t\t\tlatency = ${latency}`);
  debug(`\t\t\tsupervision timeout = ${supervisionTimeout}`);
  debug(`\t\t\tmaster clock accuracy = ${masterClockAccuracy}`);

  this._aclConnections.set(handle, { pending: 0 });

  this.emit(
    'leConnComplete',
    status,
    handle,
    role,
    addressType,
    address,
    interval,
    latency,
    supervisionTimeout,
    masterClockAccuracy
  );
};

Hci.prototype.processLeEnhancedConnComplete = function (status, data) {
  const handle = data.readUInt16LE(0);
  const role = data.readUInt8(2);
  const addressType = data.readUInt8(3) === 0x01 ? 'random' : 'public';
  const address = data
    .slice(4, 10)
    .toString('hex')
    .match(/.{1,2}/g)
    .reverse()
    .join(':');
  const localResolvablePrivateAddress = data
    .slice(10, 16)
    .toString('hex')
    .match(/.{1,2}/g)
    .reverse()
    .join(':');
  const peerResolvablePrivateAddress = data
    .slice(16, 22)
    .toString('hex')
    .match(/.{1,2}/g)
    .reverse()
    .join(':');
  const interval = data.readUInt16LE(22) * 1.25;
  const latency = data.readUInt16LE(24); // TODO: multiplier?
  const supervisionTimeout = data.readUInt16LE(26) * 10;
  const masterClockAccuracy = data.readUInt8(28); // TODO: multiplier?

  debug(`\t\t\thandle = ${handle}`);
  debug(`\t\t\trole = ${role}`);
  debug(`\t\t\taddress type = ${addressType}`);
  debug(`\t\t\taddress = ${address}`);
  debug(
    `\t\t\tLocal resolvable private address = ${localResolvablePrivateAddress}`
  );
  debug(
    `\t\t\tPeer resolvable private address = ${peerResolvablePrivateAddress}`
  );
  debug(`\t\t\tinterval = ${interval}`);
  debug(`\t\t\tlatency = ${latency}`);
  debug(`\t\t\tsupervision timeout = ${supervisionTimeout}`);
  debug(`\t\t\tmaster clock accuracy = ${masterClockAccuracy}`);

  this._aclConnections.set(handle, { pending: 0 });

  this.emit(
    'leConnComplete',
    status,
    handle,
    role,
    addressType,
    address,
    interval,
    latency,
    supervisionTimeout,
    masterClockAccuracy
  );
};

Hci.prototype.processLeAdvertisingReport = function (numReports, data) {
  try {
    for (let i = 0; i < numReports; i++) {
      const type = data.readUInt8(0);
      const addressType = data.readUInt8(1) === 0x01 ? 'random' : 'public';
      const address = data
        .slice(2, 8)
        .toString('hex')
        .match(/.{1,2}/g)
        .reverse()
        .join(':');
      const eirLength = data.readUInt8(8);
      const eir = data.slice(9, eirLength + 9);
      const rssi = data.readInt8(eirLength + 9);

      debug(`\t\t\ttype = ${type}`);
      debug(`\t\t\taddress = ${address}`);
      debug(`\t\t\taddress type = ${addressType}`);
      debug(`\t\t\teir = ${eir.toString('hex')}`);
      debug(`\t\t\trssi = ${rssi}`);

      this.emit(
        'leAdvertisingReport',
        0,
        type,
        address,
        addressType,
        eir,
        rssi
      );

      data = data.slice(eirLength + 10);
    }
  } catch (e) {
    console.warn(
      `processLeAdvertisingReport: Caught illegal packet (buffer overflow): ${e}`
    );
  }
};

Hci.prototype.processLeExtendedAdvertisingReport = function (numReports, data) {
  try {
    for (let i = 0; i < numReports; i++) {
      const type = data.readUInt16LE(0);
      const addressType = data.readUInt8(2) === 0x01 ? 'random' : 'public';
      const address = data
        .slice(3, 9)
        .toString('hex')
        .match(/.{1,2}/g)
        .reverse()
        .join(':');
      const primaryPHY = data.readUInt8(9);
      const secondaryPHY = data.readUInt8(10);
      const sid = data.readUInt8(11);
      const txpower = data.readUInt8(12);
      const rssi = data.readInt8(13);
      const periodicAdvInterval = data.readUInt16LE(14);
      const directAddressType =
        data.readUInt8(16) === 0x01 ? 'random' : 'public';
      const directAddress = data
        .slice(17, 23)
        .toString('hex')
        .match(/.{1,2}/g)
        .reverse()
        .join(':');
      const eirLength = data.readUInt8(23);
      const eir = data.slice(24);

      debug(`\t\t\ttype = ${type}`);
      debug(`\t\t\taddress = ${address}`);
      debug(`\t\t\taddress type = ${addressType}`);
      debug(`\t\t\tprimary phy = ${primaryPHY.toString(16)}`);
      debug(`\t\t\tsecondary phy = ${secondaryPHY.toString(16)}`);
      debug(`\t\t\tSID = ${sid.toString(16)}`);
      debug(`\t\t\tTX power = ${txpower}`);
      debug(`\t\t\tRSSI = ${rssi}`);
      debug(
        `\t\t\tperiodic advertising interval = ${periodicAdvInterval} msec`
      );
      debug(`\t\t\tdirect address type = ${directAddressType}`);
      debug(`\t\t\tdirect address = ${directAddress}`);
      debug(`\t\t\teir length = ${eirLength}`);
      debug(`\t\t\teir = ${eir.toString('hex')}`);

      this.emit(
        'leExtendedAdvertisingReport',
        0,
        type,
        address,
        addressType,
        txpower,
        rssi,
        eir
      );

      data = data.slice(eirLength + 24);
    }
  } catch (e) {
    console.warn(
      `processLeExtendedAdvertisingReport: Caught illegal packet (buffer overflow): ${e}`
    );
  }
};

Hci.prototype.processLeConnUpdateComplete = function (status, data) {
  const handle = data.readUInt16LE(0);
  const interval = data.readUInt16LE(2) * 1.25;
  const latency = data.readUInt16LE(4); // TODO: multiplier?
  const supervisionTimeout = data.readUInt16LE(6) * 10;

  debug(`\t\t\thandle = ${handle}`);
  debug(`\t\t\tinterval = ${interval}`);
  debug(`\t\t\tlatency = ${latency}`);
  debug(`\t\t\tsupervision timeout = ${supervisionTimeout}`);

  this.emit(
    'leConnUpdateComplete',
    status,
    handle,
    interval,
    latency,
    supervisionTimeout
  );
};

Hci.prototype.processCmdStatusEvent = function (cmd, status) {
  if (cmd === LE_CREATE_CONN_CMD || cmd === LE_CREATE_EXTENDED_CONN_CMD) {
    if (status !== 0) {
      this.emit('leConnComplete', status);
    }
  }
};

Hci.prototype.onStateChange = function (state) {
  this._state = state;
};

module.exports = Hci;
