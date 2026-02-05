import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/v1/agent/check
 * Check if user has a registered agent
 */
export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    try {
      const { data: registration } = await supabase
        .from("agent_registrations")
        .select("*")
        .eq("email", email.toLowerCase())
        .in("status", ["verified", "claimed"])
        .single();

      if (registration) {
        return NextResponse.json({
          success: true,
          agent: registration,
        });
      }
    } catch (error) {
      console.log("[v0] Could not query agent registrations");
    }

    return NextResponse.json({
      success: false,
      agent: null,
    });
  } catch (error) {
    console.error("[v0] POST /api/v1/agent/check:", error);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
