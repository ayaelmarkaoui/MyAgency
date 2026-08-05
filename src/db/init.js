require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const pool = require('./pool');
const bcrypt = require('bcryptjs');

const schema = `
-- ─── Extensions ───────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Contact / Devis requests ─────────────────────────────────
CREATE TABLE IF NOT EXISTS contact_requests (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  nom         VARCHAR(120) NOT NULL,
  telephone   VARCHAR(30)  NOT NULL,
  service     VARCHAR(80)  NOT NULL,
  message     TEXT,
  status      VARCHAR(20)  NOT NULL DEFAULT 'nouveau',   -- nouveau | en_cours | traite | archive
  notes       TEXT,                                       -- internal admin notes
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── Visa requests ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS visa_requests (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  destination   VARCHAR(120) NOT NULL,
  type_visa     VARCHAR(80)  NOT NULL,
  nationalite   VARCHAR(80)  NOT NULL,
  nom           VARCHAR(120),
  telephone     VARCHAR(30),
  email         VARCHAR(160),
  status        VARCHAR(20)  NOT NULL DEFAULT 'nouveau',
  notes         TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── Omra / Hajj reservations ─────────────────────────────────
CREATE TABLE IF NOT EXISTS omra_reservations (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  formule       VARCHAR(80)  NOT NULL,   -- '7 jours' | '10 jours' | etc.
  nom           VARCHAR(120) NOT NULL,
  telephone     VARCHAR(30)  NOT NULL,
  email         VARCHAR(160),
  nb_personnes  SMALLINT     NOT NULL DEFAULT 1,
  date_depart   DATE,
  message       TEXT,
  status        VARCHAR(20)  NOT NULL DEFAULT 'nouveau',
  notes         TEXT,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── Admin users ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS admins (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         VARCHAR(160) UNIQUE NOT NULL,
  password_hash TEXT         NOT NULL,
  nom           VARCHAR(120),
  role          VARCHAR(20)  NOT NULL DEFAULT 'admin',
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- ─── Auto-update updated_at ───────────────────────────────────
CREATE OR REPLACE FUNCTION trigger_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_contact') THEN
    CREATE TRIGGER set_updated_at_contact
      BEFORE UPDATE ON contact_requests
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_visa') THEN
    CREATE TRIGGER set_updated_at_visa
      BEFORE UPDATE ON visa_requests
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_omra') THEN
    CREATE TRIGGER set_updated_at_omra
      BEFORE UPDATE ON omra_reservations
      FOR EACH ROW EXECUTE FUNCTION trigger_set_updated_at();
  END IF;
END $$;
`;

async function init() {
  const client = await pool.connect();
  try {
    console.log('⏳  Initializing database schema…');
    await client.query(schema);
    console.log('✅  Schema created.');

    // Seed default admin
    const email    = process.env.ADMIN_EMAIL    || 'admin@aureliavoyage.ma';
    const password = process.env.ADMIN_PASSWORD || 'ChangeMe123!';
    const hash     = await bcrypt.hash(password, 12);

    await client.query(`
      INSERT INTO admins (email, password_hash, nom, role)
      VALUES ($1, $2, 'Super Admin', 'admin')
      ON CONFLICT (email) DO NOTHING;
    `, [email, hash]);

    console.log(`✅  Default admin seeded: ${email}`);
    console.log('🎉  Database ready.');
  } catch (err) {
    console.error('❌  Init error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

init();