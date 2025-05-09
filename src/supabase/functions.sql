
-- FUNCTION: log_dose
-- Logs a medication dose and determines if it's on time
CREATE OR REPLACE FUNCTION log_dose(
  medication_id UUID,
  scheduled_time TIMESTAMP WITH TIME ZONE,
  actual_time TIMESTAMP WITH TIME ZONE DEFAULT NOW()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  med_user_id UUID;
  time_diff INTERVAL;
  is_on_time BOOLEAN;
  reward_earned BOOLEAN;
  new_log_id UUID;
BEGIN
  -- Check if the medication belongs to the authenticated user
  SELECT user_id INTO med_user_id
  FROM medications
  WHERE id = medication_id;
  
  IF med_user_id IS NULL OR med_user_id != auth.uid() THEN
    RAISE EXCEPTION 'Medication not found or access denied';
  END IF;
  
  -- Calculate if the dose was taken on time (within 4 hours)
  time_diff := actual_time - scheduled_time;
  is_on_time := time_diff <= INTERVAL '4 hours' AND time_diff >= INTERVAL '-10 minutes';
  
  -- Determine if reward is earned (only if dose is on time)
  reward_earned := is_on_time;
  
  -- Insert the dose log
  INSERT INTO dose_logs (
    medication_id,
    timestamp_taken,
    scheduled_time,
    taken_on_time,
    reward_earned
  ) VALUES (
    medication_id,
    actual_time,
    scheduled_time,
    is_on_time,
    reward_earned
  )
  RETURNING id INTO new_log_id;
  
  RETURN new_log_id;
END;
$$;

-- FUNCTION: get_adherence_summary
-- Returns a summary of medication adherence for the current week
CREATE OR REPLACE FUNCTION get_adherence_summary(
  start_date DATE DEFAULT (current_date - INTERVAL '7 days')::DATE,
  end_date DATE DEFAULT current_date
)
RETURNS TABLE (
  adherence_percentage NUMERIC,
  missed_medications JSON,
  day_data JSON
)
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  user_id UUID := auth.uid();
BEGIN
  RETURN QUERY
  WITH 
  -- Total scheduled doses in time period
  scheduled_doses AS (
    SELECT 
      m.id AS medication_id,
      m.name,
      generate_series(
        GREATEST(m.start_date::timestamp, start_date::timestamp),
        LEAST(COALESCE(m.end_date, '9999-12-31'::date)::timestamp, end_date::timestamp),
        '1 day'::interval
      )::date AS day,
      m.frequency_per_day
    FROM medications m
    WHERE m.user_id = user_id
      AND m.start_date <= end_date
      AND (m.end_date IS NULL OR m.end_date >= start_date)
  ),
  
  -- Total doses in period
  total_doses AS (
    SELECT 
      COUNT(*) AS total_count
    FROM scheduled_doses
  ),
  
  -- Total doses taken
  taken_doses AS (
    SELECT 
      dl.medication_id,
      COUNT(*) AS taken_count
    FROM dose_logs dl
    JOIN medications m ON dl.medication_id = m.id
    WHERE m.user_id = user_id
      AND dl.scheduled_time::date BETWEEN start_date AND end_date
    GROUP BY dl.medication_id
  ),
  
  -- Missed medications
  missed AS (
    SELECT 
      m.id,
      m.name,
      COALESCE(sd.total_scheduled, 0) AS total_scheduled,
      COALESCE(td.taken_count, 0) AS total_taken,
      COALESCE(sd.total_scheduled, 0) - COALESCE(td.taken_count, 0) AS missed_count
    FROM medications m
    LEFT JOIN (
      SELECT 
        medication_id,
        SUM(frequency_per_day) AS total_scheduled
      FROM scheduled_doses
      GROUP BY medication_id
    ) sd ON m.id = sd.medication_id
    LEFT JOIN taken_doses td ON m.id = td.medication_id
    WHERE m.user_id = user_id
    ORDER BY missed_count DESC
  ),
  
  -- Daily adherence data for heatmap
  daily_data AS (
    SELECT 
      day::date,
      SUM(frequency_per_day) AS scheduled_count,
      COALESCE(
        (SELECT COUNT(*) 
        FROM dose_logs dl
        JOIN medications m ON dl.medication_id = m.id
        WHERE m.user_id = user_id
          AND dl.scheduled_time::date = sd.day), 
        0
      ) AS taken_count
    FROM scheduled_doses sd
    GROUP BY day
    ORDER BY day
  )
  
  -- Combine results
  SELECT 
    CASE 
      WHEN SUM(dd.scheduled_count) = 0 THEN 0
      ELSE ROUND((SUM(dd.taken_count)::numeric / SUM(dd.scheduled_count)::numeric) * 100, 2) 
    END AS adherence_percentage,
    (SELECT json_agg(row_to_json(m)) 
     FROM (
       SELECT id, name, missed_count
       FROM missed
       WHERE missed_count > 0
       ORDER BY missed_count DESC
       LIMIT 5
     ) m
    ) AS missed_medications,
    (SELECT json_agg(row_to_json(d))
     FROM (
       SELECT 
         day, 
         CASE 
           WHEN scheduled_count = 0 THEN 0
           ELSE ROUND((taken_count::numeric / scheduled_count::numeric) * 100, 2)
         END AS adherence_percentage
       FROM daily_data
     ) d
    ) AS day_data
  FROM daily_data dd;
END;
$$;
