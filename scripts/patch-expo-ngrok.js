/**
 * After `npm install`, prefer the project's `@expo/ngrok` over a global install.
 * Global @expo/ngrok often breaks tunnel on Windows with:
 *   TypeError: Cannot read properties of undefined (reading 'body')
 * @see https://github.com/expo/expo/issues/43335
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');

const candidates = [
  path.join(root, 'node_modules', 'expo', 'node_modules', '@expo', 'cli', 'build', 'src', 'start', 'server', 'AsyncNgrok.js'),
  path.join(root, 'node_modules', '@expo', 'cli', 'build', 'src', 'start', 'server', 'AsyncNgrok.js'),
];

const marker = 'prefersGlobalInstall: true';
const replacement = 'prefersGlobalInstall: false';

for (const filePath of candidates) {
  if (!fs.existsSync(filePath)) continue;
  let s = fs.readFileSync(filePath, 'utf8');
  if (!s.includes(marker)) continue;
  s = s.replace(marker, replacement);
  fs.writeFileSync(filePath, s);
  process.stdout.write(`[patch-expo-ngrok] Updated ${path.relative(root, filePath)}\n`);
  process.exit(0);
}

process.exit(0);
