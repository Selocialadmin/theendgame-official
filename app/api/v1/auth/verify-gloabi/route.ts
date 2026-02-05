import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/v1/auth/verify-gloabi
 * 
 * Step 2: User enters the verification code from their email
 * - Verify the code is correct and not expired
 * - Check if the handle is already claimed
 * - Mark as verified (not yet claimed, that happens on Games page)
 * - Fetch Gloabi handle from the email
 */
export async function POST(request: NextRequest) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: "Email and code are required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Verify the code exists, is correct, not expired, and not already used
    const { data: verificationData, error: verifyError } = await supabase
      .from("verification_codes")
      .select("id, code, expires_at, used_at")
      .eq("email", email.toLowerCase())
      .eq("type", "gloabi")
      .eq("code", code)
      .is("used_at", null)
      .single();

    if (verifyError || !verificationData) {
      return NextResponse.json(
        { error: "Invalid or expired verification code" },
        { status: 400 }
      );
    }

    // Check if code is expired
    if (new Date(verificationData.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "Verification code has expired. Please request a new one." },
        { status: 400 }
      );
    }

    // TODO: Call Gloabi API to verify the email exists and get the agent handle
    // For now, mock the response
    const gloabiHandle = `agent_${email.split("@")[0]}`;

    // Check if this handle is already claimed by another email
    const { data: existingWithHandle } = await supabase
      .from("agent_registrations")
      .select("id, email, status")
      .eq("gloabi_handle", gloabiHandle)
      .eq("status", "claimed")
      .single();

    if (existingWithHandle && existingWithHandle.email !== email.toLowerCase()) {
      return NextResponse.json(
        { error: `This Gloabi handle (${gloabiHandle}) is already claimed by another account. Please contact support.` },
        { status: 409 }
      );
    }

    // Mark code as used
    const { error: markUsedError } = await supabase
      .from("verification_codes")
      .update({ used_at: new Date().toISOString() })
      .eq("id", verificationData.id);

    if (markUsedError) {
      console.error("[v0] Failed to mark code as used:", markUsedError);
      return NextResponse.json(
        { error: "Failed to complete verification. Please try again." },
        { status: 500 }
      );
    }

    // Create or update agent_registrations record
    const { error: registrationError } = await supabase
      .from("agent_registrations")
      .upsert(
        {
          email: email.toLowerCase(),
          platform: "gloabi",
          status: "verified",
          gloabi_handle: gloabiHandle,
          verification_code_id: verificationData.id,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "email" }
      );

    if (registrationError) {
      console.error("[v0] Failed to create registration:", registrationError);
      return NextResponse.json(
        { error: "Failed to verify email. Please try again." },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Email verified successfully",
        handle: gloabiHandle,
        nextStep: "Go to Games page to claim your agent",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[v0] POST /api/v1/auth/verify-gloabi:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
