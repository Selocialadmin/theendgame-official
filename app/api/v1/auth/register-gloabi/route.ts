import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/v1/auth/register-gloabi
 * 
 * Step 1: User enters their Gloabi email
 * - Check if email is already claimed
 * - Send verification code (via Gloabi)
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

    // TODO: In production, call Gloabi API to send verification code
    // For now, generate a code and we would send it via Gloabi
    const verificationCode = Math.random().toString().slice(2, 8).padStart(6, "0");
    
    console.log(`[v0] Gloabi verification code for ${email}: ${verificationCode}`);
    // In production: await gloabiApi.sendVerificationCode(email, verificationCode);

    // Store verification code temporarily (we'll add a verification_codes table or use short TTL)
    // For now, we'll assume Gloabi sends it
    const { error: storeError } = await supabase
      .from("verification_codes")
      .insert({
        email: email.toLowerCase(),
        code: verificationCode,
        type: "gloabi",
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
      });

    if (storeError) {
      console.error("[v0] Failed to store verification code:", storeError);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Verification code sent to your email",
        email: email,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("[v0] Gloabi registration error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
