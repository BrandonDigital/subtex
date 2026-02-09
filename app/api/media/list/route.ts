import { NextRequest, NextResponse } from "next/server";
import { v2 as cloudinary } from "cloudinary";
import { auth } from "@/server/auth";
import { headers } from "next/headers";
import type { CloudinaryAsset, ListAssetsResponse } from "@/types/media";

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
    const folder = searchParams.get("folder") || "";
    const nextCursor = searchParams.get("next_cursor") || undefined;
    const maxResults = parseInt(searchParams.get("max_results") || "30", 10);

    // Use Search API for more reliable folder-based browsing
    // This works better with DAM-uploaded assets
    let searchExpression = "resource_type:image";
    if (folder) {
      // Use folder for exact folder match (not recursive)
      searchExpression += ` AND folder="${folder}"`;
    }

    const searchQuery = cloudinary.search
      .expression(searchExpression)
      .sort_by("created_at", "desc")
      .max_results(maxResults)
      .with_field("tags")
      .with_field("context");

    if (nextCursor) {
      searchQuery.next_cursor(nextCursor);
    }

    const result = await searchQuery.execute();

    // Filter to ensure exact folder match (not parent folders or subfolders)
    const filteredResources = (result.resources || []).filter(
      (resource: Record<string, unknown>) => {
        const assetFolder =
          (resource.asset_folder as string) ||
          (resource.folder as string) ||
          "";
        return assetFolder === folder;
      },
    );

    const assets: CloudinaryAsset[] = filteredResources.map(
      (resource: Record<string, unknown>) => ({
        public_id: resource.public_id as string,
        secure_url: resource.secure_url as string,
        url: resource.url as string,
        format: resource.format as string,
        resource_type: resource.resource_type as "image" | "video" | "raw",
        width: resource.width as number,
        height: resource.height as number,
        bytes: resource.bytes as number,
        created_at: resource.created_at as string,
        folder:
          (resource.asset_folder as string) ||
          (resource.folder as string) ||
          "",
        filename: (resource.public_id as string).split("/").pop() || "",
        display_name: resource.display_name as string | undefined,
        tags: resource.tags as string[] | undefined,
      }),
    );

    const response: ListAssetsResponse = {
      assets,
      next_cursor: result.next_cursor,
      total_count: result.total_count,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error listing Cloudinary assets:", error);
    return NextResponse.json(
      { error: "Failed to list assets" },
      { status: 500 },
    );
  }
}
