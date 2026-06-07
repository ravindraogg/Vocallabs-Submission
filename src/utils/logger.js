/**
 * logger.js — Shared logging utilities for pipeline stages
 * 
 * Provides color-coded, timestamped logging with stage prefixes
 * and a spinner for long-running operations.
 */

const chalk = require('chalk');
const ora = require('ora');

const STAGE_COLORS = {
  'PIPELINE': chalk.bold.magenta,
  'OCEAN':    chalk.bold.cyan,
  'PROSPEO':  chalk.bold.yellow,
  'EAZYREACH':chalk.bold.green,
  'BREVO':    chalk.bold.blue,
};

/**
 * Format a timestamp string
 */
function timestamp() {
  return chalk.gray(`[${new Date().toLocaleTimeString()}]`);
}

/**
 * Log an info message with stage prefix
 * @param {string} stage - Stage name (PIPELINE, OCEAN, PROSPEO, EAZYREACH, BREVO)
 * @param {string} message - Message to log
 */
function info(stage, message) {
  const color = STAGE_COLORS[stage] || chalk.white;
  console.log(`${timestamp()} ${color(`[${stage}]`)} ${message}`);
}

/**
 * Log a success message
 */
function success(stage, message) {
  const color = STAGE_COLORS[stage] || chalk.white;
  console.log(`${timestamp()} ${color(`[${stage}]`)} ${message}`);
}

/**
 * Log a warning message
 */
function warn(stage, message) {
  const color = STAGE_COLORS[stage] || chalk.white;
  console.log(`${timestamp()} ${color(`[${stage}]`)} ${message}`);
}

/**
 * Log an error message
 */
function error(stage, message) {
  const color = STAGE_COLORS[stage] || chalk.white;
  console.log(`${timestamp()} ${color(`[${stage}]`)} ${message}`);
}

/**
 * Create and start a spinner for a long-running operation
 * @param {string} text - Spinner text
 * @returns {ora.Ora} Spinner instance
 */
function spinner(text) {
  return ora({ text, color: 'cyan', spinner: 'dots' }).start();
}

/**
 * Print a divider line
 */
function divider() {
  console.log(chalk.gray('─'.repeat(60)));
}

/**
 * Print a stage header banner
 * @param {number} num - Stage number (1-4)
 * @param {string} title - Stage title
 */
function stageHeader(num, title) {
  console.log('');
  divider();
  console.log(chalk.bold.white(`  STAGE ${num} ─ ${title}`));
  divider();
}

module.exports = { info, success, warn, error, spinner, divider, stageHeader };
