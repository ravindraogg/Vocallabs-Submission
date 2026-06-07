/**
 * ocean.js — Stage 1: Find Lookalike Companies
 *
 * Takes a seed domain and uses the Ocean.io API to discover
 * similar companies by firmographics, size, and market.
 *
 * API Reference: https://api.ocean.io/v2/
 * Auth: X-Api-Token header
 */

const logger = require('../utils/logger');
const { requestWithRetry, deduplicateBy, normalizeDomain } = require('../utils/helpers');

const STAGE = 'OCEAN';
const BASE_URL = 'https://api.ocean.io/v3';

/**
 * Find lookalike companies for a given seed domain
 *
 * @param {string} seedDomain - The seed company domain (e.g. "intercom.com")
 * @param {object} options - Optional overrides
 * @param {number} options.maxResults - Maximum number of companies to return (default: 20)
 * @returns {Promise<Array<{domain: string, name: string, industry: string, employeeCount: number}>>}
 */
async function findLookalikes(seedDomain, options = {}) {
  const apiToken = process.env.OCEAN_API_TOKEN;
  if (!apiToken || apiToken === 'your_ocean_api_token_here') {
    throw new Error('OCEAN_API_TOKEN is not set in .env');
  }

  const maxResults = options.maxResults || 20;
  const domain = normalizeDomain(seedDomain);
  logger.stageHeader(1, 'Ocean.io — Find Lookalike Companies');
  logger.info(STAGE, `Seed domain: ${domain}`);

  const spin = logger.spinner('Searching for lookalike companies...');

  try {
    // Step 1: Use the lookalike companies search inside standard search
    const response = await requestWithRetry({
      method: 'POST',
      url: `${BASE_URL}/search/companies`,
      headers: {
        'X-Api-Token': apiToken,
        'Content-Type': 'application/json',
      },
      data: {
        companiesFilters: {
          lookalikeDomains: [domain],
        },
        size: maxResults,
      },
    }, STAGE);

    spin.stop();

    // Parse the response
    const rawResults = response.data?.companies || [];

    if (!Array.isArray(rawResults) || rawResults.length === 0) {
      logger.warn(STAGE, 'No lookalike companies found. Check your seed domain.');
      return [];
    }

    // Normalize and deduplicate results
    const companies = rawResults
      .map((item) => {
        const c = item.company;
        if (!c) return null;
        return {
          domain: normalizeDomain(c.domain || ''),
          name: c.name || 'Unknown',
          industry: c.industries?.[0] || 'N/A',
          employeeCount: c.employeeCountOcean || c.employeeCountLinkedin || c.companySize || 0,
        };
      })
      .filter((c) => c && c.domain && c.domain !== domain); // exclude the seed itself

    const unique = deduplicateBy(companies, 'domain');

    logger.success(STAGE, `Found ${unique.length} lookalike companies`);
    unique.forEach((c, i) => {
      logger.info(STAGE, `  ${i + 1}. ${c.name} (${c.domain}) — ${c.industry}`);
    });

    return unique;
  } catch (err) {
    spin.stop();
    logger.error(STAGE, `Failed to fetch lookalike companies: ${err.message}`);
    throw err;
  }
}

module.exports = { findLookalikes };
