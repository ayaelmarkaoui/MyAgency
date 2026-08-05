const pool = require('../db/pool');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// POST /api/admin/login
async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(422).json({ error: 'Email et mot de passe requis.' });

  try {
    const { rows } = await pool.query('SELECT * FROM admins WHERE email = $1', [email.toLowerCase().trim()]);
    if (!rows.length) return res.status(401).json({ error: 'Identifiants invalides.' });

    const admin = rows[0];
    const match = await bcrypt.compare(password, admin.password_hash);
    if (!match) return res.status(401).json({ error: 'Identifiants invalides.' });

    const token = jwt.sign(
      { id: admin.id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    return res.json({
      token,
      admin: { id: admin.id, email: admin.email, nom: admin.nom, role: admin.role }
    });
  } catch (err) {
    console.error('login error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
}

// GET /api/admin/stats  (admin)
async function stats(req, res) {
  try {
    const [contacts, visas, omras] = await Promise.all([
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'nouveau')   AS nouveau,
          COUNT(*) FILTER (WHERE status = 'en_cours')  AS en_cours,
          COUNT(*) FILTER (WHERE status = 'traite')    AS traite,
          COUNT(*)                                      AS total
        FROM contact_requests
      `),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'nouveau')   AS nouveau,
          COUNT(*) FILTER (WHERE status = 'en_cours')  AS en_cours,
          COUNT(*) FILTER (WHERE status = 'traite')    AS traite,
          COUNT(*)                                      AS total
        FROM visa_requests
      `),
      pool.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'nouveau')   AS nouveau,
          COUNT(*) FILTER (WHERE status = 'en_cours')  AS en_cours,
          COUNT(*) FILTER (WHERE status = 'traite')    AS traite,
          COUNT(*)                                      AS total
        FROM omra_reservations
      `),
    ]);

    // Recent 7 days activity
    const { rows: recent } = await pool.query(`
      SELECT date_trunc('day', created_at) AS day, COUNT(*) AS count, 'contact' AS type
        FROM contact_requests WHERE created_at > NOW() - INTERVAL '7 days' GROUP BY 1
      UNION ALL
      SELECT date_trunc('day', created_at), COUNT(*), 'visa'
        FROM visa_requests WHERE created_at > NOW() - INTERVAL '7 days' GROUP BY 1
      UNION ALL
      SELECT date_trunc('day', created_at), COUNT(*), 'omra'
        FROM omra_reservations WHERE created_at > NOW() - INTERVAL '7 days' GROUP BY 1
      ORDER BY day DESC
    `);

    return res.json({
      contacts:  contacts.rows[0],
      visas:     visas.rows[0],
      omras:     omras.rows[0],
      recent,
    });
  } catch (err) {
    console.error('stats error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
}

module.exports = { login, stats };