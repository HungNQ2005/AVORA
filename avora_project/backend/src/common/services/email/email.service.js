'use strict';

const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const handlebars = require('handlebars');

// Transporter configuration from environment variables
const smtpHost = process.env.SMTP_HOST;
const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
const smtpUser = process.env.SMTP_USER;
const smtpPass = process.env.SMTP_PASS;
const smtpFrom = process.env.SMTP_FROM || smtpUser || 'no-reply@avora.com';

let transporter = null;

if (smtpHost && smtpUser && smtpPass) {
  transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });
  console.log('[Email Service] SMTP transporter initialized successfully.');
} else {
  console.warn(
    '[Email Service] SMTP credentials not fully configured. Outgoing emails will be simulated in console.'
  );
}

// In-memory template cache for compiled Handlebars templates
const templateCache = new Map();

/**
 * Compile Handlebars template with provided dynamic data.
 * @param {string} templateName - e.g. 'activation' or 'otp'
 * @param {object} templateData - Dynamic data passed to the template
 * @returns {string} Compiled HTML string
 */
const compileTemplate = (templateName, templateData = {}) => {
  // Normalize template file name
  const fileName = templateName.endsWith('Template') ? `${templateName}.hbs` : `${templateName}Template.hbs`;
  const templatePath = path.join(__dirname, 'templates', fileName);

  if (!fs.existsSync(templatePath)) {
    throw new Error(`Email template not found at path: ${templatePath}`);
  }

  let compiled = templateCache.get(fileName);
  if (!compiled) {
    const templateSource = fs.readFileSync(templatePath, 'utf8');
    compiled = handlebars.compile(templateSource);
    templateCache.set(fileName, compiled);
  }

  // Inject current year automatically if not provided
  return compiled({
    year: new Date().getFullYear(),
    ...templateData,
  });
};

/**
 * Send an email using pre-defined Handlebars template.
 * @param {object} params
 * @param {string} params.to - Recipient email address
 * @param {string} params.subject - Email subject line
 * @param {string} params.templateName - Template name ('activation', 'otp', etc.)
 * @param {object} [params.templateData] - Dynamic data passed to template
 * @returns {Promise<{ success: boolean, messageId?: string, simulated?: boolean }>}
 */
const sendMail = async ({ to, subject, templateName, templateData = {} }) => {
  try {
    const htmlContent = compileTemplate(templateName, templateData);

    if (!transporter) {
      // Fallback console simulation when SMTP is not configured
      console.log('\n[EMAIL SERVICE - SIMULATION] ========================================');
      console.log(`  To: ${to}`);
      console.log(`  Subject: ${subject}`);
      console.log(`  Template: ${templateName}`);
      console.log(`  Data:`, JSON.stringify(templateData, null, 2));
      console.log('====================================================================\n');
      return { success: true, simulated: true };
    }

    const mailOptions = {
      from: `"Avora Booking" <${smtpFrom}>`,
      to,
      subject,
      html: htmlContent,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Email Service] Email sent successfully to ${to}. MessageId: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error(`[Email Service Error] Failed to send email to ${to}:`, error.message);
    // Return failure status gracefully rather than breaking business transactions
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendMail,
  compileTemplate,
};
