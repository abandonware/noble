const should = require('should');
const proxyquire = require('proxyquire').noCallThru();
const { EventEmitter } = require('events');

let chosenPlatform;
let chosenRelease;
const platform = () => chosenPlatform;
const release = () => chosenRelease;

class NobleMac {}

class NobleWinrt {}

const NobleMacImport = proxyquire('../../lib/mac/bindings', {
  'node-gyp-build': () => ({ NobleMac })
});

const NobleWinrtImport = proxyquire('../../lib/win/bindings', {
  'node-gyp-build': () => ({ NobleWinrt })
});

const WebSocket = require('../../lib/websocket/bindings');
const NobleBindings = proxyquire('../../lib/distributed/bindings', {
  ws: { Server: EventEmitter }
});
const HciNobleBindings = proxyquire('../../lib/hci-socket/bindings', {
  './hci': EventEmitter
});
const resolver = proxyquire('../../lib/resolve-bindings', {
  './distributed/bindings': NobleBindings,
  './hci-socket/bindings': HciNobleBindings,
  './mac/bindings': NobleMacImport,
  './win/bindings': NobleWinrtImport,
  os: { platform, release }
});

describe('resolve-bindings', () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    // Clone initial environment
    process.env = Object.assign({}, OLD_ENV);
  });

  afterEach(() => {
    // Restore initial environment
    process.env = OLD_ENV;
  });

  it('web socket', () => {
    process.env.NOBLE_WEBSOCKET = true;

    const bindings = resolver({});
    should(bindings).instanceof(WebSocket);
  });

  it('distributed', () => {
    process.env.NOBLE_DISTRIBUTED = true;

    const bindings = resolver({});
    should(bindings).instanceof(NobleBindings);
  });

  it('mac', () => {
    chosenPlatform = 'darwin';

    const bindings = resolver({});
    should(bindings).instanceof(NobleMac);
  });

  it('linux', () => {
    chosenPlatform = 'linux';

    const bindings = resolver({});
    should(bindings).instanceof(HciNobleBindings);
  });

  it('freebsd', () => {
    chosenPlatform = 'freebsd';

    const bindings = resolver({});
    should(bindings).instanceof(HciNobleBindings);
  });

  it('win32', () => {
    chosenPlatform = 'win32';
    chosenRelease = '10.0.22000';

    const bindings = resolver({});
    should(bindings).instanceof(NobleWinrt);
  });

  it('unknwon', () => {
    chosenPlatform = 'unknwon';

    try {
      resolver({});
    } catch (e) {
      should(e).have.property('message', 'Unsupported platform');
    }
  });
});
