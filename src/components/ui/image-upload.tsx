
'use client';

import { useState } from 'react';
import { Input } from './input';
import { Button } from './button';
import { uploadFile } from '@/lib/firebase/storage';

interface ImageUploadProps {
  onUploadComplete: (url: string) => void;
  initialImageUrl?: string;
  folder: string;
  id?: string;
}

export default function ImageUpload({ onUploadComplete, initialImageUrl, folder, id }: ImageUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(initialImageUrl || null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    try {
      const filePath = `${folder}/${Date.now()}-${file.name}`;
      const downloadURL = await uploadFile(file, filePath);
      onUploadComplete(downloadURL);
      setPreviewUrl(downloadURL);
    } catch (error) {
      console.error('Upload failed:', error);
      // Handle error (e.g., show a notification to the user)
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      {previewUrl && (
        <div className="mt-4">
          <img src={previewUrl} alt="Preview" className="max-w-xs max-h-48 rounded-md" />
        </div>
      )}
      <Input type="file" onChange={handleFileChange} accept="image/*" id={id} />
      <Button onClick={handleUpload} disabled={!file || isUploading}>
        {isUploading ? 'Uploading...' : 'Upload Image'}
      </Button>
    </div>
  );
}
