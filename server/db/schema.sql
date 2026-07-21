-- Chitwan Rent — core schema (Phase 0)
DROP TABLE IF EXISTS tolet_spots CASCADE;
DROP TABLE IF EXISTS seeker_pins CASCADE;
DROP TABLE IF EXISTS flats CASCADE;
DROP TABLE IF EXISTS bus_routes CASCADE;
DROP TABLE IF EXISTS pois CASCADE;
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
  one_liner TEXT,
  status TEXT DEFAULT 'available', -- 'available' | 'rented' | 'pending_review'
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  area TEXT, -- ward/tole name, reverse-geocoded
  photos TEXT[],
  posted_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_flats_status ON flats(status);
CREATE INDEX idx_flats_bhk ON flats(bhk);
CREATE INDEX idx_flats_lat_lng ON flats(lat, lng);

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
  lng DOUBLE PRECISION
);
