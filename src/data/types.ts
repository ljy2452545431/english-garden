/** 原创课程选择题契约；判断、匹配、填空均以备选答案呈现。 */
export interface Question {
  id: string;
  prompt: string;
  options: string[];
  /** 从 0 开始的正确选项索引。 */
  answer: number;
  explanation: string;
}

export interface WeeklyLesson {
  week: number;
  title: string;
  level: string;
  grammar: {
    title: string;
    explanation: string;
    examples: string[];
    questions: Question[];
  };
  vocabulary: { word: string; meaning: string; example: string; partOfSpeech: string }[];
  reading: { title: string; text: string; questions: Question[] };
  listening: { title: string; text: string; questions: Question[] };
  writing: { task1: string; task2: string };
  speaking: { part1: string[]; part2: string; part3: string[] };
}

/** 保留 Word 计划的原始字段；以 week 对应站内课程。 */
export interface DailyPlan {
  week: number;
  day: number;
  main: string;
  speaking: string;
  output: string;
}

export interface LearningResource {
  title: string;
  category: string;
  description: string;
  url: string;
  licenseNote: string;
}
