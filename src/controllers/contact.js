const pool   = require('../db/pool');
const { validationResult } = require('express-validator');
const { notifyAdmin, adminContactHtml } = require('../middleware/mailer');
const notif  = require('../middleware/notifications');
const { broadcast } = require('./notifications');

// POST /api/contact
async function createContact(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const { nom, telephone, service, message } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO contact_requests (nom, telephone, service, message)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [nom.trim(), telephone.trim(), service.trim(), (message || '').trim()]
    );
    const row = rows[0];

    // Notification + email
    const n = await notif.notifyNewContact(row);
    if (n) broadcast('new_notification', n);

    return res.status(201).json({ success: true, id: row.id, message: 'Demande reçue. Nous vous contactons sous 24h.' });
  } catch (err) {
    console.error('createContact error:', err);
    return res.status(500).json({ error: 'Erreur serveur. Veuillez réessayer.' });
  }
}

// GET /api/admin/contacts
async function listContacts(req, res) {
  const { status, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const conditions = [], values = [];
  if (status) { conditions.push(`status = $${values.length + 1}`); values.push(status); }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  try {
    const { rows } = await pool.query(
      `SELECT * FROM contact_requests ${where} ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );
    const { rows: countRows } = await pool.query(`SELECT COUNT(*) FROM contact_requests ${where}`, values);
    return res.json({ data: rows, total: parseInt(countRows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    console.error('listContacts error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
}

// PATCH /api/admin/contacts/:id
async function updateContact(req, res) {
  const { id } = req.params;
  const { status, notes } = req.body;
  const allowed = ['nouveau', 'en_cours', 'traite', 'archive'];
  if (status && !allowed.includes(status)) return res.status(422).json({ error: 'Statut invalide.' });

  try {
    // Fetch old row to compare
    const { rows: old } = await pool.query('SELECT * FROM contact_requests WHERE id = $1', [id]);
    if (!old.length) return res.status(404).json({ error: 'Demande introuvable.' });

    const { rows } = await pool.query(
      `UPDATE contact_requests SET
        status = COALESCE($1, status),
        notes  = COALESCE($2, notes)
       WHERE id = $3 RETURNING *`,
      [status || null, notes || null, id]
    );
    const updated = rows[0];

    // Fire notifications
    if (status && status !== old[0].status) {
      const n = await notif.notifyStatusChange('contact', updated, old[0].status, status);
      if (n) broadcast('new_notification', n);
    }
    if (notes && notes !== old[0].notes) {
      const n = await notif.notifyNoteAdded('contact', updated, notes);
      if (n) broadcast('new_notification', n);
    }

    return res.json({ data: updated });
  } catch (err) {
    console.error('updateContact error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
}

module.exports = { createContact, listContacts, updateContact };