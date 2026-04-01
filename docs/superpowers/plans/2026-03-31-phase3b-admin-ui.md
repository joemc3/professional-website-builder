# Phase 3b: Admin UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Full rebuild of the React admin app — shadcn/ui components, TanStack Query for server state, persistent sidebar layout with dark mode, covering documents, profile, job postings, sites, and settings pages.

**Architecture:** Gut existing page components; keep the Vite/React/TypeScript/Tailwind skeleton. Install shadcn/ui (Radix + Tailwind components copied into repo) and TanStack Query. Build an AppLayout shell with sidebar navigation, then implement each page against the current Python API. Auth stays in React Context; all server data flows through React Query hooks.

**Tech Stack:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui (Radix), TanStack Query, Axios, React Router v6

---

## File Structure

```
src-ui/src/
├── main.tsx                          # Entry — wrap with QueryClientProvider
├── App.tsx                           # Routes only (no state, no layout)
├── index.css                         # Tailwind + shadcn globals
├── lib/
│   └── utils.ts                      # cn() helper (shadcn)
├── hooks/
│   ├── use-auth.ts                   # useAuth query hooks (login, register, logout, me)
│   ├── use-documents.ts              # useDocuments, useDocument, useUpload, useDeleteDocument
│   ├── use-profile.ts               # useProfile, useUpdateProfile, useSynthesize
│   ├── use-job-postings.ts          # useJobPostings, useJobPosting, CRUD mutations
│   ├── use-sites.ts                 # useSites, useSite, useGeneratePortfolio, useGenerateTargeted
│   ├── use-settings.ts             # useApiKeyStatus, useModels, mutations
│   └── use-theme.ts                # useTheme (dark/light/system)
├── services/
│   └── api.ts                       # Axios client — updated to current API paths
├── types/
│   └── api.ts                       # All request/response types matching backend schemas
├── contexts/
│   └── auth-context.tsx             # Simplified: token storage, user state, logout
├── components/
│   └── ui/                          # shadcn/ui components (auto-generated)
├── layouts/
│   └── app-layout.tsx               # Sidebar + main content area
├── pages/
│   ├── login.tsx
│   ├── register.tsx
│   ├── documents.tsx
│   ├── profile.tsx
│   ├── job-postings.tsx
│   ├── job-posting-new.tsx
│   ├── job-posting-edit.tsx
│   ├── sites.tsx
│   └── settings.tsx
└── providers/
    └── theme-provider.tsx           # Dark mode context
```

**Files to delete (old Tauri-era):**
- `src/components/FileIngestion.tsx`
- `src/components/MainEditor.tsx`
- `src/components/ThemeSelection.tsx`
- `src/components/GenerationSuccess.tsx`
- `src/components/Settings.tsx`
- `src/components/Login.tsx`
- `src/components/Register.tsx`
- `src/components/ProtectedRoute.tsx`
- `src/types/portfolio.ts`
- `src/utils/tauri.ts`
- `src/App.css`

---

## Task 1: Install Dependencies and Configure shadcn/ui

**Files:**
- Modify: `src-ui/package.json`
- Modify: `src-ui/tailwind.config.js`
- Modify: `src-ui/vite.config.ts`
- Create: `src-ui/components.json`
- Create: `src-ui/src/lib/utils.ts`
- Modify: `src-ui/src/index.css`

- [ ] **Step 1: Install TanStack Query and other dependencies**

```bash
cd /Users/joemc3/tmp/professional-website-builder/src-ui
npm install @tanstack/react-query
npm install -D @types/node
```

- [ ] **Step 2: Initialize shadcn/ui**

```bash
cd /Users/joemc3/tmp/professional-website-builder/src-ui
npx shadcn@latest init
```

When prompted:
- Style: **New York**
- Base color: **Zinc**
- CSS variables: **yes**

This creates `components.json`, updates `tailwind.config.js` with shadcn presets, creates `src/lib/utils.ts` with the `cn()` helper, and updates `src/index.css` with CSS variable definitions.

- [ ] **Step 3: Install shadcn components**

```bash
cd /Users/joemc3/tmp/professional-website-builder/src-ui
npx shadcn@latest add button input label textarea card table dialog tabs badge skeleton dropdown-menu select tooltip separator sheet switch alert scroll-area
```

- [ ] **Step 4: Update vite.config.ts — fix API proxy target**

The current proxy points to `localhost:3001` but the Python API runs on `localhost:8000`.

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2020',
    sourcemap: true,
  },
});
```

- [ ] **Step 5: Commit**

```bash
git -C /Users/joemc3/tmp/professional-website-builder add src-ui/package.json src-ui/package-lock.json src-ui/components.json src-ui/tailwind.config.js src-ui/tsconfig.json src-ui/vite.config.ts src-ui/src/lib/ src-ui/src/components/ui/ src-ui/src/index.css
git -C /Users/joemc3/tmp/professional-website-builder commit -m "feat(ui): install shadcn/ui, TanStack Query, fix API proxy"
```

---

## Task 2: TypeScript Types for API

**Files:**
- Create: `src-ui/src/types/api.ts`
- Delete: `src-ui/src/types/portfolio.ts`

- [ ] **Step 1: Create API types matching backend schemas**

Create `src-ui/src/types/api.ts`:

```typescript
// Auth
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface UserResponse {
  id: string;
  email: string;
}

export interface UsernameRequest {
  username: string;
}

export interface UsernameResponse {
  username: string;
}

// Documents
export interface DocumentResponse {
  id: string;
  filename: string;
  content_type: string;
  file_size: number;
  status: string;
  error_message: string | null;
  parsed_text: string | null;
  created_at: string;
  updated_at: string;
}

// Profile
export interface Basics {
  name?: string | null;
  title?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  linkedin?: string | null;
  website?: string | null;
  summary?: string | null;
}

export interface Skill {
  category?: string | null;
  items?: string[] | null;
}

export interface Experience {
  company?: string | null;
  title?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  current?: boolean | null;
  description?: string | null;
  highlights?: string[] | null;
}

export interface Education {
  institution?: string | null;
  degree?: string | null;
  field?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  notes?: string | null;
}

export interface Certification {
  name?: string | null;
  issuer?: string | null;
  date_obtained?: string | null;
  expiration?: string | null;
  credential_id?: string | null;
}

export interface Project {
  name?: string | null;
  description?: string | null;
  role?: string | null;
  technologies?: string[] | null;
  outcomes?: string[] | null;
}

export interface Publication {
  title?: string | null;
  venue?: string | null;
  date?: string | null;
  url?: string | null;
}

export interface Award {
  title?: string | null;
  issuer?: string | null;
  date?: string | null;
  description?: string | null;
}

export interface Volunteer {
  organization?: string | null;
  role?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  description?: string | null;
}

export interface LanguageSkill {
  language?: string | null;
  proficiency?: string | null;
}

export interface ProfileData {
  basics?: Basics | null;
  skills?: Skill[] | null;
  experience?: Experience[] | null;
  education?: Education[] | null;
  certifications?: Certification[] | null;
  projects?: Project[] | null;
  publications?: Publication[] | null;
  awards?: Award[] | null;
  volunteer?: Volunteer[] | null;
  languages?: LanguageSkill[] | null;
}

export interface ProfileResponse {
  id: string;
  data: ProfileData;
  guidance: string | null;
  generated_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SynthesizeRequest {
  model: string;
  guidance?: string | null;
}

// Job Postings
export interface JobPostingCreate {
  title: string;
  company: string;
  description: string;
  source_url?: string | null;
  raw_text?: string | null;
  requirements?: Record<string, unknown> | null;
}

export interface JobPostingUpdate {
  title?: string | null;
  company?: string | null;
  description?: string | null;
  source_url?: string | null;
  raw_text?: string | null;
  requirements?: Record<string, unknown> | null;
}

export interface JobPostingDraft {
  title: string;
  company: string;
  description: string;
  source_url?: string | null;
  raw_text?: string | null;
  requirements?: Record<string, unknown> | null;
}

export interface JobPostingResponse {
  id: string;
  title: string;
  company: string;
  description: string;
  source_url: string | null;
  raw_text: string | null;
  requirements: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface ScrapeRequest {
  url: string;
}

export interface ParseRequest {
  raw_text: string;
}

// Sites
export interface PortfolioGenerateRequest {
  theme: string;
}

export interface TargetedGenerateRequest {
  job_posting_id: string;
  theme: string;
}

export interface SiteResponse {
  id: string;
  slug: string;
  type: string;
  theme: string;
  status: string;
  error_message: string | null;
  output_path: string;
  public_url: string;
  stale: boolean;
  job_posting_id: string | null;
  generated_at: string | null;
  created_at: string;
  updated_at: string;
}

// Settings
export interface APIKeySaveRequest {
  provider: string;
  api_key: string;
}

export interface APIKeySaveResponse {
  provider: string;
  saved: boolean;
}

export interface APIKeyStatusResponse {
  provider: string;
  is_set: boolean;
  selected_model: string | null;
}

export interface ModelInfo {
  id: string;
  name: string | null;
}

export interface ModelListResponse {
  provider: string;
  models: ModelInfo[];
}

export interface ModelSelectRequest {
  model: string;
}

export interface TestConnectionRequest {
  provider: string;
  model?: string | null;
}

export interface TestConnectionResponse {
  provider: string;
  status: string;
  message: string | null;
}
```

- [ ] **Step 2: Delete old types file**

```bash
rm /Users/joemc3/tmp/professional-website-builder/src-ui/src/types/portfolio.ts
```

- [ ] **Step 3: Commit**

```bash
git -C /Users/joemc3/tmp/professional-website-builder add src-ui/src/types/api.ts
git -C /Users/joemc3/tmp/professional-website-builder rm src-ui/src/types/portfolio.ts
git -C /Users/joemc3/tmp/professional-website-builder commit -m "feat(ui): add API types matching backend schemas, remove old types"
```

---

## Task 3: API Client Refactor

**Files:**
- Rewrite: `src-ui/src/services/api.ts`
- Delete: `src-ui/src/utils/tauri.ts`

- [ ] **Step 1: Rewrite api.ts to match current API endpoints**

Rewrite `src-ui/src/services/api.ts`:

```typescript
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
  APIKeySaveRequest,
  APIKeySaveResponse,
  APIKeyStatusResponse,
  ModelListResponse,
  ModelSelectRequest,
  TestConnectionRequest,
  TestConnectionResponse,
} from '@/types/api';

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

export function synthesizeProfile(
  data: SynthesizeRequest,
  onEvent: (event: string, payload: Record<string, unknown>) => void,
  onError: (error: string) => void
): () => void {
  const token = localStorage.getItem('authToken');
  const baseUrl = import.meta.env.VITE_API_URL || '';
  const url = `${baseUrl}/api/profile/synthesize`;

  const eventSource = new EventSource(url, {
    // EventSource doesn't support headers natively.
    // We use fetch-based SSE instead.
  } as EventSourceInit);

  // EventSource can't send POST or headers. Use fetch with ReadableStream.
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

      while (true) {
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
```

- [ ] **Step 2: Delete old utils/tauri.ts**

```bash
rm /Users/joemc3/tmp/professional-website-builder/src-ui/src/utils/tauri.ts
```

- [ ] **Step 3: Commit**

```bash
git -C /Users/joemc3/tmp/professional-website-builder add src-ui/src/services/api.ts
git -C /Users/joemc3/tmp/professional-website-builder rm src-ui/src/utils/tauri.ts
git -C /Users/joemc3/tmp/professional-website-builder commit -m "feat(ui): rewrite API client for current endpoints, remove tauri utils"
```

---

## Task 4: TanStack Query Hooks

**Files:**
- Create: `src-ui/src/hooks/use-documents.ts`
- Create: `src-ui/src/hooks/use-profile.ts`
- Create: `src-ui/src/hooks/use-job-postings.ts`
- Create: `src-ui/src/hooks/use-sites.ts`
- Create: `src-ui/src/hooks/use-settings.ts`

- [ ] **Step 1: Create documents hooks**

Create `src-ui/src/hooks/use-documents.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '@/services/api';

export function useDocuments() {
  return useQuery({
    queryKey: ['documents'],
    queryFn: () => api.getDocuments(),
  });
}

export function useDocument(id: string) {
  return useQuery({
    queryKey: ['documents', id],
    queryFn: () => api.getDocument(id),
    enabled: !!id,
  });
}

export function useUploadDocuments() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (files: File[]) => api.uploadDocuments(files),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });
}
```

- [ ] **Step 2: Create profile hooks**

Create `src-ui/src/hooks/use-profile.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { ProfileData } from '@/types/api';
import * as api from '@/services/api';

export function useProfile() {
  return useQuery({
    queryKey: ['profile'],
    queryFn: () => api.getProfile(),
    retry: (failureCount, error) => {
      // Don't retry on 404 (no profile yet)
      if ((error as { response?: { status: number } })?.response?.status === 404) {
        return false;
      }
      return failureCount < 3;
    },
  });
}

export function usePatchProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<ProfileData>) => api.patchProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useReplaceProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: ProfileData) => api.replaceProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
```

- [ ] **Step 3: Create job postings hooks**

Create `src-ui/src/hooks/use-job-postings.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  JobPostingCreate,
  JobPostingUpdate,
  ScrapeRequest,
  ParseRequest,
} from '@/types/api';
import * as api from '@/services/api';

export function useJobPostings() {
  return useQuery({
    queryKey: ['job-postings'],
    queryFn: () => api.getJobPostings(),
  });
}

export function useJobPosting(id: string) {
  return useQuery({
    queryKey: ['job-postings', id],
    queryFn: () => api.getJobPosting(id),
    enabled: !!id,
  });
}

export function useCreateJobPosting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: JobPostingCreate) => api.createJobPosting(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-postings'] });
    },
  });
}

export function useUpdateJobPosting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: JobPostingUpdate }) =>
      api.updateJobPosting(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-postings'] });
    },
  });
}

export function useDeleteJobPosting() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteJobPosting(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['job-postings'] });
    },
  });
}

export function useScrapeJobPosting() {
  return useMutation({
    mutationFn: (data: ScrapeRequest) => api.scrapeJobPosting(data),
  });
}

export function useParseJobPosting() {
  return useMutation({
    mutationFn: (data: ParseRequest) => api.parseJobPosting(data),
  });
}
```

- [ ] **Step 4: Create sites hooks**

Create `src-ui/src/hooks/use-sites.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { PortfolioGenerateRequest, TargetedGenerateRequest } from '@/types/api';
import * as api from '@/services/api';

export function useSites() {
  return useQuery({
    queryKey: ['sites'],
    queryFn: () => api.getSites(),
  });
}

export function useSitesPolling() {
  const query = useSites();
  const hasActiveJobs = query.data?.some(
    (s) => s.status === 'queued' || s.status === 'processing'
  );

  return useQuery({
    queryKey: ['sites'],
    queryFn: () => api.getSites(),
    refetchInterval: hasActiveJobs ? 3000 : false,
  });
}

export function useGeneratePortfolio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PortfolioGenerateRequest) => api.generatePortfolio(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
    },
  });
}

export function useGenerateTargeted() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TargetedGenerateRequest) => api.generateTargeted(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
    },
  });
}

export function useDeleteSite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteSite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sites'] });
    },
  });
}
```

- [ ] **Step 5: Create settings hooks**

Create `src-ui/src/hooks/use-settings.ts`:

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  APIKeySaveRequest,
  ModelSelectRequest,
  TestConnectionRequest,
} from '@/types/api';
import * as api from '@/services/api';

const PROVIDERS = ['anthropic', 'openai', 'gemini', 'openrouter'] as const;

export function useApiKeyStatuses() {
  return useQuery({
    queryKey: ['api-key-statuses'],
    queryFn: async () => {
      const results = await Promise.all(
        PROVIDERS.map((p) =>
          api.getApiKeyStatus(p).catch(() => ({
            provider: p,
            is_set: false,
            selected_model: null,
          }))
        )
      );
      return results;
    },
  });
}

export function useModels(provider: string) {
  return useQuery({
    queryKey: ['models', provider],
    queryFn: () => api.getModels(provider),
    enabled: !!provider,
  });
}

export function useSaveApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: APIKeySaveRequest) => api.saveApiKey(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-key-statuses'] });
    },
  });
}

export function useDeleteApiKey() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (provider: string) => api.deleteApiKey(provider),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-key-statuses'] });
    },
  });
}

export function useSelectModel() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      provider,
      data,
    }: {
      provider: string;
      data: ModelSelectRequest;
    }) => api.selectModel(provider, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['api-key-statuses'] });
    },
  });
}

export function useTestConnection() {
  return useMutation({
    mutationFn: (data: TestConnectionRequest) => api.testConnection(data),
  });
}
```

- [ ] **Step 6: Commit**

```bash
git -C /Users/joemc3/tmp/professional-website-builder add src-ui/src/hooks/
git -C /Users/joemc3/tmp/professional-website-builder commit -m "feat(ui): add TanStack Query hooks for all API resources"
```

---

## Task 5: Theme Provider and Auth Context

**Files:**
- Create: `src-ui/src/providers/theme-provider.tsx`
- Create: `src-ui/src/hooks/use-theme.ts`
- Rewrite: `src-ui/src/contexts/auth-context.tsx`

- [ ] **Step 1: Create theme provider**

Create `src-ui/src/providers/theme-provider.tsx`:

```typescript
import { createContext, useEffect, useState } from 'react';

type Theme = 'dark' | 'light' | 'system';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export const ThemeContext = createContext<ThemeContextValue>({
  theme: 'system',
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem('theme') as Theme) || 'system'
  );

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }

    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

- [ ] **Step 2: Create useTheme hook**

Create `src-ui/src/hooks/use-theme.ts`:

```typescript
import { useContext } from 'react';
import { ThemeContext } from '@/providers/theme-provider';

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
```

- [ ] **Step 3: Rewrite auth context**

Rewrite `src-ui/src/contexts/auth-context.tsx`:

```typescript
import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { UserResponse } from '@/types/api';
import * as api from '@/services/api';

interface AuthContextValue {
  user: UserResponse | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkAuth = useCallback(async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setIsLoading(false);
      return;
    }
    try {
      const me = await api.getMe();
      setUser(me);
    } catch {
      localStorage.removeItem('authToken');
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    const res = await api.login({ email, password });
    localStorage.setItem('authToken', res.access_token);
    const me = await api.getMe();
    setUser(me);
  };

  const register = async (email: string, password: string) => {
    const res = await api.register({ email, password });
    localStorage.setItem('authToken', res.access_token);
    const me = await api.getMe();
    setUser(me);
  };

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      localStorage.removeItem('authToken');
      setUser(null);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, isAuthenticated: !!user, isLoading, login, register, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

- [ ] **Step 4: Commit**

```bash
git -C /Users/joemc3/tmp/professional-website-builder add src-ui/src/providers/ src-ui/src/hooks/use-theme.ts src-ui/src/contexts/auth-context.tsx
git -C /Users/joemc3/tmp/professional-website-builder commit -m "feat(ui): add theme provider, rewrite auth context"
```

---

## Task 6: App Shell — Layout, Sidebar, Routing

**Files:**
- Create: `src-ui/src/layouts/app-layout.tsx`
- Rewrite: `src-ui/src/App.tsx`
- Rewrite: `src-ui/src/main.tsx`
- Delete: `src-ui/src/App.css`
- Delete all old components: `src-ui/src/components/FileIngestion.tsx`, `MainEditor.tsx`, `ThemeSelection.tsx`, `GenerationSuccess.tsx`, `Settings.tsx`, `Login.tsx`, `Register.tsx`, `ProtectedRoute.tsx`

- [ ] **Step 1: Create app layout with sidebar**

Create `src-ui/src/layouts/app-layout.tsx`:

```typescript
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { useTheme } from '@/hooks/use-theme';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  FileText,
  User,
  Briefcase,
  Globe,
  Settings,
  LogOut,
  Sun,
  Moon,
  Monitor,
  Menu,
} from 'lucide-react';

const navItems = [
  { to: '/app/documents', label: 'Documents', icon: FileText },
  { to: '/app/profile', label: 'Profile', icon: User },
  { to: '/app/job-postings', label: 'Job Postings', icon: Briefcase },
  { to: '/app/sites', label: 'Sites', icon: Globe },
  { to: '/app/settings', label: 'Settings', icon: Settings },
];

function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const next = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
  const Icon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Monitor;

  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(next)} title={`Theme: ${theme}`}>
      <Icon className="h-4 w-4" />
    </Button>
  );
}

function SidebarNav() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex h-full w-64 flex-col border-r bg-card">
      <div className="p-6">
        <h1 className="text-lg font-semibold tracking-tight">PWB Admin</h1>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-accent text-accent-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              }`
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t p-4">
        <div className="flex items-center justify-between">
          <span className="truncate text-sm text-muted-foreground">
            {user?.email}
          </span>
          <div className="flex items-center gap-1">
            <ThemeToggle />
            <Button variant="ghost" size="icon" onClick={handleLogout} title="Log out">
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function AppLayout() {
  return (
    <div className="flex h-screen">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <SidebarNav />
      </div>

      {/* Mobile sidebar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 flex items-center border-b bg-card p-4">
        <Sheet>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SidebarNav />
          </SheetContent>
        </Sheet>
        <h1 className="ml-3 text-lg font-semibold">PWB Admin</h1>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-auto md:pt-0 pt-16">
        <div className="mx-auto max-w-5xl p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
```

- [ ] **Step 2: Create placeholder pages**

Create minimal placeholder pages so routing works. Each will be replaced in subsequent tasks.

Create `src-ui/src/pages/login.tsx`:

```typescript
export default function LoginPage() {
  return <div>Login — TODO</div>;
}
```

Create `src-ui/src/pages/register.tsx`:

```typescript
export default function RegisterPage() {
  return <div>Register — TODO</div>;
}
```

Create `src-ui/src/pages/documents.tsx`:

```typescript
export default function DocumentsPage() {
  return <div>Documents — TODO</div>;
}
```

Create `src-ui/src/pages/profile.tsx`:

```typescript
export default function ProfilePage() {
  return <div>Profile — TODO</div>;
}
```

Create `src-ui/src/pages/job-postings.tsx`:

```typescript
export default function JobPostingsPage() {
  return <div>Job Postings — TODO</div>;
}
```

Create `src-ui/src/pages/job-posting-new.tsx`:

```typescript
export default function JobPostingNewPage() {
  return <div>New Job Posting — TODO</div>;
}
```

Create `src-ui/src/pages/job-posting-edit.tsx`:

```typescript
export default function JobPostingEditPage() {
  return <div>Edit Job Posting — TODO</div>;
}
```

Create `src-ui/src/pages/sites.tsx`:

```typescript
export default function SitesPage() {
  return <div>Sites — TODO</div>;
}
```

Create `src-ui/src/pages/settings.tsx`:

```typescript
export default function SettingsPage() {
  return <div>Settings — TODO</div>;
}
```

- [ ] **Step 3: Rewrite App.tsx — routes only**

Rewrite `src-ui/src/App.tsx`:

```typescript
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { AppLayout } from '@/layouts/app-layout';
import LoginPage from '@/pages/login';
import RegisterPage from '@/pages/register';
import DocumentsPage from '@/pages/documents';
import ProfilePage from '@/pages/profile';
import JobPostingsPage from '@/pages/job-postings';
import JobPostingNewPage from '@/pages/job-posting-new';
import JobPostingEditPage from '@/pages/job-posting-edit';
import SitesPage from '@/pages/sites';
import SettingsPage from '@/pages/settings';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route
        path="/app"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="documents" replace />} />
        <Route path="documents" element={<DocumentsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="job-postings" element={<JobPostingsPage />} />
        <Route path="job-postings/new" element={<JobPostingNewPage />} />
        <Route path="job-postings/:id" element={<JobPostingEditPage />} />
        <Route path="sites" element={<SitesPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
```

- [ ] **Step 4: Rewrite main.tsx — add providers**

Rewrite `src-ui/src/main.tsx`:

```typescript
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from '@/providers/theme-provider';
import { AuthProvider } from '@/contexts/auth-context';
import App from './App';
import './index.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
    },
  },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </BrowserRouter>
  </React.StrictMode>
);
```

- [ ] **Step 5: Delete old files**

```bash
cd /Users/joemc3/tmp/professional-website-builder/src-ui
rm -f src/App.css
rm -f src/components/FileIngestion.tsx src/components/MainEditor.tsx src/components/ThemeSelection.tsx src/components/GenerationSuccess.tsx src/components/Settings.tsx src/components/Login.tsx src/components/Register.tsx src/components/ProtectedRoute.tsx
```

- [ ] **Step 6: Install lucide-react icons**

```bash
cd /Users/joemc3/tmp/professional-website-builder/src-ui
npm install lucide-react
```

- [ ] **Step 7: Verify build compiles**

```bash
cd /Users/joemc3/tmp/professional-website-builder/src-ui
npx tsc --noEmit
```

Expected: compiles with no errors.

- [ ] **Step 8: Commit**

```bash
git -C /Users/joemc3/tmp/professional-website-builder add src-ui/src/
git -C /Users/joemc3/tmp/professional-website-builder rm src-ui/src/App.css src-ui/src/components/FileIngestion.tsx src-ui/src/components/MainEditor.tsx src-ui/src/components/ThemeSelection.tsx src-ui/src/components/GenerationSuccess.tsx src-ui/src/components/Settings.tsx src-ui/src/components/Login.tsx src-ui/src/components/Register.tsx src-ui/src/components/ProtectedRoute.tsx
git -C /Users/joemc3/tmp/professional-website-builder add src-ui/package.json src-ui/package-lock.json
git -C /Users/joemc3/tmp/professional-website-builder commit -m "feat(ui): app shell with sidebar layout, routing, dark mode, placeholder pages"
```

---

## Task 7: Auth Pages (Login & Register)

**Files:**
- Rewrite: `src-ui/src/pages/login.tsx`
- Rewrite: `src-ui/src/pages/register.tsx`

- [ ] **Step 1: Build login page**

Rewrite `src-ui/src/pages/login.tsx`:

```typescript
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/app');
    } catch (err) {
      setError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          'Login failed'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Sign in</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
            <p className="text-sm text-muted-foreground">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="text-primary hover:underline">
                Create one
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Build register page**

Rewrite `src-ui/src/pages/register.tsx`:

```typescript
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await register(email, password);
      navigate('/app');
    } catch (err) {
      setError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          'Registration failed'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Create account</CardTitle>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Verify build compiles**

```bash
cd /Users/joemc3/tmp/professional-website-builder/src-ui
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git -C /Users/joemc3/tmp/professional-website-builder add src-ui/src/pages/login.tsx src-ui/src/pages/register.tsx
git -C /Users/joemc3/tmp/professional-website-builder commit -m "feat(ui): build login and register pages with shadcn"
```

---

## Task 8: Documents Page

**Files:**
- Rewrite: `src-ui/src/pages/documents.tsx`

- [ ] **Step 1: Build documents page**

Rewrite `src-ui/src/pages/documents.tsx`:

```typescript
import { useCallback, useState } from 'react';
import { useDocuments, useUploadDocuments, useDeleteDocument } from '@/hooks/use-documents';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Upload, Trash2, FileText, ChevronDown, ChevronRight } from 'lucide-react';
import type { DocumentResponse } from '@/types/api';

function statusColor(status: string) {
  switch (status) {
    case 'completed':
      return 'default';
    case 'processing':
      return 'secondary';
    case 'failed':
      return 'destructive';
    default:
      return 'outline';
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function DocumentsPage() {
  const { data: documents, isLoading, error } = useDocuments();
  const upload = useUploadDocuments();
  const deleteMut = useDeleteDocument();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentResponse | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFiles = useCallback(
    (files: FileList | null) => {
      if (!files || files.length === 0) return;
      upload.mutate(Array.from(files));
    },
    [upload]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => setDragActive(false);

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMut.mutate(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Documents</h2>

      {/* Upload zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
          dragActive
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/25 hover:border-muted-foreground/50'
        }`}
      >
        <Upload className="mb-3 h-8 w-8 text-muted-foreground" />
        <p className="mb-1 text-sm font-medium">
          Drag and drop files here, or{' '}
          <label className="cursor-pointer text-primary hover:underline">
            browse
            <input
              type="file"
              multiple
              className="hidden"
              accept=".pdf,.docx,.doc,.md,.txt"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        </p>
        <p className="text-xs text-muted-foreground">
          PDF, DOCX, MD, TXT — resumes, project descriptions, accomplishments
        </p>
        {upload.isPending && (
          <p className="mt-2 text-sm text-muted-foreground">Uploading...</p>
        )}
        {upload.isError && (
          <p className="mt-2 text-sm text-destructive">
            Upload failed: {(upload.error as Error).message}
          </p>
        )}
      </div>

      {/* Error state */}
      {error && (
        <Alert variant="destructive">
          <AlertDescription>Failed to load documents. Try refreshing.</AlertDescription>
        </Alert>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      )}

      {/* Empty state */}
      {documents && documents.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <FileText className="mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="mb-1 text-lg font-medium">No documents yet</h3>
            <p className="text-sm text-muted-foreground">
              Upload your resumes, project descriptions, and accomplishment summaries to get
              started.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Document list */}
      {documents && documents.length > 0 && (
        <div className="space-y-2">
          {documents.map((doc) => (
            <Card key={doc.id}>
              <CardContent className="p-4">
                <div
                  className="flex cursor-pointer items-center gap-3"
                  onClick={() =>
                    setExpandedId(expandedId === doc.id ? null : doc.id)
                  }
                >
                  {expandedId === doc.id ? (
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <span className="flex-1 truncate text-sm font-medium">
                    {doc.filename}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatSize(doc.file_size)}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(doc.created_at)}
                  </span>
                  <Badge variant={statusColor(doc.status)}>{doc.status}</Badge>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(doc);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {expandedId === doc.id && (
                  <div className="mt-4 border-t pt-4">
                    {doc.error_message && (
                      <p className="mb-2 text-sm text-destructive">{doc.error_message}</p>
                    )}
                    {doc.parsed_text ? (
                      <ScrollArea className="h-64 rounded-md border p-4">
                        <pre className="whitespace-pre-wrap text-xs">{doc.parsed_text}</pre>
                      </ScrollArea>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {doc.status === 'processing'
                          ? 'Still processing...'
                          : 'No parsed text available.'}
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete document?</DialogTitle>
            <DialogDescription>
              This will permanently delete &quot;{deleteTarget?.filename}&quot; and its parsed
              content.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Verify build compiles**

```bash
cd /Users/joemc3/tmp/professional-website-builder/src-ui
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git -C /Users/joemc3/tmp/professional-website-builder add src-ui/src/pages/documents.tsx
git -C /Users/joemc3/tmp/professional-website-builder commit -m "feat(ui): build documents page with upload, list, expand, delete"
```

---

## Task 9: Profile Page

**Files:**
- Rewrite: `src-ui/src/pages/profile.tsx`

- [ ] **Step 1: Build profile page**

Rewrite `src-ui/src/pages/profile.tsx`:

```typescript
import { useState, useCallback } from 'react';
import { useProfile, usePatchProfile } from '@/hooks/use-profile';
import { useApiKeyStatuses } from '@/hooks/use-settings';
import { synthesizeProfile } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Pencil, Check, X, Sparkles, FileText, Loader2 } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import type { ProfileData, Basics } from '@/types/api';

function EditableField({
  label,
  value,
  onSave,
  multiline = false,
}: {
  label: string;
  value: string;
  onSave: (value: string) => void;
  multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const save = () => {
    onSave(draft);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (!editing) {
    return (
      <div className="group flex items-start gap-2">
        <div className="flex-1">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-sm">{value || <span className="italic text-muted-foreground">Not set</span>}</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100"
          onClick={() => setEditing(true)}
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {multiline ? (
        <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} autoFocus />
      ) : (
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} autoFocus />
      )}
      <div className="flex gap-1">
        <Button size="sm" variant="ghost" onClick={save}>
          <Check className="mr-1 h-3 w-3" /> Save
        </Button>
        <Button size="sm" variant="ghost" onClick={cancel}>
          <X className="mr-1 h-3 w-3" /> Cancel
        </Button>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { data: profile, isLoading, error } = useProfile();
  const patchProfile = usePatchProfile();
  const { data: apiKeyStatuses } = useApiKeyStatuses();
  const queryClient = useQueryClient();
  const [synthesizing, setSynthesizing] = useState(false);
  const [synthStatus, setSynthStatus] = useState('');
  const [synthError, setSynthError] = useState('');
  const [selectedModel, setSelectedModel] = useState('');

  const configuredProviders = apiKeyStatuses?.filter((s) => s.is_set && s.selected_model) || [];

  const updateBasics = useCallback(
    (field: keyof Basics, value: string) => {
      patchProfile.mutate({
        basics: { ...profile?.data?.basics, [field]: value },
      });
    },
    [patchProfile, profile]
  );

  const handleSynthesize = useCallback(() => {
    if (!selectedModel) return;
    setSynthesizing(true);
    setSynthStatus('Starting...');
    setSynthError('');

    const cancel = synthesizeProfile(
      { model: selectedModel },
      (event, payload) => {
        if (event === 'status') {
          setSynthStatus((payload as { message: string }).message);
        } else if (event === 'section') {
          setSynthStatus(`Processing ${(payload as { section: string }).section}...`);
        } else if (event === 'complete') {
          setSynthesizing(false);
          setSynthStatus('');
          queryClient.invalidateQueries({ queryKey: ['profile'] });
        }
      },
      (err) => {
        setSynthesizing(false);
        setSynthError(err);
      }
    );

    return cancel;
  }, [selectedModel, queryClient]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Profile</h2>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (error && (error as { response?: { status: number } })?.response?.status === 404) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Profile</h2>
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <FileText className="mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="mb-1 text-lg font-medium">No profile yet</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Upload documents first, then synthesize your profile using AI.
            </p>

            {configuredProviders.length > 0 && (
              <div className="flex items-center gap-2">
                <Select value={selectedModel} onValueChange={setSelectedModel}>
                  <SelectTrigger className="w-64">
                    <SelectValue placeholder="Select a model" />
                  </SelectTrigger>
                  <SelectContent>
                    {configuredProviders.map((p) => (
                      <SelectItem key={p.provider} value={p.selected_model!}>
                        {p.selected_model} ({p.provider})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button onClick={handleSynthesize} disabled={!selectedModel || synthesizing}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {synthesizing ? 'Synthesizing...' : 'Synthesize Profile'}
                </Button>
              </div>
            )}

            {synthesizing && <p className="mt-3 text-sm text-muted-foreground">{synthStatus}</p>}
            {synthError && <p className="mt-3 text-sm text-destructive">{synthError}</p>}

            {configuredProviders.length === 0 && (
              <p className="text-sm text-muted-foreground">
                Configure an API key in Settings first.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold tracking-tight">Profile</h2>
        <Alert variant="destructive">
          <AlertDescription>Failed to load profile.</AlertDescription>
        </Alert>
      </div>
    );
  }

  const data = profile?.data;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Profile</h2>
        <div className="flex items-center gap-2">
          {synthesizing && (
            <Badge variant="secondary">
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              {synthStatus}
            </Badge>
          )}
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-52">
              <SelectValue placeholder="Select model" />
            </SelectTrigger>
            <SelectContent>
              {configuredProviders.map((p) => (
                <SelectItem key={p.provider} value={p.selected_model!}>
                  {p.selected_model} ({p.provider})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleSynthesize} disabled={!selectedModel || synthesizing}>
            <Sparkles className="mr-2 h-4 w-4" />
            Re-synthesize
          </Button>
        </div>
      </div>

      {synthError && (
        <Alert variant="destructive">
          <AlertDescription>{synthError}</AlertDescription>
        </Alert>
      )}

      {/* Basics */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Basics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <EditableField label="Name" value={data?.basics?.name || ''} onSave={(v) => updateBasics('name', v)} />
          <EditableField label="Title" value={data?.basics?.title || ''} onSave={(v) => updateBasics('title', v)} />
          <EditableField label="Email" value={data?.basics?.email || ''} onSave={(v) => updateBasics('email', v)} />
          <EditableField label="Phone" value={data?.basics?.phone || ''} onSave={(v) => updateBasics('phone', v)} />
          <EditableField label="Location" value={data?.basics?.location || ''} onSave={(v) => updateBasics('location', v)} />
          <EditableField label="LinkedIn" value={data?.basics?.linkedin || ''} onSave={(v) => updateBasics('linkedin', v)} />
          <EditableField label="Website" value={data?.basics?.website || ''} onSave={(v) => updateBasics('website', v)} />
          <EditableField label="Summary" value={data?.basics?.summary || ''} onSave={(v) => updateBasics('summary', v)} multiline />
        </CardContent>
      </Card>

      {/* Skills */}
      {data?.skills && data.skills.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Skills</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.skills.map((skill, i) => (
              <div key={i}>
                <p className="text-xs font-medium text-muted-foreground">{skill.category}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {skill.items?.map((item, j) => (
                    <Badge key={j} variant="secondary">{item}</Badge>
                  ))}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Experience */}
      {data?.experience && data.experience.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Experience</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.experience.map((exp, i) => (
              <div key={i}>
                {i > 0 && <Separator className="mb-4" />}
                <p className="font-medium">{exp.title}</p>
                <p className="text-sm text-muted-foreground">
                  {exp.company} · {exp.start_date} – {exp.current ? 'Present' : exp.end_date}
                </p>
                {exp.description && <p className="mt-1 text-sm">{exp.description}</p>}
                {exp.highlights && exp.highlights.length > 0 && (
                  <ul className="mt-1 list-inside list-disc text-sm">
                    {exp.highlights.map((h, j) => (
                      <li key={j}>{h}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Education */}
      {data?.education && data.education.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Education</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.education.map((edu, i) => (
              <div key={i}>
                {i > 0 && <Separator className="mb-4" />}
                <p className="font-medium">{edu.degree}{edu.field ? ` in ${edu.field}` : ''}</p>
                <p className="text-sm text-muted-foreground">
                  {edu.institution} · {edu.start_date} – {edu.end_date}
                </p>
                {edu.notes && <p className="mt-1 text-sm">{edu.notes}</p>}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Projects */}
      {data?.projects && data.projects.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Projects</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.projects.map((proj, i) => (
              <div key={i}>
                {i > 0 && <Separator className="mb-4" />}
                <p className="font-medium">{proj.name}</p>
                {proj.role && <p className="text-sm text-muted-foreground">{proj.role}</p>}
                {proj.description && <p className="mt-1 text-sm">{proj.description}</p>}
                {proj.technologies && proj.technologies.length > 0 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {proj.technologies.map((t, j) => (
                      <Badge key={j} variant="outline" className="text-xs">{t}</Badge>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Certifications */}
      {data?.certifications && data.certifications.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Certifications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.certifications.map((cert, i) => (
              <div key={i}>
                <p className="font-medium">{cert.name}</p>
                <p className="text-sm text-muted-foreground">
                  {cert.issuer}{cert.date_obtained ? ` · ${cert.date_obtained}` : ''}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Verify build compiles**

```bash
cd /Users/joemc3/tmp/professional-website-builder/src-ui
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git -C /Users/joemc3/tmp/professional-website-builder add src-ui/src/pages/profile.tsx
git -C /Users/joemc3/tmp/professional-website-builder commit -m "feat(ui): build profile page with inline editing and SSE synthesis"
```

---

## Task 10: Job Postings List Page

**Files:**
- Rewrite: `src-ui/src/pages/job-postings.tsx`

- [ ] **Step 1: Build job postings list page**

Rewrite `src-ui/src/pages/job-postings.tsx`:

```typescript
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useJobPostings, useDeleteJobPosting } from '@/hooks/use-job-postings';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Trash2, Pencil, Briefcase } from 'lucide-react';
import type { JobPostingResponse } from '@/types/api';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function JobPostingsPage() {
  const { data: postings, isLoading, error } = useJobPostings();
  const deleteMut = useDeleteJobPosting();
  const [deleteTarget, setDeleteTarget] = useState<JobPostingResponse | null>(null);

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMut.mutate(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold tracking-tight">Job Postings</h2>
        <Button asChild>
          <Link to="/app/job-postings/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Job Posting
          </Link>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>Failed to load job postings.</AlertDescription>
        </Alert>
      )}

      {isLoading && (
        <div className="space-y-3">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      )}

      {postings && postings.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Briefcase className="mb-3 h-10 w-10 text-muted-foreground" />
            <h3 className="mb-1 text-lg font-medium">No job postings yet</h3>
            <p className="mb-4 text-sm text-muted-foreground">
              Add job postings to generate targeted sites tailored to specific positions.
              Paste a URL, paste the job text, or enter details manually.
            </p>
            <Button asChild>
              <Link to="/app/job-postings/new">
                <Plus className="mr-2 h-4 w-4" />
                Add your first job posting
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {postings && postings.length > 0 && (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Added</TableHead>
                <TableHead className="w-24" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {postings.map((posting) => (
                <TableRow key={posting.id}>
                  <TableCell className="font-medium">{posting.title}</TableCell>
                  <TableCell>{posting.company}</TableCell>
                  <TableCell>{formatDate(posting.created_at)}</TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" asChild>
                        <Link to={`/app/job-postings/${posting.id}`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(posting)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete job posting?</DialogTitle>
            <DialogDescription>
              This will permanently delete &quot;{deleteTarget?.title}&quot; at{' '}
              {deleteTarget?.company}.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
```

- [ ] **Step 2: Verify build compiles**

```bash
cd /Users/joemc3/tmp/professional-website-builder/src-ui
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git -C /Users/joemc3/tmp/professional-website-builder add src-ui/src/pages/job-postings.tsx
git -C /Users/joemc3/tmp/professional-website-builder commit -m "feat(ui): build job postings list page with table and delete"
```

---

## Task 11: Job Posting Create & Edit Pages

**Files:**
- Rewrite: `src-ui/src/pages/job-posting-new.tsx`
- Rewrite: `src-ui/src/pages/job-posting-edit.tsx`

- [ ] **Step 1: Build job posting create page with tabbed input**

Rewrite `src-ui/src/pages/job-posting-new.tsx`:

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useCreateJobPosting,
  useScrapeJobPosting,
  useParseJobPosting,
} from '@/hooks/use-job-postings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, ArrowLeft } from 'lucide-react';
import type { JobPostingCreate } from '@/types/api';

export default function JobPostingNewPage() {
  const navigate = useNavigate();
  const createMut = useCreateJobPosting();
  const scrapeMut = useScrapeJobPosting();
  const parseMut = useParseJobPosting();

  const [url, setUrl] = useState('');
  const [rawText, setRawText] = useState('');
  const [form, setForm] = useState<JobPostingCreate>({
    title: '',
    company: '',
    description: '',
    source_url: null,
    raw_text: null,
    requirements: null,
  });
  const [extracted, setExtracted] = useState(false);
  const [error, setError] = useState('');

  const populateForm = (draft: Partial<JobPostingCreate>) => {
    setForm({
      title: draft.title || '',
      company: draft.company || '',
      description: draft.description || '',
      source_url: draft.source_url || null,
      raw_text: draft.raw_text || null,
      requirements: draft.requirements || null,
    });
    setExtracted(true);
  };

  const handleScrape = async () => {
    setError('');
    try {
      const draft = await scrapeMut.mutateAsync({ url });
      populateForm({ ...draft, source_url: url });
    } catch (err) {
      setError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          'Failed to extract from URL'
      );
    }
  };

  const handleParse = async () => {
    setError('');
    try {
      const draft = await parseMut.mutateAsync({ raw_text: rawText });
      populateForm({ ...draft, raw_text: rawText });
    } catch (err) {
      setError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          'Failed to parse text'
      );
    }
  };

  const handleSave = async () => {
    setError('');
    try {
      await createMut.mutateAsync(form);
      navigate('/app/job-postings');
    } catch (err) {
      setError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          'Failed to save'
      );
    }
  };

  const isExtracting = scrapeMut.isPending || parseMut.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app/job-postings')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">Add Job Posting</h2>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardContent className="pt-6">
          <Tabs defaultValue="url">
            <TabsList className="mb-4">
              <TabsTrigger value="url">Paste URL</TabsTrigger>
              <TabsTrigger value="text">Paste Text</TabsTrigger>
              <TabsTrigger value="manual">Manual Entry</TabsTrigger>
            </TabsList>

            <TabsContent value="url" className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="https://jobs.example.com/senior-engineer"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1"
                />
                <Button onClick={handleScrape} disabled={!url || isExtracting}>
                  {scrapeMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Extract
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="text" className="space-y-3">
              <Textarea
                placeholder="Paste the full job description text here..."
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                rows={8}
              />
              <Button onClick={handleParse} disabled={!rawText || isExtracting}>
                {parseMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Extract
              </Button>
            </TabsContent>

            <TabsContent value="manual">
              {/* Manual triggers form display below without extraction */}
              {!extracted && (
                <Button
                  variant="secondary"
                  onClick={() => setExtracted(true)}
                >
                  Enter details manually
                </Button>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Review/edit form — shown after extraction or manual entry */}
      {extracted && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">
              {form.title ? 'Review and edit' : 'Enter details'}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Job Title</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="company">Company</Label>
              <Input
                id="company"
                value={form.company}
                onChange={(e) => setForm({ ...form, company: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                rows={10}
                required
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                onClick={handleSave}
                disabled={!form.title || !form.company || !form.description || createMut.isPending}
              >
                {createMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Job Posting
              </Button>
              <Button variant="outline" onClick={() => navigate('/app/job-postings')}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Build job posting edit page**

Rewrite `src-ui/src/pages/job-posting-edit.tsx`:

```typescript
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useJobPosting, useUpdateJobPosting } from '@/hooks/use-job-postings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function JobPostingEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: posting, isLoading, error } = useJobPosting(id!);
  const updateMut = useUpdateJobPosting();

  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [description, setDescription] = useState('');
  const [saveError, setSaveError] = useState('');

  useEffect(() => {
    if (posting) {
      setTitle(posting.title);
      setCompany(posting.company);
      setDescription(posting.description);
    }
  }, [posting]);

  const handleSave = async () => {
    setSaveError('');
    try {
      await updateMut.mutateAsync({
        id: id!,
        data: { title, company, description },
      });
      navigate('/app/job-postings');
    } catch (err) {
      setSaveError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          'Failed to save'
      );
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>Failed to load job posting.</AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/app/job-postings')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-2xl font-bold tracking-tight">Edit Job Posting</h2>
      </div>

      {saveError && (
        <Alert variant="destructive">
          <AlertDescription>{saveError}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{posting?.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Job Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="company">Company</Label>
            <Input
              id="company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={10}
              required
            />
          </div>

          <div className="flex gap-2 pt-2">
            <Button
              onClick={handleSave}
              disabled={!title || !company || !description || updateMut.isPending}
            >
              {updateMut.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
            <Button variant="outline" onClick={() => navigate('/app/job-postings')}>
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 3: Verify build compiles**

```bash
cd /Users/joemc3/tmp/professional-website-builder/src-ui
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git -C /Users/joemc3/tmp/professional-website-builder add src-ui/src/pages/job-posting-new.tsx src-ui/src/pages/job-posting-edit.tsx
git -C /Users/joemc3/tmp/professional-website-builder commit -m "feat(ui): build job posting create (tabbed) and edit pages"
```

---

## Task 12: Sites Page

**Files:**
- Rewrite: `src-ui/src/pages/sites.tsx`

- [ ] **Step 1: Build sites page with generation, polling, and stale detection**

Rewrite `src-ui/src/pages/sites.tsx`:

```typescript
import { useState } from 'react';
import {
  useSitesPolling,
  useGeneratePortfolio,
  useGenerateTargeted,
  useDeleteSite,
} from '@/hooks/use-sites';
import { useJobPostings } from '@/hooks/use-job-postings';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Globe,
  Plus,
  Trash2,
  ExternalLink,
  RefreshCw,
  Loader2,
  AlertTriangle,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import type { SiteResponse } from '@/types/api';

const THEMES = ['developer-dark', 'developer-light', 'minimal'];

function statusBadge(status: string) {
  switch (status) {
    case 'completed':
      return <Badge>Ready</Badge>;
    case 'queued':
      return <Badge variant="secondary">Queued</Badge>;
    case 'processing':
      return (
        <Badge variant="secondary">
          <Loader2 className="mr-1 h-3 w-3 animate-spin" />
          Generating
        </Badge>
      );
    case 'failed':
      return <Badge variant="destructive">Failed</Badge>;
    default:
      return <Badge variant="outline">{status}</Badge>;
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function SitesPage() {
  const { data: sites, isLoading, error } = useSitesPolling();
  const { data: jobPostings } = useJobPostings();
  const genPortfolio = useGeneratePortfolio();
  const genTargeted = useGenerateTargeted();
  const deleteMut = useDeleteSite();

  const [showPortfolioDialog, setShowPortfolioDialog] = useState(false);
  const [showTargetedDialog, setShowTargetedDialog] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState(THEMES[0]);
  const [selectedJobId, setSelectedJobId] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<SiteResponse | null>(null);
  const [genError, setGenError] = useState('');

  // Username check — sites require username
  const { user } = useAuth();
  const hasUsername = !!(user as unknown as { username?: string })?.username;
  // Note: the /me endpoint may not return username in UserResponse.
  // We check via a settings-level mechanism. For now, we'll attempt generation
  // and handle the 400 error gracefully.

  const handleGeneratePortfolio = async () => {
    setGenError('');
    try {
      await genPortfolio.mutateAsync({ theme: selectedTheme });
      setShowPortfolioDialog(false);
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || '';
      if (detail.toLowerCase().includes('username')) {
        setGenError('You need to set a username in Settings before generating sites.');
      } else {
        setGenError(detail || 'Generation failed');
      }
    }
  };

  const handleGenerateTargeted = async () => {
    setGenError('');
    try {
      await genTargeted.mutateAsync({
        job_posting_id: selectedJobId,
        theme: selectedTheme,
      });
      setShowTargetedDialog(false);
    } catch (err) {
      const detail =
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || '';
      if (detail.toLowerCase().includes('username')) {
        setGenError('You need to set a username in Settings before generating sites.');
      } else {
        setGenError(detail || 'Generation failed');
      }
    }
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteMut.mutate(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const portfolioSite = sites?.find((s) => s.type === 'portfolio');
  const targetedSites = sites?.filter((s) => s.type === 'targeted') || [];

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold tracking-tight">Sites</h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setGenError('');
                setShowPortfolioDialog(true);
              }}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              {portfolioSite ? 'Regenerate Portfolio' : 'Generate Portfolio'}
            </Button>
            <Button
              onClick={() => {
                setGenError('');
                setShowTargetedDialog(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Generate Targeted
            </Button>
          </div>
        </div>

        {genError && (
          <Alert variant="destructive">
            <AlertDescription>
              {genError}{' '}
              {genError.includes('username') && (
                <Link to="/app/settings" className="underline">
                  Go to Settings
                </Link>
              )}
            </AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive">
            <AlertDescription>Failed to load sites.</AlertDescription>
          </Alert>
        )}

        {isLoading && (
          <div className="space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        )}

        {sites && sites.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center py-12 text-center">
              <Globe className="mb-3 h-10 w-10 text-muted-foreground" />
              <h3 className="mb-1 text-lg font-medium">No sites generated yet</h3>
              <p className="mb-2 text-sm text-muted-foreground">
                Generate a <strong>portfolio site</strong> for your public presence, or a{' '}
                <strong>targeted site</strong> tailored to a specific job posting.
              </p>
              <p className="text-sm text-muted-foreground">
                Start with your portfolio — it uses your full profile.
              </p>
            </CardContent>
          </Card>
        )}

        {sites && sites.length > 0 && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Theme</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead>URL</TableHead>
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sites.map((site) => (
                  <TableRow key={site.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge variant={site.type === 'portfolio' ? 'default' : 'secondary'}>
                          {site.type}
                        </Badge>
                        {site.stale && site.type === 'portfolio' && (
                          <Tooltip>
                            <TooltipTrigger>
                              <AlertTriangle className="h-4 w-4 text-yellow-500" />
                            </TooltipTrigger>
                            <TooltipContent>
                              Profile updated since last generation. Consider regenerating.
                            </TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{site.theme}</TableCell>
                    <TableCell>{statusBadge(site.status)}</TableCell>
                    <TableCell>{formatDate(site.generated_at)}</TableCell>
                    <TableCell>
                      {site.status === 'completed' && site.public_url ? (
                        <a
                          href={site.public_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                        >
                          Visit <ExternalLink className="h-3 w-3" />
                        </a>
                      ) : (
                        <span className="text-sm text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {site.status === 'failed' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => {
                                  if (site.type === 'portfolio') {
                                    genPortfolio.mutate({ theme: site.theme });
                                  }
                                }}
                              >
                                <RefreshCw className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>
                              {site.error_message || 'Retry generation'}
                            </TooltipContent>
                          </Tooltip>
                        )}
                        {site.type === 'targeted' && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteTarget(site)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Generate Portfolio Dialog */}
        <Dialog open={showPortfolioDialog} onOpenChange={setShowPortfolioDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {portfolioSite ? 'Regenerate Portfolio Site' : 'Generate Portfolio Site'}
              </DialogTitle>
              <DialogDescription>
                {portfolioSite
                  ? 'This will regenerate your portfolio site with the latest profile data.'
                  : 'Create your public portfolio site from your synthesized profile.'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <label className="text-sm font-medium">Theme</label>
              <Select value={selectedTheme} onValueChange={setSelectedTheme}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {THEMES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPortfolioDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleGeneratePortfolio} disabled={genPortfolio.isPending}>
                {genPortfolio.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Generate Targeted Dialog */}
        <Dialog open={showTargetedDialog} onOpenChange={setShowTargetedDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate Targeted Site</DialogTitle>
              <DialogDescription>
                Create a site tailored to a specific job posting.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Job Posting</label>
                <Select value={selectedJobId} onValueChange={setSelectedJobId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a job posting" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobPostings?.map((jp) => (
                      <SelectItem key={jp.id} value={jp.id}>
                        {jp.title} — {jp.company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {(!jobPostings || jobPostings.length === 0) && (
                  <p className="text-sm text-muted-foreground">
                    No job postings yet.{' '}
                    <Link to="/app/job-postings/new" className="text-primary hover:underline">
                      Add one first
                    </Link>
                    .
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Theme</label>
                <Select value={selectedTheme} onValueChange={setSelectedTheme}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {THEMES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowTargetedDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleGenerateTargeted}
                disabled={!selectedJobId || genTargeted.isPending}
              >
                {genTargeted.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Generate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete confirmation */}
        <Dialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete targeted site?</DialogTitle>
              <DialogDescription>
                This will permanently remove the site and its generated files.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete}>
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
```

- [ ] **Step 2: Verify build compiles**

```bash
cd /Users/joemc3/tmp/professional-website-builder/src-ui
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git -C /Users/joemc3/tmp/professional-website-builder add src-ui/src/pages/sites.tsx
git -C /Users/joemc3/tmp/professional-website-builder commit -m "feat(ui): build sites page with generation dialogs, polling, stale detection"
```

---

## Task 13: Settings Page

**Files:**
- Rewrite: `src-ui/src/pages/settings.tsx`

- [ ] **Step 1: Build settings page with username, API keys, and model selection**

Rewrite `src-ui/src/pages/settings.tsx`:

```typescript
import { useState } from 'react';
import {
  useApiKeyStatuses,
  useModels,
  useSaveApiKey,
  useDeleteApiKey,
  useSelectModel,
  useTestConnection,
} from '@/hooks/use-settings';
import { setUsername as setUsernameApi } from '@/services/api';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Check, X, Loader2, AlertTriangle } from 'lucide-react';

const PROVIDERS = [
  { id: 'anthropic', name: 'Anthropic', placeholder: 'sk-ant-...' },
  { id: 'openai', name: 'OpenAI', placeholder: 'sk-...' },
  { id: 'gemini', name: 'Google Gemini', placeholder: 'AIza...' },
  { id: 'openrouter', name: 'OpenRouter', placeholder: 'sk-or-...' },
] as const;

function UsernameSection() {
  const { user } = useAuth();
  const [username, setUsername] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSave = async () => {
    setError('');
    setSuccess('');
    setSaving(true);
    try {
      const res = await setUsernameApi({ username });
      setSuccess(`Username set to "${res.username}"`);
    } catch (err) {
      setError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          'Failed to set username'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Username
          <Badge variant="outline">Required for sites</Badge>
        </CardTitle>
        <CardDescription>
          Your username determines your public site URLs. Must be 3-50 characters, lowercase
          letters, numbers, and hyphens.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        {success && (
          <Alert>
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}
        <div className="flex gap-2">
          <Input
            placeholder="your-username"
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase())}
            className="max-w-xs"
          />
          <Button onClick={handleSave} disabled={!username || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function ProviderCard({
  providerId,
  providerName,
  placeholder,
}: {
  providerId: string;
  providerName: string;
  placeholder: string;
}) {
  const { data: statuses } = useApiKeyStatuses();
  const { data: modelList } = useModels(providerId);
  const saveKey = useSaveApiKey();
  const deleteKey = useDeleteApiKey();
  const selectModel = useSelectModel();
  const testConn = useTestConnection();

  const status = statuses?.find((s) => s.provider === providerId);
  const [keyInput, setKeyInput] = useState('');
  const [error, setError] = useState('');

  const handleSaveKey = async () => {
    setError('');
    try {
      await saveKey.mutateAsync({ provider: providerId, api_key: keyInput });
      setKeyInput('');
    } catch (err) {
      setError(
        (err as { response?: { data?: { detail?: string } } })?.response?.data?.detail ||
          'Failed to save key'
      );
    }
  };

  const handleDelete = async () => {
    setError('');
    try {
      await deleteKey.mutateAsync(providerId);
    } catch (err) {
      setError('Failed to delete key');
    }
  };

  const handleSelectModel = async (model: string) => {
    try {
      await selectModel.mutateAsync({ provider: providerId, data: { model } });
    } catch {
      setError('Failed to select model');
    }
  };

  const handleTest = async () => {
    setError('');
    try {
      const result = await testConn.mutateAsync({ provider: providerId });
      if (result.status === 'error') {
        setError(result.message || 'Connection test failed');
      }
    } catch {
      setError('Connection test failed');
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">{providerName}</span>
          {status?.is_set ? (
            <Badge variant="default">
              <Check className="mr-1 h-3 w-3" />
              Configured
            </Badge>
          ) : (
            <Badge variant="outline">Not set</Badge>
          )}
        </div>
        {status?.is_set && (
          <div className="flex gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTest}
              disabled={testConn.isPending}
            >
              {testConn.isPending ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : null}
              Test
            </Button>
            {testConn.isSuccess && testConn.data?.status === 'ok' && (
              <Badge variant="default" className="self-center">
                <Check className="mr-1 h-3 w-3" /> OK
              </Badge>
            )}
            <Button variant="ghost" size="sm" onClick={handleDelete}>
              <X className="mr-1 h-3 w-3" />
              Remove
            </Button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {!status?.is_set && (
        <div className="flex gap-2">
          <Input
            type="password"
            placeholder={placeholder}
            value={keyInput}
            onChange={(e) => setKeyInput(e.target.value)}
            className="max-w-sm"
          />
          <Button onClick={handleSaveKey} disabled={!keyInput || saveKey.isPending} size="sm">
            {saveKey.isPending && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            Save
          </Button>
        </div>
      )}

      {status?.is_set && modelList && modelList.models.length > 0 && (
        <div className="flex items-center gap-2">
          <Label className="text-sm">Model:</Label>
          <Select
            value={status.selected_model || ''}
            onValueChange={handleSelectModel}
          >
            <SelectTrigger className="w-72">
              <SelectValue placeholder="Select a model" />
            </SelectTrigger>
            <SelectContent>
              {modelList.models.map((m) => (
                <SelectItem key={m.id} value={m.id}>
                  {m.name || m.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Settings</h2>

      <UsernameSection />

      <Card>
        <CardHeader>
          <CardTitle>API Keys</CardTitle>
          <CardDescription>
            Configure LLM provider API keys for profile synthesis and job posting extraction.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {PROVIDERS.map((provider, i) => (
            <div key={provider.id}>
              {i > 0 && <Separator className="mb-6" />}
              <ProviderCard
                providerId={provider.id}
                providerName={provider.name}
                placeholder={provider.placeholder}
              />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
```

- [ ] **Step 2: Verify build compiles**

```bash
cd /Users/joemc3/tmp/professional-website-builder/src-ui
npx tsc --noEmit
```

- [ ] **Step 3: Commit**

```bash
git -C /Users/joemc3/tmp/professional-website-builder add src-ui/src/pages/settings.tsx
git -C /Users/joemc3/tmp/professional-website-builder commit -m "feat(ui): build settings page with username, API keys, model selection"
```

---

## Task 14: Final Cleanup and Verification

**Files:**
- Modify: `src-ui/src/index.css` (remove old custom classes if shadcn replaced them)
- Verify: all old component files deleted
- Verify: full build succeeds

- [ ] **Step 1: Verify all old files are removed**

```bash
ls /Users/joemc3/tmp/professional-website-builder/src-ui/src/components/*.tsx 2>/dev/null
ls /Users/joemc3/tmp/professional-website-builder/src-ui/src/utils/ 2>/dev/null
ls /Users/joemc3/tmp/professional-website-builder/src-ui/src/App.css 2>/dev/null
```

All three should return "No such file or directory" or empty. If any old files remain, delete them.

- [ ] **Step 2: Clean up index.css — remove old custom component classes**

Read `src-ui/src/index.css` and remove old hand-written `.btn-primary`, `.btn-secondary`, `.btn-outline`, `.input-field`, `.textarea-field`, `.card`, `.label` classes. Keep only the `@tailwind` directives and any CSS variables added by shadcn.

- [ ] **Step 3: Run full build**

```bash
cd /Users/joemc3/tmp/professional-website-builder/src-ui
npx tsc --noEmit && npm run build
```

Expected: TypeScript check passes, Vite build produces `dist/` output.

- [ ] **Step 4: Fix any build errors**

If any TypeScript or build errors, fix them. Common issues:
- Missing imports (lucide-react icons, shadcn components)
- Type mismatches between API types and component props
- Path alias issues (`@/` not resolving)

- [ ] **Step 5: Run lint**

```bash
cd /Users/joemc3/tmp/professional-website-builder/src-ui
npm run lint
```

Fix any lint errors.

- [ ] **Step 6: Commit final cleanup**

```bash
git -C /Users/joemc3/tmp/professional-website-builder add src-ui/
git -C /Users/joemc3/tmp/professional-website-builder commit -m "chore(ui): final cleanup — remove old styles, verify build"
```

---

## Task 15: Update Documentation

**Files:**
- Modify: `/Users/joemc3/tmp/professional-website-builder/CLAUDE.md`

- [ ] **Step 1: Update CLAUDE.md with Phase 3b completion status**

Update the "Current Phase" section in CLAUDE.md to reflect Phase 3b completion. Update the frontend tech stack section to mention shadcn/ui and TanStack Query. Add the new frontend commands.

- [ ] **Step 2: Commit**

```bash
git -C /Users/joemc3/tmp/professional-website-builder add CLAUDE.md
git -C /Users/joemc3/tmp/professional-website-builder commit -m "docs: update CLAUDE.md for Phase 3b completion"
```
