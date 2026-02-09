import { NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { auth } from "@/server/auth";
import { headers } from "next/headers";
import type { DeleteResponse } from "@/types/media";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY || process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function DELETE(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { public_ids } = body;

    if (!public_ids || !Array.isArray(public_ids) || public_ids.length === 0) {
      return NextResponse.json(
        { error: "public_ids array is required" },
        { status: 400 }
      );
    }

    // Cloudinary supports up to 100 assets per delete call
    if (public_ids.length > 100) {
      return NextResponse.json(
        { error: "Maximum 100 assets can be deleted at once" },
        { status: 400 }
      );
    }

    const result = await cloudinary.api.delete_resources(public_ids, {
      resource_type: "image",
    });

    const response: DeleteResponse = {
      deleted: result.deleted,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error deleting Cloudinary assets:", error);
    return NextResponse.json(
      { error: "Failed to delete assets" },
      { status: 500 }
    );
  }
}
