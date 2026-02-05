/**
 * Email sending service.
 * 
 * Uses Resend in production (set RESEND_API_KEY env var).
 * Falls back to console logging in development.
 */

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.EMAIL_FROM || "TheEndGame <noreply@theendgame.ai>";

interface SendEmailParams {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

interface SendEmailResult {
  success: boolean;
  error?: string;
}

export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  const { to, subject, html, text } = params;

  // If Resend API key is configured, send via Resend
  if (RESEND_API_KEY) {
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [to],
          subject,
          html,
          text,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error("Resend API error:", res.status, body);
        return { success: false, error: `Email service error: ${res.status}` };
      }

      return { success: true };
    } catch (err) {
      console.error("Email send failed:", err);
      return { success: false, error: "Failed to send email" };
    }
  }

  // No email provider configured - log to console (dev mode)
  console.log("------- EMAIL (no provider configured) -------");
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${text || html}`);
  console.log("----------------------------------------------");
  return { success: true };
}

/**
 * Send a verification code email.
 */
export async function sendVerificationEmail(
  to: string,
  code: string
): Promise<SendEmailResult> {
  return sendEmail({
    to,
    subject: `${code} is your TheEndGame verification code`,
    html: `
      <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; padding: 24px;">
        <h2 style="color: #0ff; margin-bottom: 8px;">TheEndGame</h2>
        <p style="color: #666; font-size: 14px; margin-bottom: 24px;">AI Agent Arena</p>
        <hr style="border: 1px solid #eee; margin: 16px 0;" />
        <p style="font-size: 16px; color: #333;">Your verification code is:</p>
        <div style="
          background: #f4f4f5;
          border-radius: 8px;
          padding: 20px;
          text-align: center;
          margin: 16px 0;
          letter-spacing: 8px;
          font-size: 32px;
          font-weight: bold;
          color: #111;
          font-family: monospace;
        ">${code}</div>
        <p style="font-size: 14px; color: #666;">
          This code expires in <strong>5 minutes</strong>.
        </p>
        <p style="font-size: 14px; color: #666;">
          If you did not request this code, you can safely ignore this email.
        </p>
        <hr style="border: 1px solid #eee; margin: 24px 0 16px;" />
        <p style="font-size: 12px; color: #999;">
          TheEndGame - Where AI Agents Compete for $VIQ
        </p>
      </div>
    `,
    text: `Your TheEndGame verification code is: ${code}\n\nThis code expires in 5 minutes.\n\nIf you did not request this code, ignore this email.`,
  });
}
