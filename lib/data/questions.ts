import { readFile } from "node:fs/promises";
import path from "node:path";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import { listPracticeSessions } from "@/lib/data/sessions";
import type {
  CreateQuestionInput,
  Part1Question,
  Part1Topic,
  Part23Topic,
  Part3Question,
  Question,
  QuestionDifficulty,
  QuestionRecord,
  QuestionSource,
  SpeakingPart,
  UpdateQuestionInput,
} from "@/lib/types";

const PART1_HELPER = "用 2-4 句话直接回答，补一个原因或例子，尽量自然流畅。";
const PART2_HELPER = "按卡片四点组织内容，加入细节和感受，尽量说满 1.5-2 分钟。";
const PART3_HELPER = "先给观点，再补理由或例子，展开 2-3 句，注意逻辑连接。";
const FALLBACK_CREATED_AT = "2026-03-26";
const MARKDOWN_QUESTION_ID_PREFIX = "md-";
const CUSTOM_QUESTION_ID_PREFIX = "custom-";

type ParsedMarkdownData = {
  part1Topics: Part1Topic[];
  part23Topics: Part23Topic[];
  flatQuestions: Question[];
};

const defaultFallbackPart1Topics: Part1Topic[] = [
  {
    id: "fallback-p1-daily-life",
    part: "part1",
    topicTitle: "Daily Life",
    topicSlug: "daily-life",
    sourceOrder: 1,
    questions: [
      {
        id: "fallback-p1-daily-life-1",
        part: "part1",
        topicTitle: "Daily Life",
        topicSlug: "daily-life",
        questionIndex: 1,
        questionText: "What kind of mornings do you usually have on weekdays?",
        answerText:
          "On weekdays, my mornings are usually quite structured. I get up early, have a quick breakfast, and spend a little time planning my day before work or study. This routine helps me feel focused and organized.",
        sourceOrder: 1,
      },
    ],
  },
];

const defaultFallbackPart23Topics: Part23Topic[] = [
  {
    id: "fallback-topic-1",
    topicId: "topic-1",
    topicNumber: 1,
    topicTitle: "People",
    topicSlug: "topic-1-people",
    part2QuestionCard: "Describe a teacher who influenced you a lot.",
    cueCardBullets: ["Who this person is", "How you knew this person", "What this person did", "And explain why this person influenced you a lot"],
    part2SampleAnswer:
      "I would like to talk about a teacher from my high school who had a strong influence on me. She was patient, encouraging, and always pushed me to think more deeply. Because of her guidance, I became much more confident in expressing my ideas.",
    part3Questions: [
      {
        id: "fallback-p3-people-1",
        part: "part3",
        topicId: "topic-1",
        topicNumber: 1,
        topicTitle: "People",
        topicSlug: "topic-1-people",
        questionIndex: 1,
        questionText: "How has technology changed the way people communicate?",
        answerText:
          "Technology has made communication much faster and more convenient. People can stay in touch instantly through messaging apps and video calls, even if they live far apart. At the same time, I think it has reduced some face-to-face interaction.",
        sourceOrder: 1,
      },
    ],
    sourceOrder: 1,
  },
];

const defaultFallbackQuestions = uniqueQuestions([
  ...flattenPart1Topics(defaultFallbackPart1Topics),
  ...flattenPart23Topics(defaultFallbackPart23Topics),
]);

let parsedMarkdownDataPromise: Promise<ParsedMarkdownData> | null = null;

type QuestionFilters = {
  part?: SpeakingPart;
  topic?: string;
  difficulty?: QuestionDifficulty;
  isActive?: boolean;
};

type QuestionRecordSummary = Pick<QuestionRecord, "id" | "created_at" | "is_active">;

type Part1QuestionWithCompletion = Part1Question & {
  isCompleted: boolean;
};

type Part1TopicWithProgress = Omit<Part1Topic, "questions"> & {
  questions: Part1QuestionWithCompletion[];
  completedCount: number;
  totalCount: number;
  isTopicCompleted: boolean;
};

type Part3QuestionWithCompletion = Part3Question & {
  isCompleted: boolean;
};

type Part23TopicWithProgress = Omit<Part23Topic, "part2QuestionId" | "part3Questions"> & {
  part2QuestionId: string;
  part2IsCompleted: boolean;
  part3Questions: Part3QuestionWithCompletion[];
  completedCount: number;
  totalCount: number;
  isTopicCompleted: boolean;
};

function mapRecord(r: QuestionRecord): Question {
  return {
    id: r.id,
    part: r.part,
    topic: r.topic,
    difficulty: r.difficulty,
    question: r.question,
    helper: r.helper,
    isActive: r.is_active,
    createdAt: r.created_at,
  };
}

function cleanText(value: string) {
  return value.replace(/\r/g, "").replace(/\s+/g, " ").trim();
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return slug || "item";
}

function isMarkdownQuestionId(id: string) {
  return id.startsWith(MARKDOWN_QUESTION_ID_PREFIX);
}

export function isCustomQuestionId(id: string) {
  return id.startsWith(CUSTOM_QUESTION_ID_PREFIX);
}

export function deriveQuestionSource(id: string): QuestionSource {
  return isCustomQuestionId(id) ? "custom" : "markdown";
}

function uniqueQuestions(questions: Question[]) {
  const seen = new Set<string>();

  return questions.filter((question) => {
    const key = `${question.part}:${question.question}`.toLowerCase();

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function filterQuestions(questions: Question[], filters?: QuestionFilters) {
  return questions.filter((question) => {
    if (filters?.part && question.part !== filters.part) {
      return false;
    }

    if (filters?.topic && question.topic !== filters.topic) {
      return false;
    }

    if (filters?.difficulty && question.difficulty !== filters.difficulty) {
      return false;
    }

    if (filters?.isActive !== undefined && question.isActive !== filters.isActive) {
      return false;
    }

    return true;
  });
}

function flattenPart1Topics(topics: Part1Topic[]): Question[] {
  return topics.flatMap((topic) =>
    topic.questions.map((question) => ({
      id: question.id,
      part: "part1" as const,
      topic: topic.topicTitle,
      difficulty: "easy" as const,
      question: question.questionText,
      helper: PART1_HELPER,
      isActive: true,
      createdAt: FALLBACK_CREATED_AT,
    })),
  );
}

function flattenPart23Topics(topics: Part23Topic[]): Question[] {
  return topics.flatMap((topic) => [
    {
      id: `md-p2-${topic.topicSlug}`,
      part: "part2" as const,
      topic: topic.topicTitle,
      difficulty: "medium" as const,
      question: topic.part2QuestionCard,
      helper: PART2_HELPER,
      isActive: true,
      createdAt: FALLBACK_CREATED_AT,
    },
    ...topic.part3Questions.map((question) => ({
      id: question.id,
      part: "part3" as const,
      topic: topic.topicTitle,
      difficulty: "hard" as const,
      question: question.questionText,
      helper: PART3_HELPER,
      isActive: true,
      createdAt: FALLBACK_CREATED_AT,
    })),
  ]);
}

function parsePart1Markdown(content: string): Part1Topic[] {
  const topics: Part1Topic[] = [];
  const lines = content.split(/\n/);
  let topicTitle = "";
  let topicSlug = "";
  let topicSourceOrder = 0;
  let questionText = "";
  let questionIndex = 0;
  let answerLines: string[] = [];
  let questionSourceOrder = 0;
  let questions: Part1Question[] = [];

  function flushQuestion() {
    if (!topicTitle || !questionText) {
      return;
    }

    const normalizedQuestionIndex = questionIndex || questionSourceOrder + 1;
    const sourceOrder = questionSourceOrder + 1;

    questions.push({
      id: `md-p1-${topicSlug}-${normalizedQuestionIndex}`,
      part: "part1",
      topicTitle,
      topicSlug,
      questionIndex: normalizedQuestionIndex,
      questionText: cleanText(questionText),
      answerText: cleanText(answerLines.join(" ")) || cleanText(questionText),
      sourceOrder,
    });

    questionText = "";
    questionIndex = 0;
    answerLines = [];
    questionSourceOrder = sourceOrder;
  }

  function flushTopic() {
    flushQuestion();

    if (!topicTitle || questions.length === 0) {
      topicTitle = "";
      topicSlug = "";
      questions = [];
      return;
    }

    topics.push({
      id: `p1-topic-${topicSlug}`,
      part: "part1",
      topicTitle,
      topicSlug,
      sourceOrder: topicSourceOrder,
      questions,
    });

    topicTitle = "";
    topicSlug = "";
    questions = [];
    questionSourceOrder = 0;
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const topicMatch = line.match(/^##\s+(.+)$/);

    if (topicMatch) {
      const heading = cleanText(topicMatch[1]);

      if (heading === "目录" || heading === "Part 1 题库总览") {
        flushTopic();
        continue;
      }

      flushTopic();
      topicSourceOrder += 1;
      topicTitle = heading;
      topicSlug = slugify(heading);
      continue;
    }

    if (!topicTitle) {
      continue;
    }

    const questionMatch = line.match(/^###\s+Q(\d+):\s*(.+)$/i);

    if (questionMatch) {
      flushQuestion();
      questionIndex = Number(questionMatch[1]) || 0;
      questionText = cleanText(questionMatch[2]);
      answerLines = [];
      continue;
    }

    if (!questionText) {
      continue;
    }

    const answerMatch = line.match(/^\*\*A:\*\*\s*(.*)$/i);

    if (answerMatch) {
      answerLines = answerMatch[1] ? [answerMatch[1]] : [];
      continue;
    }

    if (!line || line === "---") {
      continue;
    }

    answerLines.push(line);
  }

  flushTopic();
  return topics;
}

function parsePart2AndPart3Markdown(content: string): Part23Topic[] {
  const topics: Part23Topic[] = [];
  const lines = content.split(/\n/);
  let topicNumber = 0;
  let topicTitle = "";
  let topicSlug = "";
  let section: "none" | "part2-card" | "part2-sample" | "part3" = "none";
  let part2QuestionCard = "";
  let cueCardBullets: string[] = [];
  let part2SampleAnswerLines: string[] = [];
  let part3Questions: Part3Question[] = [];
  let part3QuestionIndex = 0;
  let part3QuestionText = "";
  let part3AnswerLines: string[] = [];
  let topicSourceOrder = 0;
  let part3SourceOrder = 0;

  function flushPart3Question() {
    if (!topicTitle || !part3QuestionText) {
      return;
    }

    const normalizedQuestionIndex = part3QuestionIndex || part3SourceOrder;

    part3Questions.push({
      id: `md-p3-${topicSlug}-${normalizedQuestionIndex}`,
      part: "part3",
      topicId: `topic-${topicNumber}`,
      topicNumber,
      topicTitle,
      topicSlug,
      questionIndex: normalizedQuestionIndex,
      questionText: cleanText(part3QuestionText),
      answerText: cleanText(part3AnswerLines.join(" ")) || cleanText(part3QuestionText),
      sourceOrder: part3SourceOrder,
    });

    part3QuestionIndex = 0;
    part3QuestionText = "";
    part3AnswerLines = [];
  }

  function flushTopic() {
    flushPart3Question();

    if (!topicTitle || (!part2QuestionCard && part3Questions.length === 0 && part2SampleAnswerLines.length === 0)) {
      topicNumber = 0;
      topicTitle = "";
      topicSlug = "";
      section = "none";
      part2QuestionCard = "";
      cueCardBullets = [];
      part2SampleAnswerLines = [];
      part3Questions = [];
      part3SourceOrder = 0;
      return;
    }

    topics.push({
      id: `topic-${topicNumber}`,
      topicId: `topic-${topicNumber}`,
      topicNumber,
      topicTitle,
      topicSlug,
      part2QuestionCard: cleanText(part2QuestionCard),
      cueCardBullets: cueCardBullets.map((bullet) => cleanText(bullet)).filter(Boolean),
      part2SampleAnswer: cleanText(part2SampleAnswerLines.join(" ")),
      part3Questions,
      sourceOrder: topicSourceOrder,
    });

    topicNumber = 0;
    topicTitle = "";
    topicSlug = "";
    section = "none";
    part2QuestionCard = "";
    cueCardBullets = [];
    part2SampleAnswerLines = [];
    part3Questions = [];
    part3SourceOrder = 0;
  }

  for (const rawLine of lines) {
    const line = rawLine.trim();
    const topicMatch = line.match(/^##\s+Topic\s+(\d+):\s*(.+)$/i);

    if (topicMatch) {
      flushTopic();
      topicNumber = Number(topicMatch[1]) || 0;
      topicTitle = cleanText(topicMatch[2]);
      topicSlug = `topic-${topicNumber}-${slugify(topicTitle)}`;
      topicSourceOrder += 1;
      continue;
    }

    if (!topicTitle) {
      continue;
    }

    if (line === "### Part 2 Question Card") {
      flushPart3Question();
      section = "part2-card";
      continue;
    }

    if (line === "### Part 2 Sample Answer") {
      flushPart3Question();
      section = "part2-sample";
      continue;
    }

    if (line === "### Part 3 Questions") {
      flushPart3Question();
      section = "part3";
      continue;
    }

    if (section === "part2-card") {
      const questionCardMatch = line.match(/^\*\*(.+?)\*\*$/);
      const bulletMatch = line.match(/^[-*]\s+(.+)$/);

      if (questionCardMatch && !part2QuestionCard) {
        part2QuestionCard = cleanText(questionCardMatch[1]);
        continue;
      }

      if (bulletMatch) {
        cueCardBullets.push(cleanText(bulletMatch[1]));
      }

      continue;
    }

    if (section === "part2-sample") {
      if (!line || line === "---") {
        continue;
      }

      part2SampleAnswerLines.push(line);
      continue;
    }

    if (section === "part3") {
      const part3QuestionMatch = line.match(/^\*\*(\d+)\.\s*(.+?)\*\*$/);

      if (part3QuestionMatch) {
        flushPart3Question();
        part3SourceOrder += 1;
        part3QuestionIndex = Number(part3QuestionMatch[1]) || part3SourceOrder;
        part3QuestionText = cleanText(part3QuestionMatch[2]);
        part3AnswerLines = [];
        continue;
      }

      const answerMatch = line.match(/^\*\*A:\*\*\s*(.*)$/i);

      if (answerMatch && part3QuestionText) {
        part3AnswerLines = answerMatch[1] ? [answerMatch[1]] : [];
        continue;
      }

      if (!part3QuestionText || !line || line === "---" || line === "UFW:") {
        continue;
      }

      part3AnswerLines.push(line);
    }
  }

  flushTopic();
  return topics;
}

async function readMarkdownQuestionFile(fileName: string) {
  try {
    return await readFile(path.join(/* turbopackIgnore: true */ process.cwd(), fileName), "utf8");
  } catch {
    return "";
  }
}

async function loadParsedMarkdownData(): Promise<ParsedMarkdownData> {
  if (!parsedMarkdownDataPromise) {
    parsedMarkdownDataPromise = (async () => {
      const [part1Markdown, part23Markdown] = await Promise.all([
        readMarkdownQuestionFile("Part 1 题库.md"),
        readMarkdownQuestionFile("Part 2 & Part 3 题库.md"),
      ]);

      const part1Topics = parsePart1Markdown(part1Markdown);
      const part23Topics = parsePart2AndPart3Markdown(part23Markdown);
      const flatQuestions = uniqueQuestions([
        ...flattenPart1Topics(part1Topics),
        ...flattenPart23Topics(part23Topics),
      ]);

      return {
        part1Topics,
        part23Topics,
        flatQuestions,
      };
    })();
  }

  return parsedMarkdownDataPromise;
}

async function loadParsedMarkdownQuestions(): Promise<Question[]> {
  const data = await loadParsedMarkdownData();
  return data.flatQuestions;
}

async function loadPart1TopicsFromMarkdown(): Promise<Part1Topic[]> {
  const data = await loadParsedMarkdownData();
  return data.part1Topics.length > 0 ? data.part1Topics : defaultFallbackPart1Topics;
}

async function loadPart23TopicsFromMarkdown(): Promise<Part23Topic[]> {
  const data = await loadParsedMarkdownData();
  return data.part23Topics.length > 0 ? data.part23Topics : defaultFallbackPart23Topics;
}

async function loadMarkdownQuestions(): Promise<Question[]> {
  const parsedQuestions = await loadParsedMarkdownQuestions();
  return parsedQuestions.length > 0 ? parsedQuestions : defaultFallbackQuestions;
}

async function listSupabaseQuestionRecords(filters?: QuestionFilters, markdownOnly = false): Promise<QuestionRecord[] | null> {
  const supabase = createSupabaseServerClient();
  let query = supabase.from("questions").select("*").order("created_at", { ascending: false });

  if (filters?.part) query = query.eq("part", filters.part);
  if (filters?.topic) query = query.eq("topic", filters.topic);
  if (filters?.difficulty) query = query.eq("difficulty", filters.difficulty);
  if (filters?.isActive !== undefined) query = query.eq("is_active", filters.isActive);
  if (markdownOnly) query = query.like("id", `${MARKDOWN_QUESTION_ID_PREFIX}%`);

  const { data, error } = await query;

  if (error || !data || data.length === 0) {
    return null;
  }

  return data as QuestionRecord[];
}

async function listPreferredQuestions(filters?: QuestionFilters): Promise<Question[]> {
  if (!isSupabaseConfigured()) {
    return filterQuestions(await loadMarkdownQuestions(), filters);
  }

  // Query all rows (both md-* and custom-*) from Supabase when configured.
  // This ensures manually created custom questions surface in the practice flow.
  const allRows = await listSupabaseQuestionRecords(filters, false);

  if (allRows && allRows.length > 0) {
    return allRows.map(mapRecord);
  }

  // Supabase has no rows yet — fall back to parsed Markdown
  const parsedMarkdownQuestions = await loadParsedMarkdownQuestions();

  if (parsedMarkdownQuestions.length > 0) {
    return filterQuestions(parsedMarkdownQuestions, filters);
  }

  return filterQuestions(defaultFallbackQuestions, filters);
}

async function listActiveQuestionIds(parts: SpeakingPart[]) {
  const activeQuestions = await Promise.all(parts.map((part) => listPreferredQuestions({ part, isActive: true })));
  return new Set(activeQuestions.flat().map((question) => question.id));
}

function buildPart1QuestionFromQuestion(
  question: Question,
  topicSlug: string,
  questionIndex: number,
  sourceOrder: number,
): Part1Question {
  return {
    id: question.id,
    part: "part1",
    topicTitle: question.topic,
    topicSlug,
    questionIndex,
    questionText: question.question,
    answerText: question.question,
    helper: question.helper || PART1_HELPER,
    difficulty: question.difficulty,
    sourceOrder,
  };
}

function buildPart3QuestionFromQuestion(
  question: Question,
  topicSlug: string,
  topicId: string,
  topicNumber: number,
  questionIndex: number,
  sourceOrder: number,
): Part3Question {
  return {
    id: question.id,
    part: "part3",
    topicId,
    topicNumber,
    topicTitle: question.topic,
    topicSlug,
    questionIndex,
    questionText: question.question,
    answerText: question.question,
    helper: question.helper || PART3_HELPER,
    difficulty: question.difficulty,
    sourceOrder,
  };
}

async function buildPart1TopicsFromQuestions(): Promise<Part1Topic[]> {
  const [questions, markdownTopics] = await Promise.all([
    listPreferredQuestions({ part: "part1", isActive: true }),
    loadPart1TopicsFromMarkdown(),
  ]);
  const markdownTopicMap = new Map(markdownTopics.map((topic) => [topic.topicTitle.trim().toLowerCase(), topic]));
  const topicMap = new Map<string, Part1Topic>();
  const topicOrder: string[] = [];

  questions
    .slice()
    .reverse()
    .forEach((question) => {
      const markdownTopic = markdownTopicMap.get(question.topic.trim().toLowerCase());
      const topicSlug = markdownTopic?.topicSlug ?? slugify(question.topic);
      const existingTopic = topicMap.get(topicSlug);

      if (!existingTopic) {
        topicOrder.push(topicSlug);
        topicMap.set(topicSlug, {
          id: markdownTopic?.id ?? `p1-topic-${topicSlug}`,
          part: "part1",
          topicTitle: markdownTopic?.topicTitle ?? question.topic,
          topicSlug,
          sourceOrder: markdownTopic?.sourceOrder ?? topicOrder.length,
          questions: [],
        });
      }

      const topic = topicMap.get(topicSlug)!;
      topic.questions.push(
        buildPart1QuestionFromQuestion(question, topic.topicSlug, topic.questions.length + 1, topic.questions.length + 1),
      );
    });

  return topicOrder.map((topicSlug) => ({
    ...topicMap.get(topicSlug)!,
    questions: topicMap.get(topicSlug)!.questions,
  }));
}

async function buildPart23TopicsFromQuestions(): Promise<Part23Topic[]> {
  const [part2Questions, part3Questions, markdownTopics] = await Promise.all([
    listPreferredQuestions({ part: "part2", isActive: true }),
    listPreferredQuestions({ part: "part3", isActive: true }),
    loadPart23TopicsFromMarkdown(),
  ]);
  const markdownTopicMap = new Map(markdownTopics.map((topic) => [topic.topicTitle.trim().toLowerCase(), topic]));
  const topicMap = new Map<string, Part23Topic>();
  const topicOrder: string[] = [];

  function ensureTopic(topicTitle: string) {
    const markdownTopic = markdownTopicMap.get(topicTitle.trim().toLowerCase());
    const topicSlug = markdownTopic?.topicSlug ?? slugify(topicTitle);
    const existingTopic = topicMap.get(topicSlug);

    if (existingTopic) {
      return existingTopic;
    }

    const topicNumber = markdownTopic?.topicNumber ?? topicOrder.length + 1;
    const topic: Part23Topic = {
      id: markdownTopic?.id ?? `topic-${topicNumber}`,
      topicId: markdownTopic?.topicId ?? `topic-${topicNumber}`,
      topicNumber,
      topicTitle: markdownTopic?.topicTitle ?? topicTitle,
      topicSlug,
      part2QuestionId: markdownTopic?.part2QuestionId,
      part2Difficulty: undefined,
      part2Helper: undefined,
      part2QuestionCard: markdownTopic?.part2QuestionCard ?? "",
      cueCardBullets: markdownTopic?.cueCardBullets ?? [],
      part2SampleAnswer: markdownTopic?.part2SampleAnswer ?? "",
      part3Questions: [],
      sourceOrder: markdownTopic?.sourceOrder ?? topicOrder.length + 1,
    };

    topicOrder.push(topicSlug);
    topicMap.set(topicSlug, topic);
    return topic;
  }

  part2Questions
    .slice()
    .reverse()
    .forEach((question) => {
      const topic = ensureTopic(question.topic);
      topic.part2QuestionId = question.id;
      topic.part2Difficulty = question.difficulty;
      topic.part2Helper = question.helper || PART2_HELPER;
      topic.part2QuestionCard = question.question;
    });

  part3Questions
    .slice()
    .reverse()
    .forEach((question) => {
      const topic = ensureTopic(question.topic);
      topic.part3Questions.push(
        buildPart3QuestionFromQuestion(
          question,
          topic.topicSlug,
          topic.topicId,
          topic.topicNumber,
          topic.part3Questions.length + 1,
          topic.part3Questions.length + 1,
        ),
      );
    });

  return topicOrder
    .map((topicSlug) => topicMap.get(topicSlug)!)
    .filter((topic) => Boolean(topic.part2QuestionCard) || topic.part3Questions.length > 0);
}

export function getPart23Part2QuestionId(topicSlug: string) {
  return `md-p2-${topicSlug}`;
}

export async function listPart1Topics(): Promise<Part1Topic[]> {
  if (isSupabaseConfigured()) {
    return buildPart1TopicsFromQuestions();
  }

  const [topics, activeQuestionIds] = await Promise.all([loadPart1TopicsFromMarkdown(), listActiveQuestionIds(["part1"])]);

  return topics
    .map((topic) => ({
      ...topic,
      questions: topic.questions.filter((question) => activeQuestionIds.has(question.id)),
    }))
    .filter((topic) => topic.questions.length > 0);
}

async function listPracticedQuestionIds() {
  const sessions = await listPracticeSessions();
  return new Set(sessions.map((session) => session.questionId).filter((questionId): questionId is string => Boolean(questionId)));
}

async function listPersistedQuestionIds(questionIds: string[]) {
  if (!isSupabaseConfigured() || questionIds.length === 0) {
    return new Set<string>();
  }

  const { data } = await createSupabaseServerClient().from("questions").select("id").in("id", questionIds);
  return new Set((data ?? []).map((question) => question.id));
}

function attachPart1TopicProgress(topic: Part1Topic, practicedQuestionIds: Set<string>): Part1TopicWithProgress {
  const questions = topic.questions.map((question) => ({
    ...question,
    isCompleted: practicedQuestionIds.has(question.id),
  }));
  const completedCount = questions.filter((question) => question.isCompleted).length;
  const totalCount = questions.length;

  return {
    ...topic,
    questions,
    completedCount,
    totalCount,
    isTopicCompleted: totalCount > 0 && completedCount === totalCount,
  };
}

function attachPart23TopicProgress(topic: Part23Topic, practicedQuestionIds: Set<string>): Part23TopicWithProgress {
  const part2QuestionId = topic.part2QuestionId || getPart23Part2QuestionId(topic.topicSlug);
  const part2IsCompleted = practicedQuestionIds.has(part2QuestionId);
  const part3Questions = topic.part3Questions.map((question) => ({
    ...question,
    isCompleted: practicedQuestionIds.has(question.id),
  }));
  const completedCount = (part2IsCompleted ? 1 : 0) + part3Questions.filter((question) => question.isCompleted).length;
  const totalCount = 1 + part3Questions.length;

  return {
    ...topic,
    part2QuestionId,
    part2IsCompleted,
    part3Questions,
    completedCount,
    totalCount,
    isTopicCompleted: totalCount > 0 && completedCount === totalCount,
  };
}

export async function listPart1TopicsWithProgress(): Promise<Part1TopicWithProgress[]> {
  const [topics, practicedQuestionIds] = await Promise.all([listPart1Topics(), listPracticedQuestionIds()]);
  return topics.map((topic) => attachPart1TopicProgress(topic, practicedQuestionIds));
}

export async function getPart1TopicBySlug(topicSlug: string): Promise<Part1Topic | null> {
  const topics = await listPart1Topics();
  return topics.find((topic) => topic.topicSlug === topicSlug) ?? null;
}

export async function getPart1TopicBySlugWithProgress(topicSlug: string): Promise<Part1TopicWithProgress | null> {
  const topics = await listPart1TopicsWithProgress();
  return topics.find((topic) => topic.topicSlug === topicSlug) ?? null;
}

export async function getPart1QuestionById(topicSlug: string, questionId: string): Promise<Part1Question | null> {
  const topic = await getPart1TopicBySlug(topicSlug);

  if (!topic) {
    return null;
  }

  return topic.questions.find((question) => question.id === questionId) ?? null;
}

export async function listPart23Topics(): Promise<Part23Topic[]> {
  if (isSupabaseConfigured()) {
    return buildPart23TopicsFromQuestions();
  }

  const [topics, activeQuestionIds] = await Promise.all([loadPart23TopicsFromMarkdown(), listActiveQuestionIds(["part2", "part3"])]);

  return topics
    .map((topic) => ({
      ...topic,
      part3Questions: topic.part3Questions.filter((question) => activeQuestionIds.has(question.id)),
    }))
    .filter((topic) => activeQuestionIds.has(getPart23Part2QuestionId(topic.topicSlug)) || topic.part3Questions.length > 0);
}

export async function listPart23TopicsWithProgress(): Promise<Part23TopicWithProgress[]> {
  const [topics, practicedQuestionIds] = await Promise.all([listPart23Topics(), listPracticedQuestionIds()]);
  return topics.map((topic) => attachPart23TopicProgress(topic, practicedQuestionIds));
}

export async function getPart23TopicBySlug(topicSlug: string): Promise<Part23Topic | null> {
  const topics = await listPart23Topics();
  return topics.find((topic) => topic.topicSlug === topicSlug) ?? null;
}

export async function getPart23TopicBySlugWithProgress(topicSlug: string): Promise<Part23TopicWithProgress | null> {
  const topics = await listPart23TopicsWithProgress();
  return topics.find((topic) => topic.topicSlug === topicSlug) ?? null;
}

export async function getRandomQuestion(part: SpeakingPart): Promise<Question | null> {
  const candidates = (await listPreferredQuestions({ part, isActive: true })) ?? [];

  if (candidates.length === 0) {
    return null;
  }

  return candidates[Math.floor(Math.random() * candidates.length)] ?? null;
}

export async function listQuestions(filters?: QuestionFilters): Promise<Question[]> {
  return listPreferredQuestions(filters);
}

export async function listQuestionsWithCompletion(filters?: QuestionFilters): Promise<
  (Question & { isCompleted: boolean; isPersisted: boolean; source: QuestionSource })[]
> {
  const questions = await listQuestions(filters);
  const [practicedQuestionIds, persistedIds] = await Promise.all([
    listPracticedQuestionIds(),
    listPersistedQuestionIds(questions.map((question) => question.id)),
  ]);

  return questions.map((question) => ({
    ...question,
    isCompleted: practicedQuestionIds.has(question.id),
    isPersisted: persistedIds.has(question.id),
    source: deriveQuestionSource(question.id),
  }));
}

export async function syncMarkdownQuestionsToSupabase(): Promise<{ syncedCount: number }> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const markdownQuestions = await loadParsedMarkdownQuestions();

  if (markdownQuestions.length === 0) {
    throw new Error("Markdown 题库为空，无法同步。请先检查上传的题库文件。");
  }

  const supabase = createSupabaseServerClient();
  const { data: existingRows, error: existingError } = await supabase
    .from("questions")
    .select("id, is_active, created_at")
    .like("id", `${MARKDOWN_QUESTION_ID_PREFIX}%`);

  if (existingError) {
    throw new Error(`Failed to load existing questions: ${existingError.message}`);
  }

  const existingById = new Map(
    ((existingRows ?? []) as QuestionRecordSummary[]).map((question) => [question.id, question]),
  );

  const rows = markdownQuestions.map((question) => {
    const existing = existingById.get(question.id);

    return {
      id: question.id,
      part: question.part,
      topic: question.topic,
      difficulty: question.difficulty,
      question: question.question,
      helper: question.helper,
      is_active: existing?.is_active ?? true,
      created_at: existing?.created_at ?? question.createdAt,
    };
  });

  const { error } = await supabase.from("questions").upsert(rows, { onConflict: "id" });

  if (error) {
    throw new Error(`Failed to sync markdown questions: ${error.message}`);
  }

  return { syncedCount: rows.length };
}

export async function toggleQuestionActive(id: string, isActive: boolean): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("questions")
    .update({ is_active: isActive })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update question: ${error.message}`);
  }

  if (!data) {
    if (isMarkdownQuestionId(id)) {
      throw new Error("题目还没同步到 Supabase，请先点击\"同步 Markdown 题库\"。");
    }
    throw new Error("题目未找到，无法更新状态。");
  }
}

export async function getQuestionById(id: string): Promise<Question | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from("questions").select("*").eq("id", id).maybeSingle();

  if (error || !data) {
    return null;
  }

  return mapRecord(data as QuestionRecord);
}

export async function createCustomQuestion(input: CreateQuestionInput): Promise<string> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  const id = `${CUSTOM_QUESTION_ID_PREFIX}${crypto.randomUUID()}`;
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("questions").insert({
    id,
    part: input.part,
    topic: input.topic.trim(),
    difficulty: input.difficulty,
    question: input.question.trim(),
    helper: input.helper.trim(),
    is_active: input.isActive,
  });

  if (error) {
    throw new Error(`Failed to create question: ${error.message}`);
  }

  return id;
}

export async function updateCustomQuestion(input: UpdateQuestionInput): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  if (!isCustomQuestionId(input.id)) {
    throw new Error("只有自定义题目（custom-*）可以编辑，Markdown 题目内容只读。");
  }

  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("questions")
    .update({
      part: input.part,
      topic: input.topic.trim(),
      difficulty: input.difficulty,
      question: input.question.trim(),
      helper: input.helper.trim(),
      is_active: input.isActive,
    })
    .eq("id", input.id)
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update question: ${error.message}`);
  }

  if (!data) {
    throw new Error("题目未找到，无法更新。");
  }
}

export async function deleteCustomQuestion(id: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured.");
  }

  if (!isCustomQuestionId(id)) {
    throw new Error("只有自定义题目（custom-*）可以删除，Markdown 题目无法删除。");
  }

  const supabase = createSupabaseServerClient();

  // Soft-block: prevent deleting questions that have practice sessions referencing them.
  // Note: this is an application-level check, not a database transaction. In the current
  // single-admin MVP it is acceptable, but if question deletion becomes concurrent with
  // session writes later, move this into a transactional RPC or add a foreign key strategy.
  const { data: sessions, error: sessionError } = await supabase
    .from("practice_sessions")
    .select("id")
    .eq("question_id", id)
    .limit(1);

  if (sessionError) {
    throw new Error(`Failed to check practice sessions: ${sessionError.message}`);
  }

  if (sessions && sessions.length > 0) {
    throw new Error("此题目已有练习记录，无法删除。建议将其设为停用（inactive）状态。");
  }

  const { error } = await supabase.from("questions").delete().eq("id", id);

  if (error) {
    throw new Error(`Failed to delete question: ${error.message}`);
  }
}
