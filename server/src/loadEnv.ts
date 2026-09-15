import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import ws from 'ws';

// Polyfill native WebSocket for Node.js (< 22) runtime required by Supabase client
if (typeof (global as any).WebSocket === 'undefined') {
  (global as any).WebSocket = ws;
}

// Load environmental parameters from workspace root .env and fallback locations
const possibleEnvPaths = [
  path.resolve(__dirname, '../../.env'),       // Root from src/ or dist/
  path.resolve(__dirname, '../.env'),          // Server root
  path.resolve(process.cwd(), '.env'),         // Current working directory
  path.resolve(process.cwd(), '../../.env'),   // Parent directory of cwd
];

let loadedPath: string | null = null;
for (const envPath of possibleEnvPaths) {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    if (!loadedPath) loadedPath = envPath;
  }
}

console.log(`[Environment] Config loaded from: ${loadedPath || 'system environment'}`);
console.log(`[Environment] GEMINI_API_KEY present: ${Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim() !== '')}`);


