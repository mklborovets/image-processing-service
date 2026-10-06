import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';
import type { ImageRecord, PaginatedResponse } from '../types/Image';

export const ImageGallery: React.FC = () => {
  const [images, setImages] = useState<ImageRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchImages = async (pageNumber: number) => {
    try {
      setLoading(true);
      const { data } = await apiClient.get<PaginatedResponse<ImageRecord>>(`/images?page=${pageNumber}&limit=12`);
      setImages(data.data);
      setTotalPages(data.meta.totalPages || 1);
    } catch (error) {
      console.error('Failed to fetch images', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages(page);
  }, [page]);

  return (
    <div className="gallery-container">
      <div className="gallery-header">
        <h2>Your Images</h2>
        <button onClick={() => fetchImages(page)} className="btn-refresh">Refresh</button>
      </div>

      {loading ? (
        <div className="loading-spinner">Loading...</div>
      ) : (
        <>
          <div className="image-grid">
            {images.length === 0 && <p className="no-images">No images found.</p>}
            {images.map((img) => (
              <div key={img.id} className="image-card">
                <div className="image-wrapper">
                  {img.status === 'processed' && img.thumbnailViewUrl ? (
                    <img src={img.thumbnailViewUrl} alt={img.originalName} loading="lazy" />
                  ) : img.status === 'pending' ? (
                    <div className="placeholder pending">Processing...</div>
                  ) : (
                    <div className="placeholder failed">Failed</div>
                  )}
                  <span className={`status-badge status-${img.status}`}>
                    {img.status}
                  </span>
                </div>
                <div className="image-info">
                  <p className="image-name" title={img.originalName}>{img.originalName}</p>
                  <p className="image-meta">{(img.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="pagination">
              <button
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
                className="btn-page"
              >
                Prev
              </button>
              <span>Page {page} of {totalPages}</span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
                className="btn-page"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
