-- Enable RLS
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Create profiles table
CREATE TABLE profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    display_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create categories table
CREATE TABLE categories (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create medications table
CREATE TABLE medications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    name TEXT NOT NULL,
    dose TEXT NOT NULL,
    frequency_per_day INTEGER NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE,
    category_id UUID REFERENCES categories(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create dose_logs table
CREATE TABLE dose_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    medication_id UUID REFERENCES medications(id) NOT NULL,
    timestamp_taken TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_time TIMESTAMP WITH TIME ZONE NOT NULL,
    taken_on_time BOOLEAN NOT NULL,
    reward_earned BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create RLS Policies

-- Profiles policies
CREATE POLICY "Users can view own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

-- Categories policies
CREATE POLICY "Users can view own categories"
    ON categories FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own categories"
    ON categories FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own categories"
    ON categories FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own categories"
    ON categories FOR DELETE
    USING (auth.uid() = user_id);

-- Medications policies
CREATE POLICY "Users can view own medications"
    ON medications FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own medications"
    ON medications FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own medications"
    ON medications FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own medications"
    ON medications FOR DELETE
    USING (auth.uid() = user_id);

-- Dose logs policies
CREATE POLICY "Users can view own dose logs"
    ON dose_logs FOR SELECT
    USING (EXISTS (
        SELECT 1 FROM medications
        WHERE medications.id = dose_logs.medication_id
        AND medications.user_id = auth.uid()
    ));

CREATE POLICY "Users can insert own dose logs"
    ON dose_logs FOR INSERT
    WITH CHECK (EXISTS (
        SELECT 1 FROM medications
        WHERE medications.id = dose_logs.medication_id
        AND medications.user_id = auth.uid()
    ));

-- Create functions

-- Function to get adherence summary
CREATE OR REPLACE FUNCTION get_adherence_summary(p_user_id UUID)
RETURNS JSON AS $$
DECLARE
    v_result JSON;
BEGIN
    WITH adherence_data AS (
        SELECT 
            DATE_TRUNC('day', scheduled_time) as date,
            COUNT(*) as total_doses,
            SUM(CASE WHEN taken_on_time THEN 1 ELSE 0 END) as taken_on_time,
            m.name as medication_name,
            COUNT(*) FILTER (WHERE NOT taken_on_time) as missed_count
        FROM dose_logs dl
        JOIN medications m ON m.id = dl.medication_id
        WHERE m.user_id = p_user_id
        AND scheduled_time >= NOW() - INTERVAL '7 days'
        GROUP BY DATE_TRUNC('day', scheduled_time), m.name
    )
    SELECT json_build_object(
        'weekly_adherence', (
            SELECT ROUND(AVG(CASE WHEN total_doses > 0 
                THEN (taken_on_time::float / total_doses) * 100 
                ELSE 0 END), 2)
            FROM adherence_data
        ),
        'most_missed', (
            SELECT json_agg(json_build_object(
                'medication_name', medication_name,
                'missed_count', missed_count
            ))
            FROM (
                SELECT medication_name, SUM(missed_count) as missed_count
                FROM adherence_data
                GROUP BY medication_name
                ORDER BY missed_count DESC
                LIMIT 5
            ) subq
        ),
        'calendar_data', (
            SELECT json_agg(json_build_object(
                'date', date,
                'adherence_rate', ROUND((taken_on_time::float / total_doses) * 100, 2)
            ))
            FROM adherence_data
        )
    ) INTO v_result;
    
    RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log a dose
CREATE OR REPLACE FUNCTION log_dose(
    p_medication_id UUID,
    p_scheduled_time TIMESTAMP WITH TIME ZONE,
    p_actual_time TIMESTAMP WITH TIME ZONE
)
RETURNS JSON AS $$
DECLARE
    v_user_id UUID;
    v_taken_on_time BOOLEAN;
    v_reward_earned BOOLEAN;
BEGIN
    -- Get user_id from medication
    SELECT user_id INTO v_user_id
    FROM medications
    WHERE id = p_medication_id;
    
    -- Check if user has permission
    IF v_user_id != auth.uid() THEN
        RAISE EXCEPTION 'Not authorized';
    END IF;
    
    -- Check if dose is on time (within 4 hours)
    v_taken_on_time := p_actual_time <= p_scheduled_time + INTERVAL '4 hours';
    
    -- Check if reward should be earned (5 points for on-time dose)
    v_reward_earned := v_taken_on_time;
    
    -- Insert the dose log
    INSERT INTO dose_logs (
        medication_id,
        timestamp_taken,
        scheduled_time,
        taken_on_time,
        reward_earned
    ) VALUES (
        p_medication_id,
        p_actual_time,
        p_scheduled_time,
        v_taken_on_time,
        v_reward_earned
    );
    
    RETURN json_build_object(
        'success', true,
        'taken_on_time', v_taken_on_time,
        'reward_earned', v_reward_earned
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 