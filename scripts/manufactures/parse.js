const path = require('path');
const parser = require('csv-parser');
const fs = require('fs');

const CSV_PATH = path.join(process.cwd(), 'scripts', 'manufactures', 'data.csv');
const HEX_OUT_PATH = path.join(process.cwd(), 'lib', 'manufactures-hex.json');
const DEC_OUT_PATH = path.join(process.cwd(), 'lib', 'manufactures-dec.json');
const README_PATH = path.join(process.cwd(), 'scripts', 'manufactures', 'README.md');

const escape = str => {
  return str
    .replace(/[\\]/g, '\\\\')
    .replace(/["]/g, '\\"')
    .replace(/[/]/g, '\\/')
    .replace(/[\b]/g, '\\b')
    .replace(/[\f]/g, '\\f')
    .replace(/[\n]/g, '\\n')
    .replace(/[\r]/g, '\\r')
    .replace(/[\t]/g, '\\t');
};

const hexResults = {};
const decResults = {};

fs.createReadStream(CSV_PATH)
  .pipe(parser())
  .on('data', data => {
    hexResults[data.Hexadecimal] = escape(data.Company);
    decResults[data.Decimal] = escape(data.Company);
  })
  .on('end', () => {
    try {
      fs.writeFileSync(HEX_OUT_PATH, JSON.stringify(hexResults, null, '\t'), { encoding: 'utf-8' });
      fs.writeFileSync(DEC_OUT_PATH, JSON.stringify(decResults, null, '\t'), { encoding: 'utf-8' });
      fs.writeFileSync(README_PATH, ['#Manufactures', '', 'from: https://www.bluetooth.com/specifications/assigned-numbers/company-identifiers/', '', `last update: ${new Date().toISOString()}`].join('\n'));
    } catch (e) {
      console.error(e);
    }
  });
