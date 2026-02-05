import { NextRequest, NextResponse } from "next/server";
import { getCorsHeaders, corsResponse } from "@/lib/security/cors";

// Handle CORS preflight
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return corsResponse(origin);
}

/**
 * POST /api/v1/platforms/gloabi/verify
 * 
 * Verify a Gloabi email and return the agent's name from their platform.
 * This ensures the agent name is controlled by Gloabi for identity consistency.
 * 
 * Request body:
 * {
 *   "email": "agent@gloabi.ai"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "agent": {
 *     "id": "gloabi_agent_123",
 *     "name": "GloabiAgentName",
 *     "email": "agent@gloabi.ai"
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json(
        { success: false, error: "Email is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "Invalid email format" },
        { status: 400, headers: corsHeaders }
      );
    }

    // TODO: Replace with actual Gloabi API call
    // This would call the Gloabi API to verify the email and get agent details
    // For now, we'll use the GLOABI_API_KEY environment variable
    
    const gloabiApiKey = process.env.GLOABI_API_KEY;
    const gloabiApiUrl = process.env.GLOABI_API_URL || "https://api.gloabi.com";
    
    if (!gloabiApiKey) {
      // Development fallback - simulate verification
      // In production, this should fail if no API key
      console.warn("[v0] GLOABI_API_KEY not set, using development mode");
      
      // For testing: Accept any email and generate a name from it
      const namePart = email.split("@")[0];
      const sanitizedName = namePart
        .replace(/[^a-zA-Z0-9._-]/g, "")
        .slice(0, 30) || "GloabiAgent";
      
      return NextResponse.json({
        success: true,
        development_mode: true,
        message: "Development mode - Set GLOABI_API_KEY for production",
        agent: {
          id: `gloabi_dev_${Date.now()}`,
          name: sanitizedName,
          email: email,
          platform: "gloabi",
        }
      }, { headers: corsHeaders });
    }

    // Production: Call Gloabi API
    try {
      const gloabiResponse = await fetch(`${gloabiApiUrl}/v1/agents/by-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${gloabiApiKey}`,
        },
        body: JSON.stringify({ email }),
      });

      const gloabiData = await gloabiResponse.json();

      if (!gloabiResponse.ok || !gloabiData.agent) {
        return NextResponse.json(
          { 
            success: false, 
            error: gloabiData.error || "No agent found for this email on Gloabi. Please register on Gloabi first." 
          },
          { status: 404, headers: corsHeaders }
        );
      }

      return NextResponse.json({
        success: true,
        agent: {
          id: gloabiData.agent.id,
          name: gloabiData.agent.name || gloabiData.agent.handle,
          email: email,
          platform: "gloabi",
        }
      }, { headers: corsHeaders });

    } catch (fetchError) {
      console.error("[v0] Gloabi API error:", fetchError);
      return NextResponse.json(
        { success: false, error: "Failed to connect to Gloabi. Please try again later." },
        { status: 503, headers: corsHeaders }
      );
    }

  } catch (error) {
    console.error("[v0] Platform verification error:", error);
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
