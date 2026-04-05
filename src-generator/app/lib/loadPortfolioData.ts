import { PortfolioData } from '../types/portfolio';
import fs from 'fs';
import path from 'path';

/**
 * Load portfolio data written by generate.js.
 * Reads from .data/portfolio-data.json (written before next build).
 */
export function loadPortfolioData(): PortfolioData {
  const dataPath = path.join(process.cwd(), '.data', 'portfolio-data.json');

  try {
    const fileContents = fs.readFileSync(dataPath, 'utf-8');
    return JSON.parse(fileContents) as PortfolioData;
  } catch (error) {
    console.error('Error loading portfolio data:', error);
    return getDefaultPortfolioData();
  }
}

/**
 * Load preview data for a specific preview ID.
 * Preview data is written by the API to {generation_dir}/preview/{id}/portfolio-data.json.
 */
export function loadPreviewData(previewId: string): PortfolioData {
  const possiblePaths = [
    path.join(process.cwd(), '.data', 'preview', previewId, 'portfolio-data.json'),
    path.join('/data/generation', 'preview', previewId, 'portfolio-data.json'),
  ];

  for (const dataPath of possiblePaths) {
    try {
      const fileContents = fs.readFileSync(dataPath, 'utf-8');
      return JSON.parse(fileContents) as PortfolioData;
    } catch {
      continue;
    }
  }

  console.error(`Preview data not found for ID: ${previewId}`);
  return getDefaultPortfolioData();
}

/**
 * Returns default/sample portfolio data for development and testing.
 */
export function getDefaultPortfolioData(): PortfolioData {
  return {
    profile: {
      fullName: 'Sample Portfolio',
      title: 'Professional Developer',
      summary: 'This is a sample portfolio. Please generate your own portfolio data.',
    },
    contact: {
      email: 'contact@example.com',
      socialLinks: [],
    },
    workExperience: [],
    projects: [],
    education: [],
    skills: [],
    certifications: [],
    publications: [],
    awards: [],
    volunteer: [],
    languages: [],
    theme: {
      name: 'onyx',
    },
    siteType: 'portfolio',
  };
}
