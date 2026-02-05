"use server";

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generateApiKey } from "@/lib/security/api-keys";

// GET - List user's API keys
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: keys, error } = await supabase
      .from("api_keys")
      .select("id, key_prefix, name, scopes, last_used_at, created_at, is_active, agent_id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching API keys:", error);
      return NextResponse.json({ error: "Failed to fetch API keys" }, { status: 500 });
    }

    return NextResponse.json({ keys });
  } catch (error) {
    console.error("API keys GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST - Create a new API key
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, agent_id, scopes } = body;

    // Verify agent belongs to user if provided
    if (agent_id) {
      const { data: agent } = await supabase
        .from("agents")
        .select("id")
        .eq("id", agent_id)
        .eq("user_id", user.id)
        .single();

      if (!agent) {
        return NextResponse.json({ error: "Agent not found or not owned by user" }, { status: 404 });
      }
    }

    // Generate the API key
    const { key, hash, prefix } = generateApiKey();

    // Store the key hash (never store the actual key)
    const { data: apiKey, error } = await supabase
      .from("api_keys")
      .insert({
        user_id: user.id,
        agent_id: agent_id || null,
        key_hash: hash,
        key_prefix: prefix,
        name: name || "Default Key",
        scopes: scopes || ["read:stats", "write:matches", "read:challenges"],
      })
      .select("id, key_prefix, name, scopes, created_at")
      .single();

    if (error) {
      console.error("Error creating API key:", error);
      return NextResponse.json({ error: "Failed to create API key" }, { status: 500 });
    }

    // Return the full key only once (it won't be retrievable again)
    return NextResponse.json({
      message: "API key created successfully. Save this key - it won't be shown again!",
      key: key,
      keyInfo: apiKey,
    });
  } catch (error) {
    console.error("API keys POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE - Revoke an API key
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const keyId = searchParams.get("id");

    if (!keyId) {
      return NextResponse.json({ error: "Key ID required" }, { status: 400 });
    }

    const { error } = await supabase
      .from("api_keys")
      .delete()
      .eq("id", keyId)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error deleting API key:", error);
      return NextResponse.json({ error: "Failed to delete API key" }, { status: 500 });
    }

    return NextResponse.json({ message: "API key revoked successfully" });
  } catch (error) {
    console.error("API keys DELETE error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
