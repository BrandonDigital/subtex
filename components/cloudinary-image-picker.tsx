"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import Script from "next/script";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X, Loader2, AlertCircle, FolderOpen, Upload } from "lucide-react";

// Check if Cloudinary is configured at module level
// Note: API key must be NEXT_PUBLIC_ prefixed for client-side access
const isCloudinaryConfigured = !!(
  process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME &&
  process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY
);

// Debug log for development
if (typeof window !== "undefined" && !isCloudinaryConfigured) {
  console.log("[CloudinaryImagePicker] Missing env vars:", {
    NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: !!process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
    NEXT_PUBLIC_CLOUDINARY_API_KEY: !!process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  });
}

// Dynamically import Cloudinary components only if configured
const CldUploadWidget = isCloudinaryConfigured
  ? dynamic(() => import("next-cloudinary").then((mod) => mod.CldUploadWidget), {
      ssr: false,
      loading: () => <div className="h-32 animate-pulse bg-muted rounded-lg" />,
    })
  : null;

const CldImage = isCloudinaryConfigured
  ? dynamic(() => import("next-cloudinary").then((mod) => mod.CldImage), {
      ssr: false,
    })
  : null;

// Extend window for Cloudinary
declare global {
  interface Window {
    cloudinary?: {
      createMediaLibrary: (
        options: Record<string, unknown>,
        handlers: { insertHandler: (data: { assets: Array<{ secure_url: string }> }) => void }
      ) => { show: (options?: Record<string, unknown>) => void };
    };
  }
}

interface CloudinaryUploadResult {
  event?: string;
  info?: {
    public_id: string;
    secure_url: string;
    url: string;
    width: number;
    height: number;
    format: string;
    resource_type: string;
    created_at: string;
    bytes: number;
    [key: string]: unknown;
  };
}


interface CloudinaryImagePickerProps {
  value: string;
  onChange: (url: string) => void;
  folder?: string;
  label?: string;
  disabled?: boolean;
}

export function CloudinaryImagePicker({
  value,
  onChange,
  folder = "products",
  label = "Product Image",
  disabled = false,
}: CloudinaryImagePickerProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [mediaLibraryReady, setMediaLibraryReady] = useState(false);

  const handleUploadSuccess = (result: CloudinaryUploadResult) => {
    if (result.info?.secure_url) {
      onChange(result.info.secure_url);
    }
  };

  const handleRemoveImage = () => {
    onChange("");
  };

  const openMediaLibrary = useCallback(() => {
    if (!window.cloudinary) {
      console.error("Cloudinary Media Library not loaded");
      return;
    }

    const mediaLibrary = window.cloudinary.createMediaLibrary(
      {
        cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
        api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
        multiple: false,
        max_files: 1,
        folder: { path: folder, resource_type: "image" },
      },
      {
        insertHandler: (data) => {
          if (data.assets && data.assets.length > 0) {
            onChange(data.assets[0].secure_url);
          }
        },
      }
    );

    mediaLibrary.show();
  }, [folder, onChange]);

  // Extract public_id from Cloudinary URL for CldImage
  const getPublicIdFromUrl = (url: string): string | null => {
    if (!url.includes("cloudinary.com")) return null;
    
    // Match pattern: /upload/v{version}/{public_id}.{format}
    // or /upload/{public_id}.{format}
    const match = url.match(/\/upload\/(?:v\d+\/)?(.+)\.[^.]+$/);
    return match ? match[1] : null;
  };

  const publicId = value ? getPublicIdFromUrl(value) : null;
  const isCloudinaryImage = !!publicId;

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      
      {value ? (
        <div className="relative group">
          <div className="relative aspect-video rounded-lg overflow-hidden border bg-muted">
            {isCloudinaryImage && CldImage ? (
              <CldImage
                src={publicId}
                alt="Product image"
                fill
                className="object-cover"
                sizes="(max-width: 768px) 100vw, 50vw"
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={value}
                alt="Product image"
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleRemoveImage}
                disabled={disabled}
              >
                <X className="h-4 w-4 mr-2" />
                Remove
              </Button>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2 truncate">{value}</p>
        </div>
      ) : !isCloudinaryConfigured ? (
        <div className="border border-dashed border-yellow-500/50 rounded-lg p-4 bg-yellow-500/5">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-yellow-600">Cloudinary not configured</p>
              <p className="text-muted-foreground mt-1">
                To enable image uploads, add these environment variables:
              </p>
              <ul className="mt-2 space-y-1 text-xs text-muted-foreground font-mono">
                <li>NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME</li>
                <li>NEXT_PUBLIC_CLOUDINARY_API_KEY</li>
                <li>CLOUDINARY_API_SECRET</li>
              </ul>
              <p className="text-muted-foreground mt-2">
                Restart your dev server after adding env vars.
              </p>
            </div>
          </div>
        </div>
      ) : CldUploadWidget ? (
        <div className="space-y-3">
          {/* Load Cloudinary Media Library Script */}
          <Script
            src="https://media-library.cloudinary.com/global/all.js"
            onLoad={() => setMediaLibraryReady(true)}
          />
          
          <div className="grid grid-cols-2 gap-3">
            {/* Upload New Image */}
            <CldUploadWidget
              signatureEndpoint="/api/cloudinary/sign"
              options={{
                folder: folder,
                sources: ["local", "url", "camera"],
                multiple: false,
                maxFiles: 1,
                resourceType: "image",
                clientAllowedFormats: ["png", "jpg", "jpeg", "webp", "gif"],
                maxFileSize: 10000000, // 10MB
                cropping: true,
                croppingAspectRatio: 16 / 9,
                croppingShowDimensions: true,
                showSkipCropButton: true,
                styles: {
                  palette: {
                    window: "#FFFFFF",
                    windowBorder: "#90A0B3",
                    tabIcon: "#0078FF",
                    menuIcons: "#5A616A",
                    textDark: "#000000",
                    textLight: "#FFFFFF",
                    link: "#0078FF",
                    action: "#FF620C",
                    inactiveTabIcon: "#0E2F5A",
                    error: "#F44235",
                    inProgress: "#0078FF",
                    complete: "#20B832",
                    sourceBg: "#E4EBF1",
                  },
                },
              }}
              onSuccess={(result) => {
                handleUploadSuccess(result as CloudinaryUploadResult);
                setIsLoading(false);
              }}
              onOpen={() => setIsLoading(true)}
              onClose={() => setIsLoading(false)}
            >
              {({ open }) => (
                <button
                  type="button"
                  onClick={() => open()}
                  disabled={disabled || isLoading}
                  className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 hover:border-muted-foreground/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    {isLoading ? (
                      <Loader2 className="h-8 w-8 animate-spin" />
                    ) : (
                      <Upload className="h-8 w-8" />
                    )}
                    <span className="text-sm font-medium">Upload New</span>
                    <span className="text-xs text-center">
                      Device, URL, or camera
                    </span>
                  </div>
                </button>
              )}
            </CldUploadWidget>

            {/* Browse Media Library */}
            <button
              type="button"
              onClick={openMediaLibrary}
              disabled={disabled || !mediaLibraryReady}
              className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 hover:border-muted-foreground/50 transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                {!mediaLibraryReady ? (
                  <Loader2 className="h-8 w-8 animate-spin" />
                ) : (
                  <FolderOpen className="h-8 w-8" />
                )}
                <span className="text-sm font-medium">Browse Library</span>
                <span className="text-xs text-center">
                  Select from existing
                </span>
              </div>
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
