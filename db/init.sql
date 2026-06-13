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
CREATE TABLE IF NOT EXISTS property_surveys (
    id SERIAL PRIMARY KEY,
    district_id INT
        REFERENCES districts(id),  -- are nullable

    ulb_id INT
        REFERENCES ulbs(id), -- are nullable

    ward_id INT
        REFERENCES wards(id), -- are nullable

    mohalla_id INT
        REFERENCES mohallas(id),

    old_ward_no TEXT,

    old_ward_name TEXT,

    old_moholla_name TEXT,

    old_house_no TEXT,

    old_owner_name TEXT,

    old_father_husband_name TEXT,

    old_house_tax NUMERIC(12,2),

    old_house_tax_arrear NUMERIC(12,2),

    house_tax_arrear_2025_26 NUMERIC(12,2),

    old_water_tax NUMERIC(12,2),

    water_tax_arrear_2025_26 NUMERIC(12,2),

    new_house_no TEXT NOT NULL,

    owner_name TEXT,

    father_husband_name TEXT,

    mobile_no VARCHAR(15),

    address TEXT,

    road_location_width TEXT,

    rate NUMERIC(12,2),

    nature_of_house TEXT,

    property_type TEXT,

    property_use_as TEXT,

    construction_year INT,

    rebate_type TEXT,

    financial_year TEXT,


    front_feet NUMERIC(10,2),

    depth_feet NUMERIC(10,2),

    total_plot_area_sqft NUMERIC(12,2),

    no_of_floors INT,

    ground_floor_area NUMERIC(12,2),

    first_floor_area NUMERIC(12,2),

    second_floor_area NUMERIC(12,2),

    third_floor_area NUMERIC(12,2),

    total_residential_area NUMERIC(12,2),

    total_commercial_area NUMERIC(12,2),

    empty_area NUMERIC(12,2),

    total_current_arv NUMERIC(12,2),

    house_tax_current NUMERIC(12,2),

    house_tax_arrear NUMERIC(12,2),

    house_tax_interest NUMERIC(12,2),

    total_house_tax NUMERIC(12,2),

    water_tax_current NUMERIC(12,2),

    water_tax_arrear NUMERIC(12,2),

    water_tax_interest NUMERIC(12,2),

    total_water_tax NUMERIC(12,2),

    photo_gps TEXT,

    street_light_photo TEXT,

    gps_location TEXT,

    remarks TEXT,

    created_by INT
        REFERENCES users(id),

    created_at TIMESTAMPTZ DEFAULT NOW(),

    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT uq_house_per_mohalla
    UNIQUE (
        district_id,
        ulb_id,
        ward_id,
        mohalla_id,
        new_house_no
    )
);

CREATE INDEX idx_users_role ON users(role);

-- =====================================================
-- INDEXES FOR FAST SEARCHING
-- =====================================================

CREATE INDEX idx_property_search
ON property_surveys (
    district_id,
    ulb_id,
    ward_id,
    mohalla_id,
    new_house_no
);

CREATE INDEX idx_property_old_house_search
ON property_surveys (
    district_id,
    ulb_id,
    ward_id,
    mohalla_id,
    old_house_no
);

CREATE INDEX idx_property_owner
ON property_surveys (owner_name);

CREATE INDEX idx_property_mobile
ON property_surveys (mobile_no);

CREATE INDEX idx_property_created_by
ON property_surveys (created_by);

CREATE INDEX idx_ward_ulb
ON wards (ulb_id);

CREATE INDEX idx_mohalla_ward
ON mohallas (ward_id);

ALTER TABLE public.property_surveys
ADD COLUMN watertank_tax_current NUMERIC,
ADD COLUMN watertank_tax_arrear NUMERIC,
ADD COLUMN watertank_tax_interest NUMERIC,
ADD COLUMN total_watertank_tax NUMERIC,
ADD COLUMN total_tax NUMERIC;