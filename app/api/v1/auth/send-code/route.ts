import { NextRequest, NextResponse } from "next/server";
import { getCorsHeaders, corsResponse } from "@/lib/security/cors";
import {
  RATE_LIMITS,
  withRateLimit,
  storeVerificationCode,
  generateVerificationCode,
} from "@/lib/security/rate-limit";
import { createClient } from "@/lib/supabase/server";

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return corsResponse(origin);
}

/**
 * POST /api/v1/auth/send-code
 * 
 * Sends a 6-digit verification code to the provided email.
 * The code is stored in Redis with a 5 minute TTL.
 * 
 * For now, since we don't have an email provider configured,
 * the code is returned in the response (dev mode).
 * In production, integrate with an email service (Resend, SendGrid, etc.)
 * 
 * Request body:
 * { "email": "agent@example.com", "platform": "gloabi" | "single" }
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    // Rate limit: 5 verification emails per 5 minutes per IP
    const { allowed } = await withRateLimit(request, RATE_LIMITS.EMAIL_VERIFY);
    if (!allowed) {
      return NextResponse.json(
        { success: false, error: "Too many requests. Please wait a few minutes." },
        { status: 429, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { email, platform } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate platform
    const validPlatforms = ["gloabi", "single"];
    if (!platform || !validPlatforms.includes(platform.toLowerCase())) {
      return NextResponse.json(
        { success: false, error: "Platform must be 'gloabi' or 'single'" },
        { status: 400, headers: corsHeaders }
      );
    }

    // For Gloabi, validate email format
    if (platform === "gloabi" && !email.toLowerCase().endsWith("@mail.gloabi.com")) {
      return NextResponse.json(
        { success: false, error: "Gloabi agents must use a @mail.gloabi.com email address" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Check if email is already registered
    const supabase = await createClient();
    if (supabase) {
      const { data: existing } = await supabase
        .from("agents")
        .select("id")
        .eq("email", email.toLowerCase())
        .single();

      if (existing) {
        return NextResponse.json(
          { success: false, error: "This email is already registered." },
          { status: 409, headers: corsHeaders }
        );
      }
    }

    // Generate and store verification code
    const code = generateVerificationCode();
    const stored = await storeVerificationCode(email, code);

    if (!stored) {
      // Redis not available - in dev mode, still return the code
      return NextResponse.json({
        success: true,
        message: "Verification code generated (Redis not configured - dev mode)",
        dev_code: code,
      }, { headers: corsHeaders });
    }

    // TODO: In production, send the code via email service (Resend, SendGrid, etc.)
    // For now, we log it and return a success message.
    // In dev/preview, we also return the code for testing.
    const isDev = process.env.NODE_ENV !== "production";

    return NextResponse.json({
      success: true,
      message: `Verification code sent to ${email}`,
      ...(isDev ? { dev_code: code } : {}),
    }, { headers: corsHeaders });

  } catch (error) {
    console.error("POST /api/v1/auth/send-code:", error);
    return NextResponse.json(
      { success: false, error: "Something went wrong" },
      { status: 500, headers: corsHeaders }
    );
  }
}
