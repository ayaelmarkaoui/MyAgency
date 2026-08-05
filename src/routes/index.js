const router = require('express').Router();
const { body } = require('express-validator');
const { requireAuth } = require('../middleware/auth');

const contact = require('../controllers/contact');
const visa    = require('../controllers/visa');
const omra    = require('../controllers/omra');
const admin   = require('../controllers/admin');
const notifs  = require('../controllers/notifications');

// ── PUBLIC ──────────────────────────────────────────────────
router.post('/contact',
  [body('nom').trim().notEmpty(), body('telephone').trim().notEmpty(), body('service').trim().notEmpty(), body('message').optional().trim()],
  contact.createContact
);
router.post('/visa',
  [body('destination').trim().notEmpty(), body('type_visa').trim().notEmpty(), body('nationalite').trim().notEmpty(),
   body('nom').optional().trim(), body('telephone').optional().trim(), body('email').optional().isEmail()],
  visa.createVisa
);
router.post('/omra',
  [body('formule').trim().notEmpty(), body('nom').trim().notEmpty(), body('telephone').trim().notEmpty(),
   body('email').optional().isEmail(), body('nb_personnes').optional().isInt({ min:1, max:50 }), body('date_depart').optional().isDate(), body('message').optional().trim()],
  omra.createOmra
);

// ── ADMIN AUTH ───────────────────────────────────────────────
router.post('/admin/login', admin.login);

// ── ADMIN PROTECTED ─────────────────────────────────────────
router.get('/admin/stats',                            requireAuth, admin.stats);

router.get('/admin/contacts',                         requireAuth, contact.listContacts);
router.patch('/admin/contacts/:id',                   requireAuth, contact.updateContact);

router.get('/admin/visas',                            requireAuth, visa.listVisas);
router.patch('/admin/visas/:id',                      requireAuth, visa.updateVisa);

router.get('/admin/omra',                             requireAuth, omra.listOmra);
router.patch('/admin/omra/:id',                       requireAuth, omra.updateOmra);

// ── NOTIFICATIONS ────────────────────────────────────────────
router.get('/admin/notifications/stream',             requireAuth, notifs.stream);
router.get('/admin/notifications',                    requireAuth, notifs.list);
router.patch('/admin/notifications/read-all',         requireAuth, notifs.markAllRead);
router.patch('/admin/notifications/:id/read',         requireAuth, notifs.markRead);
router.delete('/admin/notifications',                 requireAuth, notifs.deleteAll);
router.delete('/admin/notifications/:id',             requireAuth, notifs.deleteOne);

module.exports = router;