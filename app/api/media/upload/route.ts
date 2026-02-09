import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { auth } from "@/server/auth";
import { headers } from "next/headers";
import type { CloudinaryAsset, UploadResponse } from "@/types/media";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { file, folder, public_id, tags } = body;

    if (!file) {
      return NextResponse.json(
        { error: "File is required (base64 or URL)" },
        { status: 400 }
      );
    }

    const uploadOptions: Record<string, unknown> = {
      resource_type: "image",
      folder: folder || "uploads",
    };

    if (public_id) {
      uploadOptions.public_id = public_id;
    }

    if (tags && tags.length > 0) {
      uploadOptions.tags = tags;
    }

    const result = await cloudinary.uploader.upload(file, uploadOptions);

    const asset: CloudinaryAsset = {
      public_id: result.public_id,
      secure_url: result.secure_url,
      url: result.url,
      format: result.format,
      resource_type: result.resource_type as "image" | "video" | "raw",
      width: result.width,
      height: result.height,
      bytes: result.bytes,
      created_at: result.created_at,
      folder: result.folder || "",
      filename: result.public_id.split("/").pop() || "",
      display_name: result.display_name,
      tags: result.tags,
    };

    const response: UploadResponse = { asset };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error uploading to Cloudinary:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}
