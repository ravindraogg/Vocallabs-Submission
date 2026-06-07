#!/usr/bin/env node

/**
 * index.js — CLI Entry Point
 *
 * Usage:
 *   node index.js <company.domain>
 *
 * Example:
 *   node index.js intercom.com
 *
 * The pipeline runs all four stages end-to-end with a single input.
 */

require('dotenv').config();

const chalk = require('chalk');
const { runPipeline } = require('./src/pipeline');

// ── Parse CLI arguments ──
const args = process.argv.slice(2);

if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
  console.log('');
  console.log(chalk.bold('Cold Outreach Pipeline'));
  console.log(chalk.gray('─'.repeat(40)));
  console.log('');
  console.log(`  ${chalk.green('Usage:')}    node index.js <company.domain>`);
  console.log(`  ${chalk.green('Example:')}  node index.js intercom.com`);
  console.log('');
  console.log(chalk.gray('  Environment variables (set in .env):'));
  console.log(chalk.gray('    SEND_EMAILS     = false|true  (toggle email sending)'));
  console.log(chalk.gray('    OCEAN_API_TOKEN  = ...         (Ocean.io API token)'));
  console.log(chalk.gray('    PROSPEO_API_KEY  = ...         (Prospeo API key)'));
  console.log(chalk.gray('    EAZYREACH_API_KEY= ...         (Eazyreach API key)'));
  console.log(chalk.gray('    BREVO_API_KEY    = ...         (Brevo API key)'));
  console.log(chalk.gray('    SENDER_NAME      = ...         (Your display name)'));
  console.log(chalk.gray('    SENDER_EMAIL     = ...         (you@yourdomain.com)'));
  console.log('');
  process.exit(0);
}

const seedDomain = args[0].replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/+$/, '');

// ── Validate required env vars ──
const requiredVars = ['OCEAN_API_TOKEN', 'PROSPEO_API_KEY', 'SENDER_EMAIL'];
const missing = requiredVars.filter(
  (v) => !process.env[v] || process.env[v].includes('your_') || process.env[v].includes('yourdomain')
);

if (missing.length > 0) {
  console.log('');
  console.log(chalk.red.bold('Missing required environment variables:'));
  missing.forEach((v) => console.log(chalk.red(`  • ${v}`)));
  console.log('');
  console.log(chalk.gray('Set them in the .env file before running the pipeline.'));
  console.log('');
  process.exit(1);
}

// ── Run the pipeline ──
runPipeline(seedDomain).catch((err) => {
  console.log('');
  console.log(chalk.red.bold(`Pipeline failed: ${err.message}`));
  console.log(chalk.gray(err.stack));
  process.exit(1);
});
