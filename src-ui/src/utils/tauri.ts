/**
 * Tauri API command wrappers
 * Provides type-safe functions to call Rust backend commands
 */

import { invoke } from '@tauri-apps/api/tauri';
import { open } from '@tauri-apps/api/shell';
import { PortfolioData, ProcessingTier } from '../types/portfolio';

/**
 * Ingest files from the provided file paths
 */
export async function ingestFiles(filePaths: string[]): Promise<void> {
  try {
    await invoke('ingest_files', { files: filePaths });
  } catch (error) {
    throw new Error(`Failed to ingest files: ${error}`);
  }
}

/**
 * Get aggregated text from all ingested files
 */
export async function getAggregatedText(): Promise<string> {
  try {
    const text = await invoke<string>('get_aggregated_text');
    return text;
  } catch (error) {
    throw new Error(`Failed to get aggregated text: ${error}`);
  }
}

/**
 * Get JSON portfolio data from AI based on the selected tier
 */
export async function getJsonFromAI(
  tier: ProcessingTier,
  aggregatedText: string,
  provider?: string
): Promise<PortfolioData> {
  try {
    const jsonString = await invoke<string>('get_json_from_ai', {
      tier,
      aggregatedText,
      provider,
    });
    return JSON.parse(jsonString) as PortfolioData;
  } catch (error) {
    throw new Error(`Failed to get JSON from AI: ${error}`);
  }
}

/**
 * Generate the website with the provided portfolio data and theme
 */
export async function generateWebsite(
  portfolioData: PortfolioData,
  themeName: string
): Promise<void> {
  try {
    const jsonData = JSON.stringify(portfolioData, null, 2);
    await invoke('generate_website', {
      jsonData,
      theme: themeName,
    });
  } catch (error) {
    throw new Error(`Failed to generate website: ${error}`);
  }
}

/**
 * Save an API key for a specific provider to secure storage
 */
export async function saveApiKey(
  provider: string,
  apiKey: string
): Promise<void> {
  try {
    await invoke('save_api_key', { provider, apiKey });
  } catch (error) {
    throw new Error(`Failed to save API key: ${error}`);
  }
}

/**
 * Get an API key for a specific provider from secure storage
 */
export async function getApiKey(provider: string): Promise<string | null> {
  try {
    const key = await invoke<string | null>('get_api_key', { provider });
    return key;
  } catch (error) {
    console.error(`Failed to get API key for ${provider}:`, error);
    return null;
  }
}

/**
 * Test the connection to an AI provider
 */
export async function testApiConnection(
  provider: string,
  apiKey?: string
): Promise<boolean> {
  try {
    const result = await invoke<boolean>('test_api_connection', {
      provider,
      apiKey,
    });
    return result;
  } catch (error) {
    console.error(`API connection test failed: ${error}`);
    return false;
  }
}

/**
 * Save the local AI endpoint URL
 */
export async function saveLocalEndpoint(endpoint: string): Promise<void> {
  try {
    await invoke('save_local_endpoint', { endpoint });
  } catch (error) {
    throw new Error(`Failed to save local endpoint: ${error}`);
  }
}

/**
 * Get the local AI endpoint URL
 */
export async function getLocalEndpoint(): Promise<string | null> {
  try {
    const endpoint = await invoke<string | null>('get_local_endpoint');
    return endpoint;
  } catch (error) {
    console.error('Failed to get local endpoint:', error);
    return null;
  }
}

/**
 * Open a folder in the system file explorer
 */
export async function openFolder(path: string): Promise<void> {
  try {
    await open(path);
  } catch (error) {
    throw new Error(`Failed to open folder: ${error}`);
  }
}

/**
 * Open a URL in the default browser
 */
export async function openInBrowser(url: string): Promise<void> {
  try {
    await open(url);
  } catch (error) {
    throw new Error(`Failed to open browser: ${error}`);
  }
}

/**
 * Get the list of available themes
 */
export async function getAvailableThemes(): Promise<
  Array<{ name: string; displayName: string; thumbnailPath: string }>
> {
  try {
    const themes = await invoke<
      Array<{ name: string; displayName: string; thumbnailPath: string }>
    >('get_available_themes');
    return themes;
  } catch (error) {
    console.error('Failed to get available themes:', error);
    // Return default themes if backend call fails
    return [
      {
        name: 'onyx',
        displayName: 'Onyx',
        thumbnailPath: '/themes/onyx/thumbnail.png',
      },
      {
        name: 'quartz',
        displayName: 'Quartz',
        thumbnailPath: '/themes/quartz/thumbnail.png',
      },
      {
        name: 'serene',
        displayName: 'Serene',
        thumbnailPath: '/themes/serene/thumbnail.png',
      },
      {
        name: 'jade',
        displayName: 'Jade',
        thumbnailPath: '/themes/jade/thumbnail.png',
      },
      {
        name: 'coral',
        displayName: 'Coral',
        thumbnailPath: '/themes/coral/thumbnail.png',
      },
    ];
  }
}
