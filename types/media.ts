// Cloudinary Media Library Types

export interface CloudinaryAsset {
  public_id: string;
  secure_url: string;
  url: string;
  format: string;
  resource_type: "image" | "video" | "raw";
  width: number;
  height: number;
  bytes: number;
  created_at: string;
  folder: string;
  filename: string;
  display_name?: string;
  tags?: string[];
}

export interface CloudinaryFolder {
  name: string;
  path: string;
  external_id?: string;
}

export interface ListAssetsResponse {
  assets: CloudinaryAsset[];
  next_cursor?: string;
  total_count?: number;
}

export interface ListFoldersResponse {
  folders: CloudinaryFolder[];
  total_count?: number;
}

export interface UploadResponse {
  asset: CloudinaryAsset;
}

export interface DeleteResponse {
  deleted: Record<string, string>;
}

export interface RenameResponse {
  asset: CloudinaryAsset;
}

export interface MoveResponse {
  asset: CloudinaryAsset;
}

// Request types
export interface UploadRequest {
  file: string; // base64 or URL
  folder?: string;
  public_id?: string;
  tags?: string[];
}

export interface DeleteRequest {
  public_ids: string[];
}

export interface RenameRequest {
  from_public_id: string;
  to_public_id: string;
}

export interface MoveRequest {
  public_id: string;
  to_folder: string;
}
