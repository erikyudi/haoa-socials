// Launcher: carrega .env, injeta no process.env, depois sobe o servidor.
// Use este arquivo em vez de `node mazyui-server.mjs` diretamente.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));

function loadEnv() {
  const envPath = path.join(ROOT, '.env');
  try {
    const text = fs.readFileSync(envPath, 'utf8');
    for (const line of text.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
      if (key && !(key in process.env)) {
        process.env[key] = val;
      }
    }
  } catch {
    // .env ausente — ok, variáveis de sistema já estão no process.env
  }
}

loadEnv();
await import('./mazyui-server.mjs');
