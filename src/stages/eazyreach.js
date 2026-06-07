/**
 * eazyreach.js — Stage 3: Resolve Work Emails
 *
 * Takes decision-makers with LinkedIn URLs from Stage 2
 * and resolves their verified work email addresses.
 *
 * Strategy:
 *   - Primary: Use Prospeo enrich-person API (which accepts linkedin_url)
 *     to get verified email. This is the most reliable path since
 *     Prospeo's enrich endpoint directly resolves LinkedIn → email.
 *   - Fallback: If Eazyreach has a public API, use it.
 *
 * Note: Eazyreach is primarily a browser extension. If they provide
 * API access (check dashboard for API key), we'll use their endpoint.
 * Otherwise, we fall back to Prospeo's enrich-person endpoint which
 * accepts linkedin_url as a matching criterion.
 *
 * The assignment says to use Eazyreach for this stage. Once you have
 * your Eazyreach API key and endpoint details from their dashboard,
 * update the EAZYREACH_API_URL below.
 */

const logger = require('../utils/logger');
const { requestWithRetry, deduplicateBy, sleep } = require('../utils/helpers');

const STAGE = 'EAZYREACH';

// Eazyreach API config — update these once you have the actual endpoint from their dashboard
const EAZYREACH_API_URL = 'https://api.eazyreach.app/v1/enrich';

// Fallback: Prospeo enrich-person (accepts linkedin_url)
const PROSPEO_ENRICH_URL = 'https://api.prospeo.io/enrich-person';

/**
 * Resolve work emails for a list of contacts
 *
 * @param {Array<{
 *   personId: string, firstName: string, lastName: string, fullName: string,
 *   title: string, seniority: string, linkedinUrl: string,
 *   companyDomain: string, companyName: string
 * }>} contacts - Contacts from Stage 2
 * @returns {Promise<Array<{...contact, email: string, emailStatus: string}>>}
 */
async function resolveEmails(contacts) {
  const eazyreachKey = process.env.EAZYREACH_API_KEY;
  const prospeoKey = process.env.PROSPEO_API_KEY;

  const useEazyreach = eazyreachKey && eazyreachKey !== 'your_eazyreach_api_key_here';
  const useProspeo = prospeoKey && prospeoKey !== 'your_prospeo_api_key_here';

  if (!useEazyreach && !useProspeo) {
    throw new Error('Neither EAZYREACH_API_KEY nor PROSPEO_API_KEY is set in .env');
  }

  logger.stageHeader(3, 'Eazyreach — Resolve Work Emails');
  logger.info(STAGE, `Resolving emails for ${contacts.length} contacts...`);
  logger.info(STAGE, `Strategy: ${useEazyreach ? 'Eazyreach API' : 'Prospeo enrich-person (fallback)'}`);

  const enrichedContacts = [];

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    logger.info(STAGE, `[${i + 1}/${contacts.length}] ${contact.fullName} (${contact.companyName})...`);

    try {
      let email = null;
      let emailStatus = null;

      if (useEazyreach && contact.linkedinUrl) {
        // ─── Try Eazyreach first ───
        try {
          const response = await requestWithRetry({
            method: 'POST',
            url: EAZYREACH_API_URL,
            headers: {
              'Authorization': `Bearer ${eazyreachKey}`,
              'Content-Type': 'application/json',
            },
            data: {
              linkedin_url: contact.linkedinUrl,
              profile: contact.linkedinUrl,
            },
          }, STAGE);

          // Parse Eazyreach response — adapt to their actual response shape
          const data = response.data;
          email = data?.email || data?.work_email || data?.data?.email || null;
          emailStatus = email ? 'FOUND_EAZYREACH' : null;

          if (email) {
            logger.success(STAGE, `  Email found via Eazyreach: ${email}`);
          }
        } catch (eazyErr) {
          logger.warn(STAGE, `  Eazyreach failed: ${eazyErr.message} — trying Prospeo fallback`);
        }
      }

      // ─── Fallback to Prospeo enrich-person ───
      if (!email && useProspeo) {
        try {
          const enrichData = {};

          // Use linkedin_url if available (best match)
          if (contact.linkedinUrl) {
            enrichData.linkedin_url = contact.linkedinUrl;
          }
          // Or use person_id if we have it from Stage 2 search
          else if (contact.personId) {
            enrichData.person_id = contact.personId;
          }
          // Or use name + company
          else {
            enrichData.first_name = contact.firstName;
            enrichData.last_name = contact.lastName;
            enrichData.company_website = contact.companyDomain;
          }

          const response = await requestWithRetry({
            method: 'POST',
            url: PROSPEO_ENRICH_URL,
            headers: {
              'X-KEY': prospeoKey,
              'Content-Type': 'application/json',
            },
            data: {
              only_verified_email: true,
              enrich_mobile: false,
              data: enrichData,
            },
          }, STAGE, 5);

          const person = response.data?.person;
          if (person?.email?.email && person.email.revealed) {
            email = person.email.email;
            emailStatus = person.email.status || 'FOUND_PROSPEO';
            logger.success(STAGE, `  Email found via Prospeo: ${email} (${emailStatus})`);
          } else if (person?.email?.email) {
            // Email exists but may be masked
            email = person.email.email;
            emailStatus = person.email.status || 'PARTIAL';
            logger.warn(STAGE, `  Partial email via Prospeo: ${email} (${emailStatus})`);
          } else {
            logger.warn(STAGE, `  No email found for ${contact.fullName}`);
          }
        } catch (prospeoErr) {
          logger.warn(STAGE, `  Prospeo enrich failed: ${prospeoErr.message}`);
        }
      }
      


      if (email) {
        enrichedContacts.push({
          ...contact,
          email,
          emailStatus,
        });
      }
    } catch (err) {
      logger.error(STAGE, `  Error processing ${contact.fullName}: ${err.message}`);
    }

    // Rate limit protection
    if (i < contacts.length - 1) {
      await sleep(3500);
    }
  }

  // Final dedupe by email
  const unique = deduplicateBy(enrichedContacts, 'email');

  logger.success(STAGE, `Resolved ${unique.length} verified work emails out of ${contacts.length} contacts`);
  const color = require('chalk').bold.green;
  let logBuffer = '';
  unique.forEach((c, i) => {
    const timeStr = require('chalk').gray(`[${new Date().toLocaleTimeString()}]`);
    const prefix = `${timeStr} ${color('[EAZYREACH]')}`;
    logBuffer += `${prefix}   ${i + 1}. ${c.fullName} <${c.email}> — ${c.title} @ ${c.companyName}\n`;
  });

  if (logBuffer) {
    console.log(logBuffer.trimEnd());
  }

  return unique;
}

module.exports = { resolveEmails };
