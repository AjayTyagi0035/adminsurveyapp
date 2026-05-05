-- Users table and a sample user
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL
);

-- Insert a sample user with email 'admin@example.com' and password 'password'
-- CHANGE THIS in production; use bcrypt hashes instead
INSERT INTO users (email,password_hash) VALUES ('admin@example.com','password') ON CONFLICT (email) DO NOTHING;
