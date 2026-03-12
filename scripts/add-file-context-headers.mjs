#!/usr/bin/env node
/*
 * File Context:
 * Purpose: Automates Add File Context Headers tasks for local development or deployment.
 * Primary Functionality: Executes operational tasks directly from the command line for developers or deploy hooks.
 * Interlinked With: Invoked from package scripts, deploy hooks, or local developer workflows.
 * Role: developer tooling.
 */
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const marker = 'File Context:';

const includeFileNames = new Set([
  'Caddyfile',
  '.gitignore',
  'public/robots.txt',
]);

const includeExtensions = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.mjs',
  '.sh',
  '.md',
  '.css',
  '.prisma',
  '.txt',
]);

const resolveExtensions = ['.ts', '.tsx', '.js', '.mjs', '.css', '.prisma', '.md', '.txt', '.d.ts'];

const skipPrefixes = [
  '.git/',
  '.next/',
  'node_modules/',
  'coverage/',
  'dist/',
  'out/',
  'data/',
  'db/',
  'src/generated/',
];

const skipFiles = new Set([
  '.env',
  '.DS_Store',
  'bun.lock',
  'package-lock.json',
  'package.json',
  'components.json',
  'tsconfig.json',
  'next-env.d.ts',
  'tsconfig.tsbuildinfo',
  'public/logo.svg',
  'mini-services/.gitkeep',
]);

function getProjectFiles(currentDir = rootDir, relativePrefix = '') {
  const entries = fs.readdirSync(currentDir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = relativePrefix
      ? path.posix.join(relativePrefix, entry.name)
      : entry.name;

    if (skipFiles.has(relativePath) || skipPrefixes.some((prefix) => relativePath.startsWith(prefix))) {
      continue;
    }

    const absolutePath = path.join(currentDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...getProjectFiles(absolutePath, relativePath));
      continue;
    }

    files.push(relativePath);
  }

  return files;
}

function shouldProcess(filePath) {
  if (skipFiles.has(filePath)) {
    return false;
  }

  if (skipPrefixes.some((prefix) => filePath.startsWith(prefix))) {
    return false;
  }

  if (includeFileNames.has(filePath)) {
    return true;
  }

  return includeExtensions.has(path.extname(filePath));
}

function toWords(rawValue) {
  return rawValue
    .replace(/\.[^.]+$/, '')
    .replace(/\[(.+?)\]/g, '$1')
    .replace(/[-_]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function describeRoute(routePath) {
  const cleaned = routePath
    .replace(/^src\/app\//, '')
    .replace(/\/page\.tsx$/, '')
    .replace(/\/layout\.tsx$/, '')
    .replace(/\/route\.ts$/, '')
    .replace(/\[(.+?)\]/g, ':$1');

  if (!cleaned) {
    return 'the home route';
  }

  return cleaned
    .split('/')
    .filter(Boolean)
    .map((segment) => {
      if (segment.startsWith(':')) {
        return segment;
      }
      return segment.replace(/-/g, ' ');
    })
    .join(' / ');
}

function determineRole(filePath) {
  if (filePath.startsWith('docs/') || filePath === 'README.md' || filePath === 'DEPLOYMENT.md') {
    return 'documentation';
  }

  if (filePath.startsWith('scripts/') || filePath.endsWith('.config.js') || filePath.endsWith('.config.mjs')) {
    return 'developer tooling';
  }

  if (filePath === 'ecosystem.config.js' || filePath === 'Caddyfile') {
    return 'deployment/runtime configuration';
  }

  if (filePath.startsWith('src/app/api/internal/admin/')) {
    return 'admin private backend';
  }

  if (filePath.startsWith('src/app/api/internal/')) {
    return 'private authenticated backend';
  }

  if (filePath.startsWith('src/app/api/public/') || filePath.startsWith('src/app/api/order/')) {
    return 'public integration backend';
  }

  if (filePath.startsWith('src/app/api/auth/')) {
    return 'authentication backend';
  }

  if (filePath.startsWith('src/app/api/admin/')) {
    return 'admin backend';
  }

  if (filePath.startsWith('src/app/api/')) {
    return 'shared backend';
  }

  if (filePath.startsWith('src/app/admin/')) {
    return 'admin-facing UI';
  }

  if (filePath === 'src/app/page.tsx') {
    return 'public storefront UI';
  }

  if (filePath.startsWith('src/app/login') || filePath.startsWith('src/app/staff-login')) {
    return 'public authentication UI';
  }

  if (filePath.startsWith('src/app/')) {
    return 'role-based user-facing UI';
  }

  if (filePath.startsWith('src/components/ui/')) {
    return 'shared UI primitive';
  }

  if (filePath.startsWith('src/shared/components/')) {
    return 'shared UI';
  }

  if (filePath.startsWith('src/shared/lib/stores/')) {
    return 'shared client state';
  }

  if (filePath.startsWith('src/shared/config/')) {
    return 'shared configuration';
  }

  if (filePath.startsWith('src/lib/server/')) {
    return 'server infrastructure';
  }

  if (filePath.startsWith('src/lib/')) {
    return 'shared infrastructure';
  }

  if (filePath.startsWith('src/hooks/')) {
    return 'shared frontend behavior';
  }

  if (filePath.startsWith('src/versions/')) {
    return 'application data/service layer';
  }

  if (filePath.startsWith('examples/')) {
    return 'example/demo code';
  }

  if (filePath === 'prisma/schema.prisma') {
    return 'database schema';
  }

  if (filePath === 'public/robots.txt') {
    return 'public asset metadata';
  }

  return 'shared project asset';
}

function determinePurpose(filePath) {
  if (filePath === 'src/app/page.tsx') {
    return 'Controls the root route and renders the public storefront when e-commerce is enabled.';
  }

  if (filePath.endsWith('/page.tsx') && filePath.startsWith('src/app/')) {
    return `Implements the Next.js page for ${describeRoute(filePath)}.`;
  }

  if (filePath.endsWith('/layout.tsx') && filePath.startsWith('src/app/')) {
    return `Defines the shared Next.js layout for ${describeRoute(filePath)}.`;
  }

  if (filePath.endsWith('/route.ts') && filePath.startsWith('src/app/api/')) {
    return `Handles the API route for ${describeRoute(filePath)}.`;
  }

  if (filePath.startsWith('src/components/ui/')) {
    return `Provides the reusable ${toWords(path.basename(filePath))} UI primitive.`;
  }

  if (filePath.startsWith('src/shared/components/')) {
    return `Provides the shared ${toWords(path.basename(filePath))} component used across routes.`;
  }

  if (filePath.startsWith('src/shared/lib/stores/')) {
    return `Stores shared client state for ${toWords(path.basename(filePath))}.`;
  }

  if (filePath.startsWith('src/shared/config/')) {
    return `Defines shared configuration for ${toWords(path.basename(filePath))}.`;
  }

  if (filePath.startsWith('src/lib/server/')) {
    return `Implements server-side infrastructure for ${toWords(path.basename(filePath))}.`;
  }

  if (filePath.startsWith('src/lib/')) {
    return `Provides shared infrastructure for ${toWords(path.basename(filePath))}.`;
  }

  if (filePath.startsWith('src/hooks/')) {
    return `Encapsulates reusable React behavior for ${toWords(path.basename(filePath))}.`;
  }

  if (filePath.startsWith('src/versions/v1/repositories/')) {
    return `Implements repository access for ${toWords(path.basename(filePath))}.`;
  }

  if (filePath.startsWith('src/versions/v1/services/')) {
    return `Implements service-layer behavior for ${toWords(path.basename(filePath))}.`;
  }

  if (filePath.startsWith('src/versions/v1/controllers/')) {
    return `Implements controller-level coordination for ${toWords(path.basename(filePath))}.`;
  }

  if (filePath.startsWith('scripts/')) {
    return `Automates ${toWords(path.basename(filePath))} tasks for local development or deployment.`;
  }

  if (filePath === 'prisma/schema.prisma') {
    return 'Defines the Prisma schema used to generate database client artifacts.';
  }

  if (filePath === 'src/app/globals.css') {
    return 'Defines the global stylesheet shared across the application.';
  }

  if (filePath === 'src/proxy.ts') {
    return 'Configures request-time proxy and route-guard behavior for the app.';
  }

  if (filePath === 'public/robots.txt') {
    return 'Defines crawler instructions for the public site.';
  }

  if (filePath === '.gitignore') {
    return 'Defines files and directories excluded from Git tracking.';
  }

  if (filePath === 'Caddyfile') {
    return 'Defines the Caddy web server and reverse-proxy configuration.';
  }

  if (filePath.endsWith('.md')) {
    return `Documents ${toWords(path.basename(filePath))} for the project.`;
  }

  return `Defines the project file for ${toWords(path.basename(filePath))}.`;
}

function determinePrimaryFunctionality(filePath) {
  if (filePath.endsWith('/route.ts') && filePath.startsWith('src/app/api/')) {
    return 'Validates incoming requests, calls service or server modules, and returns framework JSON responses.';
  }

  if (filePath.endsWith('/page.tsx') && filePath.startsWith('src/app/')) {
    return 'Composes route-level UI, data fetching, and user interactions for this page.';
  }

  if (filePath.endsWith('/layout.tsx') && filePath.startsWith('src/app/')) {
    return 'Wraps child routes with shared structure, providers, and layout-level behavior.';
  }

  if (filePath.startsWith('src/components/ui/')) {
    return 'Exports a reusable presentational building block that other components compose.';
  }

  if (filePath.startsWith('src/shared/components/')) {
    return 'Centralizes reusable UI behavior so multiple pages can share the same presentation and actions.';
  }

  if (filePath.startsWith('src/shared/lib/stores/')) {
    return 'Keeps client state synchronized across views, refreshes, and related interactions.';
  }

  if (filePath.startsWith('src/lib/server/')) {
    return 'Owns server-side persistence, schema initialization, or backend data access for this domain.';
  }

  if (filePath.startsWith('src/lib/')) {
    return 'Supports shared runtime infrastructure consumed by routes, services, or server helpers.';
  }

  if (filePath.startsWith('src/versions/v1/repositories/')) {
    return 'Wraps lower-level fetch or persistence calls behind a stable repository interface.';
  }

  if (filePath.startsWith('src/versions/v1/services/')) {
    return 'Coordinates repository calls and domain logic for higher-level app features.';
  }

  if (filePath.startsWith('src/versions/v1/controllers/')) {
    return 'Bridges UI or orchestration needs with the underlying service layer.';
  }

  if (filePath.startsWith('src/shared/config/')) {
    return 'Exports static configuration values that other modules consume directly.';
  }

  if (filePath.startsWith('src/hooks/')) {
    return 'Packages reusable React state and effect behavior behind a dedicated hook API.';
  }

  if (filePath.startsWith('scripts/')) {
    return 'Executes operational tasks directly from the command line for developers or deploy hooks.';
  }

  if (filePath.endsWith('.md')) {
    return 'Explains behavior, setup, or operational expectations for the referenced feature.';
  }

  if (filePath === 'prisma/schema.prisma') {
    return 'Declares models, datasource rules, and generator settings for Prisma-based tooling.';
  }

  if (filePath === 'src/app/globals.css') {
    return 'Applies base styles, theme tokens, and shared layout utilities across the app.';
  }

  if (filePath === '.gitignore') {
    return 'Prevents local, generated, or secret files from being committed into version control.';
  }

  if (filePath === 'Caddyfile') {
    return 'Configures HTTP serving, proxy behavior, and production routing rules.';
  }

  return 'Provides file-specific behavior or configuration for the surrounding project module.';
}

function parseInternalReferences(content, filePath) {
  const references = new Set();
  const regexes = [
    /import\s+[^'"]*?from\s+['"]([^'"]+)['"]/g,
    /import\s+['"]([^'"]+)['"]/g,
    /export\s+[^'"]*?from\s+['"]([^'"]+)['"]/g,
  ];

  for (const regex of regexes) {
    let match;
    while ((match = regex.exec(content)) !== null) {
      const specifier = match[1];
      if (!specifier || (!specifier.startsWith('@/') && !specifier.startsWith('.'))) {
        continue;
      }
      const resolved = resolveInternalSpecifier(filePath, specifier);
      if (resolved) {
        references.add(resolved);
      }
    }
  }

  return [...references].filter((ref) => ref !== filePath).sort().slice(0, 4);
}

function resolveInternalSpecifier(filePath, specifier) {
  const basePath = specifier.startsWith('@/') ?
    path.join(rootDir, 'src', specifier.slice(2)) :
    path.resolve(rootDir, path.dirname(filePath), specifier);

  const candidates = [
    basePath,
    ...resolveExtensions.map((ext) => `${basePath}${ext}`),
    ...resolveExtensions.map((ext) => path.join(basePath, `index${ext}`)),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return path.relative(rootDir, candidate).replace(/\\/g, '/');
    }
  }

  if (specifier.startsWith('@/')) {
    return `src/${specifier.slice(2)}`;
  }

  return null;
}

function determineInterlinks(filePath, content) {
  const internalReferences = parseInternalReferences(content, filePath);

  if (internalReferences.length > 0) {
    return internalReferences.join(', ');
  }

  if (filePath.startsWith('src/app/')) {
    return 'Referenced by the Next.js routing runtime and adjacent shared modules.';
  }

  if (filePath.startsWith('src/components/ui/') || filePath.startsWith('src/shared/components/')) {
    return 'Consumed by route pages and other shared UI components.';
  }

  if (filePath.startsWith('src/shared/lib/stores/')) {
    return 'Consumed by client components that need shared state.';
  }

  if (filePath.startsWith('src/lib/server/')) {
    return 'Consumed by API routes and service layers for server-side operations.';
  }

  if (filePath.startsWith('scripts/')) {
    return 'Invoked from package scripts, deploy hooks, or local developer workflows.';
  }

  if (filePath.endsWith('.md')) {
    return 'Linked from project workflows and developer documentation.';
  }

  return 'No direct internal imports; primarily used by framework or toolchain entry points.';
}

function getCommentStyle(filePath) {
  if (filePath.endsWith('.md')) {
    return 'html';
  }

  if (filePath.endsWith('.prisma')) {
    return 'slash';
  }

  if (
    filePath.endsWith('.sh') ||
    filePath === '.gitignore' ||
    filePath === 'Caddyfile' ||
    filePath === 'public/robots.txt' ||
    filePath.endsWith('.txt')
  ) {
    return 'hash';
  }

  return 'block';
}

function buildHeader(filePath, content) {
  const purpose = determinePurpose(filePath);
  const primary = determinePrimaryFunctionality(filePath);
  const interlinkedWith = determineInterlinks(filePath, content);
  const role = determineRole(filePath);
  const style = getCommentStyle(filePath);

  if (style === 'html') {
    return [
      '<!--',
      `File Context: ${purpose}`,
      `Primary Functionality: ${primary}`,
      `Interlinked With: ${interlinkedWith}`,
      `Role: ${role}.`,
      '-->',
      '',
    ].join('\n');
  }

  if (style === 'hash') {
    return [
      '# File Context:',
      `# Purpose: ${purpose}`,
      `# Primary Functionality: ${primary}`,
      `# Interlinked With: ${interlinkedWith}`,
      `# Role: ${role}.`,
      '',
    ].join('\n');
  }

  if (style === 'slash') {
    return [
      '// File Context:',
      `// Purpose: ${purpose}`,
      `// Primary Functionality: ${primary}`,
      `// Interlinked With: ${interlinkedWith}`,
      `// Role: ${role}.`,
      '',
    ].join('\n');
  }

  return [
    '/*',
    ' * File Context:',
    ` * Purpose: ${purpose}`,
    ` * Primary Functionality: ${primary}`,
    ` * Interlinked With: ${interlinkedWith}`,
    ` * Role: ${role}.`,
    ' */',
    '',
  ].join('\n');
}

function hasManagedHeader(content) {
  const normalized = content.replace(/^\uFEFF/, '');
  const withoutShebang = normalized.startsWith('#!') ? normalized.slice(normalized.indexOf('\n') + 1) : normalized;
  return withoutShebang.startsWith('/*\n * File Context:') ||
    withoutShebang.startsWith('// File Context:') ||
    withoutShebang.startsWith('# File Context:') ||
    withoutShebang.startsWith('<!--\nFile Context:');
}

function insertHeader(content, header) {
  const normalized = content.replace(/^\uFEFF/, '');
  const lines = normalized.split('\n');
  let index = 0;
  let prefix = '';

  if (lines[index]?.startsWith('#!')) {
    prefix += `${lines[index]}\n`;
    index += 1;
  }

  const isTopDirective = (value) => {
    const trimmed = value.trim();
    return /^['"]use (client|server)['"];?$/.test(trimmed) ||
      /^import ['"]server-only['"];?$/.test(trimmed);
  };

  while (index < lines.length) {
    const line = lines[index];

    if (isTopDirective(line)) {
      prefix += `${line}\n`;
      index += 1;
      continue;
    }

    if (prefix && line.trim() === '') {
      prefix += '\n';
      index += 1;
      continue;
    }

    break;
  }

  const remainder = lines.slice(index).join('\n');
  return `${prefix}${header}${remainder}`;
}

function main() {
  const projectFiles = getProjectFiles().sort();
  let updatedCount = 0;

  for (const filePath of projectFiles) {
    if (!shouldProcess(filePath)) {
      continue;
    }

    const absolutePath = path.join(rootDir, filePath);
    const content = fs.readFileSync(absolutePath, 'utf8');

    if (hasManagedHeader(content)) {
      continue;
    }

    const header = buildHeader(filePath, content);
    const nextContent = insertHeader(content, header);
    fs.writeFileSync(absolutePath, nextContent, 'utf8');
    updatedCount += 1;
  }

  console.log(`Added context headers to ${updatedCount} files.`);
}

main();
