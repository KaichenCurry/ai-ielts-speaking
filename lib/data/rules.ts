import type {
  BadCaseItem,
  BadCaseRecord,
  PromptVersion,
  PromptVersionRecord,
  PromptVersionStatus,
  BadCaseStatus,
} from "@/lib/types";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { promptVersions as mockPromptVersions } from "@/lib/mock-data";

function mapPromptVersionRecord(record: PromptVersionRecord): PromptVersion {
  return {
    id: record.id,
    name: record.name,
    description: record.description,
    status: record.status,
    updatedAt: record.updated_at,
  };
}

function mapBadCaseRecord(record: BadCaseRecord): BadCaseItem {
  return {
    id: record.id,
    sessionId: record.session_id,
    promptVersionId: record.prompt_version_id,
    reason: record.reason,
    status: record.status,
    createdAt: record.created_at,
  };
}

export async function listPromptVersions(): Promise<PromptVersion[]> {
  if (!isSupabaseConfigured()) {
    return mockPromptVersions;
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("prompt_versions")
    .select("*")
    .order("updated_at", { ascending: false });

  if (error) {
    console.error(error);
    return mockPromptVersions;
  }

  if (!data || data.length === 0) {
    return mockPromptVersions;
  }

  return (data as PromptVersionRecord[]).map(mapPromptVersionRecord);
}

export async function createPromptVersion(input: {
  name: string;
  description: string;
  status: PromptVersionStatus;
}) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Rule version actions require database connectivity.");
  }

  const supabase = createSupabaseServerClient();
  const now = new Date().toISOString();
  const id = `prompt-${Date.now()}`;

  if (input.status === "current") {
    const { error: demoteError } = await supabase
      .from("prompt_versions")
      .update({ status: "archived", updated_at: now })
      .eq("status", "current");

    if (demoteError) {
      throw new Error(`Failed to demote current prompt version: ${demoteError.message}`);
    }
  }

  const { error } = await supabase.from("prompt_versions").insert({
    id,
    name: input.name,
    description: input.description,
    status: input.status,
    created_at: now,
    updated_at: now,
  });

  if (error) {
    throw new Error(`Failed to create prompt version: ${error.message}`);
  }
}

export async function setCurrentPromptVersion(id: string) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Rule version actions require database connectivity.");
  }

  const supabase = createSupabaseServerClient();
  const now = new Date().toISOString();
  const { error: demoteError } = await supabase
    .from("prompt_versions")
    .update({ status: "archived", updated_at: now })
    .eq("status", "current");

  if (demoteError) {
    throw new Error(`Failed to clear current prompt version: ${demoteError.message}`);
  }

  const { error } = await supabase
    .from("prompt_versions")
    .update({ status: "current", updated_at: now })
    .eq("id", id);

  if (error) {
    throw new Error(`Failed to set current prompt version: ${error.message}`);
  }
}

export async function listBadCasesBySessionId(sessionId: string): Promise<BadCaseItem[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("bad_cases")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return [];
  }

  if (!data || data.length === 0) {
    return [];
  }

  return (data as BadCaseRecord[]).map(mapBadCaseRecord);
}

export async function createBadCase(input: {
  sessionId: string;
  promptVersionId?: string;
  reason: string;
}) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Bad case actions require database connectivity.");
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("bad_cases").insert({
    id: `badcase-${Date.now()}`,
    session_id: input.sessionId,
    prompt_version_id: input.promptVersionId || null,
    reason: input.reason,
    status: "open",
    created_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to create bad case: ${error.message}`);
  }
}

export async function updateBadCaseStatus(id: string, status: BadCaseStatus) {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Bad case actions require database connectivity.");
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("bad_cases").update({ status }).eq("id", id);

  if (error) {
    throw new Error(`Failed to update bad case status: ${error.message}`);
  }
}
