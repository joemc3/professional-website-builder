import { useState, useEffect } from 'react';
import {
  saveApiKey,
  getApiKey,
  testApiConnection,
  saveLocalEndpoint,
  getLocalEndpoint,
} from '../utils/tauri';

interface SettingsProps {
  onClose: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
}

type Tab = 'cloud' | 'local';

interface APIKeys {
  anthropic: string;
  openai: string;
  gemini: string;
}

export default function Settings({ onClose, showToast }: SettingsProps) {
  const [activeTab, setActiveTab] = useState<Tab>('cloud');
  const [apiKeys, setApiKeys] = useState<APIKeys>({
    anthropic: '',
    openai: '',
    gemini: '',
  });
  const [localEndpoint, setLocalEndpoint] = useState('');
  const [testing, setTesting] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      // Load API keys
      const anthropic = (await getApiKey('anthropic')) || '';
      const openai = (await getApiKey('openai')) || '';
      const gemini = (await getApiKey('gemini')) || '';

      setApiKeys({ anthropic, openai, gemini });

      // Load local endpoint
      const endpoint = (await getLocalEndpoint()) || '';
      setLocalEndpoint(endpoint);
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  };

  const handleApiKeyChange = (
    provider: keyof APIKeys,
    value: string
  ) => {
    setApiKeys((prev) => ({ ...prev, [provider]: value }));
  };

  const handleTestConnection = async (provider: keyof APIKeys | 'local') => {
    setTesting(provider);
    try {
      let result: boolean;

      if (provider === 'local') {
        // Test local endpoint
        result = await testApiConnection('local', localEndpoint);
      } else {
        // Test cloud API
        result = await testApiConnection(provider, apiKeys[provider]);
      }

      if (result) {
        showToast(`${provider} connection successful!`, 'success');
      } else {
        showToast(`${provider} connection failed`, 'error');
      }
    } catch (error) {
      showToast(
        `Error testing ${provider}: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        'error'
      );
    } finally {
      setTesting(null);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save API keys
      if (apiKeys.anthropic) {
        await saveApiKey('anthropic', apiKeys.anthropic);
      }
      if (apiKeys.openai) {
        await saveApiKey('openai', apiKeys.openai);
      }
      if (apiKeys.gemini) {
        await saveApiKey('gemini', apiKeys.gemini);
      }

      // Save local endpoint
      if (localEndpoint) {
        await saveLocalEndpoint(localEndpoint);
      }

      showToast('Settings saved successfully!', 'success');
      onClose();
    } catch (error) {
      showToast(
        `Error saving settings: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-semibold text-gray-800">Settings</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('cloud')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'cloud'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Cloud AI
          </button>
          <button
            onClick={() => setActiveTab('local')}
            className={`flex-1 px-6 py-3 text-sm font-medium transition-colors ${
              activeTab === 'local'
                ? 'text-primary-600 border-b-2 border-primary-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            Local AI
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'cloud' && (
            <div className="space-y-6">
              {/* Anthropic */}
              <div>
                <label className="label">Anthropic API Key</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={apiKeys.anthropic}
                    onChange={(e) =>
                      handleApiKeyChange('anthropic', e.target.value)
                    }
                    placeholder="sk-ant-..."
                    className="input-field"
                  />
                  <button
                    onClick={() => handleTestConnection('anthropic')}
                    disabled={!apiKeys.anthropic || testing === 'anthropic'}
                    className="btn-secondary whitespace-nowrap"
                  >
                    {testing === 'anthropic' ? 'Testing...' : 'Test'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Get your API key from{' '}
                  <a
                    href="https://console.anthropic.com"
                    className="text-primary-600 hover:underline"
                  >
                    console.anthropic.com
                  </a>
                </p>
              </div>

              {/* OpenAI */}
              <div>
                <label className="label">OpenAI API Key</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={apiKeys.openai}
                    onChange={(e) =>
                      handleApiKeyChange('openai', e.target.value)
                    }
                    placeholder="sk-..."
                    className="input-field"
                  />
                  <button
                    onClick={() => handleTestConnection('openai')}
                    disabled={!apiKeys.openai || testing === 'openai'}
                    className="btn-secondary whitespace-nowrap"
                  >
                    {testing === 'openai' ? 'Testing...' : 'Test'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Get your API key from{' '}
                  <a
                    href="https://platform.openai.com"
                    className="text-primary-600 hover:underline"
                  >
                    platform.openai.com
                  </a>
                </p>
              </div>

              {/* Gemini */}
              <div>
                <label className="label">Gemini API Key</label>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={apiKeys.gemini}
                    onChange={(e) =>
                      handleApiKeyChange('gemini', e.target.value)
                    }
                    placeholder="AIza..."
                    className="input-field"
                  />
                  <button
                    onClick={() => handleTestConnection('gemini')}
                    disabled={!apiKeys.gemini || testing === 'gemini'}
                    className="btn-secondary whitespace-nowrap"
                  >
                    {testing === 'gemini' ? 'Testing...' : 'Test'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Get your API key from{' '}
                  <a
                    href="https://makersuite.google.com/app/apikey"
                    className="text-primary-600 hover:underline"
                  >
                    Google AI Studio
                  </a>
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> API keys are stored securely in your
                  system's credential manager and are never sent to any third
                  party except the respective AI provider.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'local' && (
            <div className="space-y-6">
              <div>
                <label className="label">Local LLM Endpoint URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={localEndpoint}
                    onChange={(e) => setLocalEndpoint(e.target.value)}
                    placeholder="http://localhost:11434/api/generate"
                    className="input-field"
                  />
                  <button
                    onClick={() => handleTestConnection('local')}
                    disabled={!localEndpoint || testing === 'local'}
                    className="btn-secondary whitespace-nowrap"
                  >
                    {testing === 'local' ? 'Testing...' : 'Test'}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Enter the URL of your local LLM server (e.g., Ollama, LM
                  Studio)
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-800 mb-2">
                  <strong>Supported Local LLM Servers:</strong>
                </p>
                <ul className="text-sm text-blue-800 list-disc list-inside space-y-1">
                  <li>
                    Ollama:{' '}
                    <code className="bg-white px-1 rounded">
                      http://localhost:11434/api/generate
                    </code>
                  </li>
                  <li>
                    LM Studio:{' '}
                    <code className="bg-white px-1 rounded">
                      http://localhost:1234/v1/chat/completions
                    </code>
                  </li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
          <button onClick={onClose} className="btn-secondary">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="btn-primary"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
