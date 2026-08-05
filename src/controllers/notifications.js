const pool = require('../db/pool');

/* SSE clients map — admin_id → res */
const sseClients = new Map();

/* ── SSE stream endpoint ─────────────────────────────────────
   GET /api/admin/notifications/stream
   Le panel admin s'y connecte une fois et reçoit les events en live.
──────────────────────────────────────────────────────────── */
function stream(req, res) {
  res.setHeader('Content-Type',  'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection',    'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Nginx compatibility
  res.flushHeaders();

  const clientId = req.admin.id + '_' + Date.now();
  sseClients.set(clientId, res);

  // Send initial ping so browser knows it's connected
  res.write(`event: connected\ndata: {"clientId":"${clientId}"}\n\n`);

  // Keep-alive every 25s
  const keepAlive = setInterval(() => {
    res.write(': ping\n\n');
  }, 25000);

  req.on('close', () => {
    clearInterval(keepAlive);
    sseClients.delete(clientId);
  });
}

/* ── Broadcast to all connected admin clients ──────────────── */
function broadcast(event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  sseClients.forEach((res) => {
    try { res.write(payload); } catch (_) {}
  });
}

/* ── GET /api/admin/notifications ───────────────────────────── */
async function list(req, res) {
  const { unread_only, limit = 40, page = 1 } = req.query;
  const offset = (page - 1) * limit;
  const conditions = [];
  if (unread_only === 'true') conditions.push('is_read = FALSE');
  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  try {
    const { rows } = await pool.query(
      `SELECT * FROM notifications ${where} ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    const { rows: countRows } = await pool.query(
      `SELECT COUNT(*) FROM notifications ${where}`
    );
    const { rows: unreadRows } = await pool.query(
      `SELECT COUNT(*) FROM notifications WHERE is_read = FALSE`
    );
    return res.json({
      data:         rows,
      total:        parseInt(countRows[0].count),
      unread_count: parseInt(unreadRows[0].count),
      page:         parseInt(page),
    });
  } catch (err) {
    console.error('list notifications error:', err);
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
}

/* ── PATCH /api/admin/notifications/:id/read ────────────────── */
async function markRead(req, res) {
  const { id } = req.params;
  try {
    await pool.query(
      'UPDATE notifications SET is_read = TRUE WHERE id = $1',
      [id]
    );
    const { rows } = await pool.query(
      'SELECT COUNT(*) FROM notifications WHERE is_read = FALSE'
    );
    broadcast('unread_count', { count: parseInt(rows[0].count) });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
}

/* ── PATCH /api/admin/notifications/read-all ────────────────── */
async function markAllRead(req, res) {
  try {
    await pool.query('UPDATE notifications SET is_read = TRUE WHERE is_read = FALSE');
    broadcast('unread_count', { count: 0 });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
}

/* ── DELETE /api/admin/notifications/:id ────────────────────── */
async function deleteOne(req, res) {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM notifications WHERE id = $1', [id]);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
}

/* ── DELETE /api/admin/notifications ───────────────────────── */
async function deleteAll(req, res) {
  try {
    await pool.query('DELETE FROM notifications');
    broadcast('unread_count', { count: 0 });
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Erreur serveur.' });
  }
}

module.exports = { stream, broadcast, list, markRead, markAllRead, deleteOne, deleteAll };