// Auth
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface UserResponse {
  id: string;
  email: string;
}

export interface UsernameRequest {
  username: string;
}

export interface UsernameResponse {
  username: string;
}

// Documents
export interface DocumentResponse {
  id: string;
  filename: string;
  content_type: string;
  file_size: number;
  status: string;
  error_message: string | null;
  parsed_text: string | null;
  created_at: string;
  updated_at: string;
}

// Profile
export interface Basics {
  name?: string | null;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedin?: string | null;
  website?: string | null;
  summary?: string | null;
}

export interface Skill {
  category?: string | null;
  items?: string[] | null;
}

export interface Experience {
  company?: string | null;
  title?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  current?: boolean | null;
  description?: string | null;
  highlights?: string[] | null;
}

export interface Education {
  institution?: string | null;
  degree?: string | null;
  field?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string | null;
}

export interface Certification {
  name?: string | null;
  issuer?: string | null;
  date_obtained?: string | null;
  expiration?: string | null;
  credential_id?: string | null;
}

export interface Project {
  name?: string | null;
  description?: string | null;
  role?: string | null;
  technologies?: string[] | null;
  outcomes?: string[] | null;
}

export interface Publication {
  title?: string | null;
  venue?: string | null;
  date?: string | null;
  url?: string | null;
}

export interface Award {
  title?: string | null;
  issuer?: string | null;
  date?: string | null;
  description?: string | null;
}

export interface Volunteer {
  organization?: string | null;
  role?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  description?: string | null;
}

export interface LanguageSkill {
  language?: string | null;
  proficiency?: string | null;
}

export interface ProfileData {
  basics?: Basics | null;
  skills?: Skill[] | null;
  experience?: Experience[] | null;
  education?: Education[] | null;
  certifications?: Certification[] | null;
  projects?: Project[] | null;
  publications?: Publication[] | null;
  awards?: Award[] | null;
  volunteer?: Volunteer[] | null;
  languages?: LanguageSkill[] | null;
}

export interface ProfileResponse {
  id: string;
  data: ProfileData;
  guidance: string | null;
  generated_at: string | null;
  created_at: string;
  updated_at: string;
  photo_path: string | null;
}

export interface SynthesizeRequest {
  model: string;
  guidance?: string | null;
}

// Job Postings
export interface JobPostingCreate {
  title: string;
  company: string;
  description: string;
  source_url?: string | null;
  raw_text?: string | null;
  requirements?: Record<string, unknown> | null;
}

export interface JobPostingUpdate {
  title?: string | null;
  company?: string | null;
  description?: string | null;
  source_url?: string | null;
  raw_text?: string | null;
  requirements?: Record<string, unknown> | null;
}

export interface JobPostingDraft {
  title: string;
  company: string;
  description: string;
  source_url?: string | null;
  raw_text?: string | null;
  requirements?: Record<string, unknown> | null;
}

export interface JobPostingResponse {
  id: string;
  title: string;
  company: string;
  description: string;
  source_url: string | null;
  raw_text: string | null;
  requirements: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ScrapeRequest {
  url: string;
}

export interface ParseRequest {
  raw_text: string;
}

// Sites
export interface PortfolioGenerateRequest {
  theme: string;
}

export interface TargetedGenerateRequest {
  job_posting_id: string;
  theme: string;
}

export interface SiteResponse {
  id: string;
  slug: string;
  type: string;
  theme: string;
  status: string;
  error_message: string | null;
  output_path: string;
  public_url: string;
  stale: boolean;
  job_posting_id: string | null;
  generated_at: string | null;
  created_at: string;
  updated_at: string;
}

// Preview
export interface PreviewRequest {
  theme: string;
  site_type: string;
  job_posting_id?: string;
}

export interface PreviewResponse {
  preview_id: string;
}

// Settings
export interface APIKeySaveRequest {
  provider: string;
  api_key: string;
}

export interface APIKeySaveResponse {
  provider: string;
  saved: boolean;
}

export interface APIKeyStatusResponse {
  provider: string;
  is_set: boolean;
  selected_model: string | null;
}

export interface ModelInfo {
  id: string;
  name: string | null;
}

export interface ModelListResponse {
  provider: string;
  models: ModelInfo[];
}

export interface ModelSelectRequest {
  model: string;
}

export interface TestConnectionRequest {
  provider: string;
  model?: string | null;
}

export interface TestConnectionResponse {
  provider: string;
  status: string;
  message: string | null;
}
