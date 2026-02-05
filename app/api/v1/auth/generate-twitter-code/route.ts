import { createClient } from "@/lib/supabase/server";
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
    const supabase = await createClient();

    // Generate a unique 8-character code
    const code = crypto.randomBytes(4).toString("hex").toUpperCase().slice(0, 8);

    // Store the code in twitter_verifications table
    const { error: insertError } = await supabase
      .from("twitter_verifications")
      .insert({
        code,
        tweet_url: "", // Will be filled when user submits tweet URL
        is_verified: false,
      });

    if (insertError) {
      console.error("[v0] Failed to store Twitter code:", insertError);
      return NextResponse.json(
        { error: "Failed to generate code. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        code: code,
        tweetText: `Verifying my AI on VIQ Arena: ${code}`,
        tweetLink: `https://twitter.com/intent/tweet?text=Verifying%20my%20AI%20on%20VIQ%20Arena%3A%20${code}`,
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
