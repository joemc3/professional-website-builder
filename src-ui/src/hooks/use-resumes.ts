import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { GeneralResumeRequest, TargetedResumeRequest } from '@/types/resume';
import * as api from '@/services/api';

export function useResumes() {
  return useQuery({
    queryKey: ['resumes'],
    queryFn: () => api.getResumes(),
  });
}

export function useResumesPolling() {
  const query = useResumes();
  const hasActiveJobs = query.data?.some(
    (r) => r.status === 'queued' || r.status === 'tailoring' || r.status === 'rendering'
  );

  return useQuery({
    queryKey: ['resumes'],
    queryFn: () => api.getResumes(),
    refetchInterval: hasActiveJobs ? 3000 : false,
  });
}

export function useResume(id: string) {
  return useQuery({
    queryKey: ['resumes', id],
    queryFn: () => api.getResume(id),
    enabled: !!id,
  });
}

export function useGenerateGeneralResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: GeneralResumeRequest) => api.generateGeneralResume(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
    },
  });
}

export function useGenerateTargetedResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: TargetedResumeRequest) => api.generateTargetedResume(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
    },
  });
}

export function useDeleteResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.deleteResume(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resumes'] });
    },
  });
}
