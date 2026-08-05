require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const pool = require('./pool');

const migration = `
-- ─── Notifications table ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type        VARCHAR(30)  NOT NULL,  -- 'new_contact' | 'new_visa' | 'new_omra' | 'status_change' | 'note_added'
  category    VARCHAR(20)  NOT NULL,  -- 'contact' | 'visa' | 'omra'
  ref_id      UUID         NOT NULL,  -- ID de la demande concernée
  title       VARCHAR(200) NOT NULL,
  body        TEXT         NOT NULL,
  is_read     BOOLEAN      NOT NULL DEFAULT FALSE,
  email_sent  BOOLEAN      NOT NULL DEFAULT FALSE,
  metadata    JSONB,                  -- données extras (ancien statut, nouveau statut, etc.)
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_is_read    ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_category   ON notifications(category);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('⏳  Running notifications migration…');
    await client.query(migration);
    console.log('✅  notifications table ready.');
  } catch (err) {
    console.error('❌  Migration error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();