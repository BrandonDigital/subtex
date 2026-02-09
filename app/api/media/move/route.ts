import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { auth } from "@/server/auth";
import { headers } from "next/headers";
import type { CloudinaryAsset, MoveResponse } from "@/types/media";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function PATCH(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { public_id, to_folder } = body;

    if (!public_id || to_folder === undefined) {
      return NextResponse.json(
        { error: "public_id and to_folder are required" },
        { status: 400 }
      );
    }

    // Extract filename from public_id
    const filename = public_id.split("/").pop();
    
    // Construct new public_id with destination folder
    const newPublicId = to_folder ? `${to_folder}/${filename}` : filename;

    const result = await cloudinary.uploader.rename(public_id, newPublicId, {
      resource_type: "image",
    });

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

    const response: MoveResponse = { asset };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error moving Cloudinary asset:", error);
    return NextResponse.json(
      { error: "Failed to move asset" },
      { status: 500 }
    );
  }
}
