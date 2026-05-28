-- ─────────────────────────────────────────────────────────────
-- Single unified users table
-- role: 'admin' | 'surveyor'
-- Login credential: mobile + password
-- is_blocked only applies to surveyors (admins are never blocked)
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id             SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  mobile         TEXT UNIQUE NOT NULL,       -- used as login username
  password_hash  TEXT NOT NULL,              -- store bcrypt hash in production
  role           TEXT NOT NULL DEFAULT 'surveyor'
                   CHECK (role IN ('admin', 'surveyor')),
  is_blocked     BOOLEAN NOT NULL DEFAULT FALSE,  -- TRUE = surveyor cannot login
  blocked_at     TIMESTAMPTZ,
  blocked_reason TEXT,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  updated_at     TIMESTAMPTZ DEFAULT NOW()
);

-- Default admin  (mobile: 9000000000, password: admin123)
INSERT INTO users (name, mobile, password_hash, role)
VALUES ('Super Admin', '9000000000', 'admin123', 'admin')
ON CONFLICT (mobile) DO NOTHING;

-- Sample surveyor  (mobile: 9000000001, password: surveyor123)
INSERT INTO users (name, mobile, password_hash, role, is_blocked)
VALUES ('John Doe', '9000000001', 'surveyor123', 'surveyor', FALSE)
ON CONFLICT (mobile) DO NOTHING;

CREATE TABLE IF NOT EXISTS districts (
    id SERIAL PRIMARY KEY,
    district_name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS ulbs (
    id SERIAL PRIMARY KEY,

    district_id INT NOT NULL REFERENCES districts(id) ON DELETE CASCADE,

    ulb_name TEXT NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(district_id, ulb_name)
);
CREATE TABLE IF NOT EXISTS wards (
    id SERIAL PRIMARY KEY,

    district_id INT NOT NULL REFERENCES districts(id) ON DELETE CASCADE,

    ulb_id INT NOT NULL REFERENCES ulbs(id) ON DELETE CASCADE,

    ward_no TEXT NOT NULL,

    ward_name TEXT NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(ulb_id, ward_no)
);
CREATE TABLE IF NOT EXISTS mohallas (
    id SERIAL PRIMARY KEY,

    ward_id INT NOT NULL REFERENCES wards(id) ON DELETE CASCADE,

    mohalla_name TEXT NOT NULL,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(ward_id, mohalla_name)
);