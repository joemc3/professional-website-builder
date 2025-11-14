import { useState, useEffect } from 'react';
import { PortfolioData, ThemeInfo } from '../types/portfolio';
import { generateWebsite, getAvailableThemes } from '../utils/tauri';

interface ThemeSelectionProps {
  portfolioData: PortfolioData;
  onThemeSelect: (themeName: string) => void;
  onGenerate: () => void;
  onBack: () => void;
  showLoading: (message: string) => void;
  hideLoading: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
}

export default function ThemeSelection({
  portfolioData,
  onThemeSelect,
  onGenerate,
  onBack,
  showLoading,
  hideLoading,
  showToast,
}: ThemeSelectionProps) {
  const [themes, setThemes] = useState<ThemeInfo[]>([]);
  const [selectedTheme, setSelectedTheme] = useState(
    portfolioData.theme.name || 'onyx'
  );
  const [previewUrl, setPreviewUrl] = useState<string>('');

  useEffect(() => {
    loadThemes();
  }, []);

  useEffect(() => {
    // Update preview when theme changes
    updatePreview();
  }, [selectedTheme, portfolioData]);

  const loadThemes = async () => {
    try {
      const availableThemes = await getAvailableThemes();
      const themeInfos: ThemeInfo[] = availableThemes.map((theme) => ({
        name: theme.name,
        displayName: theme.displayName,
        thumbnailPath: theme.thumbnailPath,
        description: `The ${theme.displayName} theme`,
      }));
      setThemes(themeInfos);
    } catch (error) {
      console.error('Error loading themes:', error);
      showToast('Error loading themes', 'error');
    }
  };

  const updatePreview = () => {
    // Create a preview data URL with current portfolio data
    // For now, we'll just show a placeholder
    const previewData = {
      ...portfolioData,
      theme: { name: selectedTheme },
    };
    // In a real implementation, this would generate a preview URL
    setPreviewUrl(JSON.stringify(previewData, null, 2));
  };

  const handleThemeSelect = (themeName: string) => {
    setSelectedTheme(themeName);
    onThemeSelect(themeName);
  };

  const handleGenerate = async () => {
    try {
      showLoading('Generating your website...');

      const dataWithTheme = {
        ...portfolioData,
        theme: { name: selectedTheme },
      };

      await generateWebsite(dataWithTheme, selectedTheme);

      hideLoading();
      showToast('Website generated successfully!', 'success');
      onGenerate();
    } catch (error) {
      hideLoading();
      showToast(
        `Error generating website: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        'error'
      );
      console.error('Error generating website:', error);
    }
  };

  return (
    <div className="flex h-full gap-6">
      {/* Left Panel - Theme Picker */}
      <div className="w-80 flex flex-col">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Choose a theme:
        </h2>

        <div className="grid grid-cols-2 gap-4 flex-1 overflow-y-auto pb-4">
          {themes.map((theme) => (
            <button
              key={theme.name}
              onClick={() => handleThemeSelect(theme.name)}
              className={`relative rounded-lg overflow-hidden border-2 transition-all ${
                selectedTheme === theme.name
                  ? 'border-primary-500 ring-2 ring-primary-200'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              <div className="aspect-[4/3] bg-gray-100 flex items-center justify-center">
                {/* Placeholder for theme thumbnail */}
                <div className="text-4xl">{getThemeEmoji(theme.name)}</div>
              </div>
              <div className="p-2 bg-white">
                <p className="text-sm font-medium text-gray-800 text-center">
                  {theme.displayName}
                </p>
              </div>
              {selectedTheme === theme.name && (
                <div className="absolute top-2 right-2 bg-primary-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                  ✓
                </div>
              )}
            </button>
          ))}
        </div>

        <button onClick={onBack} className="btn-secondary w-full mt-4">
          Back
        </button>
      </div>

      {/* Right Panel - Preview */}
      <div className="flex-1 flex flex-col">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Preview</h2>

        <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Preview Frame */}
          <div className="h-full flex flex-col">
            <div className="bg-gray-100 px-4 py-2 border-b border-gray-300 flex items-center gap-2">
              <div className="flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
              </div>
              <div className="flex-1 bg-white rounded px-3 py-1 text-xs text-gray-600">
                preview.html
              </div>
            </div>

            <div className="flex-1 overflow-auto p-8 bg-gradient-to-br from-gray-50 to-gray-100">
              {/* Mock Preview */}
              <div className="max-w-4xl mx-auto bg-white rounded-lg shadow-lg p-8">
                <div className="text-center mb-8">
                  <h1 className="text-4xl font-bold text-gray-900 mb-2">
                    {portfolioData.profile.fullName || 'Your Name'}
                  </h1>
                  <p className="text-xl text-gray-600">
                    {portfolioData.profile.title || 'Your Professional Title'}
                  </p>
                </div>

                {portfolioData.profile.summary && (
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-3">
                      About Me
                    </h2>
                    <p className="text-gray-700">
                      {portfolioData.profile.summary}
                    </p>
                  </div>
                )}

                {portfolioData.workExperience.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-3">
                      Experience
                    </h2>
                    <div className="space-y-4">
                      {portfolioData.workExperience
                        .slice(0, 2)
                        .map((exp, index) => (
                          <div key={index} className="border-l-2 border-primary-500 pl-4">
                            <h3 className="font-semibold text-gray-900">
                              {exp.title}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {exp.company} • {exp.startDate} - {exp.endDate}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {portfolioData.projects.length > 0 && (
                  <div className="mb-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-3">
                      Projects
                    </h2>
                    <div className="grid grid-cols-2 gap-4">
                      {portfolioData.projects.slice(0, 2).map((project, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <h3 className="font-semibold text-gray-900 mb-2">
                            {project.name}
                          </h3>
                          <p className="text-sm text-gray-600 line-clamp-2">
                            {project.description}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="text-center text-sm text-gray-500 mt-8">
                  Theme: {themes.find((t) => t.name === selectedTheme)?.displayName || selectedTheme}
                </p>
              </div>
            </div>
          </div>
        </div>

        <button onClick={handleGenerate} className="btn-primary w-full mt-4">
          Generate Website
        </button>
      </div>
    </div>
  );
}

// Helper function to get emoji for theme
function getThemeEmoji(themeName: string): string {
  const emojiMap: Record<string, string> = {
    onyx: '🖤',
    quartz: '💎',
    serene: '🌊',
    jade: '💚',
    coral: '🪸',
  };
  return emojiMap[themeName] || '🎨';
}
