const nodemailer = require('nodemailer');

function getSmtpConfig() {
  const host = String(process.env.SMTP_HOST || '').trim();
  const port = Number(process.env.SMTP_PORT || 0) || 0;
  const user = String(process.env.SMTP_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || '').trim();
  const from = String(process.env.SMTP_FROM || '').trim();

  if (!host || !port || !user || !pass || !from) return null;
  return { host, port, user, pass, from };
}

function hasSmtpConfig() {
  return Boolean(getSmtpConfig());
}

let _transporter = null;

function getTransporter() {
  if (_transporter) return _transporter;
  const cfg = getSmtpConfig();
  if (!cfg) return null;

  _transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    auth: { user: cfg.user, pass: cfg.pass },
  });

  return _transporter;
}

async function sendMail({ to, subject, text, html }) {
  const cfg = getSmtpConfig();
  const transporter = getTransporter();

  // Allow the app to run without SMTP (dev / early stage). In this case we just log.
  if (!cfg || !transporter) {
    console.log('[mailer] SMTP is not configured, skipping email send:', { to, subject });
    if (text) console.log('[mailer] text preview:', String(text).slice(0, 500));
    return { ok: false, skipped: true };
  }

  const info = await transporter.sendMail({
    from: cfg.from,
    to,
    subject,
    text,
    html,
  });

  return { ok: true, messageId: info && info.messageId ? info.messageId : null };
}

module.exports = { sendMail, hasSmtpConfig };
