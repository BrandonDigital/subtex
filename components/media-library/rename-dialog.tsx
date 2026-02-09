"use client";

import { useState, useEffect } from "react";
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
import { Loader2 } from "lucide-react";
import type { CloudinaryAsset } from "@/types/media";

interface RenameDialogProps {
  asset: CloudinaryAsset | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRename: (fromPublicId: string, toPublicId: string) => Promise<CloudinaryAsset | null>;
}

export function RenameDialog({
  asset,
  open,
  onOpenChange,
  onRename,
}: RenameDialogProps) {
  const [newName, setNewName] = useState("");
  const [isRenaming, setIsRenaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize name when asset changes
  useEffect(() => {
    if (asset) {
      // Extract filename without extension
      const filename = asset.public_id.split("/").pop() || "";
      setNewName(filename);
      setError(null);
    }
  }, [asset]);

  const handleRename = async () => {
    if (!asset || !newName.trim()) return;

    // Validate name
    if (!/^[a-zA-Z0-9_-]+$/.test(newName.trim())) {
      setError("Name can only contain letters, numbers, hyphens, and underscores");
      return;
    }

    setIsRenaming(true);
    setError(null);

    // Construct new public_id preserving folder path
    const folder = asset.folder;
    const newPublicId = folder ? `${folder}/${newName.trim()}` : newName.trim();

    const result = await onRename(asset.public_id, newPublicId);

    setIsRenaming(false);

    if (result) {
      onOpenChange(false);
    } else {
      setError("Failed to rename asset. The name might already exist.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Rename Asset</DialogTitle>
          <DialogDescription>
            Enter a new name for this asset. The file extension will be preserved.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <div className="flex items-center gap-2">
              <Input
                id="name"
                value={newName}
                onChange={(e) => {
                  setNewName(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleRename();
                  }
                }}
                placeholder="Enter new name"
              />
              {asset && <span className="text-muted-foreground">.{asset.format}</span>}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          {asset && (
            <div className="rounded-lg border p-3 bg-muted/50">
              <p className="text-xs text-muted-foreground mb-1">Current path:</p>
              <p className="text-sm font-mono truncate">{asset.public_id}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleRename}
            disabled={!newName.trim() || isRenaming}
          >
            {isRenaming ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Rename
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
