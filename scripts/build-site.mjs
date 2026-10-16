// Keeps the landing page on the app's real character code (single source of truth: src/shared).
// Run after changing src/shared/*.js:  npm run site:sync
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = ['mascot.js', 'sound.js', 'characters.js'];
fs.mkdirSync(path.join(root, 'site/assets/js'), { recursive: true });
for (const f of files) {
  fs.copyFileSync(path.join(root, 'src/shared', f), path.join(root, 'site/assets/js', f));
  console.log('synced', f);
}
