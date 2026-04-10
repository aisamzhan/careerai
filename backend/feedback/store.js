const fs = require('fs');
const path = require('path');

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function appendJsonl(filePath, entry) {
  const dir = path.dirname(filePath);
  ensureDir(dir);
  fs.appendFileSync(filePath, `${JSON.stringify(entry)}\n`, 'utf8');
}

module.exports = { appendJsonl };

