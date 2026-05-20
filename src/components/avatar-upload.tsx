'use client';

import { useState, useRef, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import { Camera, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { UserAvatar } from '@/components/user-avatar';
import { useToast } from '@/hooks/use-toast';
import type { User } from '@/lib/types';
import { uploadAvatarAction } from '@/app/actions/settings';

interface AvatarUploadProps {
  user: User;
  onAvatarUpdated?: (newUrl: string) => void;
}

/** Extract the cropped region from the source image via canvas, returning a base64 PNG */
async function getCroppedImage(imageSrc: string, pixelCrop: Area): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => {
      const canvas = document.createElement('canvas');
      const OUTPUT_SIZE = 400; // 400×400 final output
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext('2d');
      if (!ctx) return reject(new Error('Canvas context unavailable'));

      // Draw the cropped region scaled to 400×400
      ctx.drawImage(
        image,
        pixelCrop.x,
        pixelCrop.y,
        pixelCrop.width,
        pixelCrop.height,
        0,
        0,
        OUTPUT_SIZE,
        OUTPUT_SIZE
      );

      resolve(canvas.toDataURL('image/png'));
    });
    image.addEventListener('error', reject);
    image.src = imageSrc;
  });
}

export function AvatarUpload({ user, onAvatarUpdated }: AvatarUploadProps) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Local preview URL (overrides user.avatarUrl optimistically after save)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  // Crop dialog state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ variant: 'destructive', title: 'File too large', description: 'Please choose an image under 5 MB.' });
      return;
    }
    if (!file.type.startsWith('image/')) {
      toast({ variant: 'destructive', title: 'Invalid file', description: 'Please select an image file.' });
      return;
    }

    const reader = new FileReader();
    reader.addEventListener('load', () => {
      setImageSrc(reader.result as string);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setIsDialogOpen(true);
    });
    reader.readAsDataURL(file);
    // Reset input so the same file can be re-selected
    e.target.value = '';
  };

  const handleSave = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    setIsSaving(true);
    try {
      const croppedBase64 = await getCroppedImage(imageSrc, croppedAreaPixels);
      const result = await uploadAvatarAction(croppedBase64);
      if (result.success && result.avatarUrl) {
        setPreviewUrl(result.avatarUrl);
        onAvatarUpdated?.(result.avatarUrl);
        toast({ title: 'Avatar updated!', description: 'Your new profile photo has been saved.' });
        setIsDialogOpen(false);
      } else {
        toast({ variant: 'destructive', title: 'Upload failed', description: result.error });
      }
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Upload failed', description: err.message });
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setIsDialogOpen(false);
    setImageSrc(null);
  };

  const displayUser: User = previewUrl ? { ...user, avatarUrl: previewUrl } : user;

  return (
    <>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
        aria-label="Upload profile photo"
        id="avatar-file-input"
      />

      {/* Avatar trigger button */}
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="group relative inline-block rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        aria-label="Change profile photo"
      >
        {/* Avatar image */}
        <UserAvatar
          user={displayUser}
          className="h-24 w-24 transition-opacity group-hover:opacity-70"
          badgeSize="lg"
        />
        {/* Camera overlay */}
        <span className="absolute inset-0 flex flex-col items-center justify-center rounded-full bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
          <Camera className="h-6 w-6 text-white" />
          <span className="mt-1 text-[10px] font-medium text-white">Change</span>
        </span>
      </button>

      {/* Crop Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={(open) => { if (!open) handleCancel(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Adjust Profile Photo</DialogTitle>
          </DialogHeader>

          {/* Crop area */}
          <div className="relative h-72 w-full overflow-hidden rounded-lg bg-muted">
            {imageSrc && (
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
              />
            )}
          </div>

          {/* Zoom slider */}
          <div className="space-y-2 px-1">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <span>Zoom</span>
              <span>{zoom.toFixed(1)}×</span>
            </div>
            <Slider
              min={1}
              max={3}
              step={0.05}
              value={[zoom]}
              onValueChange={([v]) => setZoom(v)}
              aria-label="Zoom"
            />
          </div>

          <p className="text-center text-xs text-muted-foreground">
            Drag to reposition · Use the slider to zoom
          </p>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              id="avatar-save-button"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Save Photo
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
