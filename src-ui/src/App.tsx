import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate } from 'react-router-dom';
import './App.css';
import FileIngestion from './components/FileIngestion';
import Settings from './components/Settings';
import MainEditor from './components/MainEditor';
import ThemeSelection from './components/ThemeSelection';
import GenerationSuccess from './components/GenerationSuccess';
import { PortfolioData, ProcessingTier } from './types/portfolio';

function App() {
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [toast, setToast] = useState<{
    message: string;
    type: 'success' | 'error' | 'warning' | 'info';
  } | null>(null);

  // Application state
  const [selectedTier, setSelectedTier] = useState<ProcessingTier>('manual');
  const [ingestedFiles, setIngestedFiles] = useState<string[]>([]);
  const [portfolioData, setPortfolioData] = useState<PortfolioData>({
    profile: {
      fullName: '',
      title: '',
      summary: '',
    },
    contact: {
      email: '',
      phone: '',
      website: '',
      socialLinks: [],
    },
    workExperience: [],
    projects: [],
    education: [],
    skills: [],
    theme: {
      name: 'onyx',
    },
  });

  // Auto-hide toast after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (
    message: string,
    type: 'success' | 'error' | 'warning' | 'info' = 'info'
  ) => {
    setToast({ message, type });
  };

  const showLoading = (message: string) => {
    setLoadingMessage(message);
    setLoading(true);
  };

  const hideLoading = () => {
    setLoading(false);
    setLoadingMessage('');
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <h1 className="app-title">Professional Website Builder</h1>
        <button
          className="settings-icon"
          onClick={() => setShowSettings(true)}
          aria-label="Settings"
        >
          ⚙️
        </button>
      </header>

      {/* Main Content */}
      <main className="app-content">
        <Routes>
          <Route
            path="/"
            element={
              <FileIngestion
                selectedTier={selectedTier}
                onTierChange={setSelectedTier}
                ingestedFiles={ingestedFiles}
                onFilesIngested={setIngestedFiles}
                onNext={() => navigate('/editor')}
                showLoading={showLoading}
                hideLoading={hideLoading}
                showToast={showToast}
                portfolioData={portfolioData}
                setPortfolioData={setPortfolioData}
              />
            }
          />
          <Route
            path="/editor"
            element={
              <MainEditor
                portfolioData={portfolioData}
                onUpdate={setPortfolioData}
                onNext={() => navigate('/themes')}
                onBack={() => navigate('/')}
              />
            }
          />
          <Route
            path="/themes"
            element={
              <ThemeSelection
                portfolioData={portfolioData}
                onThemeSelect={(themeName) =>
                  setPortfolioData({
                    ...portfolioData,
                    theme: { name: themeName },
                  })
                }
                onGenerate={() => navigate('/success')}
                onBack={() => navigate('/editor')}
                showLoading={showLoading}
                hideLoading={hideLoading}
                showToast={showToast}
              />
            }
          />
          <Route
            path="/success"
            element={
              <GenerationSuccess
                onBackToEditor={() => navigate('/editor')}
                showToast={showToast}
              />
            }
          />
        </Routes>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <Settings
          onClose={() => setShowSettings(false)}
          showToast={showToast}
        />
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="spinner"></div>
            <p className="text-gray-700 font-medium">{loadingMessage}</p>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type}`}>
          <p>{toast.message}</p>
        </div>
      )}
    </div>
  );
}

export default App;
