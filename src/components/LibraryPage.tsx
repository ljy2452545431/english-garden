import { zh as t } from "../i18n/zh";
import resources from "../data/resources.json";
import { PageIntro } from "./PageIntro";
import { Leaf, Headphones, PenLine, ArrowUpRight, BookOpen } from "./icons";
import type { Skill } from "./Classroom";
export function LibraryPage({
  classroom,
}: {
  classroom: (skill: Skill) => void;
}) {
  return (
    <>
      <PageIntro
        eyebrow="A SHELF OF GOOD THINGS"
        title="需要的工具，都在花园里。"
        text={t.resourceNote}
      />
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
        <h2>完整试卷与评分</h2>
        <p>
          本站原创练习提供客观题批改、答案证据和错题复习。官方完整样题从上方官方入口获取；剑桥题册需要正版授权，本站不会公开复制付费试卷。
        </p>
        <p>
          正式听读写模拟应连续进行约 150 分钟，另安排口语。AI
          写作和口语反馈只作训练参考，不能替代真实考试成绩。
        </p>
        <p className="muted">
          要做到所有真题都直接在站内使用，需要相应的素材授权与可内嵌条件；目前完整授权试卷尚未导入。
        </p>
      </section>
    </>
  );
}
