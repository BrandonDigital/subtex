import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { auth } from "@/server/auth";
import { headers } from "next/headers";
import type { CloudinaryFolder, ListFoldersResponse } from "@/types/media";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key:
    process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY ||
    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const parentFolder = searchParams.get("folder") || "";

    let result;
    if (parentFolder) {
      result = await cloudinary.api.sub_folders(parentFolder);
    } else {
      result = await cloudinary.api.root_folders();
    }

    const folders: CloudinaryFolder[] = result.folders.map(
      (folder: Record<string, unknown>) => ({
        name: folder.name as string,
        path: folder.path as string,
        external_id: folder.external_id as string | undefined,
      }),
    );

    const response: ListFoldersResponse = {
      folders,
      total_count: result.total_count,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error listing Cloudinary folders:", error);
    return NextResponse.json(
      { error: "Failed to list folders" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { folder } = body;

    if (!folder) {
      return NextResponse.json(
        { error: "Folder path is required" },
        { status: 400 },
      );
    }

    const result = await cloudinary.api.create_folder(folder);

    return NextResponse.json({
      folder: {
        name: result.name,
        path: result.path,
      },
    });
  } catch (error) {
    console.error("Error creating Cloudinary folder:", error);
    return NextResponse.json(
      { error: "Failed to create folder" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { folder } = body;

    if (!folder) {
      return NextResponse.json(
        { error: "Folder path is required" },
        { status: 400 },
      );
    }

    await cloudinary.api.delete_folder(folder);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error deleting Cloudinary folder:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to delete folder";
    // Cloudinary returns an error if folder is not empty
    if (errorMessage.includes("not empty")) {
      return NextResponse.json(
        { error: "Folder is not empty. Delete or move all assets first." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: "Failed to delete folder" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { from_folder, to_folder } = body;

    if (!from_folder || !to_folder) {
      return NextResponse.json(
        { error: "from_folder and to_folder are required" },
        { status: 400 },
      );
    }

    // Cloudinary doesn't have a direct rename folder API
    // We need to:
    // 1. Create the new folder
    // 2. Move all assets from old folder to new folder
    // 3. Delete the old folder

    // First, create the new folder
    await cloudinary.api.create_folder(to_folder);

    // Get all assets in the old folder
    const assets = await cloudinary.api.resources({
      type: "upload",
      prefix: from_folder,
      resource_type: "image",
      max_results: 500,
    });

    // Move each asset to the new folder
    for (const asset of assets.resources) {
      const filename = asset.public_id.split("/").pop();
      const newPublicId = `${to_folder}/${filename}`;
      try {
        await cloudinary.uploader.rename(asset.public_id, newPublicId);
      } catch (e) {
        console.error(`Failed to move asset ${asset.public_id}:`, e);
      }
    }

    // Try to delete the old folder (will fail if not empty)
    try {
      await cloudinary.api.delete_folder(from_folder);
    } catch (e) {
      // Folder might not be empty if there were subfolders
      console.error("Could not delete old folder:", e);
    }

    return NextResponse.json({
      folder: {
        name: to_folder.split("/").pop(),
        path: to_folder,
      },
    });
  } catch (error) {
    console.error("Error renaming Cloudinary folder:", error);
    return NextResponse.json(
      { error: "Failed to rename folder" },
      { status: 500 },
    );
  }
}
