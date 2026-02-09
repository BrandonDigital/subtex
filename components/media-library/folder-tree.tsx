"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import {
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Plus,
  Loader2,
  Edit,
  Trash2,
} from "lucide-react";
import type { CloudinaryFolder } from "@/types/media";

interface FolderTreeProps {
  folders: CloudinaryFolder[];
  currentFolder: string;
  onFolderSelect: (folder: string) => void;
  onCreateFolder?: (path: string) => Promise<CloudinaryFolder | null>;
  onRenameFolder?: (oldPath: string, newPath: string) => Promise<boolean>;
  onDeleteFolder?: (path: string) => Promise<boolean>;
  isLoading?: boolean;
}

export function FolderTree({
  folders,
  currentFolder,
  onFolderSelect,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  isLoading = false,
}: FolderTreeProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(),
  );
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Rename folder state
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [folderToRename, setFolderToRename] = useState<CloudinaryFolder | null>(
    null,
  );
  const [renameFolderName, setRenameFolderName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);

  // Delete folder state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [folderToDelete, setFolderToDelete] = useState<CloudinaryFolder | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  // Toggle folder expansion
  const toggleFolder = useCallback((path: string) => {
    setExpandedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  }, []);

  // Handle folder click
  const handleFolderClick = useCallback(
    (path: string) => {
      onFolderSelect(path);
    },
    [onFolderSelect],
  );

  // Create new folder
  const handleCreateFolder = useCallback(async () => {
    if (!newFolderName.trim() || !onCreateFolder) return;

    setIsCreating(true);
    const folderPath = currentFolder
      ? `${currentFolder}/${newFolderName.trim()}`
      : newFolderName.trim();

    await onCreateFolder(folderPath);
    setNewFolderName("");
    setShowCreateDialog(false);
    setIsCreating(false);
  }, [currentFolder, newFolderName, onCreateFolder]);

  // Open rename dialog
  const handleOpenRename = useCallback((folder: CloudinaryFolder) => {
    setFolderToRename(folder);
    setRenameFolderName(folder.name);
    setShowRenameDialog(true);
  }, []);

  // Rename folder
  const handleRenameFolder = useCallback(async () => {
    if (!renameFolderName.trim() || !folderToRename || !onRenameFolder) return;

    setIsRenaming(true);

    // Get parent path
    const pathParts = folderToRename.path.split("/");
    pathParts.pop(); // Remove old name
    const parentPath = pathParts.join("/");
    const newPath = parentPath
      ? `${parentPath}/${renameFolderName.trim()}`
      : renameFolderName.trim();

    const success = await onRenameFolder(folderToRename.path, newPath);

    if (success) {
      setShowRenameDialog(false);
      setFolderToRename(null);
      setRenameFolderName("");
    }
    setIsRenaming(false);
  }, [renameFolderName, folderToRename, onRenameFolder]);

  // Open delete dialog
  const handleOpenDelete = useCallback((folder: CloudinaryFolder) => {
    setFolderToDelete(folder);
    setShowDeleteDialog(true);
  }, []);

  // Delete folder
  const handleDeleteFolder = useCallback(async () => {
    if (!folderToDelete || !onDeleteFolder) return;

    setIsDeleting(true);
    const success = await onDeleteFolder(folderToDelete.path);

    if (success) {
      setShowDeleteDialog(false);
      setFolderToDelete(null);
    }
    setIsDeleting(false);
  }, [folderToDelete, onDeleteFolder]);

  return (
    <div className='flex flex-col h-full'>
      {/* Folder list */}
      <ScrollArea className='flex-1'>
        <div className='p-2'>
          {isLoading ? (
            <div className='flex items-center justify-center py-4'>
              <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
            </div>
          ) : folders.length > 0 ? (
            <div className='space-y-1'>
              {folders.map((folder) => {
                const isExpanded = expandedFolders.has(folder.path);
                const isActive = currentFolder === folder.path;

                return (
                  <ContextMenu key={folder.path}>
                    <ContextMenuTrigger asChild>
                      <div
                        className={cn(
                          "flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors",
                          isActive
                            ? "bg-accent text-accent-foreground"
                            : "hover:bg-muted",
                        )}
                        onClick={() => handleFolderClick(folder.path)}
                      >
                        <button
                          className='p-0.5 hover:bg-muted-foreground/20 rounded'
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleFolder(folder.path);
                          }}
                        >
                          {isExpanded ? (
                            <ChevronDown className='h-4 w-4' />
                          ) : (
                            <ChevronRight className='h-4 w-4' />
                          )}
                        </button>
                        {isExpanded || isActive ? (
                          <FolderOpen className='h-4 w-4 text-yellow-500' />
                        ) : (
                          <Folder className='h-4 w-4 text-yellow-500' />
                        )}
                        <span className='text-sm truncate'>{folder.name}</span>
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className='w-40'>
                      <ContextMenuItem onClick={() => handleOpenRename(folder)}>
                        <Edit className='mr-2 h-4 w-4' />
                        Rename
                      </ContextMenuItem>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        onClick={() => handleOpenDelete(folder)}
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
          ) : (
            <p className='text-sm text-muted-foreground text-center py-4'>
              No subfolders
            </p>
          )}
        </div>
      </ScrollArea>

      {/* Create folder button */}
      {onCreateFolder && (
        <div className='p-2 border-t'>
          <Button
            variant='outline'
            size='sm'
            className='w-full'
            onClick={() => setShowCreateDialog(true)}
          >
            <Plus className='h-4 w-4 mr-2' />
            New Folder
          </Button>
        </div>
      )}

      {/* Create folder dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <div className='space-y-4'>
            <div className='space-y-2'>
              <p className='text-sm text-muted-foreground'>
                {currentFolder
                  ? `Creating folder in: ${currentFolder}/`
                  : "Creating folder in root"}
              </p>
              <Input
                placeholder='Folder name'
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleCreateFolder();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setShowCreateDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim() || isCreating}
            >
              {isCreating ? (
                <Loader2 className='h-4 w-4 mr-2 animate-spin' />
              ) : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename folder dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className='sm:max-w-md'>
          <DialogHeader>
            <DialogTitle>Rename Folder</DialogTitle>
            <DialogDescription>
              Enter a new name for the folder.
            </DialogDescription>
          </DialogHeader>
          <div className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='folder-name'>Folder Name</Label>
              <Input
                id='folder-name'
                placeholder='Folder name'
                value={renameFolderName}
                onChange={(e) => setRenameFolderName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleRenameFolder();
                  }
                }}
              />
            </div>
            {folderToRename && (
              <div className='rounded-lg border p-3 bg-muted/50'>
                <p className='text-xs text-muted-foreground mb-1'>
                  Current path:
                </p>
                <p className='text-sm font-mono truncate'>
                  {folderToRename.path}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setShowRenameDialog(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRenameFolder}
              disabled={!renameFolderName.trim() || isRenaming}
            >
              {isRenaming ? (
                <Loader2 className='h-4 w-4 mr-2 animate-spin' />
              ) : null}
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete folder confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the folder &quot;
              {folderToDelete?.name}&quot;? This will only work if the folder is
              empty. Any assets inside must be moved or deleted first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFolder}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className='h-4 w-4 mr-2 animate-spin' />
              ) : null}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
