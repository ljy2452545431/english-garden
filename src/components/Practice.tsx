import { useState } from "react";
import { zh as t } from "../i18n/zh";
import type { Garden } from "../hooks/useGarden";
import { dateKey } from "../utils/learning";
import curriculum from "../data/curriculum.json";
import type { WeeklyLesson } from "../data/types";
import { PageIntro } from "./PageIntro";
import { Quiz } from "./Quiz";
import { WordGame } from "./WordGame";
import { Leaf } from "./icons";
const lessons = curriculum as WeeklyLesson[];
export function Practice({ garden, week }: { garden: Garden; week: number }) {
  const [mode, setMode] = useState<"weekly" | "wrong">("weekly");
  const lesson = lessons[week - 1];
  const selected = lessons
    .flatMap((l) => [
      ...l.reading.questions,
      ...l.listening.questions,
      ...l.grammar.questions,
    ])
    .filter((q) =>
      Object.values(garden.state.attempts).some((a) =>
        a.wrongIds.includes(q.id),
      ),
    );
  const questions =
    mode === "wrong"
      ? selected
      : [
          ...lesson.reading.questions,
          ...lesson.listening.questions,
          ...lesson.grammar.questions,
        ];
  return (
    <>
      <PageIntro
        eyebrow="PRACTICE MAKES PROGRESS"
        title="知道哪里不会，就是进步的开始。"
        text={t.examNote}
      />
      <WordGame words={lesson.vocabulary} />
      <div className="row mb-5 mt-5">
        <button
          className={"pill " + (mode === "weekly" ? "active" : "")}
          onClick={() => setMode("weekly")}
        >
          {t.exam} · 第 {week} 周
        </button>
        <button
          className={"pill " + (mode === "wrong" ? "active" : "")}
          onClick={() => setMode("wrong")}
        >
          {t.wrong}（{selected.length}）
        </button>
      </div>
      <section className="paper">
        {mode === "weekly" && (
          <>
            <h2>本周信息阅读材料</h2>
            <div className="reading-text english">
              <h3>{lesson.reading.title}</h3>
              <p>{lesson.reading.text}</p>
              <h3>{lesson.listening.title} · 文本版</h3>
              <p>{lesson.listening.text}</p>
            </div>
            <p className="muted">
              本页综合检测采用文本版听力内容；要练听辨，请进入课堂听力模块。
            </p>
          </>
        )}
        {questions.length ? (
          <Quiz
            key={`${mode}.${week}`}
            questions={questions}
            savedAnswers={garden.state.answers[`exam.${week}.${mode}`] ?? {}}
            onAnswers={(answers) =>
              garden.update((prev) => ({
                ...prev,
                answers: { ...prev.answers, [`exam.${week}.${mode}`]: answers },
              }))
            }
            onResult={(r) =>
              garden.update((prev) => ({
                ...prev,
                attempts: {
                  ...prev.attempts,
                  [`exam.${week}.${mode}`]: {
                    correct: r.correct,
                    total: r.total,
                    wrongIds: r.wrongIds,
                    date: dateKey(),
                  },
                },
              }))
            }
          />
        ) : (
          <div className="empty-state">
            <Leaf size={35} />
            <p>{t.noWrong}</p>
          </div>
        )}
      </section>
    </>
  );
}
