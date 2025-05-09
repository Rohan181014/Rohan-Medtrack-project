
-- PROFILES TABLE
-- Extends the auth.users table with additional user information
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  display_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- CATEGORIES TABLE
-- Medication categories (e.g., "Heart Medications", "Vitamins", etc.)
CREATE TABLE categories (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- MEDICATIONS TABLE
-- Stores medication information
CREATE TABLE medications (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  dose TEXT NOT NULL,
  frequency_per_day INTEGER NOT NULL CHECK (frequency_per_day > 0),
  start_date DATE NOT NULL,
  end_date DATE,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- DOSE_LOGS TABLE
-- Records when medications are taken
CREATE TABLE dose_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  medication_id UUID REFERENCES medications(id) ON DELETE CASCADE NOT NULL,
  timestamp_taken TIMESTAMP WITH TIME ZONE NOT NULL,
  scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
  taken_on_time BOOLEAN NOT NULL,
  reward_earned BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add created_at and updated_at triggers to all tables
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_categories_updated_at
BEFORE UPDATE ON categories
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();

CREATE TRIGGER update_medications_updated_at
BEFORE UPDATE ON medications
FOR EACH ROW EXECUTE PROCEDURE update_modified_column();
