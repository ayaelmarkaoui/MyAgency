const pool   = require('../db/pool');
const { validationResult } = require('express-validator');
const notif  = require('../middleware/notifications');
const { broadcast } = require('./notifications');

async function createOmra(req, res) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

  const { formule, nom, telephone, email, nb_personnes, date_depart, message } = req.body;
  try {
    const { rows } = await pool.query(
      `INSERT INTO omra_reservations (formule, nom, telephone, email, nb_personnes, date_depart, message)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [formule.trim(), nom.trim(), telephone.trim(),
       (email||'').trim(), nb_personnes||1, date_depart||null, (message||'').trim()]
    );
    const row = rows[0];
    const n = await notif.notifyNewOmra(row);
    if (n) broadcast('new_notification', n);
    return res.status(201).json({ success: true, id: row.id, message: 'Réservation reçue. Notre équipe vous contacte rapidement.' });
  } catch (err) {
    console.error('createOmra error:', err);
    return res.status(500).json({ error: 'Erreur serveur. Veuillez réessayer.' });
  }
}

async function listOmra(req, res) {
  const { status, formule, page = 1, limit = 20 } = req.query;
  const offset = (page - 1) * limit;
  const conditions = [], values = [];
  if (status)  { conditions.push(`status = $${values.length + 1}`);  values.push(status); }
  if (formule) { conditions.push(`formule = $${values.length + 1}`); values.push(formule); }
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
  try {
    const { rows } = await pool.query(
      `SELECT * FROM omra_reservations ${where} ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );
    const { rows: countRows } = await pool.query(`SELECT COUNT(*) FROM omra_reservations ${where}`, values);
    return res.json({ data: rows, total: parseInt(countRows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
}

async function updateOmra(req, res) {
  const { id } = req.params;
  const { status, notes } = req.body;
  const allowed = ['nouveau', 'en_cours', 'traite', 'archive'];
  if (status && !allowed.includes(status)) return res.status(422).json({ error: 'Statut invalide.' });
  try {
    const { rows: old } = await pool.query('SELECT * FROM omra_reservations WHERE id = $1', [id]);
    if (!old.length) return res.status(404).json({ error: 'Réservation introuvable.' });
    const { rows } = await pool.query(
      `UPDATE omra_reservations SET status = COALESCE($1, status), notes = COALESCE($2, notes) WHERE id = $3 RETURNING *`,
      [status||null, notes||null, id]
    );
    const updated = rows[0];
    if (status && status !== old[0].status) {
      const n = await notif.notifyStatusChange('omra', updated, old[0].status, status);
      if (n) broadcast('new_notification', n);
    }
    if (notes && notes !== old[0].notes) {
      const n = await notif.notifyNoteAdded('omra', updated, notes);
      if (n) broadcast('new_notification', n);
    }
    return res.json({ data: updated });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
}

module.exports = { createOmra, listOmra, updateOmra };