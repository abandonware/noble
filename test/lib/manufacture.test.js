const should = require('should');
const proxyquire = require('proxyquire').noCallThru();

const decValues = {
  135: 'DEC name'
};

const hexValues = {
  135: 'HEX name'
};

const Manufacture = proxyquire('../../lib/manufacture', {
  './manufactures-dec.json': decValues,
  './manufactures-hex.json': hexValues
});

describe('manufacture', () => {
  it('should have only data, no name', () => {
    const noble = 'fake_noble';
    const data = 'not_a_json';
    const manufacture = new Manufacture(noble, data);

    should(manufacture._noble).eql(noble);
    should(manufacture.data).eql(data);
    should(manufacture.name).eql(null);

    should(manufacture.toString()).eql('{"name":null,"data":"not_a_json"}');
  });

  it('should have data and name', () => {
    const noble = 'fake_noble';
    const data = Buffer.from([0x87, 0x00, 0x0d, 0x9c], 'hex');
    const manufacture = new Manufacture(noble, data);

    should(manufacture._noble).eql(noble);
    should(manufacture.data).eql(data);
    should(manufacture.name).eql('DEC name');

    should(manufacture.toString()).eql(
      '{"name":"DEC name","data":{"type":"Buffer","data":[135,0,13,156]}}'
    );
  });

  it('should have no array data', () => {
    const noble = 'fake_noble';
    const data = '{type: "not an array"}';
    const manufacture = new Manufacture(noble, data);

    should(manufacture._noble).eql(noble);
    should(manufacture.data).eql(data);
    should(manufacture.name).eql(null);

    should(manufacture.toString()).eql(
      '{"name":null,"data":"{type: \\"not an array\\"}"}'
    );
  });

  it('get existing name from HEX', () => {
    const name = Manufacture.nameFromHex(135);
    should(name).eql('HEX name');
  });

  it('get unknown name from HEX', () => {
    const name = Manufacture.nameFromHex(1);
    should(name).eql(undefined);
  });

  it('get existing name from DEC', () => {
    const name = Manufacture.nameFromDec(135);
    should(name).eql('DEC name');
  });

  it('get unknown name from DEC', () => {
    const name = Manufacture.nameFromDec(1);
    should(name).eql(undefined);
  });
});
