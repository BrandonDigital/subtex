import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { auth } from "@/server/auth";
import { headers } from "next/headers";
import type { CloudinaryAsset, RenameResponse } from "@/types/media";

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
    const { from_public_id, to_public_id } = body;

    if (!from_public_id || !to_public_id) {
      return NextResponse.json(
        { error: "from_public_id and to_public_id are required" },
        { status: 400 }
      );
    }

    const result = await cloudinary.uploader.rename(from_public_id, to_public_id, {
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

    const response: RenameResponse = { asset };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error renaming Cloudinary asset:", error);
    return NextResponse.json(
      { error: "Failed to rename asset" },
      { status: 500 }
    );
  }
}
