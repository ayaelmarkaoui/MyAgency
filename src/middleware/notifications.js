const pool   = require('../db/pool');
const mailer = require('./mailer');

/* ── Icônes et labels par type ─────────────────────────────── */
const TYPE_META = {
  new_contact:   { icon: '✉️',  label: 'Nouveau devis',         color: '#1AA3C9' },
  new_visa:      { icon: '🛂',  label: 'Nouvelle demande visa', color: '#D4AF55' },
  new_omra:      { icon: '🕌',  label: 'Nouvelle réservation Omra', color: '#E8A030' },
  status_change: { icon: '🔄',  label: 'Statut modifié',        color: '#3DBA7A' },
  note_added:    { icon: '📝',  label: 'Note ajoutée',          color: '#9B8EC4' },
};

const STATUS_FR = {
  nouveau: 'Nouveau', en_cours: 'En cours', traite: 'Traité', archive: 'Archivé',
};

/* ── Créer une notification en DB + envoyer email ─────────── */
async function createNotification({ type, category, ref_id, title, body, metadata = {} }) {
  try {
    // 1. Insérer en base
    const { rows } = await pool.query(
      `INSERT INTO notifications (type, category, ref_id, title, body, metadata)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [type, category, ref_id, title, body, JSON.stringify(metadata)]
    );
    const notif = rows[0];

    // 2. Envoyer email admin (fire-and-forget)
    sendEmailNotification(notif).catch(err =>
      console.warn('Email notification failed (non-blocking):', err.message)
    );

    return notif;
  } catch (err) {
    console.error('createNotification error:', err.message);
  }
}

/* ── Email HTML template ───────────────────────────────────── */
async function sendEmailNotification(notif) {
  if (!process.env.SMTP_USER) return;
  const meta  = TYPE_META[notif.type] || { icon: '🔔', label: 'Notification', color: '#D4AF55' };
  const html  = `
<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#06102A;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#06102A;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#0D1E42;border:1px solid rgba(212,175,85,.28);border-radius:12px;overflow:hidden;max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#0D1E42,#132552);padding:24px 32px;border-bottom:1px solid rgba(212,175,85,.20);">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div style="font-size:22px;font-weight:700;color:#E8CC7A;letter-spacing:.02em;">Aurelia Voyage</div>
                  <div style="font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:rgba(246,241,230,.45);margin-top:3px;">Espace Administration</div>
                </td>
                <td align="right">
                  <div style="font-size:28px;">${meta.icon}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Type badge -->
        <tr>
          <td style="padding:24px 32px 8px;">
            <span style="display:inline-block;background:${meta.color}22;border:1px solid ${meta.color}55;color:${meta.color};font-size:11px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;padding:5px 13px;border-radius:3px;">
              ${meta.label}
            </span>
          </td>
        </tr>

        <!-- Title -->
        <tr>
          <td style="padding:8px 32px 6px;">
            <div style="font-size:20px;font-weight:600;color:#F6F1E6;line-height:1.3;">${notif.title}</div>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:8px 32px 24px;">
            <div style="font-size:14px;color:rgba(246,241,230,.65);line-height:1.65;">${notif.body}</div>
          </td>
        </tr>

        <!-- Metadata -->
        ${notif.metadata && Object.keys(notif.metadata).length ? `
        <tr>
          <td style="padding:0 32px 24px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(246,241,230,.05);border:1px solid rgba(212,175,85,.18);border-radius:6px;overflow:hidden;">
              ${Object.entries(notif.metadata).filter(([k]) => k !== 'ref_type').map(([k, v]) => `
              <tr>
                <td style="padding:9px 16px;font-size:11px;font-weight:600;letter-spacing:.12em;text-transform:uppercase;color:#D4AF55;border-bottom:1px solid rgba(212,175,85,.10);white-space:nowrap;width:130px;">${k}</td>
                <td style="padding:9px 16px;font-size:13px;color:rgba(246,241,230,.80);border-bottom:1px solid rgba(212,175,85,.10);">${v}</td>
              </tr>`).join('')}
            </table>
          </td>
        </tr>` : ''}

        <!-- CTA -->
        <tr>
          <td style="padding:0 32px 32px;">
            <a href="${process.env.ADMIN_URL || 'http://localhost:3001/admin'}"
               style="display:inline-block;background:linear-gradient(135deg,#D4AF55,#E8CC7A);color:#06102A;font-size:12px;font-weight:600;letter-spacing:.14em;text-transform:uppercase;padding:12px 24px;border-radius:4px;text-decoration:none;">
              Voir dans le panel →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid rgba(212,175,85,.15);">
            <div style="font-size:11px;color:rgba(246,241,230,.30);">
              Aurelia Voyage · Notification automatique · ${new Date().toLocaleString('fr-MA')}
            </div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;

  await mailer.notifyAdmin(
    `${TYPE_META[notif.type]?.icon || '🔔'} ${notif.title}`,
    html
  );

  // Marquer email comme envoyé
  await pool.query('UPDATE notifications SET email_sent = TRUE WHERE id = $1', [notif.id]);
}

/* ══════════════════════════════════════════════════════════════
   HELPERS : créer les notifications métier
══════════════════════════════════════════════════════════════ */

async function notifyNewContact(row) {
  return createNotification({
    type: 'new_contact', category: 'contact', ref_id: row.id,
    title: `Nouveau devis — ${row.nom}`,
    body: `${row.nom} demande un devis pour le service "${row.service}".`,
    metadata: { Nom: row.nom, Téléphone: row.telephone, Service: row.service, Message: row.message || '—' },
  });
}

async function notifyNewVisa(row) {
  return createNotification({
    type: 'new_visa', category: 'visa', ref_id: row.id,
    title: `Nouvelle demande visa — ${row.destination}`,
    body: `${row.nom || 'Un client'} demande un visa ${row.type_visa} pour ${row.destination}.`,
    metadata: { Destination: row.destination, 'Type de visa': row.type_visa, Nationalité: row.nationalite, Téléphone: row.telephone || '—' },
  });
}

async function notifyNewOmra(row) {
  return createNotification({
    type: 'new_omra', category: 'omra', ref_id: row.id,
    title: `Nouvelle réservation Omra — ${row.formule}`,
    body: `${row.nom} réserve la formule "${row.formule}" pour ${row.nb_personnes} personne(s).`,
    metadata: { Nom: row.nom, Formule: row.formule, Téléphone: row.telephone, Personnes: row.nb_personnes, Départ: row.date_depart || '—' },
  });
}

async function notifyStatusChange(category, row, oldStatus, newStatus) {
  return createNotification({
    type: 'status_change', category, ref_id: row.id,
    title: `Statut modifié — ${row.nom || row.destination || row.formule || row.id}`,
    body: `Le statut est passé de "${STATUS_FR[oldStatus] || oldStatus}" à "${STATUS_FR[newStatus] || newStatus}".`,
    metadata: {
      Catégorie: category,
      'Ancien statut': STATUS_FR[oldStatus] || oldStatus,
      'Nouveau statut': STATUS_FR[newStatus] || newStatus,
    },
  });
}

async function notifyNoteAdded(category, row, note) {
  return createNotification({
    type: 'note_added', category, ref_id: row.id,
    title: `Note ajoutée — ${row.nom || row.destination || row.formule || row.id}`,
    body: `Une note interne a été ajoutée.`,
    metadata: { Catégorie: category, Note: note.substring(0, 120) + (note.length > 120 ? '…' : '') },
  });
}

module.exports = {
  createNotification,
  notifyNewContact,
  notifyNewVisa,
  notifyNewOmra,
  notifyStatusChange,
  notifyNoteAdded,
};