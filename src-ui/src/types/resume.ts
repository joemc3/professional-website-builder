export interface GeneralResumeRequest {
  theme: string;
  page_target: number;
}

export interface TargetedResumeRequest {
  job_posting_id: string;
  theme: string;
  page_target: number;
}

export interface ResumeResponse {
  id: string;
  type: string; // "general" | "targeted"
  theme: string;
  page_target: number;
  actual_pages: number | null;
  status: string;
  error_message: string | null;
  stale: boolean;
  job_posting_id: string | null;
  job_posting_title: string | null;
  generated_at: string | null;
  created_at: string;
}
