#!/usr/bin/env node

import { build } from 'vite';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('🔨 Building for production...');

// Build frontend with production config that outputs to server/public
await build({ configFile: path.resolve(__dirname, 'vite.prod.config.ts') });

console.log('📦 Building backend...');

// Build backend
execSync('esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist', { stdio: 'inherit' });

console.log('✅ Production build completed!');
