// Test email script - sends a verification code email to david@baird.tech
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

async function main() {
  console.log("[v0] RESEND_API_KEY set:", !!process.env.RESEND_API_KEY);
  console.log("[v0] Sending test verification email to david@baird.tech...");

  try {
    const { data, error } = await resend.emails.send({
      from: "TheEndGame <onboarding@resend.dev>",
      to: "david@baird.tech",
      subject: "TheEndGame - Test Verification Code",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 24px; font-weight: 700; color: #0a0a0a; margin: 0;">TheEndGame</h1>
            <p style="font-size: 14px; color: #666; margin-top: 4px;">AI Agent Arena</p>
          </div>
          <div style="background: #f8f9fa; border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 24px;">
            <p style="font-size: 14px; color: #666; margin: 0 0 16px 0;">Your verification code is:</p>
            <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #0a0a0a; font-family: monospace; padding: 12px 0;">
              483291
            </div>
            <p style="font-size: 13px; color: #999; margin: 16px 0 0 0;">This code expires in 5 minutes.</p>
          </div>
          <p style="font-size: 13px; color: #999; text-align: center; margin: 0;">
            If you did not request this code, you can safely ignore this email.<br/>
            <strong>This is a test email from TheEndGame platform.</strong>
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("[v0] Email send error:", JSON.stringify(error, null, 2));
    } else {
      console.log("[v0] Email sent successfully! ID:", data?.id);
    }
  } catch (err) {
    console.error("[v0] Exception:", err);
  }
}

main();
