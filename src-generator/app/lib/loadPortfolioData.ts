import { PortfolioData } from '../types/portfolio';
import fs from 'fs';
import path from 'path';

/**
 * Load portfolio data from session.json file
 * Reads from environment variable SESSION_FILE or defaults to user-data/session.json
 */
export function loadPortfolioData(): PortfolioData {
  // Get the session file path from environment variable or use default
  const sessionFilePath =
    process.env.SESSION_FILE ||
    path.join(process.cwd(), '..', '..', 'user-data', 'session.json');

  try {
    // Read the file
    const fileContents = fs.readFileSync(sessionFilePath, 'utf-8');

    // Parse the JSON
    const data = JSON.parse(fileContents) as PortfolioData;

    return data;
  } catch (error) {
    console.error('Error loading portfolio data:', error);

    // Return minimal default data if file doesn't exist or is invalid
    return getDefaultPortfolioData();
  }
}

/**
 * Returns default/sample portfolio data for development and testing
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
    theme: {
      name: 'onyx',
    },
  };
}
