import axios from 'axios';
import type {
  LoginRequest,
  RegisterRequest,
  TokenResponse,
  UserResponse,
  UsernameRequest,
  UsernameResponse,
  DocumentResponse,
  ProfileResponse,
  ProfileData,
  SynthesizeRequest,
  JobPostingCreate,
  JobPostingUpdate,
  JobPostingResponse,
  JobPostingDraft,
  ScrapeRequest,
  ParseRequest,
  PortfolioGenerateRequest,
  TargetedGenerateRequest,
  SiteResponse,
  PreviewRequest,
  PreviewResponse,
  APIKeySaveRequest,
  APIKeySaveResponse,
  APIKeyStatusResponse,
  ModelListResponse,
  ModelSelectRequest,
  TestConnectionRequest,
  TestConnectionResponse,
} from '@/types/api';
import type {
  GeneralResumeRequest,
  TargetedResumeRequest,
  ResumeResponse,
} from '@/types/resume';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export async function register(data: RegisterRequest): Promise<TokenResponse> {
  const res = await api.post<TokenResponse>('/api/auth/register', data);
  return res.data;
}

export async function login(data: LoginRequest): Promise<TokenResponse> {
  const res = await api.post<TokenResponse>('/api/auth/login', data);
  return res.data;
}

export async function logout(): Promise<void> {
  await api.post('/api/auth/logout');
}

export async function getMe(): Promise<UserResponse> {
  const res = await api.get<UserResponse>('/api/auth/me');
  return res.data;
}

export async function setUsername(data: UsernameRequest): Promise<UsernameResponse> {
  const res = await api.put<UsernameResponse>('/api/auth/username', data);
  return res.data;
}

// Documents
export async function getDocuments(statusFilter?: string): Promise<DocumentResponse[]> {
  const params = statusFilter ? { status_filter: statusFilter } : {};
  const res = await api.get<DocumentResponse[]>('/api/documents', { params });
  return res.data;
}

export async function getDocument(id: string): Promise<DocumentResponse> {
  const res = await api.get<DocumentResponse>(`/api/documents/${id}`);
  return res.data;
}

export async function uploadDocuments(files: File[]): Promise<DocumentResponse[]> {
  const formData = new FormData();
  files.forEach((file) => formData.append('files', file));
  const res = await api.post<DocumentResponse[]>('/api/documents', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function deleteDocument(id: string): Promise<void> {
  await api.delete(`/api/documents/${id}`);
}

// Profile
export async function getProfile(): Promise<ProfileResponse> {
  const res = await api.get<ProfileResponse>('/api/profile');
  return res.data;
}

export async function replaceProfile(data: ProfileData): Promise<ProfileResponse> {
  const res = await api.put<ProfileResponse>('/api/profile', data);
  return res.data;
}

export async function patchProfile(data: Partial<ProfileData>): Promise<ProfileResponse> {
  const res = await api.patch<ProfileResponse>('/api/profile', data);
  return res.data;
}

export async function uploadPhoto(file: File): Promise<ProfileResponse> {
  const formData = new FormData();
  formData.append('file', file);
  const res = await api.post<ProfileResponse>('/api/profile/photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return res.data;
}

export async function deletePhoto(): Promise<ProfileResponse> {
  const res = await api.delete<ProfileResponse>('/api/profile/photo');
  return res.data;
}

export function synthesizeProfile(
  data: SynthesizeRequest,
  onEvent: (event: string, payload: Record<string, unknown>) => void,
  onError: (error: string) => void
): () => void {
  const token = localStorage.getItem('authToken');
  const baseUrl = import.meta.env.VITE_API_URL || '';
  const url = `${baseUrl}/api/profile/synthesize`;

  const controller = new AbortController();

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        const text = await response.text();
        onError(text);
        return;
      }
      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        let currentEvent = '';
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.slice(7).trim();
          } else if (line.startsWith('data: ') && currentEvent) {
            try {
              const payload = JSON.parse(line.slice(6));
              onEvent(currentEvent, payload);
            } catch {
              // skip malformed data
            }
            currentEvent = '';
          }
        }
      }
    })
    .catch((err) => {
      if (err.name !== 'AbortError') {
        onError(err.message);
      }
    });

  return () => controller.abort();
}

// Job Postings
export async function getJobPostings(): Promise<JobPostingResponse[]> {
  const res = await api.get<JobPostingResponse[]>('/api/job-postings');
  return res.data;
}

export async function getJobPosting(id: string): Promise<JobPostingResponse> {
  const res = await api.get<JobPostingResponse>(`/api/job-postings/${id}`);
  return res.data;
}

export async function createJobPosting(data: JobPostingCreate): Promise<JobPostingResponse> {
  const res = await api.post<JobPostingResponse>('/api/job-postings', data);
  return res.data;
}

export async function updateJobPosting(
  id: string,
  data: JobPostingUpdate
): Promise<JobPostingResponse> {
  const res = await api.put<JobPostingResponse>(`/api/job-postings/${id}`, data);
  return res.data;
}

export async function deleteJobPosting(id: string): Promise<void> {
  await api.delete(`/api/job-postings/${id}`);
}

export async function scrapeJobPosting(data: ScrapeRequest): Promise<JobPostingDraft> {
  const res = await api.post<JobPostingDraft>('/api/job-postings/from-url', data);
  return res.data;
}

export async function parseJobPosting(data: ParseRequest): Promise<JobPostingDraft> {
  const res = await api.post<JobPostingDraft>('/api/job-postings/from-text', data);
  return res.data;
}

// Sites
export async function getSites(): Promise<SiteResponse[]> {
  const res = await api.get<SiteResponse[]>('/api/sites');
  return res.data;
}

export async function getSite(id: string): Promise<SiteResponse> {
  const res = await api.get<SiteResponse>(`/api/sites/${id}`);
  return res.data;
}

export async function generatePortfolio(
  data: PortfolioGenerateRequest
): Promise<SiteResponse> {
  const res = await api.post<SiteResponse>('/api/sites/portfolio', data);
  return res.data;
}

export async function generateTargeted(
  data: TargetedGenerateRequest
): Promise<SiteResponse> {
  const res = await api.post<SiteResponse>('/api/sites/targeted', data);
  return res.data;
}

export async function deleteSite(id: string): Promise<void> {
  await api.delete(`/api/sites/${id}`);
}

// Preview
export async function createPreview(data: PreviewRequest): Promise<PreviewResponse> {
  const res = await api.post<PreviewResponse>('/api/preview/', data);
  return res.data;
}

export async function deletePreview(previewId: string): Promise<void> {
  await api.delete(`/api/preview/${previewId}`);
}

export function getPreviewUrl(previewId: string): string {
  const baseUrl = import.meta.env.VITE_API_URL || '';
  return `${baseUrl}/api/preview/${previewId}`;
}

// Settings
export async function saveApiKey(data: APIKeySaveRequest): Promise<APIKeySaveResponse> {
  const res = await api.post<APIKeySaveResponse>('/api/settings/api-keys', data);
  return res.data;
}

export async function getApiKeyStatus(provider: string): Promise<APIKeyStatusResponse> {
  const res = await api.get<APIKeyStatusResponse>(`/api/settings/api-keys/${provider}`);
  return res.data;
}

export async function deleteApiKey(provider: string): Promise<void> {
  await api.delete(`/api/settings/api-keys/${provider}`);
}

export async function selectModel(
  provider: string,
  data: ModelSelectRequest
): Promise<void> {
  await api.put(`/api/settings/api-keys/${provider}/model`, data);
}

export async function getModels(provider: string): Promise<ModelListResponse> {
  const res = await api.get<ModelListResponse>(`/api/settings/models/${provider}`);
  return res.data;
}

export async function testConnection(
  data: TestConnectionRequest
): Promise<TestConnectionResponse> {
  const res = await api.post<TestConnectionResponse>(
    '/api/settings/test-connection',
    data
  );
  return res.data;
}

// Resumes
export async function getResumes(): Promise<ResumeResponse[]> {
  const res = await api.get<ResumeResponse[]>('/api/resumes');
  return res.data;
}

export async function getResume(id: string): Promise<ResumeResponse> {
  const res = await api.get<ResumeResponse>(`/api/resumes/${id}`);
  return res.data;
}

export async function generateGeneralResume(
  data: GeneralResumeRequest
): Promise<ResumeResponse> {
  const res = await api.post<ResumeResponse>('/api/resumes/general', data);
  return res.data;
}

export async function generateTargetedResume(
  data: TargetedResumeRequest
): Promise<ResumeResponse> {
  const res = await api.post<ResumeResponse>('/api/resumes/targeted', data);
  return res.data;
}

export async function deleteResume(id: string): Promise<void> {
  await api.delete(`/api/resumes/${id}`);
}

export async function downloadResume(id: string): Promise<void> {
  const res = await api.get(`/api/resumes/${id}/download`, {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([res.data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = `resume-${id}.pdf`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
