import { authApiClient } from './apiClient';

export interface MediaUploadResult {
  SourceLink: string;
  PreviewLink: string;
  IsValid: boolean;
  Errors: string[];
  MediaType: {
    Id: number;
    Name: string;
    DisplayName: string;
    Description?: string | null;
  };
  Created: string | null;
  Id: number;
  Name: string;
  DisplayName: string;
  Description?: string;
}

export async function uploadTaskMedia(file: { uri: string; name: string; type?: string | null }) {
  const formData = new FormData();
  formData.append('file', {
    uri: file.uri,
    name: file.name,
    type: file.type || 'application/octet-stream',
  } as any);

  const response = await authApiClient.post<MediaUploadResult[]>('/media/Task', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data || [];
}
