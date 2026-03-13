#!/usr/bin/env node
/*
 * File Context:
 * Purpose: Automates Deploy tasks for local development or deployment.
 * Primary Functionality: Executes operational tasks directly from the command line for developers or deploy hooks.
 * Interlinked With: Invoked from package scripts, deploy hooks, or local developer workflows.
 * Role: developer tooling.
 */
/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Deploy script for demo.busynotify.in
 * Uses spawn with isolated environment and syncs the repo to production
 * Preserves local .env and database files during deployment
 */

const { spawn, execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const https = require("https");

// Get project root
const PROJECT_ROOT = path.join(__dirname, '..');

// Load .env file at the very beginning
function loadEnvFile() {
  const possiblePaths = [
    path.join(PROJECT_ROOT, '.env'),
    path.join(process.cwd(), '.env'),
  ];
  
  for (const envPath of possiblePaths) {
    if (fs.existsSync(envPath)) {
      console.log(`[deploy] Loading .env from: ${envPath}`);
      const envContent = fs.readFileSync(envPath, "utf-8");
      envContent.split("\n").forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const [key, ...valueParts] = trimmed.split('=');
          if (key && valueParts.length > 0) {
            const value = valueParts.join('=').trim().replace(/^["']|["']$/g, '');
            // Always override with .env values
            process.env[key.trim()] = value;
          }
        }
      });
      console.log(`[deploy] Loaded env vars, BOT_MASTER_AUTH_TOKEN=${process.env.BOT_MASTER_AUTH_TOKEN ? 'SET' : 'NOT SET'}`);
      return;
    }
  }
  console.log("[deploy] Warning: .env file not found");
}

// Load env before config
loadEnvFile();

// ====== CONFIG ======
const CONFIG = {
  projectName: process.env.DEPLOY_PROJECT_NAME || "Busy Notify Order App",
  domain: process.env.DEPLOY_DOMAIN || "demo.busynotify.in",
  projectPath: process.env.DEPLOY_PROJECT_PATH || PROJECT_ROOT,
  tempPath: process.env.DEPLOY_TEMP_PATH || path.join(PROJECT_ROOT, ".deploy-tmp"),
  repoUrl: process.env.DEPLOY_REPO_URL || "https://github.com/whats91/busynotify-order-app.git",
  branch: process.env.DEPLOY_BRANCH || "main",
  delayMs: Number(process.env.DEPLOY_DELAY_MS || 3000),
  pm2RestartCmd:
    process.env.DEPLOY_PM2_CMD || "pm2 startOrRestart ecosystem.config.js --env production --update-env",
  pm2StopCmd:
    process.env.DEPLOY_PM2_STOP_CMD || "pm2 stop ecosystem.config.js --env production",
  lockFile: process.env.DEPLOY_LOCK_FILE || path.join(PROJECT_ROOT, ".deploy.lock"),
  webhookLogPath:
    process.env.DEPLOY_WEBHOOK_LOG_PATH || path.join(PROJECT_ROOT, "logs", "deploy-webhook.log"),
  github: {
    token:
      process.env.DEPLOY_GITHUB_TOKEN ||
      process.env.GITHUB_FINE_GRAINED_TOKEN ||
      process.env.GITHUB_TOKEN ||
      "",
    username: process.env.DEPLOY_GITHUB_USERNAME || "x-access-token",
  },

  // Bot Master Sender API config for notifications
  botMaster: {
    apiUrl: process.env.BOT_MASTER_API_URL || "https://api.botmastersender.com/api/v1/?action=send",
    senderId: process.env.BOT_MASTER_SENDER_ID || "919425004029",
    receiverId: process.env.BOT_MASTER_RECEIVER_ID || "917000782082",
    authToken: process.env.BOT_MASTER_AUTH_TOKEN || "",
  },
  syncExcludes: [
    ".git",
    ".next",
    "node_modules",
    ".env",
    "public/theme",
    "data",
    "db",
    "logs",
    ".deploy-tmp",
    ".deploy.lock",
  ],
  databaseFileSuffixes: [
    ".sqlite",
    ".sqlite-shm",
    ".sqlite-wal",
    ".sqlite3",
    ".db",
    ".db-shm",
    ".db-wal",
  ],
};

// ====== Logging ======
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
  magenta: "\x1b[35m",
};

function log(message, color = "reset") {
  const ts = new Date().toISOString();
  console.log(`${colors[color]}[${ts}] [deploy] ${message}${colors.reset}`);
}

function logSection(title) {
  console.log("");
  log("═".repeat(60), "bright");
  log(`  ${title}`, "bright");
  log("═".repeat(60), "bright");
  console.log("");
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getRepoOrigin(repoUrl) {
  try {
    const url = new URL(repoUrl);
    return `${url.protocol}//${url.host}/`;
  } catch {
    return null;
  }
}

function buildGitAuthEnv() {
  if (!CONFIG.github.token) {
    return {};
  }

  const repoOrigin = getRepoOrigin(CONFIG.repoUrl);
  if (!repoOrigin) {
    throw new Error(`Invalid DEPLOY_REPO_URL: ${CONFIG.repoUrl}`);
  }

  const authValue = Buffer.from(
    `${CONFIG.github.username}:${CONFIG.github.token}`,
    "utf-8"
  ).toString("base64");

  return {
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: `http.${repoOrigin}.extraheader`,
    GIT_CONFIG_VALUE_0: `AUTHORIZATION: Basic ${authValue}`,
  };
}

/**
 * Deployment lock functions to prevent concurrent deployments
 */
function acquireLock() {
  if (fs.existsSync(CONFIG.lockFile)) {
    const lockData = JSON.parse(fs.readFileSync(CONFIG.lockFile, 'utf-8'));
    const lockAge = Date.now() - new Date(lockData.timestamp).getTime();
    
    // If lock is older than 30 minutes, it's stale - remove it
    if (lockAge > 30 * 60 * 1000) {
      log("Found stale lock file (older than 30 min), removing...", "yellow");
      fs.unlinkSync(CONFIG.lockFile);
    } else {
      return false;
    }
  }
  
  // Create lock file
  fs.writeFileSync(CONFIG.lockFile, JSON.stringify({
    pid: process.pid,
    timestamp: new Date().toISOString(),
  }));
  log(`Lock acquired: ${CONFIG.lockFile}`, "green");
  return true;
}

function releaseLock() {
  if (fs.existsSync(CONFIG.lockFile)) {
    fs.unlinkSync(CONFIG.lockFile);
    log("Lock released", "green");
  }
}

/**
 * Run a command with CLEAN environment
 */
function runCommand(command, args, cwd, options = {}) {
  return new Promise((resolve, reject) => {
    const displayArgs = options.displayArgs || args;
    log(`Running: ${command} ${displayArgs.join(" ")}`, "cyan");
    log(`  CWD: ${cwd}`, "magenta");
    
    const cleanEnv = {
      HOME: process.env.HOME || "/home/whats91-chat",
      USER: process.env.USER || "whats91-chat",
      PATH: process.env.PATH,
      NODE_PATH: process.env.NODE_PATH,
      NVM_DIR: process.env.NVM_DIR,
      ...options.extraEnv,
    };
    
    log(`  PATH: ${cleanEnv.PATH?.substring(0, 100)}...`, "magenta");
    
    const child = spawn(command, args, {
      cwd,
      stdio: "inherit",
      env: cleanEnv,
      shell: true,
    });
    
    child.on("error", (error) => {
      log(`Process error: ${error.message}`, "red");
      reject(error);
    });
    
    child.on("exit", (code, signal) => {
      if (code === 0) {
        resolve({ code, signal });
      } else {
        const error = new Error(`Command failed with code ${code}, signal ${signal}`);
        error.code = code;
        reject(error);
      }
    });
  });
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    log(`Created directory: ${dir}`, "yellow");
  }
}

function normalizeRelativePath(relPath) {
  return relPath.split(path.sep).join("/");
}

function shouldExcludePath(relPath, stats) {
  const normalized = normalizeRelativePath(relPath);

  if (!normalized || normalized === ".") {
    return false;
  }

  const baseName = path.basename(normalized);

  if (CONFIG.syncExcludes.includes(normalized) || CONFIG.syncExcludes.includes(baseName)) {
    return true;
  }

  if (stats.isFile()) {
    return CONFIG.databaseFileSuffixes.some((suffix) => baseName.endsWith(suffix));
  }

  return false;
}

function removePath(targetPath, relPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
  log(`Removed stale path: ${normalizeRelativePath(relPath)}`, "yellow");
}

function syncDirectory(srcDir, destDir, relPath = "") {
  const sourceStats = fs.statSync(srcDir);

  if (shouldExcludePath(relPath, sourceStats)) {
    log(`Preserved excluded path: ${normalizeRelativePath(relPath)}`, "cyan");
    return;
  }

  ensureDir(destDir);

  const srcEntries = new Map(
    fs.readdirSync(srcDir, { withFileTypes: true }).map((entry) => [entry.name, entry])
  );
  const destEntries = fs.existsSync(destDir)
    ? fs.readdirSync(destDir, { withFileTypes: true })
    : [];

  for (const destEntry of destEntries) {
    const nextRelPath = relPath ? path.join(relPath, destEntry.name) : destEntry.name;
    const destEntryPath = path.join(destDir, destEntry.name);
    const destStats = fs.lstatSync(destEntryPath);

    if (shouldExcludePath(nextRelPath, destStats)) {
      continue;
    }

    if (!srcEntries.has(destEntry.name)) {
      removePath(destEntryPath, nextRelPath);
    }
  }

  for (const [name, srcEntry] of srcEntries) {
    const sourcePath = path.join(srcDir, name);
    const destinationPath = path.join(destDir, name);
    const nextRelPath = relPath ? path.join(relPath, name) : name;
    const sourceStats = fs.lstatSync(sourcePath);

    if (shouldExcludePath(nextRelPath, sourceStats)) {
      log(`Preserved excluded path: ${normalizeRelativePath(nextRelPath)}`, "cyan");
      continue;
    }

    if (sourceStats.isDirectory()) {
      syncDirectory(sourcePath, destinationPath, nextRelPath);
      continue;
    }

    if (sourceStats.isSymbolicLink()) {
      if (fs.existsSync(destinationPath)) {
        fs.rmSync(destinationPath, { recursive: true, force: true });
      }

      const linkTarget = fs.readlinkSync(sourcePath);
      fs.symlinkSync(linkTarget, destinationPath);
      log(`Synced symlink: ${normalizeRelativePath(nextRelPath)}`, "green");
      continue;
    }

    ensureDir(path.dirname(destinationPath));
    fs.copyFileSync(sourcePath, destinationPath);
    log(`Synced file: ${normalizeRelativePath(nextRelPath)}`, "green");
  }
}

const legacyPersistentPaths = [
  {
    label: "SQLite data",
    sourceDir: path.join(CONFIG.projectPath, ".next", "standalone", "data"),
    targetDir: path.join(CONFIG.projectPath, "data"),
  },
  {
    label: "theme assets",
    sourceDir: path.join(CONFIG.projectPath, ".next", "standalone", "public", "theme"),
    targetDir: path.join(CONFIG.projectPath, "public", "theme"),
  },
];

function hasLegacyPersistentStorage() {
  return legacyPersistentPaths.some(({ sourceDir }) => fs.existsSync(sourceDir));
}

function shouldCopyPersistentFile(sourcePath, targetPath) {
  if (!fs.existsSync(targetPath)) {
    return true;
  }

  const sourceStats = fs.statSync(sourcePath);
  const targetStats = fs.statSync(targetPath);

  return sourceStats.size !== targetStats.size || sourceStats.mtimeMs > targetStats.mtimeMs;
}

function copyPersistentDirectory(sourceDir, targetDir) {
  let copiedFiles = 0;

  if (!fs.existsSync(sourceDir)) {
    return copiedFiles;
  }

  ensureDir(targetDir);

  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (entry.isDirectory()) {
      copiedFiles += copyPersistentDirectory(sourcePath, targetPath);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    ensureDir(path.dirname(targetPath));

    if (shouldCopyPersistentFile(sourcePath, targetPath)) {
      fs.copyFileSync(sourcePath, targetPath);
      copiedFiles += 1;
      log(`Migrated persistent file: ${path.relative(CONFIG.projectPath, targetPath)}`, "green");
    }
  }

  return copiedFiles;
}

async function stopPm2ForLegacyMigration() {
  try {
    await runCommand(CONFIG.pm2StopCmd, [], CONFIG.projectPath);
    log("Stopped PM2 app before migrating legacy persistent storage", "yellow");
  } catch (error) {
    log(`PM2 stop skipped: ${error.message}`, "yellow");
  }
}

function migrateLegacyPersistentStorage() {
  let copiedFiles = 0;

  for (const { label, sourceDir, targetDir } of legacyPersistentPaths) {
    if (!fs.existsSync(sourceDir)) {
      log(`No legacy ${label} found at ${path.relative(CONFIG.projectPath, sourceDir)}`, "cyan");
      continue;
    }

    log(`Migrating legacy ${label} from ${path.relative(CONFIG.projectPath, sourceDir)}`, "yellow");
    copiedFiles += copyPersistentDirectory(sourceDir, targetDir);
  }

  return copiedFiles;
}

function removeSensitiveFilesFromBuildOutput() {
  const standalonePath = path.join(CONFIG.projectPath, ".next", "standalone");

  if (!fs.existsSync(standalonePath)) {
    return 0;
  }

  const removedPaths = [];

  for (const entry of fs.readdirSync(standalonePath)) {
    if (!entry.startsWith(".env")) {
      continue;
    }

    const targetPath = path.join(standalonePath, entry);
    fs.rmSync(targetPath, { recursive: true, force: true });
    removedPaths.push(path.relative(CONFIG.projectPath, targetPath));
  }

  for (const removedPath of removedPaths) {
    log(`Removed non-build artifact from standalone output: ${removedPath}`, "yellow");
  }

  return removedPaths.length;
}

function clearCacheFolders() {
  log("Clearing all cache folders...", "yellow");
  
  const cachePaths = [
    ".next",
    "node_modules/.cache",
    "node_modules/.prisma",
    "node_modules/@prisma/client",
  ];

  for (const relPath of cachePaths) {
    const fullPath = path.join(CONFIG.projectPath, relPath);
    if (fs.existsSync(fullPath)) {
      fs.rmSync(fullPath, { recursive: true, force: true });
      log(`Cleared: ${relPath}`, "green");
    } else {
      log(`Not found (skip): ${relPath}`, "cyan");
    }
  }
}

/**
 * Read version from version.txt
 */
function getVersion() {
  try {
    const versionPath = path.join(CONFIG.projectPath, "version.txt");
    if (fs.existsSync(versionPath)) {
      return fs.readFileSync(versionPath, "utf-8").trim();
    }
  } catch (err) {
    log(`Could not read version.txt: ${err.message}`, "yellow");
  }
  return "?.?.?";
}

/**
 * Get current git commit info from temp folder
 */
function getGitInfo() {
  try {
    const commitHash = execSync(`git -C "${CONFIG.tempPath}" rev-parse --short HEAD`, { encoding: "utf-8" }).trim();
    const commitMsg = execSync(`git -C "${CONFIG.tempPath}" log -1 --pretty=%s`, { encoding: "utf-8" }).trim();
    return { hash: commitHash, message: commitMsg };
  } catch (err) {
    return { hash: "unknown", message: "unknown" };
  }
}

/**
 * Send WhatsApp notification via Bot Master Sender API
 */
async function sendDeploymentNotification(status, data) {
  const { botMaster } = CONFIG;
  
  const tokenStatus = botMaster.authToken ? `set (${botMaster.authToken.substring(0, 8)}...)` : 'NOT SET';
  log(`Bot Master config: senderId=${botMaster.senderId}, receiverId=${botMaster.receiverId}, authToken=${tokenStatus}`, "cyan");
  
  if (!botMaster.authToken) {
    log("Bot Master auth token not configured, skipping notification", "yellow");
    return;
  }

  const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const version = getVersion();
  const gitInfo = getGitInfo();
  
  let messageText;
  
  if (status === "success") {
    messageText = `✅ *Deployment Successful*

🚀 *${CONFIG.domain}* deployed successfully!
━━━━━━━━━━━━━━━━━━━━
📦 *Version:* v${version}
🔗 *Commit:* \`${gitInfo.hash}\`
📝 *Message:* ${gitInfo.message}
⏱️ *Duration:* ${data.duration}s
━━━━━━━━━━━━━━━━━━━━

📅 *Deployed:* ${timestamp}
🌐 *Branch:* ${CONFIG.branch}`;
  } else {
    messageText = `❌ *Deployment Failed*

⚠️ *${CONFIG.domain}* deployment encountered an error!
━━━━━━━━━━━━━━━━━━━━
📦 *Version:* v${version}
🔗 *Commit:* \`${gitInfo.hash}\`
📝 *Message:* ${gitInfo.message}
━━━━━━━━━━━━━━━━━━━━

🔴 *Error:*
\`\`\`
${data.error.substring(0, 500)}${data.error.length > 500 ? "..." : ""}
\`\`\`

📅 *Failed at:* ${timestamp}
🌐 *Branch:* ${CONFIG.branch}

⚡ *Action Required:* Check deployment logs immediately.`;
  }

  const payload = JSON.stringify({
    senderId: botMaster.senderId,
    receiverId: botMaster.receiverId,
    messageText: messageText,
    authToken: botMaster.authToken,
  });

  log(`Sending notification to: ${botMaster.apiUrl}`, "cyan");

  return new Promise((resolve) => {
    const url = new URL(botMaster.apiUrl);
    
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    };

    const req = https.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        log(`API Response Status: ${res.statusCode}`, "cyan");
        if (res.statusCode === 200) {
          log("WhatsApp notification sent successfully", "green");
        } else {
          log(`WhatsApp notification failed: ${res.statusCode} ${body}`, "yellow");
        }
        resolve();
      });
    });

    req.on("error", (err) => {
      log(`WhatsApp notification error: ${err.message}`, "red");
      resolve();
    });

    req.write(payload);
    req.end();
  });
}

async function deploy() {
  const start = Date.now();
  
  // Try to acquire deployment lock
  if (!acquireLock()) {
    logSection("DEPLOYMENT SKIPPED");
    log("Another deployment is already in progress. Exiting.", "yellow");
    process.exit(0);
  }
  
  // Ensure lock is released on exit
  process.on('exit', releaseLock);
  process.on('SIGINT', () => { releaseLock(); process.exit(0); });
  process.on('SIGTERM', () => { releaseLock(); process.exit(0); });
  
  logSection("DEPLOYMENT STARTING");
  
  // Log environment info
  log("Environment Information:", "bright");
  log(`  Process CWD: ${process.cwd()}`, "magenta");
  log(`  Project Path: ${CONFIG.projectPath}`, "magenta");
  log(`  Temp Path: ${CONFIG.tempPath}`, "magenta");
  log(`  Branch: ${CONFIG.branch}`, "magenta");
  log(`  Node Version: ${process.version}`, "magenta");
  log(`  Version: ${getVersion()}`, "magenta");
  log(`  Repo URL: ${CONFIG.repoUrl}`, "magenta");
  log(`  GitHub token: ${CONFIG.github.token ? "configured" : "not configured"}`, "magenta");
  log(`  Domain: ${CONFIG.domain}`, "magenta");
  
  // Verify project path exists
  if (!fs.existsSync(CONFIG.projectPath)) {
    releaseLock();
    throw new Error(`Project path does not exist: ${CONFIG.projectPath}`);
  }

  try {
    // STEP 1: Pull to temp
    logSection("STEP 1: Pull latest code into temp folder");
    ensureDir(CONFIG.tempPath);
    const gitAuthEnv = buildGitAuthEnv();

    const tempGitDir = path.join(CONFIG.tempPath, ".git");
    if (!fs.existsSync(tempGitDir)) {
      log("Temp folder is not a git repo. Initializing...", "cyan");
      await runCommand("git", ["init"], CONFIG.tempPath);
      await runCommand("git", ["remote", "add", "origin", CONFIG.repoUrl], CONFIG.tempPath);
    }

    await runCommand("git", ["remote", "set-url", "origin", CONFIG.repoUrl], CONFIG.tempPath);
    await runCommand("git", ["fetch", "origin", CONFIG.branch], CONFIG.tempPath, {
      extraEnv: gitAuthEnv,
      displayArgs: ["fetch", "origin", CONFIG.branch, "--auth-header"],
    });
    await runCommand("git", ["reset", "--hard", `origin/${CONFIG.branch}`], CONFIG.tempPath);
    await runCommand("git", ["log", "-1", "--oneline"], CONFIG.tempPath);

    log(`Waiting ${CONFIG.delayMs / 1000}s...`, "cyan");
    await sleep(CONFIG.delayMs);

    // STEP 2: Sync repo to production while preserving local env and DB files
    logSection("STEP 2: Sync updated code to production");
    syncDirectory(CONFIG.tempPath, CONFIG.projectPath);

    log(`Waiting ${CONFIG.delayMs / 1000}s...`, "cyan");
    await sleep(CONFIG.delayMs);

    if (hasLegacyPersistentStorage()) {
      logSection("STEP 2.5: Rescue legacy persistent storage");
      log(
        "Detected runtime data under .next/standalone. Moving it into project-level persistent folders before cache cleanup.",
        "yellow"
      );
      await stopPm2ForLegacyMigration();
      const migratedFiles = migrateLegacyPersistentStorage();
      log(`Migrated ${migratedFiles} persistent file(s)`, migratedFiles > 0 ? "green" : "cyan");

      log(`Waiting ${CONFIG.delayMs / 1000}s...`, "cyan");
      await sleep(CONFIG.delayMs);
    }

    // STEP 3: Clear ALL caches
    logSection("STEP 3: Clear all caches");
    clearCacheFolders();

    log(`Waiting ${CONFIG.delayMs / 1000}s...`, "cyan");
    await sleep(CONFIG.delayMs);

    // STEP 4: npm install
    logSection("STEP 4: npm install");
    ensureDir(path.join(CONFIG.projectPath, "logs"));
    const installStart = Date.now();
    const installCommand = fs.existsSync(path.join(CONFIG.projectPath, "package-lock.json"))
      ? ["ci"]
      : ["install"];
    await runCommand("npm", installCommand, CONFIG.projectPath);
    const installSecs = ((Date.now() - installStart) / 1000).toFixed(2);
    log(`npm ${installCommand.join(" ")} completed in ${installSecs}s`, "green");

    log(`Waiting ${CONFIG.delayMs / 1000}s...`, "cyan");
    await sleep(CONFIG.delayMs);

    // STEP 5: Build
    logSection("STEP 5: npm run build");
    const buildStart = Date.now();
    await runCommand("npm", ["run", "build"], CONFIG.projectPath);
    const buildSecs = ((Date.now() - buildStart) / 1000).toFixed(2);
    log(`Build completed in ${buildSecs}s`, "green");
    const removedBuildArtifacts = removeSensitiveFilesFromBuildOutput();
    if (removedBuildArtifacts > 0) {
      log(`Removed ${removedBuildArtifacts} sensitive build artifact(s) from .next/standalone`, "green");
    }

    // STEP 6: Restart PM2
    logSection("STEP 6: pm2 restart");
    await runCommand(CONFIG.pm2RestartCmd, [], CONFIG.projectPath);

    // Small delay to ensure PM2 restart completes
    await sleep(2000);

    const totalSecs = ((Date.now() - start) / 1000).toFixed(2);
    logSection("DEPLOYMENT SUCCESSFUL");
    log(`Total time: ${totalSecs}s`, "green");
    log(`Version: ${getVersion()}`, "green");
    
    // Send success notification
    log("Sending deployment notification...", "cyan");
    await sendDeploymentNotification("success", { duration: totalSecs });
    
    log("Deployment complete, exiting...", "green");
    process.exit(0);
  } catch (err) {
    const totalSecs = ((Date.now() - start) / 1000).toFixed(2);
    logSection("DEPLOYMENT FAILED");
    log(`Error: ${err.message}`, "red");
    if (err.stack) {
      log(`Stack: ${err.stack}`, "red");
    }
    log(`Total time: ${totalSecs}s`, "red");
    
    // Send failure notification
    log("Sending failure notification...", "cyan");
    await sendDeploymentNotification("failed", { 
      error: err.message,
      duration: totalSecs 
    });
    
    log("Deployment failed, exiting...", "red");
    process.exit(1);
  }
}

deploy();
