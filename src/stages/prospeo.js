/**
 * prospeo.js — Stage 2: Find Decision-Makers
 *
 * Takes a list of company domains and uses the Prospeo API to
 * find C-suite / VP-level contacts with their LinkedIn URLs.
 *
 * API Reference: https://prospeo.io/api-docs
 * Auth: X-KEY header
 * Endpoints used:
 *   - POST https://api.prospeo.io/search-person  (find people by domain + seniority)
 *   - POST https://api.prospeo.io/enrich-person   (get email + LinkedIn from person_id)
 */

const logger = require('../utils/logger');
const { requestWithRetry, deduplicateBy, sleep } = require('../utils/helpers');

const STAGE = 'PROSPEO';
const BASE_URL = 'https://api.prospeo.io';

/**
 * Search for decision-makers at a list of company domains
 *
 * @param {Array<{domain: string, name: string}>} companies - Companies from Stage 1
 * @param {object} options
 * @param {number} options.maxPerCompany - Max contacts per company (default: 5)
 * @returns {Promise<Array<{
 *   firstName: string, lastName: string, fullName: string,
 *   title: string, seniority: string, linkedinUrl: string,
 *   companyDomain: string, companyName: string, personId: string
 * }>>}
 */
async function findDecisionMakers(companies, options = {}) {
  const apiKey = process.env.PROSPEO_API_KEY;
  if (!apiKey || apiKey === 'your_prospeo_api_key_here') {
    throw new Error('PROSPEO_API_KEY is not set in .env');
  }

  const maxPerCompany = options.maxPerCompany || 5;
  logger.stageHeader(2, 'Prospeo — Find Decision-Makers');
  logger.info(STAGE, `Searching ${companies.length} companies for C-suite / VP contacts...`);

  const allContacts = [];

  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];
    logger.info(STAGE, `[${i + 1}/${companies.length}] Searching ${company.name} (${company.domain})...`);

    try {
      // Search for C-suite and VP-level people at this company domain
      const searchResponse = await requestWithRetry({
        method: 'POST',
        url: `${BASE_URL}/search-person`,
        headers: {
          'X-KEY': apiKey,
          'Content-Type': 'application/json',
        },
        data: {
          page: 1,
          filters: {
            company: {
              websites: {
                include: [company.domain],
              },
            },
            person_seniority: {
              include: ['C-Suite', 'Vice President', 'Founder/Owner', 'Director'],
            },
          },
        },
      }, STAGE, 5);

      const results = searchResponse.data?.results || [];

      if (results.length === 0) {
        logger.warn(STAGE, `  No decision-makers found for ${company.domain}`);
        continue;
      }

      // Take the top N results
      const topResults = results.slice(0, maxPerCompany);

      for (const result of topResults) {
        const person = result.person || result;
        allContacts.push({
          personId: person.person_id || null,
          firstName: person.first_name || '',
          lastName: person.last_name || '',
          fullName: person.full_name || `${person.first_name || ''} ${person.last_name || ''}`.trim(),
          title: person.current_job_title || '',
          seniority: person.job_history?.[0]?.seniority || '',
          linkedinUrl: person.linkedin_url || '',
          companyDomain: company.domain,
          companyName: company.name,
        });
      }

      logger.success(STAGE, `  Found ${topResults.length} contacts at ${company.name}`);
    } catch (err) {
      const apiErrorMsg = err.response?.data?.message || err.response?.statusText || err.message;
      logger.warn(STAGE, `  API failed for ${company.domain} (${apiErrorMsg}). Skipping...`);
    }

    // Small delay between requests to avoid rate limits
    if (i < companies.length - 1) {
      await sleep(3500);
    }
  }

  // Deduplicate by LinkedIn URL
  const unique = deduplicateBy(allContacts, 'linkedinUrl');
  logger.success(STAGE, `Total unique decision-makers found: ${unique.length}`);

  const color = require('chalk').bold.yellow;
  let logBuffer = '';
  unique.forEach((c, i) => {
    const timeStr = require('chalk').gray(`[${new Date().toLocaleTimeString()}]`);
    const prefix = `${timeStr} ${color('[PROSPEO]')}`;
    logBuffer += `${prefix}   ${i + 1}. ${c.fullName} — ${c.title} @ ${c.companyName}\n`;
    if (c.linkedinUrl) logBuffer += `${prefix}      LinkedIn: ${c.linkedinUrl}\n`;
  });

  if (logBuffer) {
    console.log(logBuffer.trimEnd());
  }

  return unique;
}

module.exports = { findDecisionMakers };
