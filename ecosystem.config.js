/*
 * File Context:
 * Purpose: Defines the project file for Ecosystem.Config.
 * Primary Functionality: Provides file-specific behavior or configuration for the surrounding project module.
 * Interlinked With: No direct internal imports; primarily used by framework or toolchain entry points.
 * Role: developer tooling.
 */
/**
 * PM2 Ecosystem Configuration for Busy Notify
 * 
 * This configuration file handles:
 * - Loading environment variables from .env file
 * - Setting up the application for PM2 management
 * - Configuring logging and process management
 * 
 * Usage:
 *   pm2 start ecosystem.config.js   # Start the application
 *   pm2 stop ecosystem.config.js    # Stop the application
 *   pm2 restart ecosystem.config.js # Restart the application
 *   pm2 logs busy-notify            # View logs
 */

/* eslint-disable @typescript-eslint/no-require-imports */

const fs = require('fs');
const path = require('path');

/**
 * Parse .env file and return an object with all environment variables
 * This ensures all variables are loaded, not just NEXT_PUBLIC_ prefixed ones
 */
function parseEnvFile(filePath) {
  const envVars = {};
  
  if (!fs.existsSync(filePath)) {
    console.warn(`Warning: .env file not found at ${filePath}`);
    return envVars;
  }
  
  const content = fs.readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  
  for (const line of lines) {
    // Skip empty lines and comments
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }
    
    // Parse KEY=VALUE format
    const equalIndex = trimmedLine.indexOf('=');
    if (equalIndex > 0) {
      const key = trimmedLine.substring(0, equalIndex).trim();
      let value = trimmedLine.substring(equalIndex + 1).trim();
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) ||
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      envVars[key] = value;
    }
  }
  
  return envVars;
}

// Load environment variables from .env file
const envPath = path.join(__dirname, '.env');
const envVars = parseEnvFile(envPath);

// Set default values
const appName = envVars.APP_NAME || 'busy-notify';
const appPort = parseInt(envVars.APP_PORT || '3000', 10);
const nodeEnv = envVars.NODE_ENV || 'production';

console.log(`\n========================================`);
console.log(`Busy Notify - PM2 Configuration`);
console.log(`========================================`);
console.log(`App Name: ${appName}`);
console.log(`Port: ${appPort}`);
console.log(`Environment: ${nodeEnv}`);
console.log(`Loaded ${Object.keys(envVars).length} environment variables`);
console.log(`========================================\n`);

module.exports = {
  apps: [
    {
      name: appName,
      script: path.join('scripts', 'start-with-env.js'),
      cwd: __dirname,
      
      // Environment variables from .env file
      env: {
        ...envVars,
        NODE_ENV: nodeEnv,
        PORT: appPort,
        PROJECT_ROOT: __dirname,
      },
      
      // Production-specific overrides
      env_production: {
        ...envVars,
        NODE_ENV: 'production',
        PORT: appPort,
        PROJECT_ROOT: __dirname,
      },
      
      // Process management
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      
      // Graceful shutdown
      kill_timeout: 5000,
      wait_ready: true,
      listen_timeout: 10000,
      
      // Restart on crash
      restart_delay: 1000,
      max_restarts: 10,
      min_uptime: '10s',
    }
  ]
};
