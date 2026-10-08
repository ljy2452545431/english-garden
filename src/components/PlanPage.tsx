import { zh as t } from "../i18n/zh";
import { PageIntro } from "./PageIntro";
import { Check, ArrowRight } from "./icons";
import type { Skill } from "./Classroom";
import type { Garden } from "../hooks/useGarden";
import type { WeeklyLesson } from "../data/types";
export function PlanPage({
  week,
  dayNumber,
  lessons,
  garden,
  onDay,
  classroom,
}: {
  week: number;
  dayNumber: number;
  lessons: WeeklyLesson[];
  garden: Garden;
  onDay: (day: number) => void;
  classroom: (skill: Skill, week: number) => void;
}) {
  return (
    <>
      <PageIntro
        eyebrow="ONE DAY AT A TIME"
        title="让进步，有迹可循。"
        text="48 周，从基础句子到雅思准备。按自己的节奏走，阶段未达标就多留几周。"
      />
      <div className="phases">
        {[
          "第 1–12 周 · 扎根基础",
          "第 13–24 周 · 积累表达",
          "第 25–36 周 · 认识雅思",
          "第 37–48 周 · 整合与复核",
        ].map((phase, i) => (
          <span
            className={week > i * 12 && week <= (i + 1) * 12 ? "active" : ""}
            key={phase}
          >
            {phase}
          </span>
        ))}
      </div>
      <div className="week-grid">
        {lessons.map((w) => (
          <article className="week-card" key={w.week}>
            <div className="row justify-between">
              <span className="eyebrow">
                WEEK {String(w.week).padStart(2, "0")}
              </span>
              <span className="tag">{w.level}</span>
            </div>
            <h3>{w.title}</h3>
            <p>{w.grammar.title}</p>
            <div className="week-days">
              {Array.from(
                { length: 7 },
                (_, i) => (w.week - 1) * 7 + i + 1,
              ).map((n) => (
                <button
                  className={
                    (garden.state.completed.includes(n) ? "done" : "") +
                    (dayNumber === n ? " current" : "")
                  }
                  key={n}
                  aria-label={`第 ${n} 天`}
                  onClick={() => {
                    onDay(n);
                  }}
                >
                  {garden.state.completed.includes(n) ? <Check size={14} /> : n}
                </button>
              ))}
            </div>
            <button
              className="text-button"
              onClick={() => classroom("vocabulary", w.week)}
            >
              {t.viewWeek}
              <ArrowRight size={16} />
            </button>
          </article>
        ))}
      </div>
    </>
  );
}
