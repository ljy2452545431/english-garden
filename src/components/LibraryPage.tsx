import { appearanceText as a } from "../i18n/appearance";
import { zh as t } from "../i18n/zh";
import resources from "../data/resources.json";
import { PageIntro } from "./PageIntro";
import { Leaf, Headphones, PenLine, ArrowUpRight, BookOpen } from "./icons";
import type { Skill } from "./Classroom";
export function LibraryPage({
  classroom,
  practice,
}: {
  classroom: (skill: Skill) => void;
  practice: () => void;
}) {
  return (
    <>
      <PageIntro eyebrow="" title={a.libraryTitle} text={t.resourceNote} />
      <div className="library-tools">
        {[
          [Leaf, "词卡与间隔复习", "不需要另外安装背词软件。", "vocabulary"],
          [
            Headphones,
            "朗读与口语录音",
            "浏览器内直接练习和回听。",
            "speaking",
          ],
          [PenLine, "写作草稿与反馈", "独立写作，再接收参考建议。", "writing"],
        ].map(([Icon, title, text, next]) => {
          const I = Icon as typeof Leaf;
          return (
            <button
              className="paper tool-card"
              key={title as string}
              onClick={() => classroom(next as Skill)}
            >
              <I size={24} />
              <h3>{title as string}</h3>
              <p>{text as string}</p>
              <ArrowUpRight size={18} />
            </button>
          );
        })}
      </div>
      <section className="paper">
        <h2>官方资料与考试入口</h2>
        <div className="resource-list">
          {resources.map((r, i) => (
            <a
              key={i}
              href={r.url}
              target="_blank"
              rel="noreferrer"
              className="resource-row"
            >
              <div className="resource-icon">
                <BookOpen size={21} />
              </div>
              <div>
                <span className="tag">{r.category}</span>
                <h3>{r.title}</h3>
                <p>{r.description}</p>
                <small>{r.licenseNote}</small>
              </div>
              <ArrowUpRight size={19} />
            </a>
          ))}
        </div>
      </section>
      <section className="paper mt-5">
        <h2>详细学习计划</h2>
        <p>
          336 天的任务、双人练习方法与阶段验收标准，整理成可保存的 Word 文档。
        </p>
        <a
          className="button secondary"
          href={`${import.meta.env.BASE_URL}learning-plan.docx`}
          download="双人英语与雅思学习计划_48周每日版.docx"
        >
          下载 48 周每日学习计划（Word）
        </a>
      </section>
      <section className="paper mt-5">
        <h2>{t.officialPractice}</h2>
        <p>{t.officialLibraryNote}</p>
        <button className="button primary" onClick={practice}>
          {t.officialPractice}
          <ArrowUpRight size={18} />
        </button>
      </section>
    </>
  );
}
