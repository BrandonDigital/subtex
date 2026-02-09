"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/components/ui/toast";
import { cn } from "@/lib/utils";
import { useMediaLibrary } from "./use-media-library";
import { UploadZone } from "./upload-zone";
import { MediaGrid } from "./media-grid";
import { MediaToolbar } from "./media-toolbar";
import { FolderTree } from "./folder-tree";
import { RenameDialog } from "./rename-dialog";
import { MoveDialog } from "./move-dialog";
import { Upload, Loader2, Home, ChevronRight } from "lucide-react";
import type { CloudinaryAsset } from "@/types/media";

interface MediaLibrarySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (assets: CloudinaryAsset[]) => void;
  folder?: string;
  multiple?: boolean;
  accept?: string;
}

export function MediaLibrarySheet({
  open,
  onOpenChange,
  onSelect,
  folder = "",
  multiple = false,
  accept = "image/*",
}: MediaLibrarySheetProps) {
  const {
    assets,
    folders,
    currentFolder,
    isLoading,
    isUploading,
    error,
    hasMore,
    fetchMore,
    fetchFolders,
    navigateToFolder,
    uploadFile,
    deleteAssets,
    renameAsset,
    moveAsset,
    createFolder,
    renameFolder,
    deleteFolder,
    refresh,
  } = useMediaLibrary({ initialFolder: folder });

  // Local state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const dragCounter = useRef(0);

  // Dialogs
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [moveDialogOpen, setMoveDialogOpen] = useState(false);
  const [assetToRename, setAssetToRename] = useState<CloudinaryAsset | null>(null);
  const [assetsToMove, setAssetsToMove] = useState<CloudinaryAsset[]>([]);

  // Load initial data when sheet opens
  useEffect(() => {
    if (open) {
      navigateToFolder(folder);
    }
  }, [open, folder, navigateToFolder]);

  // Filter assets by search query
  const filteredAssets = useMemo(() => {
    if (!searchQuery.trim()) return assets;
    const query = searchQuery.toLowerCase();
    return assets.filter(
      (asset) =>
        asset.filename.toLowerCase().includes(query) ||
        asset.public_id.toLowerCase().includes(query)
    );
  }, [assets, searchQuery]);

  // Drag and drop handlers for file upload
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOver(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDraggingOver(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
    dragCounter.current = 0;

    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    // Upload each file
    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image`);
        continue;
      }

      // Convert file to base64
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        const result = await uploadFile(base64, { folder: currentFolder });
        if (result) {
          toast.success(`Uploaded ${file.name}`);
        } else {
          toast.error(`Failed to upload ${file.name}`);
        }
      };
      reader.readAsDataURL(file);
    }
  }, [uploadFile, currentFolder]);

  // Get selected assets
  const selectedAssets = useMemo(() => {
    return assets.filter((a) => selectedIds.has(a.public_id));
  }, [assets, selectedIds]);

  // Handle upload
  const handleUpload = useCallback(
    async (file: string) => {
      const result = await uploadFile(file, { folder: currentFolder || folder });
      if (result) {
        toast.success("File uploaded successfully");
        setShowUploadDialog(false);
      } else {
        toast.error("Failed to upload file");
      }
    },
    [uploadFile, currentFolder, folder]
  );

  // Handle delete
  const handleDelete = useCallback(
    async (asset: CloudinaryAsset) => {
      setIsDeleting(true);
      const success = await deleteAssets([asset.public_id]);
      setIsDeleting(false);
      if (success) {
        toast.success("Asset deleted");
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(asset.public_id);
          return next;
        });
      } else {
        toast.error("Failed to delete asset");
      }
    },
    [deleteAssets]
  );

  // Handle bulk delete
  const handleBulkDelete = useCallback(async () => {
    setIsDeleting(true);
    const success = await deleteAssets(Array.from(selectedIds));
    setIsDeleting(false);
    if (success) {
      toast.success(`${selectedIds.size} assets deleted`);
      setSelectedIds(new Set());
    } else {
      toast.error("Failed to delete some assets");
    }
  }, [deleteAssets, selectedIds]);

  // Handle rename
  const handleRename = useCallback((asset: CloudinaryAsset) => {
    setAssetToRename(asset);
    setRenameDialogOpen(true);
  }, []);

  const handleRenameConfirm = useCallback(
    async (fromPublicId: string, toPublicId: string) => {
      const result = await renameAsset(fromPublicId, toPublicId);
      if (result) {
        toast.success("Asset renamed");
        return result;
      } else {
        toast.error("Failed to rename asset");
        return null;
      }
    },
    [renameAsset]
  );

  // Handle folder rename
  const handleFolderRename = useCallback(
    async (oldPath: string, newPath: string) => {
      const success = await renameFolder(oldPath, newPath);
      if (success) {
        toast.success("Folder renamed");
        refresh();
      } else {
        toast.error("Failed to rename folder");
      }
      return success;
    },
    [renameFolder, refresh]
  );

  // Handle folder delete
  const handleFolderDelete = useCallback(
    async (path: string) => {
      const success = await deleteFolder(path);
      if (success) {
        toast.success("Folder deleted");
      } else {
        toast.error("Failed to delete folder. Make sure it's empty.");
      }
      return success;
    },
    [deleteFolder]
  );

  // Handle move
  const handleMove = useCallback((asset: CloudinaryAsset) => {
    setAssetsToMove([asset]);
    setMoveDialogOpen(true);
  }, []);

  const handleBulkMove = useCallback(() => {
    setAssetsToMove(selectedAssets);
    setMoveDialogOpen(true);
  }, [selectedAssets]);

  const handleMoveConfirm = useCallback(
    async (publicId: string, toFolder: string) => {
      const result = await moveAsset(publicId, toFolder);
      if (result) {
        toast.success("Asset moved");
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(publicId);
          return next;
        });
        return result;
      } else {
        toast.error("Failed to move asset");
        return null;
      }
    },
    [moveAsset]
  );

  // Handle selection
  const handleSelectionChange = useCallback((ids: Set<string>) => {
    setSelectedIds(ids);
  }, []);

  // Handle double-click to select
  const handleAssetDoubleClick = useCallback(
    (asset: CloudinaryAsset) => {
      onSelect([asset]);
      onOpenChange(false);
    },
    [onSelect, onOpenChange]
  );

  // Handle insert selected
  const handleInsertSelected = useCallback(() => {
    if (selectedAssets.length > 0) {
      onSelect(multiple ? selectedAssets : [selectedAssets[0]]);
      onOpenChange(false);
    }
  }, [selectedAssets, multiple, onSelect, onOpenChange]);

  // Clear selection when closing
  useEffect(() => {
    if (!open) {
      setSelectedIds(new Set());
      setSearchQuery("");
    }
  }, [open]);

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl md:max-w-4xl flex flex-col p-0"
        >
          <SheetHeader className="px-6 py-4 border-b">
            <SheetTitle>Media Library</SheetTitle>
          </SheetHeader>

          <div 
            className="flex-1 flex flex-col overflow-hidden px-6 py-4 relative"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {/* Drag overlay */}
            {isDraggingOver && (
              <div className="absolute inset-0 z-50 bg-primary/10 border-2 border-dashed border-primary rounded-lg flex items-center justify-center">
                <div className="text-center">
                  <Upload className="h-12 w-12 mx-auto text-primary mb-2" />
                  <p className="text-lg font-medium text-primary">Drop files to upload</p>
                  <p className="text-sm text-muted-foreground">to {currentFolder || "root"}</p>
                </div>
              </div>
            )}

            {/* Toolbar */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <MediaToolbar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedCount={selectedIds.size}
                onDeleteSelected={handleBulkDelete}
                onMoveSelected={handleBulkMove}
                onClearSelection={() => setSelectedIds(new Set())}
                onRefresh={refresh}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
                  isLoading={isLoading}
                  isDeleting={isDeleting}
                />
              </div>
              <Button onClick={() => setShowUploadDialog(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Upload
              </Button>
            </div>

            <Separator className="my-4" />

              {/* Breadcrumb navigation */}
              <div className="flex items-center gap-1 mb-4 text-sm">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "h-7 px-2",
                    !currentFolder && "bg-accent"
                  )}
                  onClick={() => navigateToFolder("")}
                >
                  <Home className="h-4 w-4" />
                </Button>
                {currentFolder.split("/").filter(Boolean).reduce<{ name: string; path: string }[]>(
                  (acc, part) => {
                    const path = acc.length > 0 ? `${acc[acc.length - 1].path}/${part}` : part;
                    acc.push({ name: part, path });
                    return acc;
                  },
                  []
                ).map((crumb, index, arr) => (
                  <div key={crumb.path} className="flex items-center">
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    <Button
                      variant="ghost"
                      size="sm"
                      className={cn(
                        "h-7 px-2",
                        index === arr.length - 1 && "bg-accent"
                      )}
                      onClick={() => navigateToFolder(crumb.path)}
                    >
                      {crumb.name}
                    </Button>
                  </div>
                ))}
              </div>

              {/* Main content area */}
              <div className="flex-1 flex gap-4 overflow-hidden">
                {/* Folder sidebar */}
                <div className="w-48 shrink-0 border rounded-lg overflow-hidden hidden md:block">
                  <FolderTree
                    folders={folders}
                    currentFolder={currentFolder}
                    onFolderSelect={navigateToFolder}
                    onCreateFolder={createFolder}
                    onRenameFolder={handleFolderRename}
                    onDeleteFolder={handleFolderDelete}
                    isLoading={isLoading}
                  />
                </div>

                {/* Asset grid */}
                <ScrollArea className="flex-1">
                  <MediaGrid
                    assets={filteredAssets}
                    selectedIds={selectedIds}
                    onSelectionChange={handleSelectionChange}
                    onAssetDoubleClick={handleAssetDoubleClick}
                    onRename={handleRename}
                    onDelete={handleDelete}
                    onMove={handleMove}
                    isLoading={isLoading}
                    multiple={multiple}
                  />
                  {hasMore && (
                    <div className="flex justify-center py-4">
                      <Button
                        variant="outline"
                        onClick={fetchMore}
                        disabled={isLoading}
                      >
                        {isLoading ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : null}
                        Load More
                      </Button>
                    </div>
                  )}
                </ScrollArea>
              </div>

            {/* Error display */}
            {error && (
              <div className="mt-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Upload Dialog */}
          <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
            <DialogContent className="sm:max-w-2xl">
              <DialogHeader>
                <DialogTitle>Upload Files</DialogTitle>
              </DialogHeader>
              <UploadZone
                onUpload={handleUpload}
                isUploading={isUploading}
                accept={accept}
              />
            </DialogContent>
          </Dialog>

          <SheetFooter className="px-6 py-4 border-t">
            <div className="flex items-center justify-between w-full">
              <p className="text-sm text-muted-foreground">
                {selectedIds.size > 0
                  ? `${selectedIds.size} selected`
                  : "Double-click to select"}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleInsertSelected}
                  disabled={selectedIds.size === 0}
                >
                  {multiple ? "Insert Selected" : "Select"}
                </Button>
              </div>
            </div>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Rename Dialog */}
      <RenameDialog
        asset={assetToRename}
        open={renameDialogOpen}
        onOpenChange={setRenameDialogOpen}
        onRename={handleRenameConfirm}
      />

      {/* Move Dialog */}
      <MoveDialog
        assets={assetsToMove}
        open={moveDialogOpen}
        onOpenChange={setMoveDialogOpen}
        onMove={handleMoveConfirm}
        fetchFolders={fetchFolders}
        folders={folders}
        isLoading={isLoading}
      />
    </>
  );
}
