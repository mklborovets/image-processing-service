import React, { useState, useRef } from 'react';
import axios from 'axios';
import { apiClient } from '../api/client';

interface UploaderProps {
  onUploadSuccess: () => void;
}

export const ImageUploader: React.FC<UploaderProps> = ({ onUploadSuccess }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files.length > 0) {
      const selected = e.target.files[0];
      if (selected.size > 5 * 1024 * 1024) {
        setError('File must be smaller than 5MB');
        return;
      }
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(selected.type)) {
        setError('Only JPEG, PNG, and WebP are allowed');
        return;
      }
      setFile(selected);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    try {
      setUploading(true);
      setProgress(0);
      setError(null);

      const res = await apiClient.post('/images/upload-url', {
        fileName: file.name,
        mimeType: file.type,
        size: file.size,
      });

      const { uploadUrl, fields } = res.data;

      const formData = new FormData();
      Object.keys(fields).forEach((key) => {
        formData.append(key, fields[key]);
      });
      formData.append('file', file);

      await axios.post(uploadUrl, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setProgress(percentCompleted);
          }
        },
      });

      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      onUploadSuccess();
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="uploader-container">
      <div className="upload-box">
        <input
          type="file"
          accept="image/jpeg, image/png, image/webp"
          onChange={handleFileChange}
          ref={fileInputRef}
          disabled={uploading}
          className="file-input"
        />

        {file && (
          <div className="file-details">
            <span>{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
            <button
              className="btn-upload"
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Upload'}
            </button>
          </div>
        )}
      </div>

      {uploading && (
        <div className="progress-bar-container">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }}>
            {progress > 5 ? `${progress}%` : ''}
          </div>
        </div>
      )}

      {error && <p className="error-text">{error}</p>}
    </div>
  );
};
