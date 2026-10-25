import path from 'node:path';
import { loadFileSnapshot } from '../dist/storage/import-files.js';
import { SqliteAdapter } from '../dist/storage/sqlite-adapter.js';

const args = process.argv.slice(2);
const allowed = new Set(['--source', '--database', '--apply']);
for (let i = 0; i < args.length; i++) {
  if (!allowed.has(args[i])) throw new Error('Usage: --source <JSON-directory> --database <file.sqlite> [--apply]');
  if (args[i] !== '--apply') {
    if (!args[i + 1] || args[i + 1].startsWith('--')) throw new Error('Missing value for ' + args[i]);
    i++;
  }
}
const value = flag => args[args.indexOf(flag) + 1];
if (!args.includes('--source') || !args.includes('--database') || !value('--source') || !value('--database')) throw new Error('Both --source and --database are required');
const source = path.resolve(value('--source'));
const destination = path.resolve(value('--database'));
if (!destination.endsWith('.sqlite')) throw new Error('Destination must end with .sqlite');
const snapshot = await loadFileSnapshot(source);
console.log(JSON.stringify({ mode: args.includes('--apply') ? 'import' : 'dry-run', source, destination, records: Object.fromEntries(Object.entries(snapshot).map(([name, rows]) => [name, rows.length])) }, null, 2));
if (args.includes('--apply')) {
  const database = new SqliteAdapter(destination);
  try { database.importSnapshot(snapshot); console.log('Import committed. Source JSON files were not modified.'); }
  finally { database.close(); }
} else console.log('Nothing written. Stop the app and add --apply to import into an empty database.');
