const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  // Support token via query param for SSE (EventSource can't set headers)
  const authHeader = req.headers['authorization'];
  const token = (authHeader && authHeader.split(' ')[1]) || req.query.token;

  if (!token) {
    return res.status(401).json({ error: 'Token manquant. Veuillez vous connecter.' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = payload;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token invalide ou expiré.' });
  }
}

module.exports = { requireAuth };