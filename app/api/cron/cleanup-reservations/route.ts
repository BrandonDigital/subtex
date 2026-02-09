import { NextRequest, NextResponse } from "next/server";
import { cleanupExpiredReservations } from "@/server/actions/reservations";

// This endpoint is called by Vercel Cron or can be called manually
// Configure in vercel.json:
// {
//   "crons": [
//     {
//       "path": "/api/cron/cleanup-reservations",
//       "schedule": "* * * * *"
//     }
//   ]
// }

export async function GET(request: NextRequest) {
  try {
    // Verify cron secret if configured (recommended for production)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await cleanupExpiredReservations();

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      releasedCount: result.releasedCount,
      message: `Released ${result.releasedCount} expired reservation(s)`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error in cron cleanup:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// Also support POST for manual triggering
export async function POST(request: NextRequest) {
  return GET(request);
}
