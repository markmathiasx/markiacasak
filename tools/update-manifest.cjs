'use strict';
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const ROOT = path.resolve(__dirname, '..');
const excluded = new Set(['MANIFEST.json', 'VALIDATION-V8.json']);
const files = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard', '-z'], { cwd: ROOT })
  .toString('utf8')
  .split('\0')
  .filter(relative => relative && !excluded.has(relative))
  .sort((left, right) => left.localeCompare(right))
  .map(relative => {
    const contents = fs.readFileSync(path.join(ROOT, relative));
    return {
      path: relative.replaceAll(path.sep, '/'),
      bytes: contents.length,
      sha256: crypto.createHash('sha256').update(contents).digest('hex'),
    };
  });

fs.writeFileSync(
  path.join(ROOT, 'MANIFEST.json'),
  JSON.stringify({ version: '8.9.0', files }, null, 2) + '\n',
  'utf8',
);
console.log(`MANIFEST.json atualizado com ${files.length} arquivos.`);
