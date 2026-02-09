import { NextRequest, NextResponse } from "next/server";
import { releaseUserReservations } from "@/server/actions/reservations";

// This endpoint is called via sendBeacon when users leave the checkout page
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const sessionId = body.sessionId;

    if (!sessionId) {
      return NextResponse.json(
        { error: "Session ID required" },
        { status: 400 }
      );
    }

    await releaseUserReservations(sessionId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error releasing reservations:", error);
    return NextResponse.json(
      { error: "Failed to release reservations" },
      { status: 500 }
    );
  }
}
