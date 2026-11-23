#!/usr/bin/env node
// No npm dependencies: Python 3 stdlib parses the official gzip/ZIP/XLSX formats.
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const result = spawnSync(process.env.VOCAB_PYTHON || 'python', [fileURLToPath(new URL('./build-wordlist.py', import.meta.url)), ...process.argv.slice(2)], { stdio: 'inherit', shell: false });
if (result.error) console.error(`Python 3 is required; configure VOCAB_PYTHON: ${result.error.message}`);
process.exitCode = result.status ?? 1;
