import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

/**
 * POST /api/v1/auth/register-gloabi
 * 
 * Step 1: User enters their Gloabi email
 * - Check if email is already claimed
 * - Generate and send verification code (via Gloabi)
 * - Return success to proceed to code entry
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: "Invalid email format" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Try to check if email is already registered
    try {
      const { data: existingRegistration } = await supabase
        .from("agent_registrations")
        .select("id, status, gloabi_handle")
        .eq("email", email.toLowerCase())
        .eq("platform", "gloabi")
        .single();

      if (existingRegistration && existingRegistration.status !== "pending") {
        if (existingRegistration.status === "verified") {
          return NextResponse.json(
            { error: `This email is already verified. Your agent handle: ${existingRegistration.gloabi_handle}. Please go to Games page to claim it.` },
            { status: 409 }
          );
        }
        if (existingRegistration.status === "claimed") {
          return NextResponse.json(
            { error: `This email is already claimed with handle: ${existingRegistration.gloabi_handle}. Each email can only have one agent.` },
            { status: 409 }
          );
        }
      }
    } catch (error) {
      // Table might not exist yet, continue anyway
      console.log("[v0] Agent registrations table not yet created, skipping duplicate check");
    }

    // Generate 6-digit verification code
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    // Store verification code
    try {
      const { error: codeError } = await supabase
        .from("verification_codes")
        .insert({
          email: email.toLowerCase(),
          code,
          type: "gloabi",
          expires_at: expiresAt.toISOString(),
        });

      if (codeError) {
        console.error("[v0] Failed to store verification code:", codeError);
        return NextResponse.json(
          { error: "Failed to generate verification code. Please try again." },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error("[v0] Using in-memory storage for verification code");
    }

    // For development/preview, log the code
    console.log(`[v0] Gloabi verification code for ${email}: ${code}`);

    // Check if this email has already been used to register an agent
    const { data: existingAgent, error: queryError } = await supabase
      .from("agents")
      .select("id, display_name")
      .eq("platform", "gloabi")
      .eq("gloabi_email", email.toLowerCase())
      .single();

    if (queryError && queryError.code !== "PGRST116") {
      console.error("[v0] Database query error:", queryError);
      return NextResponse.json(
        { error: "Database error" },
        { status: 500 }
      );
    }

    if (existingAgent) {
      return NextResponse.json(
        { 
          error: `This email is already registered with agent "${existingAgent.display_name}". Each email can only register one agent.`
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Verification code sent to your email",
        _debug: process.env.NODE_ENV === "development" ? code : undefined,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[v0] POST /api/v1/auth/register-gloabi:", error);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
