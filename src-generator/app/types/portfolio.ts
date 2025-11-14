/**
 * TypeScript types for portfolio data structure
 * Based on Data Structure Specification.md
 */

export interface Profile {
  fullName: string;
  title: string;
  summary?: string;
}

export interface SocialLink {
  platform: string;
  url: string;
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
  startDate: string;
  endDate: string;
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
  startDate?: string;
  endDate: string;
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
