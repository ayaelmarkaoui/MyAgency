require('dotenv').config();
const express    = require('express');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const rateLimit  = require('express-rate-limit');
const path       = require('path');

const routes = require('./routes');

const app  = express();
const PORT = process.env.PORT || 3001;

// ─── Security ────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc:  ["'self'"],
      scriptSrc:   ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://fonts.googleapis.com"],
      styleSrc:    ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
      fontSrc:     ["'self'", "https://fonts.gstatic.com"],
      imgSrc:      ["'self'", "data:", "https://images.unsplash.com", "https://*"],
      connectSrc:  ["'self'", "http://localhost:3001", "ws://localhost:3001"],
      frameSrc:    ["'none'"],
      objectSrc:   ["'none'"],
    },
  },
}));
 
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, Postman, server-to-server)
    if (!origin) return cb(null, true);
    if (allowedOrigins.length === 0 || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin ${origin} not allowed`));
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));
// ─── Rate limiting ───────────────────────────────────────────
const publicLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 30,
  message: { error: 'Trop de requêtes, veuillez patienter 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const adminLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use('/api/contact', publicLimiter);
app.use('/api/visa',    publicLimiter);
app.use('/api/omra',    publicLimiter);
app.use('/api/admin',   adminLimiter);

// ─── Body / logging ─────────────────────────────────────────
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

// ─── API Routes ──────────────────────────────────────────────
app.use('/api', routes);

// ─── Admin Panel (static HTML) ───────────────────────────────
app.use('/admin', express.static(path.join(__dirname, '../admin/public')));
app.get('/admin*', (req, res) => {
  res.sendFile(path.join(__dirname, '../admin/public/admin.html'));
});
// ───────────────public web─────────────────────────────────────
app.use(express.static(path.join(__dirname, '..')));
app.get('/aurelia_voyage', (req, res) => {
  res.sendFile(path.join(__dirname, '../index.html'));
});
// ─── Health check ────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ─── 404 ─────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ error: 'Route introuvable.' }));

// ─── Global error handler ────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Erreur serveur interne.' });
});

// ─── Start ───────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n🚀  Aurelia Voyage API running on http://localhost:${PORT}`);
  console.log(`📊  Admin panel: http://localhost:${PORT}/admin`);
  console.log(`🔍  Health: http://localhost:${PORT}/health\n`);
});