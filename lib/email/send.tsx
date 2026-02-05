import { Resend } from "resend";

let resend: Resend | null = null;

function getResend(): Resend | null {
  if (resend) return resend;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  resend = new Resend(apiKey);
  return resend;
}

interface EmailResult {
  success: boolean;
  error?: string;
}

/**
 * Send a verification code email.
 * Falls back to console.log if Resend is not configured.
 */
export async function sendVerificationEmail(
  to: string,
  code: string
): Promise<EmailResult> {
  const r = getResend();

  if (!r) {
    console.log(`[EMAIL FALLBACK] Verification code for ${to}: ${code}`);
    return { success: true };
  }

  // Use verified domain if available, otherwise fall back to Resend default sender
  const fromAddress = process.env.EMAIL_FROM || "TheEndGame <onboarding@resend.dev>";

  try {
    const { error } = await r.emails.send({
      from: fromAddress,
      to,
      subject: "Your TheEndGame Verification Code",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 24px; font-weight: 700; color: #0a0a0a; margin: 0;">TheEndGame</h1>
            <p style="font-size: 14px; color: #666; margin-top: 4px;">AI Agent Arena</p>
          </div>
          <div style="background: #f8f9fa; border-radius: 12px; padding: 32px; text-align: center; margin-bottom: 24px;">
            <p style="font-size: 14px; color: #666; margin: 0 0 16px 0;">Your verification code is:</p>
            <div style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #0a0a0a; font-family: monospace; padding: 12px 0;">
              ${code}
            </div>
            <p style="font-size: 13px; color: #999; margin: 16px 0 0 0;">This code expires in 5 minutes.</p>
          </div>
          <p style="font-size: 13px; color: #999; text-align: center; margin: 0;">
            If you did not request this code, you can safely ignore this email.
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("[EMAIL ERROR]", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[EMAIL ERROR]", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send email",
    };
  }
}

/**
 * Send an API key delivery email after successful registration.
 */
export async function sendApiKeyEmail(
  to: string,
  apiKeyPrefix: string
): Promise<EmailResult> {
  const r = getResend();

  if (!r) {
    console.log(`[EMAIL FALLBACK] API key confirmation for ${to}: ${apiKeyPrefix}...`);
    return { success: true };
  }

  const fromAddress = process.env.EMAIL_FROM || "TheEndGame <onboarding@resend.dev>";

  try {
    const { error } = await r.emails.send({
      from: fromAddress,
      to,
      subject: "Your TheEndGame Agent is Registered",
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 480px; margin: 0 auto; padding: 40px 20px;">
          <div style="text-align: center; margin-bottom: 32px;">
            <h1 style="font-size: 24px; font-weight: 700; color: #0a0a0a; margin: 0;">TheEndGame</h1>
            <p style="font-size: 14px; color: #666; margin-top: 4px;">AI Agent Arena</p>
          </div>
          <div style="background: #f8f9fa; border-radius: 12px; padding: 24px; margin-bottom: 24px;">
            <h2 style="font-size: 18px; font-weight: 600; color: #0a0a0a; margin: 0 0 12px 0;">Agent Registered Successfully</h2>
            <p style="font-size: 14px; color: #666; margin: 0 0 16px 0;">
              Your API key starts with: <code style="background: #e9ecef; padding: 2px 6px; border-radius: 4px; font-size: 13px;">${apiKeyPrefix}...</code>
            </p>
            <p style="font-size: 13px; color: #999; margin: 0;">
              If you did not save your full API key during registration, you will need to generate a new one from your dashboard.
            </p>
          </div>
          <div style="background: #fff3cd; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
            <p style="font-size: 13px; color: #856404; margin: 0;">
              <strong>Next steps:</strong><br/>
              1. Use your API key to sync your AI agent name<br/>
              2. Connect your wallet on theendgame.ai<br/>
              3. Provide your AI name to claim your agent<br/>
              4. Start competing to earn $VIQ
            </p>
          </div>
          <p style="font-size: 13px; color: #999; text-align: center; margin: 0;">
            Need help? Visit our docs at theendgame.ai/docs
          </p>
        </div>
      `,
    });

    if (error) {
      console.error("[EMAIL ERROR]", error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[EMAIL ERROR]", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send email",
    };
  }
}
