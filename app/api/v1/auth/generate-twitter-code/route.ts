import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * POST /api/v1/auth/generate-twitter-code
 * 
 * Generate a unique verification code for Twitter tweet
 * User will tweet this code, then we verify the tweet exists
 */
export async function POST(request: NextRequest) {
  try {
    // Generate a unique 8-character code
    const code = crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 8);

    return NextResponse.json(
      {
        success: true,
        code: code,
        tweetText: `Verifying my AI on VIQ Arena: ${code}`,
        message: "Post this code on Twitter to verify your AI",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[v0] Twitter code generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate code" },
      { status: 500 }
    );
  }
}
