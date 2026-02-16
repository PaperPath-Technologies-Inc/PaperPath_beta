export type StatusType = "student" | "pgwp";

export type Profile = {
  id: string;
  status: StatusType | null;
  expiry_date: string | null;
  study_permit_expiry_date: string | null;
  knows_expiry: boolean;
  program_end_date: string | null;
  city: string | null;
  plan: "free" | "pro";
  pro: boolean;
  plan_updated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PgwpRiskRow = {
  user_id: string;
  risk_level: "LOW" | "MEDIUM" | "HIGH" | "UNKNOWN";
  risk_score: number;
  days_to_permit_expiry?: number | null;
  days_to_program_end?: number | null;
  days_since_program_end?: number | null;
  reasons: Array<{ title: string; explanation: string }>;
  next_actions: Array<{ title: string; description: string; cta_route: string }>;
  updated_at: string;
  version: "pgwp-v0.2";
};

export type Reminder = {
  id: string;
  user_id: string;
  title: string;
  category: string;
  due_at: string;
  notes: string | null;
  is_done: boolean;
  created_at: string;
  updated_at: string;
};

export type DocumentRow = {
  id: string;
  user_id: string;
  filename: string;
  storage_path: string;
  doc_type: "passport" | "study_permit" | "program_proof" | "transcript_or_completion" | "address_proof" | "other" | null;
  created_at: string;
};

export type NotificationRow = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string;
  created_at: string;
  resolved: boolean;
};
