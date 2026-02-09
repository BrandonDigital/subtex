"use client";

import { useCallback, useRef } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { cn } from "@/lib/utils";
import {
  ImageIcon,
  Edit,
  Trash2,
  FolderInput,
  Download,
  Copy,
  ExternalLink,
} from "lucide-react";
import type { CloudinaryAsset } from "@/types/media";

interface MediaGridProps {
  assets: CloudinaryAsset[];
  selectedIds: Set<string>;
  onSelectionChange: (ids: Set<string>) => void;
  onAssetDoubleClick?: (asset: CloudinaryAsset) => void;
  onRename?: (asset: CloudinaryAsset) => void;
  onDelete?: (asset: CloudinaryAsset) => void;
  onMove?: (asset: CloudinaryAsset) => void;
  isLoading?: boolean;
  multiple?: boolean;
}

export function MediaGrid({
  assets,
  selectedIds,
  onSelectionChange,
  onAssetDoubleClick,
  onRename,
  onDelete,
  onMove,
  isLoading = false,
  multiple = true,
}: MediaGridProps) {
  const lastSelectedIndex = useRef<number | null>(null);

  // Context menu actions
  const handleCopyUrl = useCallback((asset: CloudinaryAsset) => {
    navigator.clipboard.writeText(asset.secure_url);
  }, []);

  const handleDownload = useCallback((asset: CloudinaryAsset) => {
    const link = document.createElement("a");
    link.href = asset.secure_url;
    link.download = asset.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, []);

  const handleOpenInNewTab = useCallback((asset: CloudinaryAsset) => {
    window.open(asset.secure_url, "_blank");
  }, []);

  // Format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Handle asset click with shift+click support
  const handleAssetClick = useCallback(
    (asset: CloudinaryAsset, index: number, e: React.MouseEvent) => {
      e.preventDefault();

      const isSelected = selectedIds.has(asset.public_id);

      if (!multiple) {
        // Single select mode
        onSelectionChange(new Set([asset.public_id]));
        lastSelectedIndex.current = index;
        return;
      }

      if (e.shiftKey && lastSelectedIndex.current !== null) {
        // Shift+click for range select
        const start = Math.min(lastSelectedIndex.current, index);
        const end = Math.max(lastSelectedIndex.current, index);
        const newSelection = new Set(selectedIds);

        for (let i = start; i <= end; i++) {
          newSelection.add(assets[i].public_id);
        }

        onSelectionChange(newSelection);
      } else if (e.ctrlKey || e.metaKey) {
        // Ctrl/Cmd+click for toggle
        const newSelection = new Set(selectedIds);
        if (isSelected) {
          newSelection.delete(asset.public_id);
        } else {
          newSelection.add(asset.public_id);
        }
        onSelectionChange(newSelection);
        lastSelectedIndex.current = index;
      } else {
        // Regular click - toggle single item
        if (isSelected && selectedIds.size === 1) {
          onSelectionChange(new Set());
        } else {
          onSelectionChange(new Set([asset.public_id]));
        }
        lastSelectedIndex.current = index;
      }
    },
    [assets, multiple, onSelectionChange, selectedIds],
  );

  // Handle checkbox change
  const handleCheckboxChange = useCallback(
    (asset: CloudinaryAsset, checked: boolean) => {
      if (!multiple) {
        onSelectionChange(checked ? new Set([asset.public_id]) : new Set());
        return;
      }

      const newSelection = new Set(selectedIds);
      if (checked) {
        newSelection.add(asset.public_id);
      } else {
        newSelection.delete(asset.public_id);
      }
      onSelectionChange(newSelection);
    },
    [multiple, onSelectionChange, selectedIds],
  );

  // Handle double click
  const handleDoubleClick = useCallback(
    (asset: CloudinaryAsset) => {
      onAssetDoubleClick?.(asset);
    },
    [onAssetDoubleClick],
  );

  if (isLoading && assets.length === 0) {
    return (
      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'>
        {Array.from({ length: 8 }).map((_, i) => (
          <Skeleton key={i} className='aspect-square rounded-lg' />
        ))}
      </div>
    );
  }

  if (assets.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center py-12 text-muted-foreground'>
        <ImageIcon className='h-12 w-12 mb-4' />
        <p className='text-sm'>No images found</p>
      </div>
    );
  }

  return (
    <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'>
      {assets.map((asset, index) => {
        const isSelected = selectedIds.has(asset.public_id);

        return (
          <ContextMenu key={asset.public_id}>
            <ContextMenuTrigger asChild>
              <div
                className={cn(
                  "group relative aspect-square rounded-lg overflow-hidden border-2 cursor-pointer transition-all",
                  isSelected
                    ? "border-primary ring-2 ring-primary ring-offset-2"
                    : "border-transparent hover:border-muted-foreground/50",
                )}
                onClick={(e) => handleAssetClick(asset, index, e)}
                onDoubleClick={() => handleDoubleClick(asset)}
              >
                {/* Image */}
                <div className='absolute inset-0 bg-muted'>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={asset.secure_url.replace(
                      "/upload/",
                      "/upload/c_fill,w_300,h_300,f_auto,q_auto/",
                    )}
                    alt={asset.filename}
                    className='w-full h-full object-cover'
                    loading='lazy'
                  />
                </div>

                {/* Selection checkbox */}
                <div
                  className={cn(
                    "absolute top-2 left-2 z-10 transition-opacity",
                    isSelected || "opacity-0 group-hover:opacity-100",
                  )}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked) =>
                      handleCheckboxChange(asset, checked as boolean)
                    }
                    className='h-5 w-5 bg-white/80 border-2'
                  />
                </div>

                {/* Info overlay */}
                <div className='absolute inset-x-0 bottom-0 bg-linear-to-t from-black/70 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity'>
                  <p className='text-white text-xs truncate'>
                    {asset.filename}
                  </p>
                  <p className='text-white/70 text-xs'>
                    {asset.width}×{asset.height} • {formatFileSize(asset.bytes)}
                  </p>
                </div>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent className='w-48'>
              <ContextMenuItem onClick={() => handleCopyUrl(asset)}>
                <Copy className='mr-2 h-4 w-4' />
                Copy URL
              </ContextMenuItem>
              <ContextMenuItem onClick={() => handleDownload(asset)}>
                <Download className='mr-2 h-4 w-4' />
                Download
              </ContextMenuItem>
              <ContextMenuItem onClick={() => handleOpenInNewTab(asset)}>
                <ExternalLink className='mr-2 h-4 w-4' />
                Open in New Tab
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => onRename?.(asset)}>
                <Edit className='mr-2 h-4 w-4' />
                Rename
              </ContextMenuItem>
              <ContextMenuItem onClick={() => onMove?.(asset)}>
                <FolderInput className='mr-2 h-4 w-4' />
                Move to...
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                onClick={() => onDelete?.(asset)}
                className='text-destructive focus:text-destructive'
              >
                <Trash2 className='mr-2 h-4 w-4' />
                Delete
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        );
      })}
    </div>
  );
}
