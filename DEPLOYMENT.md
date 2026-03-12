<!--
File Context: Documents DEPLOYMENT for the project.
Primary Functionality: Explains behavior, setup, or operational expectations for the referenced feature.
Interlinked With: src/lib/env.ts
Role: documentation.
-->
# Busy Notify - Deployment Guide

## Overview

This project includes PM2-compatible startup scripts that properly load environment variables from the `.env` file.

## Files

- **`.env`** - Environment configuration file
- **`ecosystem.config.js`** - PM2 ecosystem configuration
- **`start.sh`** - Production startup script (bash)
- **`src/lib/env.ts`** - Runtime environment configuration module

## Environment Variables

The `.env` file contains all environment variables needed by the application:

```env
# Application Settings
APP_NAME=busy-notify
APP_PORT=3000
NODE_ENV=production

# Database Configuration
DATABASE_URL=file:/home/z/my-project/db/custom.db
```

## PM2 Deployment

### Prerequisites

1. Install PM2 globally:
   ```bash
   npm install -g pm2
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

### Using the Startup Script

```bash
# Build and start the application
./start.sh build-start

# Or step by step:
./start.sh build   # Build the application
./start.sh start   # Start with PM2

# Other commands:
./start.sh stop     # Stop the application
./start.sh restart  # Restart the application
./start.sh logs     # View logs
./start.sh status   # Show PM2 status
./start.sh env      # Display loaded environment variables
```

### Using PM2 Directly

```bash
# Build the application
npm run build

# Start with PM2
pm2 start ecosystem.config.js

# Stop
pm2 stop ecosystem.config.js

# Restart
pm2 restart ecosystem.config.js

# View logs
pm2 logs busy-notify

# Save PM2 configuration (for auto-start on reboot)
pm2 save
pm2 startup
```

### Using NPM Scripts

```bash
# Build
npm run build

# Start with PM2
npm run start:pm2

# Stop
npm run stop:pm2

# Restart
npm run restart:pm2

# View logs
npm run logs:pm2
```

## Building with npm

The project is configured to use npm for building:

```bash
npm run build
```

This command:
1. Builds the Next.js application
2. Copies static files to the standalone directory
3. Copies public assets to the standalone directory

## Logs

Logs are stored in the `logs/` directory:

- `logs/out.log` - Standard output
- `logs/error.log` - Error output

View logs in real-time:
```bash
./start.sh logs
# or
pm2 logs busy-notify
```

## Environment Variable Access

### Server-Side

```typescript
import { serverEnv } from '@/lib/env';

console.log(serverEnv.appName);
console.log(serverEnv.databaseUrl);
```

### Client-Side

For client-side access, add `NEXT_PUBLIC_` prefix to variables in `.env`:

```env
NEXT_PUBLIC_APP_NAME=busy-notify
```

Then access them:

```typescript
import { clientEnv } from '@/lib/env';

console.log(clientEnv.appName);
```

## Troubleshooting

### Port Already in Use

If port 3000 is in use, change `APP_PORT` in `.env`:

```env
APP_PORT=3001
```

### Environment Variables Not Loading

1. Check that `.env` file exists in the project root
2. Verify the file format (no spaces around `=`)
3. Restart PM2: `./start.sh restart`

### Build Errors

1. Clear Next.js cache:
   ```bash
   rm -rf .next
   npm run build
   ```

2. Reinstall dependencies:
   ```bash
   rm -rf node_modules
   npm install
   npm run build
   ```

## Production Checklist

1. [ ] Update `.env` with production values
2. [ ] Run `npm run build`
3. [ ] Start with PM2: `./start.sh start`
4. [ ] Verify logs: `./start.sh logs`
5. [ ] Save PM2 config: `pm2 save`
6. [ ] Enable startup script: `pm2 startup`
