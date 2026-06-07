/**
 * brevo.js — Stage 4: Send Personalized Outreach Emails
 *
 * Takes contacts with verified emails from Stage 3 and sends
 * personalized outreach emails via the Brevo Transactional Email API.
 *
 * API Reference: https://developers.brevo.com/reference/sendtransacemail
 * Auth: api-key header
 * Endpoint: POST https://api.brevo.com/v3/smtp/email
 *
 * ─────────────────────────────────────────────────────────────
 * SEND_EMAILS toggle (from .env):
 *   false → DRY RUN: logs what would be sent, no actual email, no credits used
 *   true  → LIVE: actually sends emails via Brevo API
 * ─────────────────────────────────────────────────────────────
 */

const logger = require('../utils/logger');
const { requestWithRetry, sleep } = require('../utils/helpers');

const STAGE = 'BREVO';
const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

/**
 * Generate personalized email HTML for a contact
 * @param {object} contact - Contact with email, name, title, company info
 * @param {string} senderName - Sender's display name
 * @returns {{subject: string, htmlContent: string}}
 */
function generateEmailContent(contact, senderName) {
  const firstName = contact.firstName || contact.fullName.split(' ')[0] || 'there';
  const companyName = contact.companyName || 'your company';
  const title = contact.title || 'your role';

  const subject = `Quick question for ${firstName} at ${companyName}`;

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a1a; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; }
    .highlight { color: #2563eb; font-weight: 600; }
    .cta { display: inline-block; margin-top: 16px; padding: 10px 24px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; font-weight: 500; }
    .signature { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 14px; }
  </style>
</head>
<body>
  <p>Hi ${firstName},</p>

  <p>I noticed you're ${title} at <span class="highlight">${companyName}</span> — really impressive work your team is doing.</p>

  <p>We've been helping companies like ${companyName} streamline their outreach operations and have seen some incredible results — teams saving 10+ hours a week while improving response rates by 3x.</p>

  <p>I'd love to share a quick idea that could be relevant to what you're building. Would you be open to a 15-minute chat this week?</p>

  <a href="mailto:${process.env.SENDER_EMAIL}?subject=Re: ${subject}" class="cta">Let's Chat →</a>

  <div class="signature">
    <p>Best,<br>
    <strong>${senderName}</strong><br>
    ${process.env.SENDER_EMAIL || ''}</p>
  </div>
</body>
</html>`;

  return { subject, htmlContent };
}

/**
 * Send outreach emails to a list of contacts
 *
 * @param {Array<{email: string, firstName: string, fullName: string, title: string, companyName: string}>} contacts
 * @returns {Promise<Array<{contact: object, status: string, messageId?: string}>>}
 */
async function sendOutreach(contacts) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.SENDER_EMAIL;
  const senderName = process.env.SENDER_NAME || 'Outreach Pipeline';
  const isDryRun = process.env.SEND_EMAILS !== 'true';

  if (!isDryRun && (!apiKey || apiKey === 'your_brevo_api_key_here')) {
    throw new Error('BREVO_API_KEY is not set in .env (required when SEND_EMAILS=true)');
  }

  if (!senderEmail || senderEmail === 'you@yourdomain.com') {
    throw new Error('SENDER_EMAIL is not set in .env');
  }

  logger.stageHeader(4, 'Brevo — Send Personalized Outreach');

  if (isDryRun) {
    logger.warn(STAGE, 'DRY RUN MODE (SEND_EMAILS=false)');
    logger.warn(STAGE, 'Emails will be simulated — no actual sends, no credits used.');
    logger.warn(STAGE, 'Set SEND_EMAILS=true in .env to send real emails.');
  } else {
    logger.info(STAGE, 'LIVE MODE (SEND_EMAILS=true) — emails will actually be sent!');
  }

  console.log('');
  logger.info(STAGE, `Processing ${contacts.length} recipients...`);

  const results = [];

  for (let i = 0; i < contacts.length; i++) {
    const contact = contacts[i];
    const { subject, htmlContent } = generateEmailContent(contact, senderName);

    logger.info(STAGE, `[${i + 1}/${contacts.length}] → ${contact.fullName} <${contact.email}>`);
    logger.info(STAGE, `  Subject: "${subject}"`);

    if (isDryRun) {
      // ─── DRY RUN: Simulate ───
      logger.success(STAGE, `  Email "sent" (DRY RUN — not actually sent)`);
      results.push({
        contact,
        status: 'SIMULATED',
        messageId: `dry-run-${Date.now()}-${i}`,
        subject,
      });
    } else {
      // ─── LIVE: Actually send via Brevo ───
      try {
        const response = await requestWithRetry({
          method: 'POST',
          url: BREVO_API_URL,
          headers: {
            'api-key': apiKey,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          data: {
            sender: {
              name: senderName,
              email: senderEmail,
            },
            to: [
              {
                email: contact.email,
                name: contact.fullName,
              },
            ],
            subject,
            htmlContent,
          },
        }, STAGE);

        const messageId = response.data?.messageId || 'unknown';
        logger.success(STAGE, `  Email sent! Message ID: ${messageId}`);
        results.push({
          contact,
          status: 'SENT',
          messageId,
          subject,
        });
      } catch (err) {
        logger.error(STAGE, `  Failed to send: ${err.message}`);
        results.push({
          contact,
          status: 'FAILED',
          error: err.message,
          subject,
        });
      }

      // Delay between sends to avoid rate limits
      if (i < contacts.length - 1) {
        await sleep(1000);
      }
    }
  }

  // ─── Summary ───
  console.log('');
  logger.divider();
  const sent = results.filter((r) => r.status === 'SENT').length;
  const simulated = results.filter((r) => r.status === 'SIMULATED').length;
  const failed = results.filter((r) => r.status === 'FAILED').length;

  if (isDryRun) {
    logger.success(STAGE, `DRY RUN complete: ${simulated} emails simulated`);
  } else {
    logger.success(STAGE, `Sent: ${sent} | Failed: ${failed}`);
  }

  return results;
}

module.exports = { sendOutreach, generateEmailContent };
