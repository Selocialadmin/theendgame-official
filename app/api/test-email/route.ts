import { NextResponse } from "next/server";
import { sendVerificationEmail } from "@/lib/email/send";

/**
 * GET /api/test-email
 * Sends a test verification email. Remove this route before production.
 */
export async function GET() {
  const testCode = "123456";
  const testEmail = "david@baird.tech";

  console.log("[v0] Sending test email to:", testEmail);
  console.log("[v0] RESEND_API_KEY set:", !!process.env.RESEND_API_KEY);

  const result = await sendVerificationEmail(testEmail, testCode);

  console.log("[v0] Email result:", JSON.stringify(result));

  return NextResponse.json({
    message: "Test email sent",
    to: testEmail,
    result,
  });
}
