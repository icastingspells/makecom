import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';

const serverRoot = fileURLToPath(new URL('..', import.meta.url));
const output = path.resolve(serverRoot, 'dist');
if (path.dirname(output) !== path.resolve(serverRoot) || path.basename(output) !== 'dist') throw new Error('Invalid build output directory');
// Rebuildable output only. Source files, environment and user data are never removed.
fs.rmSync(output, { recursive: true, force: true });
const require = createRequire(import.meta.url);
execFileSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', path.join(serverRoot, 'tsconfig.json')], { stdio: 'inherit' });
