/**
 * TypeScript interfaces matching the Data Structure Specification
 * for the Professional Website Builder
 */

export interface SocialLink {
  platform: string;
  url: string;
}

export interface Profile {
  fullName: string;
  title: string;
  summary?: string;
}

export interface Contact {
  email?: string;
  phone?: string;
  website?: string;
  socialLinks?: SocialLink[];
}

export interface WorkExperience {
  company: string;
  location?: string;
  title: string;
  startDate: string; // Format: YYYY-MM
  endDate: string; // Format: YYYY-MM or "Present"
  responsibilities?: string[];
}

export interface Project {
  name: string;
  description: string;
  technologies?: string[];
  url?: string;
}

export interface Education {
  institution: string;
  degree: string;
  fieldOfStudy?: string;
  startDate?: string; // Format: YYYY
  endDate: string; // Format: YYYY
}

export interface SkillCategory {
  category: string;
  items: string[];
}

export interface Theme {
  name: string;
  layoutOptions?: Record<string, unknown>;
}

export interface PortfolioData {
  profile: Profile;
  contact: Contact;
  workExperience: WorkExperience[];
  projects: Project[];
  education: Education[];
  skills: SkillCategory[];
  theme: Theme;
}

// UI-specific types
export type ProcessingTier = 'manual' | 'cloud' | 'local';

export interface FileInfo {
  name: string;
  path: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
}

export interface ThemeInfo {
  name: string;
  displayName: string;
  thumbnailPath: string;
  description?: string;
}

export interface APIProvider {
  name: 'anthropic' | 'openai' | 'gemini';
  displayName: string;
  keyPlaceholder: string;
}
