import {
  DashboardMetric,
  MockPracticeResponse,
  PracticeQuestionConfig,
  PracticeSession,
  PromptVersion,
  SpeakingPart,
} from "@/lib/types";

export const practiceQuestionConfigs: Record<SpeakingPart, PracticeQuestionConfig> = {
  part1: {
    part: "part1",
    title: "Part 1 练习进行页",
    question: "What kind of mornings do you usually have on weekdays?",
    helper: "用 3-5 句话快速回答，先把表达流畅度建立起来。",
    mockTranscriptHint: "可以谈你的早晨习惯、安排和感受。",
    resultSessionId: "session-101",
  },
  part2: {
    part: "part2",
    title: "Part 2 练习进行页",
    question: "Describe a teacher who influenced you a lot.",
    helper: "尽量把人物、经历和影响说完整，练习扩展表达。",
    mockTranscriptHint: "可以描述老师是谁、做了什么、为什么影响你。",
    resultSessionId: "session-102",
  },
  part3: {
    part: "part3",
    title: "Part 3 练习进行页",
    question: "How has technology changed the way people communicate?",
    helper: "尝试给出观点、解释原因，再补一个例子。",
    mockTranscriptHint: "可以从速度、便利性和人与人关系变化来回答。",
    resultSessionId: "session-103",
  },
};

export const practiceSessions: PracticeSession[] = [
  {
    id: "session-101",
    part: "part1",
    title: "Daily routine warm-up",
    prompt: "Describe a part of your daily routine that you enjoy the most.",
    transcript:
      "I really enjoy the morning part of my day because I can plan everything clearly. Usually I wake up early, make a cup of coffee, and check my study tasks before classes.",
    createdAt: "2026-03-24 09:30",
    score: {
      total: 6.5,
      fluencyCoherence: 6.5,
      lexicalResource: 6.0,
      grammar: 6.0,
      pronunciation: 6.5,
      completeness: 7.0,
    },
    feedback: {
      summary: "Your answer is clear and easy to follow, with a steady pace and a complete response to the question.",
      strengths: [
        "You answered the question directly.",
        "The structure is natural and easy to understand.",
      ],
      priorities: [
        "Use more varied vocabulary for daily routines.",
        "Add one more detail to show range in grammar and ideas.",
      ],
      nextStep: "Try answering the same question again with one specific example and one more complex sentence.",
      sampleAnswer:
        "One part of my daily routine I enjoy most is the quiet time in the morning, because it helps me organize both my schedule and my mood for the whole day.",
    },
    riskFlag: false,
    appealStatus: "none",
    reviewStatus: "pending",
  },
  {
    id: "session-102",
    part: "part2",
    title: "Describe a memorable teacher",
    prompt: "Describe a teacher who has influenced you a lot.",
    transcript:
      "She was my English teacher in high school and she always encouraged us to speak more confidently. Because of her, I became less afraid of making mistakes in public.",
    createdAt: "2026-03-23 20:10",
    score: {
      total: 6.0,
      fluencyCoherence: 6.0,
      lexicalResource: 6.0,
      grammar: 5.5,
      pronunciation: 6.5,
      completeness: 6.0,
    },
    feedback: {
      summary: "The response has a clear idea and emotional connection, but it needs more expansion to feel fully developed for Part 2.",
      strengths: [
        "You expressed personal impact clearly.",
        "The response sounds sincere and easy to understand.",
      ],
      priorities: [
        "Add more supporting details and examples.",
        "Use a wider sentence range to improve grammar score.",
      ],
      nextStep: "Practice extending your Part 2 answer to include background, a concrete story, and the final impact.",
    },
    riskFlag: true,
    riskReason: "Answer length is relatively short for a Part 2 response.",
    appealStatus: "submitted",
    reviewStatus: "flagged",
  },
  {
    id: "session-103",
    part: "part3",
    title: "Technology and communication",
    prompt: "How has technology changed the way people communicate with each other?",
    transcript:
      "Technology has made communication much faster and more convenient, especially through messaging apps and video calls. However, I think it also makes some conversations less personal than before.",
    createdAt: "2026-03-22 18:45",
    score: {
      total: 7.0,
      fluencyCoherence: 7.0,
      lexicalResource: 6.5,
      grammar: 6.5,
      pronunciation: 7.0,
      completeness: 7.0,
    },
    feedback: {
      summary: "This is a balanced answer with a clear comparison of benefits and drawbacks.",
      strengths: [
        "You gave both positive and negative points.",
        "The answer is concise but still complete.",
      ],
      priorities: [
        "Use a slightly more academic phrase or example.",
        "Develop the drawback with one deeper explanation.",
      ],
      nextStep: "Try answering again and support your opinion with one real-life example.",
    },
    riskFlag: false,
    appealStatus: "reviewed",
    reviewStatus: "completed",
  },
];

export const dashboardMetrics: DashboardMetric[] = [
  { label: "会话总量", value: "128", helper: "最近 7 天学生练习记录" },
  { label: "异常案例", value: "9", helper: "已自动或人工标记为异常" },
  { label: "申诉数量", value: "4", helper: "待处理与已处理申诉总数" },
  { label: "当前规则版本", value: "v0.1", helper: "学生端评分骨架版本" },
];

export const promptVersions: PromptVersion[] = [
  {
    id: "prompt-v0.1",
    name: "v0.1 Skeleton Baseline",
    description: "当前骨架阶段使用的评分结构定义，强调总分、分项分和风险标记字段。",
    status: "current",
    updatedAt: "2026-03-24",
  },
  {
    id: "prompt-v0.0",
    name: "v0.0 Draft Logic",
    description: "最早期文档草案版本，仅用于定义评分字段和反馈模块。",
    status: "archived",
    updatedAt: "2026-03-22",
  },
];

export function getSessionById(sessionId: string) {
  return practiceSessions.find((session) => session.id === sessionId);
}

export function getQuestionConfig(part: string) {
  return practiceQuestionConfigs[part as SpeakingPart];
}

export function buildMockTranscript(part: SpeakingPart) {
  return practiceQuestionConfigs[part].mockTranscriptHint;
}

export function buildMockPracticeResponse(part: SpeakingPart, transcript?: string): MockPracticeResponse {
  const config = practiceQuestionConfigs[part];

  return {
    sessionId: config.resultSessionId,
    transcript: transcript?.trim() || config.mockTranscriptHint,
    processingSummary: "Mock ASR and scoring pipeline completed successfully.",
  };
}
