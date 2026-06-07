/**
 * helpers.js — Shared utility functions
 *
 * Rate-limit-aware request wrapper, deduplication, and data normalization.
 */

const axios = require('axios');
const logger = require('./logger');

/**
 * Sleep for a specified duration
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Make an HTTP request with automatic retry on rate limits (429) and transient errors
 * @param {object} config - Axios request config
 * @param {string} stageName - Name of the calling stage (for logging)
 * @param {number} maxRetries - Maximum number of retries (default: 3)
 * @returns {Promise<object>} Axios response
 */
async function requestWithRetry(config, stageName, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await axios(config);
      return response;
    } catch (err) {
      const status = err.response?.status;
      const isRateLimit = status === 429;
      const isServerError = status >= 500;

      const dailyLeft = err.response?.headers?.['x-daily-request-left'];
      if (dailyLeft === '0') {
        logger.error(stageName, `Daily API credit limit exhausted (0 left).`);
        throw new Error('DAILY_LIMIT_EXHAUSTED');
      }

      if ((isRateLimit || isServerError) && attempt < maxRetries) {
        // For rate limits (429), back off at least 30s to let rolling windows reset
        const backoff = isRateLimit
          ? Math.max(30000, Math.pow(2, attempt) * 1000)
          : Math.pow(2, attempt) * 1000;
        logger.warn(stageName, `HTTP ${status} — retrying in ${backoff / 1000}s (attempt ${attempt}/${maxRetries})`);
        await sleep(backoff);
        continue;
      }

      // Non-retryable or exhausted retries
      const errorMsg = err.response?.data?.message || err.response?.data?.error_code || err.message;
      throw new Error(`HTTP ${status || 'ERR'}: ${errorMsg}`);
    }
  }
}

/**
 * Deduplicate an array of objects by a given key
 * @param {Array} arr - Array of objects
 * @param {string} key - Key to deduplicate by
 * @returns {Array} Deduplicated array
 */
function deduplicateBy(arr, key) {
  const seen = new Set();
  return arr.filter((item) => {
    const val = item[key];
    if (!val || seen.has(val)) return false;
    seen.add(val);
    return true;
  });
}

/**
 * Normalize a domain string (strip protocol, www, trailing slash)
 * @param {string} domain - Raw domain string
 * @returns {string} Cleaned domain
 */
function normalizeDomain(domain) {
  if (!domain) return '';
  return domain
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/+$/, '')
    .trim();
}

/**
 * Save data to a JSON file in the output directory
 * @param {string} filename - File name (without path)
 * @param {object} data - Data to save
 */
function saveOutput(filename, data) {
  const fs = require('fs');
  const path = require('path');
  const dir = path.join(process.cwd(), 'output');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const filepath = path.join(dir, filename);
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
  logger.info('PIPELINE', `Output saved → ${filepath}`);
}

module.exports = { sleep, requestWithRetry, deduplicateBy, normalizeDomain, saveOutput };
