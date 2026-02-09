"use client";

import { useState, useCallback, useRef } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Camera,
  Trash2,
  Loader2,
  User,
  Upload,
  Link,
  ImageIcon,
} from "lucide-react";

interface ProfileImagePickerProps {
  value: string;
  onChange: (url: string) => void;
  onDelete?: () => void;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  userEmail?: string;
}

export function ProfileImagePicker({
  value,
  onChange,
  onDelete,
  disabled = false,
  size = "lg",
  userEmail,
}: ProfileImagePickerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const sizeClasses = {
    sm: "h-16 w-16",
    md: "h-24 w-24",
    lg: "h-32 w-32",
  };

  const iconSizes = {
    sm: "h-6 w-6",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  // Extract public_id from Cloudinary URL
  const getPublicIdFromUrl = (url: string): string | null => {
    if (!url.includes("cloudinary.com")) return null;
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
    return match ? match[1] : null;
  };

  const uploadToCloudinary = async (file: File | string): Promise<string> => {
    let base64: string;

    if (typeof file === "string") {
      // It's a URL, pass directly
      base64 = file;
    } else {
      // Convert file to base64
      base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
    }

    // Use email as the public_id (sanitize it for Cloudinary)
    // Replace @ and . with underscores for a valid public_id
    const publicId = userEmail ? userEmail.replace(/[@.]/g, "_") : undefined;

    const response = await fetch("/api/media/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        file: base64,
        folder: "users",
        public_id: publicId,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to upload image");
    }

    const data = await response.json();
    return data.asset.secure_url;
  };

  const handleFileSelect = async (file: File) => {
    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];
    if (!validTypes.includes(file.type)) {
      setError("Please select a valid image file (JPG, PNG, WebP, or GIF)");
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const url = await uploadToCloudinary(file);
      onChange(url);
      setIsDialogOpen(false);
    } catch (err) {
      console.error("Upload error:", err);
      setError("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUrlSubmit = async () => {
    if (!urlInput.trim()) {
      setError("Please enter a URL");
      return;
    }

    // Basic URL validation
    try {
      new URL(urlInput);
    } catch {
      setError("Please enter a valid URL");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      const url = await uploadToCloudinary(urlInput);
      onChange(url);
      setUrlInput("");
      setIsDialogOpen(false);
    } catch (err) {
      console.error("Upload error:", err);
      setError("Failed to upload image from URL. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);

      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect],
  );

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDelete = async () => {
    if (!value || !onDelete) return;

    setIsDeleting(true);
    try {
      // Extract public_id from URL
      const publicId = getPublicIdFromUrl(value);

      if (publicId) {
        // Delete from Cloudinary
        await fetch("/api/media/delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ public_ids: [publicId] }),
        });
      }

      onDelete();
    } catch (error) {
      console.error("Failed to delete image:", error);
    } finally {
      setIsDeleting(false);
    }
  };

  const openDialog = () => {
    setError(null);
    setUrlInput("");
    setIsDialogOpen(true);
  };

  return (
    <>
      <div className='flex flex-col items-center gap-4'>
        {/* Avatar Display */}
        <div
          className={`relative ${sizeClasses[size]} rounded-full overflow-hidden bg-muted`}
        >
          {value ? (
            <Image
              src={value}
              alt='Profile'
              fill
              className='object-cover'
              sizes='128px'
            />
          ) : (
            <div className='w-full h-full flex items-center justify-center bg-muted'>
              <User className={`${iconSizes[size]} text-muted-foreground`} />
            </div>
          )}

          {/* Loading overlay */}
          {(isUploading || isDeleting) && (
            <div className='absolute inset-0 bg-black/50 flex items-center justify-center'>
              <Loader2 className='h-6 w-6 text-white animate-spin' />
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className='flex gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={openDialog}
            disabled={disabled || isUploading || isDeleting}
          >
            <Camera className='h-4 w-4 mr-2' />
            {value ? "Change" : "Upload"}
          </Button>

          {value && onDelete && (
            <Button
              type='button'
              variant='outline'
              size='sm'
              onClick={handleDelete}
              disabled={disabled || isUploading || isDeleting}
              className='text-destructive hover:text-destructive'
            >
              <Trash2 className='h-4 w-4 mr-2' />
              Remove
            </Button>
          )}
        </div>
      </div>

      {/* Upload Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Upload Profile Photo</DialogTitle>
            <DialogDescription>
              Choose an image from your device or enter a URL.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue='upload' className='mt-4'>
            <TabsList className='grid w-full grid-cols-2'>
              <TabsTrigger value='upload' className='flex items-center gap-2'>
                <Upload className='h-4 w-4' />
                Upload
              </TabsTrigger>
              <TabsTrigger value='url' className='flex items-center gap-2'>
                <Link className='h-4 w-4' />
                URL
              </TabsTrigger>
            </TabsList>

            {/* Upload Tab */}
            <TabsContent value='upload' className='mt-4'>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`
                  border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                  transition-colors
                  ${isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50"}
                  ${isUploading ? "pointer-events-none opacity-50" : ""}
                `}
              >
                <input
                  ref={fileInputRef}
                  type='file'
                  accept='image/jpeg,image/png,image/webp,image/gif'
                  onChange={handleFileInputChange}
                  className='hidden'
                />
                <div className='flex flex-col items-center gap-3'>
                  {isUploading ? (
                    <Loader2 className='h-10 w-10 text-muted-foreground animate-spin' />
                  ) : (
                    <ImageIcon className='h-10 w-10 text-muted-foreground' />
                  )}
                  <div>
                    <p className='font-medium'>
                      {isDragging
                        ? "Drop image here"
                        : "Drag and drop an image"}
                    </p>
                    <p className='text-sm text-muted-foreground mt-1'>
                      or click to browse
                    </p>
                  </div>
                  <p className='text-xs text-muted-foreground'>
                    JPG, PNG, WebP, or GIF. Max 5MB.
                  </p>
                </div>
              </div>
            </TabsContent>

            {/* URL Tab */}
            <TabsContent value='url' className='mt-4 space-y-4'>
              <div className='space-y-2'>
                <Label htmlFor='image-url'>Image URL</Label>
                <Input
                  id='image-url'
                  type='url'
                  placeholder='https://example.com/image.jpg'
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  disabled={isUploading}
                />
              </div>
              <Button
                onClick={handleUrlSubmit}
                disabled={isUploading || !urlInput.trim()}
                className='w-full'
              >
                {isUploading ? (
                  <>
                    <Loader2 className='h-4 w-4 mr-2 animate-spin' />
                    Uploading...
                  </>
                ) : (
                  "Upload from URL"
                )}
              </Button>
            </TabsContent>
          </Tabs>

          {error && <p className='text-sm text-destructive mt-2'>{error}</p>}
        </DialogContent>
      </Dialog>
    </>
  );
}
