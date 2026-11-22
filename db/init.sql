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

ALTER TABLE public.property_surveys
ADD COLUMN watertank_present BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE public.surveyor_s_submissions (
    id BIGSERIAL PRIMARY KEY,

    "ulbName" TEXT,
    district TEXT,
    "mohallaName" TEXT,
    "wardNoOrName" TEXT,
    "propertyId" TEXT,
    "houseNo" TEXT,
    "ownerName" TEXT,
    "fatherOrHusbandName" TEXT,
    "membersInHouse" INTEGER,
    address TEXT,
    "mobileNo" TEXT,
    "natureOfHouse" TEXT,

    "WidthofRoadInFront" TEXT,
    "Typeofconstruction" TEXT,
    "Useofhouse" TEXT,

    "frontWidthofPlotInFeet" NUMERIC,
    "depthofPlotInFeet" NUMERIC,
    "totalAreaInFeet" NUMERIC,
    "builtUpArea" NUMERIC,
    "openArea" NUMERIC,

    ifmixed TEXT,

    "firstFloorArea" NUMERIC,
    "secondFloorArea" NUMERIC,
    "thirdFloorArea" NUMERIC,
    "fourthFloorArea" NUMERIC,

    "commercialArea" NUMERIC,
    "totalBuiltUpArea" NUMERIC,

    "occupancyStatus" TEXT,

    "frontPhotoUrl" TEXT,
    "rightSidePhotoUrl" TEXT,
    "leftSidePhotoUrl" TEXT,

    "dataLat" NUMERIC,
    "dataLng" NUMERIC,

    "waterConnection" TEXT,
    "sewerConnection" TEXT,

    "submittedAt" TEXT,

    remarks TEXT,

    "updatedAt" TIMESTAMP WITHOUT TIME ZONE,
    "updatedBy" BIGINT,

    "floorNo" TEXT
);

CREATE TABLE public."Taru" (
    id BIGSERIAL PRIMARY KEY,

    "ulbName" TEXT,
    district TEXT,
    "mohallaName" TEXT,
    "wardNoOrName" TEXT,
    "propertyId" TEXT,
    "houseNo" TEXT,
    "ownerName" TEXT,
    "fatherOrHusbandName" TEXT,
    "membersInHouse" INTEGER,
    address TEXT,
    "mobileNo" TEXT,
    "natureOfHouse" TEXT,

    "WidthofRoadInFront" TEXT,
    "Typeofconstruction" TEXT,
    "Useofhouse" TEXT,

    "frontWidthofPlotInFeet" NUMERIC,
    "depthofPlotInFeet" NUMERIC,
    "totalAreaInFeet" NUMERIC,
    "builtUpArea" NUMERIC,
    "openArea" NUMERIC,

    ifmixed TEXT,

    "firstFloorArea" NUMERIC,
    "secondFloorArea" NUMERIC,
    "thirdFloorArea" NUMERIC,
    "fourthFloorArea" NUMERIC,

    "commercialArea" NUMERIC,
    "totalBuiltUpArea" NUMERIC,

    "occupancyStatus" TEXT,

    "frontPhotoUrl" TEXT,
    "rightSidePhotoUrl" TEXT,
    "leftSidePhotoUrl" TEXT,

    "dataLat" NUMERIC,
    "dataLng" NUMERIC,

    "waterConnection" TEXT,
    "sewerConnection" TEXT,

    remarks TEXT,
    "floorNo" TEXT,

    "submittedBy" BIGINT REFERENCES public.users(id),
    "submittedAt" TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    "updatedAt" TIMESTAMPTZ
);

-- =====================================================
-- STREET VENDING (streetvendorsApp + portal "Street Vending")
-- One row = Form-I survey + Form-II application + Form-III ID card.
-- Media columns store only the blob PATH inside the storage account,
-- e.g. 'streetvending/1732101234567-ab12cd.jpg'. The portal/app build
-- the full URL as https://cdn.omgauamrit.in/<path>.
-- =====================================================
CREATE TABLE IF NOT EXISTS public.street_vendors (
    id BIGSERIAL PRIMARY KEY,

    status TEXT NOT NULL DEFAULT 'draft'
        CHECK (status IN ('draft', 'submitted', 'idIssued')),

    -- Media (Q1-Q5, Form II) : blob paths only
    photo_with_location TEXT,          -- Q1
    photo_with_thela TEXT,             -- Q2
    id_proof_1 TEXT,                   -- Q3
    id_proof_2 TEXT,                   -- Q4
    video TEXT,                        -- Q5
    video_name TEXT,                   -- Q5 original file name
    passport_photo TEXT,               -- Form II + ID card
    signature TEXT,                    -- Form II

    -- Location (Q6-Q13)
    municipality_name TEXT,
    zone_name TEXT,
    ward_name TEXT,                    -- Q6
    street_name TEXT,                  -- Q7
    landmark TEXT,                     -- Q8
    area_type TEXT,                    -- Q9
    place_of_business TEXT,            -- Q10
    nature_of_business TEXT,           -- Q11
    service_provider_type TEXT,        -- Q12
    vending_place_name TEXT,           -- Q13

    -- Personal (Q14-Q38)
    first_name TEXT,                   -- Q14
    middle_name TEXT,                  -- Q15
    surname TEXT,                      -- Q16
    guardian_relation TEXT,            -- Form II: Son of / Daughter of / Wife of
    guardian_name TEXT,
    house_no TEXT,
    colony_sector TEXT,
    residential_address TEXT,          -- Q17
    permanent_address TEXT,
    block TEXT,                        -- Q18
    city TEXT,                         -- Q19
    district TEXT,                     -- Q20
    mobile_no VARCHAR(15),             -- Q21
    phone_no VARCHAR(20),              -- Q22
    age INT,                           -- Q23
    gender TEXT,                       -- Q24
    nationality TEXT,                  -- Q25
    category TEXT,                     -- Q26
    has_caste_certificate BOOLEAN,     -- Q27
    marital_status TEXT,               -- Q28
    education TEXT,                    -- Q29
    disability TEXT,                   -- Q30
    has_disability_certificate BOOLEAN,-- Q31
    disability_certificate_no TEXT,    -- Q32
    bpl_card_no TEXT,                  -- Q33
    migration TEXT,                    -- Q34/35
    native_district TEXT,              -- Q36
    years_in_city INT,                 -- Q37
    residential_proofs TEXT[] NOT NULL DEFAULT '{}',  -- Q38 (multi)

    -- Household (Q39-Q47)
    male_members INT,                  -- Q39
    female_members INT,                -- Q40
    children INT,                      -- Q41
    earning_male INT,                  -- Q42
    earning_female INT,                -- Q43/44
    other_vendor_in_house BOOLEAN,     -- Q45
    other_vendor_relation TEXT,        -- Q46
    other_vendor_name TEXT,            -- Q47
    family_members JSONB NOT NULL DEFAULT '[]',  -- [{name, relation, age}] max 6

    -- Business (Q48-Q70)
    other_income BOOLEAN,              -- Q48
    previous_work TEXT,                -- Q49
    previous_city TEXT,                -- Q50
    years_in_vending INT,              -- Q51
    years_in_area INT,                 -- Q52
    license TEXT,                      -- Q53
    vending_frequency TEXT,            -- Q54
    business_type TEXT,                -- Q55
    distance_to_place_km NUMERIC(10,2),-- Q56
    hours_per_day NUMERIC(5,2),        -- Q57
    vending_from TEXT,                 -- Q58
    vending_to TEXT,                   -- Q58
    km_per_day_mobile NUMERIC(10,2),   -- Q59
    structure_type TEXT,               -- Q60
    land_space_sqft NUMERIC(12,2),     -- Q61
    uses_vehicle BOOLEAN,              -- Q62
    vehicle_type TEXT,                 -- Q63
    vehicle_ownership TEXT,            -- Q64
    vehicle_rent NUMERIC(12,2),        -- Q65
    months_per_year INT,               -- Q66
    same_work_mostly BOOLEAN,          -- Q67
    satisfied_with_location BOOLEAN,   -- Q68
    satisfied_reasons TEXT[] NOT NULL DEFAULT '{}',    -- Q69 (multi)
    unsatisfied_reasons TEXT[] NOT NULL DEFAULT '{}',  -- Q70 (multi)

    -- Economics (Q71-Q87)
    employees_count TEXT,              -- Q71
    employee_wage_type TEXT,           -- Q72
    avg_employee_pay NUMERIC(12,2),    -- Q73
    pays_rent BOOLEAN,                 -- Q74
    rent_paid_to TEXT,                 -- Q75
    rent_payment_type TEXT,            -- Q76
    rent_amount NUMERIC(12,2),         -- Q77
    purchase_source TEXT,              -- Q78
    seed_money_source TEXT,            -- Q79
    raw_material_frequency TEXT,       -- Q80
    daily_purchase NUMERIC(12,2),      -- Q81
    daily_sales NUMERIC(12,2),         -- Q82
    daily_profit NUMERIC(12,2),        -- Q83
    has_loan BOOLEAN,                  -- Q84
    loan_amount NUMERIC(12,2),         -- Q85
    has_savings_account BOOLEAN,       -- Q86
    bank_name TEXT,                    -- Q87

    -- Welfare & facilities (Q88-Q112)
    has_insurance BOOLEAN,             -- Q88
    insurance_details TEXT,            -- Q89
    uses_social_security BOOLEAN,      -- Q90
    social_security_scheme TEXT,       -- Q91
    satisfied_with_work BOOLEAN,       -- Q92
    ready_to_shift BOOLEAN,            -- Q93
    need_covered_market BOOLEAN,       -- Q94
    need_open_space BOOLEAN,           -- Q95
    union_member BOOLEAN,              -- Q96
    union_name TEXT,                   -- Q97
    aware_of_act BOOLEAN,              -- Q98
    interested_in_license BOOLEAN,     -- Q99
    favourite_time TEXT,               -- Q100
    market_type TEXT,                  -- Q101
    drinking_water BOOLEAN,            -- Q102
    toilet_access BOOLEAN,             -- Q103
    garbage_disposal TEXT,             -- Q104
    storage_access TEXT,               -- Q105
    light_source TEXT,                 -- Q106
    aware_of_traffic_problem BOOLEAN,  -- Q107
    traffic_solution TEXT,             -- Q108
    desired_facilities TEXT[] NOT NULL DEFAULT '{}',   -- Q109/110 (multi)
    vendor_remarks TEXT,               -- Q111
    surveyor_note TEXT,                -- Q112

    -- Free text typed for "Other" options, keyed by lookup code
    -- e.g. {"AREA_TYPE": "Near temple gate"}
    other_text JSONB NOT NULL DEFAULT '{}',

    -- Form II : Application
    application_no TEXT UNIQUE,        -- APP/<year>/<id>
    application_date DATE,
    application_place TEXT,
    vending_activity TEXT,
    vending_mode TEXT,

    -- Form III : ID card
    id_card_no TEXT UNIQUE,            -- SV/<WARD>/<year>/<id>
    id_valid_from DATE,
    id_valid_to DATE,

    -- Audit
    created_by INT REFERENCES public.users(id),
    updated_by INT REFERENCES public.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_sv_zone_ward   ON public.street_vendors (municipality_name, zone_name, ward_name);
CREATE INDEX IF NOT EXISTS idx_sv_mobile      ON public.street_vendors (mobile_no);
CREATE INDEX IF NOT EXISTS idx_sv_status      ON public.street_vendors (status);
CREATE INDEX IF NOT EXISTS idx_sv_created_by  ON public.street_vendors (created_by);
CREATE INDEX IF NOT EXISTS idx_sv_created_at  ON public.street_vendors (created_at);

-- GPS of the vendor, captured with Q1 "Photograph of Vendor with Location".
-- Format 'latitude,longitude' (same as property_surveys.gps_location).
ALTER TABLE public.street_vendors
ADD COLUMN IF NOT EXISTS gps_location TEXT;