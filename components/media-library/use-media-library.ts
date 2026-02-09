"use client";

import { useState, useCallback, useRef } from "react";
import type {
  CloudinaryAsset,
  CloudinaryFolder,
  ListAssetsResponse,
  ListFoldersResponse,
  UploadResponse,
  DeleteResponse,
  RenameResponse,
  MoveResponse,
} from "@/types/media";

interface UseMediaLibraryOptions {
  initialFolder?: string;
}

export function useMediaLibrary(options: UseMediaLibraryOptions = {}) {
  const [assets, setAssets] = useState<CloudinaryAsset[]>([]);
  const [folders, setFolders] = useState<CloudinaryFolder[]>([]);
  const [currentFolder, setCurrentFolder] = useState(
    options.initialFolder || "",
  );
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);

  // Track the latest request to prevent race conditions
  const latestRequestRef = useRef<number>(0);

  // Fetch assets from current folder
  const fetchAssets = useCallback(
    async (folder?: string, cursor?: string) => {
      setIsLoading(true);
      setError(null);

      try {
        const targetFolder = folder ?? currentFolder;
        const params = new URLSearchParams();
        if (targetFolder) params.set("folder", targetFolder);
        if (cursor) params.set("next_cursor", cursor);

        const response = await fetch(`/api/media/list?${params.toString()}`);

        if (!response.ok) {
          throw new Error("Failed to fetch assets");
        }

        const data: ListAssetsResponse = await response.json();

        if (cursor) {
          // Append to existing assets for pagination
          setAssets((prev) => [...prev, ...data.assets]);
        } else {
          // Replace assets for new folder
          setAssets(data.assets);
        }

        setNextCursor(data.next_cursor);
        setHasMore(!!data.next_cursor);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setIsLoading(false);
      }
    },
    [currentFolder],
  );

  // Fetch more assets (pagination)
  const fetchMore = useCallback(async () => {
    if (nextCursor && !isLoading) {
      await fetchAssets(currentFolder, nextCursor);
    }
  }, [nextCursor, isLoading, currentFolder, fetchAssets]);

  // Fetch folders
  const fetchFolders = useCallback(async (parentFolder?: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (parentFolder) params.set("folder", parentFolder);

      const response = await fetch(`/api/media/folders?${params.toString()}`);

      if (!response.ok) {
        throw new Error("Failed to fetch folders");
      }

      const data: ListFoldersResponse = await response.json();
      setFolders(data.folders);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Navigate to folder
  const navigateToFolder = useCallback(async (folder: string) => {
    // Increment request ID to track this navigation
    const requestId = ++latestRequestRef.current;

    setCurrentFolder(folder);
    setAssets([]);
    setNextCursor(undefined);
    setIsLoading(true);
    setError(null);

    try {
      // Fetch assets
      const assetsParams = new URLSearchParams();
      if (folder) assetsParams.set("folder", folder);

      const foldersParams = new URLSearchParams();
      if (folder) foldersParams.set("folder", folder);

      const [assetsResponse, foldersResponse] = await Promise.all([
        fetch(`/api/media/list?${assetsParams.toString()}`),
        fetch(`/api/media/folders?${foldersParams.toString()}`),
      ]);

      // Check if this is still the latest request before updating state
      if (requestId !== latestRequestRef.current) {
        return; // Stale request, ignore the response
      }

      if (!assetsResponse.ok || !foldersResponse.ok) {
        throw new Error("Failed to fetch data");
      }

      const [assetsData, foldersData]: [
        ListAssetsResponse,
        ListFoldersResponse,
      ] = await Promise.all([assetsResponse.json(), foldersResponse.json()]);

      // Double-check this is still the latest request
      if (requestId !== latestRequestRef.current) {
        return; // Stale request, ignore the response
      }

      setAssets(assetsData.assets);
      setNextCursor(assetsData.next_cursor);
      setHasMore(!!assetsData.next_cursor);
      setFolders(foldersData.folders);
    } catch (err) {
      // Only set error if this is still the latest request
      if (requestId === latestRequestRef.current) {
        setError(err instanceof Error ? err.message : "An error occurred");
      }
    } finally {
      // Only set loading false if this is still the latest request
      if (requestId === latestRequestRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  // Upload file
  const uploadFile = useCallback(
    async (
      file: string,
      options?: { folder?: string; public_id?: string; tags?: string[] },
    ): Promise<CloudinaryAsset | null> => {
      setIsUploading(true);
      setError(null);

      try {
        const response = await fetch("/api/media/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            file,
            folder: options?.folder ?? currentFolder,
            public_id: options?.public_id,
            tags: options?.tags,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to upload file");
        }

        const data: UploadResponse = await response.json();

        // Add to assets list if in same folder
        if (
          data.asset.folder === currentFolder ||
          (!data.asset.folder && !currentFolder)
        ) {
          setAssets((prev) => [data.asset, ...prev]);
        }

        return data.asset;
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        return null;
      } finally {
        setIsUploading(false);
      }
    },
    [currentFolder],
  );

  // Delete assets
  const deleteAssets = useCallback(
    async (publicIds: string[]): Promise<boolean> => {
      setError(null);

      try {
        const response = await fetch("/api/media/delete", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ public_ids: publicIds }),
        });

        if (!response.ok) {
          throw new Error("Failed to delete assets");
        }

        const data: DeleteResponse = await response.json();

        // Remove deleted assets from list
        const deletedIds = Object.keys(data.deleted).filter(
          (id) => data.deleted[id] === "deleted",
        );
        setAssets((prev) =>
          prev.filter((a) => !deletedIds.includes(a.public_id)),
        );

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        return false;
      }
    },
    [],
  );

  // Rename asset
  const renameAsset = useCallback(
    async (
      fromPublicId: string,
      toPublicId: string,
    ): Promise<CloudinaryAsset | null> => {
      setError(null);

      try {
        const response = await fetch("/api/media/rename", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            from_public_id: fromPublicId,
            to_public_id: toPublicId,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to rename asset");
        }

        const data: RenameResponse = await response.json();

        // Update asset in list
        setAssets((prev) =>
          prev.map((a) => (a.public_id === fromPublicId ? data.asset : a)),
        );

        return data.asset;
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        return null;
      }
    },
    [],
  );

  // Move asset
  const moveAsset = useCallback(
    async (
      publicId: string,
      toFolder: string,
    ): Promise<CloudinaryAsset | null> => {
      setError(null);

      try {
        const response = await fetch("/api/media/move", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            public_id: publicId,
            to_folder: toFolder,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to move asset");
        }

        const data: MoveResponse = await response.json();

        // Remove from current list if moved to different folder
        if (toFolder !== currentFolder) {
          setAssets((prev) => prev.filter((a) => a.public_id !== publicId));
        }

        return data.asset;
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        return null;
      }
    },
    [currentFolder],
  );

  // Create folder
  const createFolder = useCallback(
    async (folderPath: string): Promise<CloudinaryFolder | null> => {
      setError(null);

      try {
        const response = await fetch("/api/media/folders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folder: folderPath }),
        });

        if (!response.ok) {
          throw new Error("Failed to create folder");
        }

        const data = await response.json();

        // Add to folders list
        setFolders((prev) => [...prev, data.folder]);

        return data.folder;
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        return null;
      }
    },
    [],
  );

  // Rename folder
  const renameFolder = useCallback(
    async (fromPath: string, toPath: string): Promise<boolean> => {
      setError(null);

      try {
        const response = await fetch("/api/media/folders", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from_folder: fromPath, to_folder: toPath }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to rename folder");
        }

        const data = await response.json();

        // Update folders list
        setFolders((prev) =>
          prev.map((f) => (f.path === fromPath ? data.folder : f)),
        );

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        return false;
      }
    },
    [],
  );

  // Delete folder
  const deleteFolder = useCallback(
    async (folderPath: string): Promise<boolean> => {
      setError(null);

      try {
        const response = await fetch("/api/media/folders", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ folder: folderPath }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || "Failed to delete folder");
        }

        // Remove from folders list
        setFolders((prev) => prev.filter((f) => f.path !== folderPath));

        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        return false;
      }
    },
    [],
  );

  // Refresh current view
  const refresh = useCallback(async () => {
    await navigateToFolder(currentFolder);
  }, [currentFolder, navigateToFolder]);

  return {
    // State
    assets,
    folders,
    currentFolder,
    isLoading,
    isUploading,
    error,
    hasMore,

    // Actions
    fetchAssets,
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
  };
}
