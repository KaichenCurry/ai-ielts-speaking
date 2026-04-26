import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import {
  getPart1TopicBySlug,
  getPart23TopicBySlug,
  getPart23Part2QuestionId,
  listPart1Topics,
  listPart23Topics,
} from "@/lib/data/questions";
import type {
  MockPaper,
  MockPaperPlan,
  MockPaperQuestion,
  MockPaperRecord,
  Part1Topic,
  Part23Topic,
  QuestionDifficulty,
} from "@/lib/types";

const PART1_TARGET_SECONDS = 50;
const PART2_PREP_SECONDS = 60;
const PART2_TALK_SECONDS = 110;
const PART3_TARGET_SECONDS = 60;
const PART1_QUESTIONS_PER_TOPIC = 3;
const PART3_QUESTIONS_PER_PAPER = 5;
const MAX_GENERATED_PAPERS = 8;

const PART1_HELPER = "用 2–4 句直接回答，加 1 个原因或例子，自然流畅。";
const PART2_HELPER = "1 分钟准备时间，独白尽量说满 1.5–2 分钟，按卡片四点展开。";
const PART3_HELPER = "先观点、再理由、再举例，2–3 句展开。";

export type SeasonInfo = {
  id: string;
  label: string;
  zhLabel: string;
  startDate: string;
  endDate: string;
};

export function getCurrentSeason(now: Date = new Date()): SeasonInfo {
  const year = now.getFullYear();
  const month = now.getMonth();

  if (month < 4) {
    return {
      id: `${year}-jan-apr`,
      label: `${year} Jan – Apr`,
      zhLabel: `${year} 年 1–4 月题季`,
      startDate: `${year}-01-01`,
      endDate: `${year}-04-30`,
    };
  }
  if (month < 8) {
    return {
      id: `${year}-may-aug`,
      label: `${year} May – Aug`,
      zhLabel: `${year} 年 5–8 月题季`,
      startDate: `${year}-05-01`,
      endDate: `${year}-08-31`,
    };
  }
  return {
    id: `${year}-sep-dec`,
    label: `${year} Sep – Dec`,
    zhLabel: `${year} 年 9–12 月题季`,
    startDate: `${year}-09-01`,
    endDate: `${year}-12-31`,
  };
}

function mapPaperRecord(record: MockPaperRecord): MockPaper {
  return {
    id: record.id,
    season: record.season,
    title: record.title,
    part1TopicSlugs: record.part1_topic_slugs ?? [],
    part23TopicSlug: record.part23_topic_slug,
    difficulty: record.difficulty,
    isActive: record.is_active,
    createdAt: record.created_at,
  };
}

function generatePapersFromTopics(
  part1Topics: Part1Topic[],
  part23Topics: Part23Topic[],
  season: SeasonInfo,
): MockPaper[] {
  if (part23Topics.length === 0 || part1Topics.length === 0) {
    return [];
  }

  const limit = Math.min(part23Topics.length, MAX_GENERATED_PAPERS);
  const createdAt = new Date().toISOString();
  const difficulty: QuestionDifficulty = "medium";

  return Array.from({ length: limit }, (_, index) => {
    const part23Topic = part23Topics[index];
    const part1A = part1Topics[(index * 2) % part1Topics.length];
    const part1B = part1Topics[(index * 2 + 1) % part1Topics.length];
    const part1TopicSlugs = part1A.topicSlug === part1B.topicSlug
      ? [part1A.topicSlug]
      : [part1A.topicSlug, part1B.topicSlug];

    return {
      id: `paper-${season.id}-${String(index + 1).padStart(2, "0")}`,
      season: season.id,
      // Title now embeds the Part 2/3 topic so the /mock card preview is
      // recognisable at a glance instead of a generic "Mock 03".
      title: `Mock ${String(index + 1).padStart(2, "0")} · ${part23Topic.topicTitle}`,
      part1TopicSlugs,
      part23TopicSlug: part23Topic.topicSlug,
      difficulty,
      isActive: true,
      createdAt,
    };
  });
}

export type MockPaperPreview = MockPaper & {
  part1TopicTitles: string[];
  part23TopicTitle: string;
};

/**
 * Resolve topic slugs → human-readable titles so the /mock list can
 * preview "Part 1: Daily Life · Hometown / Part 2&3: A skill you want to learn"
 * without each card having to fetch its own topic data.
 */
export async function listMockPapersWithPreview(): Promise<MockPaperPreview[]> {
  const [papers, part1Topics, part23Topics] = await Promise.all([
    listMockPapers(),
    listPart1Topics(),
    listPart23Topics(),
  ]);
  const p1Map = new Map(part1Topics.map((t) => [t.topicSlug, t.topicTitle]));
  const p23Map = new Map(part23Topics.map((t) => [t.topicSlug, t.topicTitle]));
  return papers.map((paper) => ({
    ...paper,
    part1TopicTitles: paper.part1TopicSlugs
      .map((slug) => p1Map.get(slug))
      .filter((t): t is string => Boolean(t)),
    part23TopicTitle: p23Map.get(paper.part23TopicSlug) ?? paper.part23TopicSlug,
  }));
}

async function listGeneratedPapers(): Promise<MockPaper[]> {
  const [part1Topics, part23Topics] = await Promise.all([listPart1Topics(), listPart23Topics()]);
  return generatePapersFromTopics(part1Topics, part23Topics, getCurrentSeason());
}

const CUSTOM_PAPER_PREFIX = "custom-";

export function isCustomPaper(paperId: string) {
  return paperId.startsWith(CUSTOM_PAPER_PREFIX);
}

/**
 * Make sure the given paper has a row in mock_papers before any attempt
 * tries to FK to it. Auto-generated papers (`paper-{season}-{NN}`) live
 * only in memory by default; mock_attempts.paper_id won't satisfy its
 * foreign key unless we upsert here first. Idempotent — repeat calls
 * are no-ops thanks to onConflict: id.
 *
 * SECURITY: only papers whose id matches one currently in the generated
 * set (or already in mock_papers) are allowed to upsert. This prevents
 * an unauthenticated/guest attacker from minting arbitrary paper rows
 * by hitting `/mock/<forged-id>/intro` and triggering a write.
 */
export async function ensureMockPaperPersisted(paper: MockPaper): Promise<void> {
  if (!isSupabaseConfigured()) return;

  // Custom papers are created by createCustomMockPaper and are already in
  // mock_papers — they should never reach this code path, but if they do
  // it's safe (the row exists; upsert is a no-op).
  if (isCustomPaper(paper.id)) return;

  // Verify the paper id actually came from our generator. Anything else
  // is a forgery attempt.
  const generated = await listGeneratedPapers();
  const isLegitimate = generated.some((p) => p.id === paper.id);
  if (!isLegitimate) {
    throw new Error("Unknown paper id; refusing to persist.");
  }

  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("mock_papers")
    .upsert(
      {
        id: paper.id,
        season: paper.season,
        title: paper.title,
        part1_topic_slugs: paper.part1TopicSlugs,
        part23_topic_slug: paper.part23TopicSlug,
        difficulty: paper.difficulty,
        is_active: paper.isActive,
      },
      { onConflict: "id" },
    );
  if (error) {
    throw new Error(`Failed to persist mock paper: ${error.message}`);
  }
}

export async function listMockPapers(): Promise<MockPaper[]> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createSupabaseServerClient();
      const { data, error } = await supabase
        .from("mock_papers")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        // Custom papers are persisted with the `custom-` id prefix and shouldn't
        // appear in the public hall — they're per-user, ad-hoc selections.
        return (data as MockPaperRecord[])
          .map(mapPaperRecord)
          .filter((paper) => !isCustomPaper(paper.id));
      }
    } catch (error) {
      console.error("Failed to load mock papers from Supabase, falling back to generated:", error);
    }
  }

  return listGeneratedPapers();
}

/**
 * Direct fetch by id — works for both official AND custom papers.
 * Used by /mock/[paperId]/intro|run|submitting where we already have the id.
 */
export async function getMockPaper(paperId: string): Promise<MockPaper | null> {
  if (isSupabaseConfigured()) {
    try {
      const supabase = createSupabaseServerClient();
      const { data, error } = await supabase
        .from("mock_papers")
        .select("*")
        .eq("id", paperId)
        .maybeSingle();
      if (!error && data) {
        return mapPaperRecord(data as MockPaperRecord);
      }
    } catch (error) {
      console.error("Failed to load mock paper from Supabase, falling back to generated:", error);
    }
  }
  // Fallback: search the generated public set
  const generated = await listGeneratedPapers();
  return generated.find((paper) => paper.id === paperId) ?? null;
}

/**
 * Topic catalog for the /mock/custom picker. Returns lightweight rows so
 * the form stays cheap to render; we resolve the full plan only after the
 * student submits their selection.
 */
export type PickerTopic = {
  topicSlug: string;
  topicTitle: string;
  questionCount: number;
};
export type TopicCatalog = {
  part1: PickerTopic[];
  part23: PickerTopic[];
};
export async function getTopicCatalog(): Promise<TopicCatalog> {
  const [part1Topics, part23Topics] = await Promise.all([listPart1Topics(), listPart23Topics()]);
  return {
    part1: part1Topics.map((t) => ({
      topicSlug: t.topicSlug,
      topicTitle: t.topicTitle,
      questionCount: t.questions.length,
    })),
    part23: part23Topics.map((t) => ({
      topicSlug: t.topicSlug,
      topicTitle: t.topicTitle,
      questionCount: t.part3Questions.length + (t.part2QuestionCard ? 1 : 0),
    })),
  };
}

/**
 * Persist a per-student "custom" paper assembled from picked topics.
 * `is_active=false` keeps it out of the public /mock listing while the
 * `custom-` prefix tags it for tooling. The paper is then a normal first-class
 * row so attempts can FK to it and reports look identical to official papers.
 */
export async function createCustomMockPaper(input: {
  userId: string;
  part1TopicSlugs: string[];
  part23TopicSlug: string;
}): Promise<MockPaper> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured. Custom papers require database access.");
  }
  if (input.part1TopicSlugs.length === 0) {
    throw new Error("至少要选 1 个 Part 1 题目主题。");
  }
  if (input.part1TopicSlugs.length > 3) {
    throw new Error("Part 1 最多选 3 个主题。");
  }
  if (!input.part23TopicSlug) {
    throw new Error("请选择一个 Part 2 / Part 3 主题。");
  }

  // Validate the picked slugs against the live topic catalog so a malicious
  // form post can't FK to non-existent questions.
  const catalog = await getTopicCatalog();
  const validP1 = new Set(catalog.part1.map((t) => t.topicSlug));
  const validP23 = new Set(catalog.part23.map((t) => t.topicSlug));
  const cleanedP1 = Array.from(new Set(input.part1TopicSlugs)).filter((s) => validP1.has(s));
  if (cleanedP1.length === 0) {
    throw new Error("所选 Part 1 主题不在题库中。");
  }
  if (!validP23.has(input.part23TopicSlug)) {
    throw new Error("所选 Part 2 / Part 3 主题不在题库中。");
  }

  const part23Title = catalog.part23.find((t) => t.topicSlug === input.part23TopicSlug)?.topicTitle
    ?? input.part23TopicSlug;
  const season = getCurrentSeason();
  const id = `${CUSTOM_PAPER_PREFIX}${input.userId.slice(0, 8)}-${Date.now().toString(36)}`;

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("mock_papers")
    .insert({
      id,
      season: season.id,
      title: `自选 · ${part23Title}`,
      part1_topic_slugs: cleanedP1,
      part23_topic_slug: input.part23TopicSlug,
      difficulty: "medium",
      is_active: false, // hidden from public hall
    })
    .select("*")
    .single();
  if (error || !data) {
    throw new Error(`Failed to create custom paper: ${error?.message ?? "unknown error"}`);
  }
  return mapPaperRecord(data as MockPaperRecord);
}

function buildPart1Questions(topics: Part1Topic[]): MockPaperQuestion[] {
  return topics.flatMap((topic) => {
    const questions = topic.questions.slice(0, PART1_QUESTIONS_PER_TOPIC);
    return questions.map<MockPaperQuestion>((question) => ({
      part: "part1",
      topicSlug: topic.topicSlug,
      topicTitle: topic.topicTitle,
      questionId: question.id,
      questionText: question.questionText,
      questionIndex: question.questionIndex,
      questionLabel: `Part 1 · ${topic.topicTitle}`,
      helper: question.helper ?? PART1_HELPER,
      targetSeconds: PART1_TARGET_SECONDS,
    }));
  });
}

function buildPart2Question(topic: Part23Topic): MockPaperQuestion {
  return {
    part: "part2",
    topicSlug: topic.topicSlug,
    topicTitle: topic.topicTitle,
    questionId: topic.part2QuestionId ?? getPart23Part2QuestionId(topic.topicSlug),
    questionText: topic.part2QuestionCard,
    questionIndex: null,
    questionLabel: `Part 2 · ${topic.topicTitle}`,
    helper: topic.part2Helper ?? PART2_HELPER,
    cueCardBullets: topic.cueCardBullets,
    preparationSeconds: PART2_PREP_SECONDS,
    targetSeconds: PART2_TALK_SECONDS,
  };
}

function buildPart3Questions(topic: Part23Topic): MockPaperQuestion[] {
  return topic.part3Questions.slice(0, PART3_QUESTIONS_PER_PAPER).map<MockPaperQuestion>((question) => ({
    part: "part3",
    topicSlug: topic.topicSlug,
    topicTitle: topic.topicTitle,
    questionId: question.id,
    questionText: question.questionText,
    questionIndex: question.questionIndex,
    questionLabel: `Part 3 · ${topic.topicTitle}`,
    helper: question.helper ?? PART3_HELPER,
    targetSeconds: PART3_TARGET_SECONDS,
  }));
}

export async function buildMockPaperPlan(paperId: string): Promise<MockPaperPlan | null> {
  const paper = await getMockPaper(paperId);
  if (!paper) {
    return null;
  }

  const [part1ResolvedTopics, part23Topic] = await Promise.all([
    Promise.all(paper.part1TopicSlugs.map((slug) => getPart1TopicBySlug(slug))),
    getPart23TopicBySlug(paper.part23TopicSlug),
  ]);

  if (!part23Topic) {
    return null;
  }

  const part1Topics = part1ResolvedTopics.filter((topic): topic is Part1Topic => Boolean(topic));
  const part1Questions = buildPart1Questions(part1Topics);
  const part2Question = buildPart2Question(part23Topic);
  const part3Questions = buildPart3Questions(part23Topic);

  if (part1Questions.length === 0 || !part2Question.questionText || part3Questions.length === 0) {
    return null;
  }

  const part1Duration = part1Questions.reduce((sum, q) => sum + (q.targetSeconds ?? PART1_TARGET_SECONDS), 0);
  const part2Duration = (part2Question.preparationSeconds ?? PART2_PREP_SECONDS)
    + (part2Question.targetSeconds ?? PART2_TALK_SECONDS);
  const part3Duration = part3Questions.reduce((sum, q) => sum + (q.targetSeconds ?? PART3_TARGET_SECONDS), 0);

  return {
    paper,
    part1Questions,
    part2Question,
    part3Questions,
    estimatedDurationSeconds: part1Duration + part2Duration + part3Duration,
  };
}
