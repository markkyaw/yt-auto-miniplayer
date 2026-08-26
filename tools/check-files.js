'use strict';

// Reads every path the manifest and the popup name. Reports a missing file.
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.json')));
const wanted = [];

function add(value) {
  if (typeof value === 'string') wanted.push(value);
  else if (Array.isArray(value)) value.forEach(add);
  else if (value) Object.values(value).forEach(add);
}

add(manifest.icons);
add(manifest.action && manifest.action.default_icon);
add(manifest.action && manifest.action.default_popup);
(manifest.content_scripts || []).forEach((entry) => add(entry.js));

// The popup page loads its own scripts.
const popup = manifest.action && manifest.action.default_popup;
if (popup) {
  const html = fs.readFileSync(path.join(root, popup), 'utf8');
  const pattern = /<script src="([^"]+)"/g;
  let found = pattern.exec(html);
  while (found) {
    wanted.push(found[1]);
    found = pattern.exec(html);
  }
}

const missing = wanted.filter((file) => !fs.existsSync(path.join(root, file)));
if (missing.length) {
  console.error('missing files:\n  ' + missing.join('\n  '));
  process.exit(1);
}
console.log('checked ' + wanted.length + ' files. None is missing.');
