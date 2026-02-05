import { NextRequest, NextResponse } from "next/server";
import { sendVerificationEmail } from "@/lib/email/send";

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams.get("email");
    if (!email) {
      return NextResponse.json({ error: "Email param required" });
    }

    console.log("[v0] TEST EMAIL: About to send test email to:", email);
    console.log("[v0] TEST EMAIL: RESEND_API_KEY env:", !!process.env.RESEND_API_KEY, "length:", process.env.RESEND_API_KEY?.length ?? 0);
    console.log("[v0] TEST EMAIL: EMAIL_FROM env:", process.env.EMAIL_FROM);
    
    const result = await sendVerificationEmail(email, "123456");
    
    console.log("[v0] TEST EMAIL: Result:", JSON.stringify(result));
    
    return NextResponse.json({ 
      success: true,
      result,
      apiKeyPresent: !!process.env.RESEND_API_KEY,
      emailFrom: process.env.EMAIL_FROM
    });
  } catch (err) {
    console.error("[v0] TEST EMAIL ERROR:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
