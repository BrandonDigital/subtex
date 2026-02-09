"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Home,
  Loader2,
} from "lucide-react";
import type { CloudinaryAsset, CloudinaryFolder } from "@/types/media";

interface MoveDialogProps {
  assets: CloudinaryAsset[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onMove: (publicId: string, toFolder: string) => Promise<CloudinaryAsset | null>;
  fetchFolders: (parentFolder?: string) => Promise<void>;
  folders: CloudinaryFolder[];
  isLoading?: boolean;
}

export function MoveDialog({
  assets,
  open,
  onOpenChange,
  onMove,
  fetchFolders,
  folders,
  isLoading = false,
}: MoveDialogProps) {
  const [selectedFolder, setSelectedFolder] = useState<string>("");
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [isMoving, setIsMoving] = useState(false);
  const [currentPath, setCurrentPath] = useState<string>("");

  // Fetch root folders when dialog opens
  useEffect(() => {
    if (open) {
      fetchFolders();
      setSelectedFolder("");
      setCurrentPath("");
    }
  }, [open, fetchFolders]);

  // Toggle folder expansion and fetch subfolders
  const toggleFolder = useCallback(
    async (path: string) => {
      const newExpanded = new Set(expandedFolders);
      if (newExpanded.has(path)) {
        newExpanded.delete(path);
      } else {
        newExpanded.add(path);
        await fetchFolders(path);
      }
      setExpandedFolders(newExpanded);
    },
    [expandedFolders, fetchFolders]
  );

  // Handle folder selection
  const handleSelectFolder = useCallback((path: string) => {
    setSelectedFolder(path);
    setCurrentPath(path);
  }, []);

  // Handle move
  const handleMove = async () => {
    if (assets.length === 0) return;

    setIsMoving(true);

    // Move all selected assets
    for (const asset of assets) {
      await onMove(asset.public_id, selectedFolder);
    }

    setIsMoving(false);
    onOpenChange(false);
  };

  // Build breadcrumb from current path
  const breadcrumbs = currentPath
    ? currentPath.split("/").reduce<{ name: string; path: string }[]>(
        (acc, part, index) => {
          const path = acc.length > 0 ? `${acc[acc.length - 1].path}/${part}` : part;
          acc.push({ name: part, path });
          return acc;
        },
        []
      )
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Move {assets.length} {assets.length === 1 ? "Asset" : "Assets"}</DialogTitle>
          <DialogDescription>
            Select a destination folder for the selected {assets.length === 1 ? "asset" : "assets"}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Breadcrumb navigation */}
          <div className="flex items-center gap-1 text-sm overflow-x-auto">
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-7 px-2", selectedFolder === "" && "bg-accent")}
              onClick={() => handleSelectFolder("")}
            >
              <Home className="h-4 w-4" />
              <span className="ml-1">Root</span>
            </Button>
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.path} className="flex items-center">
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 px-2",
                    index === breadcrumbs.length - 1 && "bg-accent"
                  )}
                  onClick={() => handleSelectFolder(crumb.path)}
                >
                  {crumb.name}
                </Button>
              </div>
            ))}
          </div>

          {/* Folder tree */}
          <ScrollArea className="h-64 rounded-md border">
            <div className="p-2">
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : folders.length > 0 ? (
                <div className="space-y-1">
                  {folders.map((folder) => {
                    const isExpanded = expandedFolders.has(folder.path);
                    const isSelected = selectedFolder === folder.path;
                    // Check if any asset is already in this folder
                    const hasAssetInFolder = assets.some(
                      (a) => a.folder === folder.path
                    );

                    return (
                      <div
                        key={folder.path}
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors",
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : hasAssetInFolder
                            ? "opacity-50 cursor-not-allowed"
                            : "hover:bg-muted"
                        )}
                        onClick={() => {
                          if (!hasAssetInFolder) {
                            handleSelectFolder(folder.path);
                          }
                        }}
                      >
                        <button
                          className="p-0.5 hover:bg-muted-foreground/20 rounded"
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFolder(folder.path);
                          }}
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4" />
                          ) : (
                            <ChevronRight className="h-4 w-4" />
                          )}
                        </button>
                        {isExpanded || isSelected ? (
                          <FolderOpen className="h-4 w-4 text-yellow-500" />
                        ) : (
                          <Folder className="h-4 w-4 text-yellow-500" />
                        )}
                        <span className="text-sm truncate">{folder.name}</span>
                        {hasAssetInFolder && (
                          <span className="text-xs opacity-70">(current)</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">
                  No folders found
                </p>
              )}
            </div>
          </ScrollArea>

          {/* Selected destination */}
          <div className="rounded-lg border p-3 bg-muted/50">
            <p className="text-xs text-muted-foreground mb-1">Destination:</p>
            <p className="text-sm font-mono">
              {selectedFolder || "/ (root)"}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleMove} disabled={isMoving}>
            {isMoving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Move {assets.length} {assets.length === 1 ? "Asset" : "Assets"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
