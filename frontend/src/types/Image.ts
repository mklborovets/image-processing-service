export type ImageStatus = 'pending' | 'processed' | 'failed';

export interface ImageRecord {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  status: ImageStatus;
  createdAt: string;
  updatedAt: string;
  originalViewUrl?: string;
  thumbnailViewUrl?: string;
  errorReason?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}
