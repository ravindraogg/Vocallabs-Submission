/**
 * pipeline.js — Main Pipeline Orchestrator
 *
 * Chains all four stages together:
 *   1. Ocean.io   → Find lookalike companies
 *   2. Prospeo    → Find decision-makers
 *   3. Eazyreach  → Resolve work emails
 *   4. Brevo      → Send personalized outreach
 *
 * Includes a safety checkpoint before Stage 4 (email sending).
 */

const chalk = require('chalk');
const Table = require('cli-table3');
const readlineSync = require('readline-sync');
const logger = require('./utils/logger');
const { saveOutput } = require('./utils/helpers');
const { findLookalikes } = require('./stages/ocean');
const { findDecisionMakers } = require('./stages/prospeo');
const { resolveEmails } = require('./stages/eazyreach');
const { sendOutreach } = require('./stages/brevo');

/**
 * Display a summary table of contacts
 * @param {Array} enrichedContacts - Enriched contacts with emails
 */
function displaySummaryTable(enrichedContacts) {
  const table = new Table({
    head: [
      chalk.cyan('#'),
      chalk.cyan('Name'),
      chalk.cyan('Title'),
      chalk.cyan('Company'),
      chalk.cyan('Email'),
    ],
    colWidths: [4, 22, 28, 20, 30],
    wordWrap: true,
  });

  enrichedContacts.forEach((c, i) => {
    table.push([i + 1, c.fullName, c.title || 'N/A', c.companyName, c.email]);
  });

  console.log(table.toString());
}

/**
 * Display a summary table of contacts and prompt for confirmation
 * @param {Array} contacts - Enriched contacts with emails
 * @param {boolean} isDryRun - Whether SEND_EMAILS is false
 * @returns {boolean} Whether the user confirmed
 */
function safetyCheckpoint(contacts, isDryRun) {
  console.log('');
  logger.divider();
  console.log(chalk.bold.red('  SAFETY CHECKPOINT — Review Before Sending'));
  logger.divider();
  console.log('');

  displaySummaryTable(contacts);
  console.log('');

  const modeLabel = isDryRun
    ? chalk.yellow('DRY RUN (no actual emails)')
    : chalk.red.bold('LIVE — emails WILL be sent!');

  console.log(`  Mode: ${modeLabel}`);
  console.log(`  Recipients: ${chalk.bold(contacts.length)}`);
  console.log('');

  const answer = readlineSync.question(
    chalk.bold('  Proceed with sending? (y/n): ')
  );

  return answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes';
}

/**
 * Run the complete outreach pipeline
 * @param {string} seedDomain - The seed company domain
 */
async function runPipeline(seedDomain) {
  const startTime = Date.now();
  const isDryRun = process.env.SEND_EMAILS !== 'true';

  console.log('');
  console.log(chalk.bold.magenta('╔═══════════════════════════════════════════════════╗'));
  console.log(chalk.bold.magenta('║     COLD OUTREACH PIPELINE — Fully Automated      ║'));
  console.log(chalk.bold.magenta('╚═══════════════════════════════════════════════════╝'));
  console.log('');
  logger.info('PIPELINE', `Seed domain: ${chalk.bold(seedDomain)}`);
  logger.info('PIPELINE', `Mode: ${isDryRun ? chalk.yellow('DRY RUN') : chalk.red('LIVE')}`);

  // ── STAGE 1: Ocean.io — Find Lookalike Companies ──
  const maxCompanies = process.env.MAX_COMPANIES ? parseInt(process.env.MAX_COMPANIES, 10) : 5;
  const companies = await findLookalikes(seedDomain, { maxResults: maxCompanies });
  if (companies.length === 0) {
    logger.error('PIPELINE', 'No companies found. Pipeline cannot continue.');
    process.exit(1);
  }
  saveOutput('01_companies.json', companies);

  // ── STAGE 2: Prospeo — Find Decision-Makers ──
  const contacts = await findDecisionMakers(companies);
  if (contacts.length === 0) {
    logger.error('PIPELINE', 'No decision-makers found. Pipeline cannot continue.');
    process.exit(1);
  }
  saveOutput('02_contacts.json', contacts);

  // ── STAGE 3: Eazyreach — Resolve Work Emails ──
  const maxContacts = process.env.MAX_CONTACTS ? parseInt(process.env.MAX_CONTACTS, 10) : 5;
  
  if (contacts.length > maxContacts) {
    logger.warn('PIPELINE', `Queue truncated from ${contacts.length} down to ${maxContacts} contacts to optimize API usage bounds.`);
  }
  
  const contactsToResolve = contacts.slice(0, maxContacts);
  const enrichedContacts = await resolveEmails(contactsToResolve);
  if (enrichedContacts.length === 0) {
    logger.error('PIPELINE', 'No emails resolved. Pipeline cannot continue.');
    process.exit(1);
  }
  saveOutput('03_emails.json', enrichedContacts);

  // ── SAFETY CHECKPOINT ──
  let confirmed = false;
  const autoConfirm = process.env.AUTO_CONFIRM === 'true';

  if (autoConfirm) {
    console.log('');
    logger.divider();
    console.log(chalk.bold.green('  SAFETY CHECKPOINT — Auto-Confirming (AUTO_CONFIRM=true)'));
    logger.divider();
    console.log('');

    displaySummaryTable(enrichedContacts);
    console.log('');
    confirmed = true;
  } else {
    confirmed = safetyCheckpoint(enrichedContacts, isDryRun);
  }

  if (!confirmed) {
    logger.warn('PIPELINE', 'Aborted by user. No emails sent.');
    console.log('');
    logger.info('PIPELINE', 'Data from Stages 1–3 has been saved to the output/ directory.');
    process.exit(0);
  }

  // ── STAGE 4: Brevo — Send Outreach Emails ──
  const emailResults = await sendOutreach(enrichedContacts);
  saveOutput('04_email_results.json', emailResults);

  // ── FINAL SUMMARY ──
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('');
  logger.divider();
  console.log(chalk.bold.green('  PIPELINE COMPLETE'));
  logger.divider();
  console.log('');
  logger.info('PIPELINE', `Companies found:     ${companies.length}`);
  logger.info('PIPELINE', `Decision-makers:     ${contacts.length}`);
  logger.info('PIPELINE', `Emails resolved:     ${enrichedContacts.length}`);
  logger.info('PIPELINE', `Emails sent/simulated: ${emailResults.length}`);
  logger.info('PIPELINE', `Total time:          ${elapsed}s`);
  logger.info('PIPELINE', `Output directory:    ./output/`);
  console.log('');
}

module.exports = { runPipeline };
