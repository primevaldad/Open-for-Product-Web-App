
'use client';

import { useState } from 'react';
import { Input } from './input';
import { uploadProjectImage } from '@/app/actions/upload';

interface ImageUploadProps {
  onUploadComplete: (url: string) => void;
  onUploadError?: (error: string) => void;
  initialImageUrl?: string;
  folder: string;
  id?: string;
}

export default function ImageUpload({ onUploadComplete, onUploadError, initialImageUrl, folder, id }: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImageUrl || null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    // Show local preview immediately
    const reader = new FileReader();
    reader.onloadend = () => setPreviewUrl(reader.result as string);
    reader.readAsDataURL(selectedFile);

    setIsUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('folder', folder);

      const result = await uploadProjectImage(formData);

      if (result.success && result.url) {
        onUploadComplete(result.url);
        setPreviewUrl(result.url);
      } else {
        const errMsg = result.error ?? 'Upload failed.';
        setError(errMsg);
        onUploadError?.(errMsg);
        // Revert preview on failure
        setPreviewUrl(initialImageUrl || null);
      }
    } catch (err) {
      const errMsg = 'An unexpected error occurred during upload.';
      setError(errMsg);
      onUploadError?.(errMsg);
      setPreviewUrl(initialImageUrl || null);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col space-y-4">
      {previewUrl && (
        <div className="mt-2">
          <img src={previewUrl} alt="Preview" className="max-w-xs max-h-48 rounded-md object-cover border" />
        </div>
      )}
      <div className="flex items-center space-x-4">
        <Input
          type="file"
          onChange={handleFileChange}
          accept="image/*"
          id={id}
          disabled={isUploading}
          className="max-w-md"
        />
        {isUploading && (
          <span className="text-sm text-muted-foreground animate-pulse">Uploading…</span>
        )}
      </div>
      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
    </div>
  );
}
