import { useMutation } from '@tanstack/react-query';
import { createPreview, deletePreview } from '@/services/api';
import type { PreviewRequest } from '@/types/api';

export function useCreatePreview() {
  return useMutation({
    mutationFn: (data: PreviewRequest) => createPreview(data),
  });
}

export function useDeletePreview() {
  return useMutation({
    mutationFn: (previewId: string) => deletePreview(previewId),
  });
}
