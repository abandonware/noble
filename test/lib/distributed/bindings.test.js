const proxyquire = require('proxyquire').noCallThru();
const should = require('should');
const sinon = require('sinon');
const { assert, fake } = sinon;

describe('Distributed bindings', () => {
  const wssOn = sinon.stub().resolves(null);

  const WebSocketServerStub = sinon.stub();
  WebSocketServerStub.prototype.on = wssOn;

  const Bindings = proxyquire('../../../lib/distributed/bindings', {
    ws: { Server: WebSocketServerStub }
  });

  let clock;

  beforeEach(() => {
    clock = sinon.useFakeTimers({ toFake: ['nextTick'] });
  });

  afterEach(() => {
    clock.restore();
    sinon.reset();
  });

  it('Constructor initialization', () => {
    const bindings = new Bindings();

    assert.calledOnce(WebSocketServerStub);
    assert.calledWith(WebSocketServerStub, {
      port: 0xB1e
    });

    assert.calledOnce(wssOn);
    assert.calledWith(wssOn, 'connection', sinon.match.typeOf('function'));

    should(bindings.eventNames()).eql(['close', 'message']);
  });

  it('Constructor stateChange event', () => {
    const stateChange = fake.resolves(null);

    const bindings = new Bindings();
    bindings.on('stateChange', stateChange);

    clock.tick(1);

    assert.calledOnce(stateChange);
    assert.calledWith(stateChange, 'poweredOff');
  });
});
