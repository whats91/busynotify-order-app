#!/usr/bin/env node
/**
 * Dev server script - reads APP_PORT from .env and runs next dev
 */
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function parseEnvFile(filePath) {
  const envVars = {};
  if (!fs.existsSync(filePath)) return envVars;
  const content = fs.readFileSync(filePath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq > 0) {
      const key = trimmed.substring(0, eq).trim();
      let value = trimmed.substring(eq + 1).trim();
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      envVars[key] = value;
    }
  }
  return envVars;
}

const envPath = path.join(__dirname, '..', '.env');
const env = parseEnvFile(envPath);
const port = env.APP_PORT || '3000';

console.log(`Starting dev server on port ${port} (from .env APP_PORT)\n`);

const child = spawn('npx', ['next', 'dev', '-p', port], {
  stdio: 'inherit',
  shell: true,
  cwd: path.join(__dirname, '..'),
  env: { ...process.env, ...env, PORT: port },
});

child.on('exit', (code) => process.exit(code ?? 0));
