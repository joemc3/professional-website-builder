import { useState, useRef, useEffect } from 'react';
import { open } from '@tauri-apps/api/dialog';
import {
  ingestFiles,
  getAggregatedText,
  getJsonFromAI,
  getApiKey,
  getLocalEndpoint,
} from '../utils/tauri';
import { ProcessingTier, PortfolioData, FileInfo } from '../types/portfolio';

interface FileIngestionProps {
  selectedTier: ProcessingTier;
  onTierChange: (tier: ProcessingTier) => void;
  ingestedFiles: string[];
  onFilesIngested: (files: string[]) => void;
  onNext: () => void;
  showLoading: (message: string) => void;
  hideLoading: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'warning') => void;
  portfolioData: PortfolioData;
  setPortfolioData: (data: PortfolioData) => void;
}

export default function FileIngestion({
  selectedTier,
  onTierChange,
  ingestedFiles,
  onFilesIngested,
  onNext,
  showLoading,
  hideLoading,
  showToast,
  setPortfolioData,
}: FileIngestionProps) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [cloudAIEnabled, setCloudAIEnabled] = useState(false);
  const [localAIEnabled, setLocalAIEnabled] = useState(false);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Check if AI options are configured
  useEffect(() => {
    checkAIOptions();
  }, []);

  const checkAIOptions = async () => {
    try {
      // Check if any cloud API keys are configured
      const anthropicKey = await getApiKey('anthropic');
      const openaiKey = await getApiKey('openai');
      const geminiKey = await getApiKey('gemini');
      setCloudAIEnabled(!!(anthropicKey || openaiKey || geminiKey));

      // Check if local endpoint is configured
      const endpoint = await getLocalEndpoint();
      setLocalAIEnabled(!!endpoint);
    } catch (error) {
      console.error('Error checking AI options:', error);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const droppedFiles = Array.from(e.dataTransfer.files);
    addFiles(droppedFiles.map((f) => f.path));
  };

  const handleAddFiles = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: 'Documents',
            extensions: ['pdf', 'docx', 'md', 'xlsx', 'pptx'],
          },
        ],
      });

      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        addFiles(paths);
      }
    } catch (error) {
      showToast('Error selecting files', 'error');
      console.error('Error selecting files:', error);
    }
  };

  const addFiles = (filePaths: string[]) => {
    const newFiles: FileInfo[] = filePaths.map((path) => ({
      name: path.split('/').pop() || path,
      path,
      status: 'pending',
    }));

    setFiles((prev) => [...prev, ...newFiles]);
    onFilesIngested([...ingestedFiles, ...filePaths]);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    onFilesIngested(files.filter((_, i) => i !== index).map((f) => f.path));
  };

  const handleProcessDocuments = async () => {
    if (files.length === 0) {
      showToast('Please add at least one file', 'warning');
      return;
    }

    try {
      showLoading('Processing documents...');

      // Ingest files
      await ingestFiles(files.map((f) => f.path));

      if (selectedTier === 'manual') {
        // For manual mode, just get the text for reference
        await getAggregatedText();
        hideLoading();
        onNext();
      } else {
        // For AI modes, process with AI
        showLoading('AI is analyzing your documents...');
        const aggregatedText = await getAggregatedText();
        const aiData = await getJsonFromAI(selectedTier, aggregatedText);

        // Update portfolio data with AI results
        setPortfolioData(aiData);
        hideLoading();
        showToast('Documents processed successfully!', 'success');
        onNext();
      }
    } catch (error) {
      hideLoading();
      showToast(
        `Error processing documents: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`,
        'error'
      );
      console.error('Error processing documents:', error);
    }
  };

  return (
    <div className="flex h-full gap-6">
      {/* Left Panel - File Ingestion */}
      <div className="flex-1 flex flex-col">
        <div
          ref={dropZoneRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center transition-colors ${
            isDragging
              ? 'border-primary-500 bg-primary-50'
              : 'border-gray-300 bg-gray-50'
          }`}
        >
          <div className="text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <p className="mt-4 text-lg text-gray-600">
              Drag and drop files here or...
            </p>
            <button onClick={handleAddFiles} className="btn-primary mt-4">
              Add Files
            </button>
          </div>
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="mt-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-3">
              Added Files:
            </h3>
            <div className="space-y-2">
              {files.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm border border-gray-200"
                >
                  <div className="flex items-center gap-3">
                    <svg
                      className="h-5 w-5 text-gray-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                    <span className="text-sm text-gray-700">{file.name}</span>
                  </div>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-red-600 hover:text-red-800 text-sm font-medium"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Right Panel - Processing Tier Selection */}
      <div className="w-80 flex flex-col">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">
          Choose a method:
        </h2>

        <div className="space-y-4 flex-1">
          {/* Manual Mode */}
          <label
            className={`card cursor-pointer transition-all ${
              selectedTier === 'manual'
                ? 'ring-2 ring-primary-500 border-primary-500'
                : 'hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="tier"
              value="manual"
              checked={selectedTier === 'manual'}
              onChange={(e) => onTierChange(e.target.value as ProcessingTier)}
              className="sr-only"
            />
            <div className="flex items-start gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 mt-1 flex items-center justify-center ${
                  selectedTier === 'manual'
                    ? 'border-primary-500'
                    : 'border-gray-300'
                }`}
              >
                {selectedTier === 'manual' && (
                  <div className="w-3 h-3 rounded-full bg-primary-500"></div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Manual Mode</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Fill it out yourself from the extracted text.
                </p>
              </div>
            </div>
          </label>

          {/* Cloud AI Mode */}
          <label
            className={`card cursor-pointer transition-all ${
              !cloudAIEnabled
                ? 'opacity-50 cursor-not-allowed'
                : selectedTier === 'cloud'
                ? 'ring-2 ring-primary-500 border-primary-500'
                : 'hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="tier"
              value="cloud"
              checked={selectedTier === 'cloud'}
              onChange={(e) => onTierChange(e.target.value as ProcessingTier)}
              disabled={!cloudAIEnabled}
              className="sr-only"
            />
            <div className="flex items-start gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 mt-1 flex items-center justify-center ${
                  selectedTier === 'cloud'
                    ? 'border-primary-500'
                    : 'border-gray-300'
                }`}
              >
                {selectedTier === 'cloud' && (
                  <div className="w-3 h-3 rounded-full bg-primary-500"></div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Cloud AI Mode</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Automated via API.{' '}
                  {!cloudAIEnabled && (
                    <span className="text-red-600">(Configure API key)</span>
                  )}
                </p>
              </div>
            </div>
          </label>

          {/* Local AI Mode */}
          <label
            className={`card cursor-pointer transition-all ${
              !localAIEnabled
                ? 'opacity-50 cursor-not-allowed'
                : selectedTier === 'local'
                ? 'ring-2 ring-primary-500 border-primary-500'
                : 'hover:border-gray-300'
            }`}
          >
            <input
              type="radio"
              name="tier"
              value="local"
              checked={selectedTier === 'local'}
              onChange={(e) => onTierChange(e.target.value as ProcessingTier)}
              disabled={!localAIEnabled}
              className="sr-only"
            />
            <div className="flex items-start gap-3">
              <div
                className={`w-5 h-5 rounded-full border-2 mt-1 flex items-center justify-center ${
                  selectedTier === 'local'
                    ? 'border-primary-500'
                    : 'border-gray-300'
                }`}
              >
                {selectedTier === 'local' && (
                  <div className="w-3 h-3 rounded-full bg-primary-500"></div>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Local AI Mode</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Use your own local LLM.{' '}
                  {!localAIEnabled && (
                    <span className="text-red-600">(Configure endpoint)</span>
                  )}
                </p>
              </div>
            </div>
          </label>
        </div>

        {/* Process Button */}
        <button
          onClick={handleProcessDocuments}
          disabled={files.length === 0}
          className="btn-primary w-full mt-6"
        >
          Process Documents
        </button>
      </div>
    </div>
  );
}
