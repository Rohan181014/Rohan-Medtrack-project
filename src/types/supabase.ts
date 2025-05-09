
export type Profile = {
  id: string;
  display_name: string | null;
  created_at: string;
  updated_at: string;
};

export type Category = {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
  updated_at: string;
};

export type Medication = {
  id: string;
  user_id: string;
  name: string;
  dose: string;
  frequency_per_day: number;
  start_date: string;
  end_date: string | null;
  category_id: string | null;
  created_at: string;
  updated_at: string;
};

export type DoseLog = {
  id: string;
  medication_id: string;
  timestamp_taken: string;
  scheduled_time: string;
  taken_on_time: boolean;
  reward_earned: boolean;
  created_at: string;
};

export type AdherenceSummary = {
  adherence_percentage: number;
  missed_medications: {
    id: string;
    name: string;
    missed_count: number;
  }[];
  day_data: {
    day: string;
    adherence_percentage: number;
  }[];
};
