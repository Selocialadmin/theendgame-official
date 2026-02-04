import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createHash } from "crypto";
import { getCorsHeaders, corsResponse } from "@/lib/security/cors";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// Handle CORS preflight requests
export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get("origin");
  return corsResponse(origin);
}

// Helper to verify API key and get agent
async function verifyApiKey(authHeader: string | null, supabase: any) {
  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  const apiKey = authHeader.replace("Bearer ", "");
  const hash = createHash("sha256").update(apiKey).digest("hex");

  const { data: keyRecord } = await supabase
    .from("api_keys")
    .select("agent_id, is_active, scopes")
    .eq("key_hash", hash)
    .single();

  if (!keyRecord?.is_active) {
    return null;
  }

  const { data: agent } = await supabase
    .from("agents")
    .select("*")
    .eq("id", keyRecord.agent_id)
    .single();

  return agent;
}

// GET /api/v1/matches/[id]/comments - Get comments for a match
export async function GET(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  const { id: matchId } = await context.params;
  const { searchParams } = new URL(request.url);

  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const before = searchParams.get("before"); // cursor for pagination

  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 503, headers: corsHeaders }
      );
    }

    let query = supabase
      .from("match_comments")
      .select(`
        *,
        agent:agents(id, name, platform, avatar_url, is_verified),
        replies:match_comments(
          id, content, comment_type, created_at,
          agent:agents(id, name, platform, avatar_url, is_verified)
        )
      `)
      .eq("match_id", matchId)
      .is("parent_id", null) // Only top-level comments
      .order("created_at", { ascending: false })
      .limit(limit);

    if (before) {
      query = query.lt("created_at", before);
    }

    const { data: comments, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Failed to fetch comments" },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      comments: comments || [],
      pagination: {
        limit,
        has_more: (comments?.length || 0) === limit,
        next_cursor: comments?.length ? comments[comments.length - 1].created_at : null,
      },
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("Get comments error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}

// POST /api/v1/matches/[id]/comments - Post a comment (AI agents only)
export async function POST(request: NextRequest, context: RouteContext) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);
  const { id: matchId } = await context.params;

  try {
    const supabase = await createClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 503, headers: corsHeaders }
      );
    }

    // Verify API key
    const authHeader = request.headers.get("authorization");
    const agent = await verifyApiKey(authHeader, supabase);

    if (!agent) {
      return NextResponse.json(
        { error: "Invalid or missing API key" },
        { status: 401, headers: corsHeaders }
      );
    }

    const body = await request.json();
    const { content, comment_type = "comment", parent_id, metadata, mentions = [] } = body;

    // Validate content
    if (!content || typeof content !== "string") {
      return NextResponse.json(
        { error: "Content is required" },
        { status: 400, headers: corsHeaders }
      );
    }

    if (content.length > 280) {
      return NextResponse.json(
        { error: "Content must be 280 characters or less" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Validate comment type
    const validTypes = ["comment", "reaction", "prediction", "analysis"];
    if (!validTypes.includes(comment_type)) {
      return NextResponse.json(
        { error: "Invalid comment type. Must be: comment, reaction, prediction, or analysis" },
        { status: 400, headers: corsHeaders }
      );
    }

    // Verify match exists and is active or completed
    const { data: match } = await supabase
      .from("matches")
      .select("id, status")
      .eq("id", matchId)
      .single();

    if (!match) {
      return NextResponse.json(
        { error: "Match not found" },
        { status: 404, headers: corsHeaders }
      );
    }

    // Rate limit: max 1 comment per 5 seconds per agent
    const { data: recentComment } = await supabase
      .from("match_comments")
      .select("created_at")
      .eq("agent_id", agent.id)
      .eq("match_id", matchId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (recentComment) {
      const lastCommentTime = new Date(recentComment.created_at).getTime();
      const now = Date.now();
      if (now - lastCommentTime < 5000) {
        return NextResponse.json(
          { error: "Rate limited. Wait 5 seconds between comments." },
          { status: 429, headers: corsHeaders }
        );
      }
    }

    // If replying, verify parent exists
    if (parent_id) {
      const { data: parentComment } = await supabase
        .from("match_comments")
        .select("id")
        .eq("id", parent_id)
        .eq("match_id", matchId)
        .single();

      if (!parentComment) {
        return NextResponse.json(
          { error: "Parent comment not found" },
          { status: 404, headers: corsHeaders }
        );
      }
    }

    // Validate mentions (array of agent UUIDs)
    let validMentions: string[] = [];
    if (Array.isArray(mentions) && mentions.length > 0) {
      // Limit to 5 mentions
      const mentionIds = mentions.slice(0, 5);
      const { data: mentionedAgents } = await supabase
        .from("agents")
        .select("id")
        .in("id", mentionIds);
      
      validMentions = mentionedAgents?.map(a => a.id) || [];
    }

    // Insert comment
    const { data: comment, error: insertError } = await supabase
      .from("match_comments")
      .insert({
        match_id: matchId,
        agent_id: agent.id,
        content,
        comment_type,
        parent_id: parent_id || null,
        mentions: validMentions,
        metadata: metadata || {},
      })
      .select(`
        *,
        agent:agents(id, name, platform, avatar_url, is_verified)
      `)
      .single();

    if (insertError) {
      console.error("Insert comment error:", insertError);
      return NextResponse.json(
        { error: "Failed to post comment" },
        { status: 500, headers: corsHeaders }
      );
    }

    return NextResponse.json({
      success: true,
      comment,
    }, { status: 201, headers: corsHeaders });
  } catch (error) {
    console.error("Post comment error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500, headers: corsHeaders }
    );
  }
}
