-- Chitwan Rent — core schema (Phase 0)
DROP TABLE IF EXISTS flat_reports CASCADE;
DROP TABLE IF EXISTS flat_comments CASCADE;
DROP TABLE IF EXISTS flat_ratings CASCADE;
DROP TABLE IF EXISTS flat_interests CASCADE;
DROP TABLE IF EXISTS rent_reports CASCADE;
DROP TABLE IF EXISTS tolet_spots CASCADE;
DROP TABLE IF EXISTS seeker_pins CASCADE;
DROP TABLE IF EXISTS flats CASCADE;
DROP TABLE IF EXISTS bus_routes CASCADE;
DROP TABLE IF EXISTS pois CASCADE;
DROP TABLE IF EXISTS places CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name TEXT,
  phone TEXT UNIQUE,
  email TEXT,
  role TEXT DEFAULT 'user', -- 'user' | 'superhero'
  hero_points INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE flats (
  id SERIAL PRIMARY KEY,
  owner_id INT REFERENCES users(id),
  listing_type TEXT CHECK (listing_type IN ('flat','flatmate')) DEFAULT 'flat',
  bhk INT,
  rent INT,
  deposit INT,
  furnishing TEXT CHECK (furnishing IN ('furnished','unfurnished')),
  includes_maintenance BOOLEAN DEFAULT false,
  gated TEXT CHECK (gated IN ('gated','not_gated')),
  who_lives TEXT, -- 'family' | 'bachelor'
  pets_allowed TEXT, -- 'yes'|'no'|'not_sure'
  parking_for INT DEFAULT 0,
  sqft INT,
  rating DOUBLE PRECISION, -- seed listings: fixed 3.5-5.0 placeholder set at seed time, never changes.
                            -- Real listings: NULL until the first real rating comes in, then the
                            -- locality/built_quality average from flat_ratings (see POST /:id/rating).
  one_liner TEXT,
  status TEXT DEFAULT 'available', -- 'available' | 'rented' | 'pending_review'
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  area TEXT, -- ward/tole name, reverse-geocoded
  society_name TEXT, -- owner-entered building/society name, distinct from area
  photos TEXT[],
  available_from TEXT CHECK (available_from IN ('asap','next_month','flexible')),
  flatmate_gender_pref TEXT, -- 'male'|'female'|'any' — only set when listing_type = 'flatmate'
  food_pref TEXT, -- 'veg'|'non_veg'|'any' — only set when listing_type = 'flatmate'
  smoker_ok TEXT, -- 'smoker'|'non_smoker' — only set when listing_type = 'flatmate'
  posted_at TIMESTAMP DEFAULT now(),
  is_seed BOOLEAN NOT NULL DEFAULT false, -- true only for seed.js's dummy listings, never set by the real POST /api/flats submission flow
  report_count INT NOT NULL DEFAULT 0, -- materialized from flat_reports, same pattern as rating
  rent_flagged BOOLEAN NOT NULL DEFAULT false -- owner-confirmed over-cap rent (AddFlatForm's RentCapConfirmModal); still visible on the map, excluded only from digestJob's ACTIVE_FLATS_SQL
);

CREATE INDEX idx_flats_status ON flats(status);
CREATE INDEX idx_flats_bhk ON flats(bhk);
CREATE INDEX idx_flats_lat_lng ON flats(lat, lng);

-- Community rating (Phase 10): two-dimension 1-5 star submissions (locality,
-- built quality), averaged together into flats.rating. Real (non-seed)
-- listings only — see is_seed and POST /:id/rating in routes/flats.js.
CREATE TABLE flat_ratings (
  id SERIAL PRIMARY KEY,
  flat_id INT REFERENCES flats(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id),
  locality_stars INT CHECK (locality_stars BETWEEN 1 AND 5),
  built_quality_stars INT CHECK (built_quality_stars BETWEEN 1 AND 5),
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_flat_ratings_flat_id ON flat_ratings(flat_id);

-- Comments shown in the flat detail panel's COMMENTS section.
CREATE TABLE flat_comments (
  id SERIAL PRIMARY KEY,
  flat_id INT REFERENCES flats(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id),
  name TEXT,
  text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_flat_comments_flat_id ON flat_comments(flat_id);

-- Report-listing submissions from the flat detail panel's flag button.
CREATE TABLE flat_reports (
  id SERIAL PRIMARY KEY,
  flat_id INT REFERENCES flats(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id),
  reason TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_flat_reports_flat_id ON flat_reports(flat_id);

-- "I'm interested in this flat" CTA submissions.
CREATE TABLE flat_interests (
  id SERIAL PRIMARY KEY,
  flat_id INT REFERENCES flats(id) ON DELETE CASCADE,
  user_id INT REFERENCES users(id),
  name TEXT,
  contact TEXT,
  note TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_flat_interests_flat_id ON flat_interests(flat_id);

CREATE TABLE seeker_pins (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id),
  looking_for TEXT CHECK (looking_for IN ('whole_flat','room')),
  budget INT,
  bhk_pref TEXT, -- '1'|'2'|'3'|'any'
  move_in TEXT, -- 'asap'|'next_month'|'flexible'
  food_pref TEXT, -- 'veg'|'non_veg'|'any'
  smoker_ok TEXT, -- 'smoker'|'non_smoker'
  gender TEXT, -- 'male'|'female'|'other'
  flatmate_gender_pref TEXT, -- 'male'|'female'|'any'
  parking_required BOOLEAN DEFAULT false,
  lifestyle_note TEXT,
  email TEXT,
  phone TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  area TEXT,
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_seeker_pins_lat_lng ON seeker_pins(lat, lng);

CREATE TABLE tolet_spots (
  id SERIAL PRIMARY KEY,
  spotter_id INT REFERENCES users(id),
  photo_url TEXT,
  name TEXT,
  message TEXT,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE bus_routes (
  id SERIAL PRIMARY KEY,
  name TEXT,
  color TEXT,
  geojson JSONB
);

CREATE TABLE pois (
  id SERIAL PRIMARY KEY,
  name TEXT,
  category TEXT, -- 'school'|'college'|'temple'|'hospital'|'landmark'
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  tier TEXT -- 'important' for school/college (real OSM data); NULL for dummy categories
);

-- Search bar typeahead gazetteer — general locality names (villages, towns,
-- suburbs, neighbourhoods, hamlets) pulled from OSM, separate from `pois`
-- (specific named venues) and from the small curated ward list seed.js uses
-- for dummy-listing density (that one stays as-is for the filter dropdown).
CREATE TABLE places (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  place_type TEXT, -- 'village'|'town'|'suburb'|'neighbourhood'|'hamlet'
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION
);

CREATE INDEX idx_places_name ON places(name);

-- Anonymous rent data points from the empty-map "Add something here" quick
-- action — no owner_id/user_id by design. Feeds future Area Stats
-- aggregation alongside real flat listings.
CREATE TABLE rent_reports (
  id SERIAL PRIMARY KEY,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  rent INT,
  bhk INT,
  gated TEXT CHECK (gated IN ('gated','not_gated')),
  furnishing TEXT CHECK (furnishing IN ('furnished','unfurnished')), -- optional, matches flats.furnishing
  parking_for INT, -- optional, matches flats.parking_for (nullable here: unspecified != 0)
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_rent_reports_lat_lng ON rent_reports(lat, lng);
