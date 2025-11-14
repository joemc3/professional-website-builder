import { openFolder, openInBrowser } from '../utils/tauri';
import { homeDir } from '@tauri-apps/api/path';

interface GenerationSuccessProps {
  onBackToEditor: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
}

export default function GenerationSuccess({
  onBackToEditor,
  showToast,
}: GenerationSuccessProps) {
  const handleOpenFolder = async () => {
    try {
      const home = await homeDir();
      const websitePath = `${home}/user-data/generated-site`;
      await openFolder(websitePath);
    } catch (error) {
      showToast(
        `Error opening folder: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        'error'
      );
      console.error('Error opening folder:', error);
    }
  };

  const handlePreviewInBrowser = async () => {
    try {
      const home = await homeDir();
      const indexPath = `${home}/user-data/generated-site/index.html`;
      await openInBrowser(`file://${indexPath}`);
    } catch (error) {
      showToast(
        `Error opening preview: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        'error'
      );
      console.error('Error opening preview:', error);
    }
  };

  return (
    <div className="h-full flex items-center justify-center">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          {/* Success Icon */}
          <div className="mb-6">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
              <svg
                className="w-12 h-12 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>

          {/* Success Message */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Success!</h1>
          <p className="text-xl text-gray-600 mb-8">
            Your professional website has been generated successfully.
          </p>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center mb-8">
            <button
              onClick={handleOpenFolder}
              className="btn-primary flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
              Open Website Folder
            </button>

            <button
              onClick={handlePreviewInBrowser}
              className="btn-primary flex items-center gap-2"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                />
              </svg>
              Preview in Browser
            </button>
          </div>

          {/* Information Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-semibold text-blue-900 mb-2">
              What's Next?
            </h3>
            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
              <li>Your website files are ready to be deployed</li>
              <li>Upload the generated files to any web hosting service</li>
              <li>Share your professional portfolio with the world</li>
            </ul>
          </div>

          {/* Secondary Action */}
          <button onClick={onBackToEditor} className="btn-secondary">
            Back to Editor
          </button>

          {/* File Location Info */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              Files saved to:{' '}
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                ~/user-data/generated-site/
              </code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
