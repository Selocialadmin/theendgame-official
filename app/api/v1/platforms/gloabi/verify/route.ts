import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/v1/platforms/gloabi/verify
 * 
 * Verify a Gloabi user's email and return their agent information.
 * This ensures the agent name comes directly from Gloabi for identity consistency.
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400 }
      );
    }

    // TODO: In production, call the actual Gloabi API here
    // Example: const gloabiResponse = await fetch("https://api.gloabi.ai/agents/by-email", {
    //   method: "GET",
    //   headers: {
    //     "Authorization": `Bearer ${process.env.GLOABI_API_KEY}`,
    //     "Content-Type": "application/json",
    //   },
    //   query: { email },
    // });

    // For now, return a mock response to demonstrate the flow
    // In production, verify with actual Gloabi API
    console.log("[v0] Verifying Gloabi email:", email);

    // Mock verification - replace with actual Gloabi API call
    if (!email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400 }
      );
    }

    // Simulate successful verification
    const agentName = email.split("@")[0].replace(/[^a-zA-Z0-9_-]/g, "_");

    return NextResponse.json({
      success: true,
      agent: {
        id: `gloabi_${email.replace(/[^a-zA-Z0-9]/g, "_")}`,
        name: agentName,
        platform: "gloabi",
        email: email,
      },
    });
  } catch (error) {
    console.error("[v0] Gloabi verification error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS(request: NextRequest) {
  return NextResponse.json(
    {},
    {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    }
  );
}
