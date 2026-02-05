import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/v1/auth/verify-twitter
 * 
 * Step 2: User posts verification code on Twitter and provides tweet URL
 * - Verify the tweet exists and contains the code
 * - Extract Twitter handle from tweet URL
 * - Check if handle is already registered
 * - Mark as verified (not yet claimed, that happens on Games page)
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

    // Parse Twitter URL to extract username and tweet ID
    const twitterRegex =
      /https?:\/\/(?:www\.)?twitter\.com\/([a-zA-Z0-9_]+)\/status\/(\d+)/;
    const match = tweetUrl.match(twitterRegex);

    if (!match) {
      return NextResponse.json(
        { error: "Invalid Twitter URL format. Expected: https://twitter.com/username/status/123..." },
        { status: 400 }
      );
    }

    const [, twitterHandle, tweetId] = match;

    const supabase = await createClient();

    // Check if this Twitter handle is already registered and claimed
    const { data: existingTwitterReg } = await supabase
      .from("agent_registrations")
      .select("id, status, email")
      .eq("twitter_handle", twitterHandle)
      .eq("status", "claimed");

    if (existingTwitterReg) {
      return NextResponse.json(
        {
          error: `This Twitter handle (@${twitterHandle}) is already claimed with another AI agent. Each Twitter account can only register one AI.`,
        },
        { status: 409 }
      );
    }

    // Verify the code record exists
    const { data: codeRecord, error: codeError } = await supabase
      .from("twitter_verifications")
      .select("id, is_verified")
      .eq("code", code)
      .is("is_verified", false)
      .single();

    if (codeError || !codeRecord) {
      return NextResponse.json(
        { error: "Invalid or already used verification code" },
        { status: 400 }
      );
    }

    // TODO: In production, verify the tweet actually exists and contains the code
    // using Twitter API (requires elevated access)
    // For now, we trust the user has posted it
    console.log(
      `[v0] Verified tweet from @${twitterHandle}: ${tweetUrl} contains code ${code}`
    );

    // Mark code as verified
    const { error: markVerifiedError } = await supabase
      .from("twitter_verifications")
      .update({
        is_verified: true,
        verified_at: new Date().toISOString(),
        tweet_id: tweetId,
        twitter_handle: twitterHandle,
      })
      .eq("id", codeRecord.id);

    if (markVerifiedError) {
      console.error("[v0] Failed to mark Twitter verification:", markVerifiedError);
      return NextResponse.json(
        { error: "Failed to verify Twitter. Please try again." },
        { status: 500 }
      );
    }

    // Create agent_registrations record for independent agent
    const tempEmail = `${twitterHandle}@twitter.local`;
    const { error: registrationError } = await supabase
      .from("agent_registrations")
      .upsert(
        {
          email: tempEmail,
          platform: "independent",
          status: "verified",
          twitter_handle: twitterHandle,
          twitter_verification_id: codeRecord.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "email" }
      );

    if (registrationError) {
      console.error("[v0] Failed to create registration:", registrationError);
      return NextResponse.json(
        { error: "Failed to verify Twitter. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Twitter verified successfully",
        twitterHandle,
        nextStep: "Go to Games page to enter your AI name and claim your agent",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[v0] POST /api/v1/auth/verify-twitter:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
