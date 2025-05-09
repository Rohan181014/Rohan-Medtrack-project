
-- ROW LEVEL SECURITY POLICIES
-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE dose_logs ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
CREATE POLICY "Users can view their own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- CATEGORIES POLICIES
CREATE POLICY "Users can view their own categories"
  ON categories FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own categories"
  ON categories FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own categories"
  ON categories FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own categories"
  ON categories FOR DELETE
  USING (auth.uid() = user_id);

-- MEDICATIONS POLICIES
CREATE POLICY "Users can view their own medications"
  ON medications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own medications"
  ON medications FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own medications"
  ON medications FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own medications"
  ON medications FOR DELETE
  USING (auth.uid() = user_id);

-- DOSE_LOGS POLICIES
CREATE POLICY "Users can view their own dose logs"
  ON dose_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM medications
      WHERE medications.id = dose_logs.medication_id
      AND medications.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own dose logs"
  ON dose_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM medications
      WHERE medications.id = dose_logs.medication_id
      AND medications.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own dose logs"
  ON dose_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM medications
      WHERE medications.id = dose_logs.medication_id
      AND medications.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own dose logs"
  ON dose_logs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM medications
      WHERE medications.id = dose_logs.medication_id
      AND medications.user_id = auth.uid()
    )
  );
