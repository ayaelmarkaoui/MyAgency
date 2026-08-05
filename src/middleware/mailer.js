const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtp.gmail.com',
  port:   parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const FROM    = process.env.EMAIL_FROM    || 'Aurelia Voyage <contact@aureliavoyage.ma>';
const NOTIFY  = process.env.EMAIL_NOTIFY  || process.env.SMTP_USER;

// ── Notify admin of new submission ──────────────────────────────
async function notifyAdmin(subject, html) {
  if (!process.env.SMTP_USER) return; // skip if SMTP not configured
  try {
    await transporter.sendMail({ from: FROM, to: NOTIFY, subject, html });
  } catch (e) {
    console.warn('Email send failed (non-blocking):', e.message);
  }
}

// ── Confirmation to client ───────────────────────────────────────
async function confirmClient(to, subject, html) {
  if (!process.env.SMTP_USER || !to) return;
  try {
    await transporter.sendMail({ from: FROM, to, subject, html });
  } catch (e) {
    console.warn('Client email failed (non-blocking):', e.message);
  }
}

// ── Templates ───────────────────────────────────────────────────
function adminContactHtml(data) {
  return `<h2>📩 Nouvelle demande de devis</h2>
<table cellpadding="8" style="border-collapse:collapse;font-family:sans-serif;">
  <tr><td><b>Nom</b></td><td>${data.nom}</td></tr>
  <tr><td><b>Téléphone</b></td><td>${data.telephone}</td></tr>
  <tr><td><b>Service</b></td><td>${data.service}</td></tr>
  <tr><td><b>Message</b></td><td>${data.message || '—'}</td></tr>
  <tr><td><b>Reçu le</b></td><td>${new Date().toLocaleString('fr-MA')}</td></tr>
</table>`;
}

function adminVisaHtml(data) {
  return `<h2>🛂 Nouvelle demande visa</h2>
<table cellpadding="8" style="border-collapse:collapse;font-family:sans-serif;">
  <tr><td><b>Destination</b></td><td>${data.destination}</td></tr>
  <tr><td><b>Type de visa</b></td><td>${data.type_visa}</td></tr>
  <tr><td><b>Nationalité</b></td><td>${data.nationalite}</td></tr>
  <tr><td><b>Nom</b></td><td>${data.nom || '—'}</td></tr>
  <tr><td><b>Téléphone</b></td><td>${data.telephone || '—'}</td></tr>
  <tr><td><b>Email</b></td><td>${data.email || '—'}</td></tr>
  <tr><td><b>Reçu le</b></td><td>${new Date().toLocaleString('fr-MA')}</td></tr>
</table>`;
}

function adminOmraHtml(data) {
  return `<h2>🕌 Nouvelle réservation Omra</h2>
<table cellpadding="8" style="border-collapse:collapse;font-family:sans-serif;">
  <tr><td><b>Formule</b></td><td>${data.formule}</td></tr>
  <tr><td><b>Nom</b></td><td>${data.nom}</td></tr>
  <tr><td><b>Téléphone</b></td><td>${data.telephone}</td></tr>
  <tr><td><b>Email</b></td><td>${data.email || '—'}</td></tr>
  <tr><td><b>Nb personnes</b></td><td>${data.nb_personnes}</td></tr>
  <tr><td><b>Date départ</b></td><td>${data.date_depart || '—'}</td></tr>
  <tr><td><b>Message</b></td><td>${data.message || '—'}</td></tr>
  <tr><td><b>Reçu le</b></td><td>${new Date().toLocaleString('fr-MA')}</td></tr>
</table>`;
}

module.exports = { notifyAdmin, confirmClient, adminContactHtml, adminVisaHtml, adminOmraHtml };