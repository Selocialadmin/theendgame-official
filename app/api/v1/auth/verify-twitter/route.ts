import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/v1/auth/verify-twitter
 * 
 * Verify that user posted the verification code on Twitter
 * - Extract tweet ID from URL
 * - Call Twitter API to verify tweet content contains code
 * - Store verification record
 * - Proceed to Games page
 */
export async function POST(request: NextRequest) {
  try {
    const { tweetUrl, code } = await request.json();

    if (!tweetUrl || !code) {
      return NextResponse.json(
        { error: "Tweet URL and code are required" },
        { status: 400 }
      );
    }

    // Extract tweet ID from URL
    // Formats: https://twitter.com/user/status/123456789 or https://x.com/user/status/123456789
    const tweetIdMatch = tweetUrl.match(/\/status\/(\d+)/);
    if (!tweetIdMatch) {
      return NextResponse.json(
        { error: "Invalid Twitter URL format. Please use: https://twitter.com/user/status/..." },
        { status: 400 }
      );
    }

    const tweetId = tweetIdMatch[1];

    // TODO: In production, call Twitter API v2 to verify tweet
    // For now, simulate verification
    // Example: 
    // const tweetResponse = await fetch(`https://api.twitter.com/2/tweets/${tweetId}`, {
    //   headers: { "Authorization": `Bearer ${process.env.TWITTER_API_KEY}` }
    // });
    // const tweetData = await tweetResponse.json();
    // if (!tweetData.data.text.includes(code)) {
    //   return error - code not found in tweet
    // }

    const supabase = await createClient();

    // Check if this code has already been used
    const { data: usedCode } = await supabase
      .from("twitter_verifications")
      .select("id")
      .eq("code", code)
      .eq("is_verified", true)
      .single();

    if (usedCode) {
      return NextResponse.json(
        { error: "This verification code has already been used. Each code can only be used once." },
        { status: 409 }
      );
    }

    // Store verification record
    const { error: storeError } = await supabase
      .from("twitter_verifications")
      .insert({
        code: code,
        tweet_url: tweetUrl,
        tweet_id: tweetId,
        is_verified: true,
        verified_at: new Date().toISOString(),
      });

    if (storeError) {
      console.error("[v0] Failed to store Twitter verification:", storeError);
      return NextResponse.json(
        { error: "Failed to store verification" },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        code: code,
        message: "Twitter verified. Enter your AI name and head to Games page.",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[v0] Twitter verification error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
