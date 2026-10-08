import { useEffect, useRef, useState } from "react";
import {
  Sprout,
  Sun,
  ArrowUpRight,
  ArrowRight,
  Check,
  CalendarDays,
  BookOpen,
  Headphones,
  Heart,
  Palette,
  Library,
  Lock,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Flame,
  Leaf,
  PenLine,
  NotebookPen,
  Menu,
  X,
} from "./components/icons";
import { zh as t } from "./i18n/zh";
import curriculum from "./data/curriculum.json";
import plan from "./data/plan.json";

import type { WeeklyLesson, DailyPlan } from "./data/types";
import { useGarden } from "./hooks/useGarden";
import { dateKey, getCurrentDay, getStreak } from "./utils/learning";
import { configured } from "./server";
import { GardenCompanion } from "./components/GardenCompanion";
import { useGardenMotion } from "./hooks/useGardenMotion";
import { GardenScene } from "./components/GardenScene";
import { Timer } from "./components/Timer";
import { Classroom, type Skill } from "./components/Classroom";
import { Settings, defaults, type Preferences } from "./components/Settings";
import { Together } from "./components/Together";

import { PageIntro } from "./components/PageIntro";
import { Practice } from "./components/Practice";
import { PlanPage } from "./components/PlanPage";
import { LibraryPage } from "./components/LibraryPage";
type Page =
  | "today"
  | "plan"
  | "classroom"
  | "practice"
  | "together"
  | "library"
  | "settings";
const nav = [
  ["today", t.today, Sun],
  ["plan", t.plan, CalendarDays],
  ["classroom", t.classroom, BookOpen],
  ["practice", t.practice, NotebookPen],
  ["together", t.together, Heart],
  ["library", t.library, Library],
  ["settings", t.settings, Palette],
] as const;
const lessons = curriculum as WeeklyLesson[],
  days = plan as DailyPlan[];
function preferences(): Preferences {
  try {
    const p = JSON.parse(
      localStorage.getItem("english-garden.preferences") ?? "null",
    );
    if (p && ["garden", "cream", "rose", "ocean", "night"].includes(p.theme))
      return {
        ...defaults,
        ...p,
        order:
          Array.isArray(p.order) &&
          p.order.length === 4 &&
          new Set(p.order).size === 4 &&
          p.order.every((x: string) => defaults.order.includes(x))
            ? p.order
            : defaults.order,
      };
  } catch {}
  return defaults;
}
const daySkills: Skill[] = [
  "grammar",
  "listening",
  "reading",
  "writing",
  "listening",
  "reading",
  "speaking",
];
export default function App() {
  const garden = useGarden();
  const root = useRef<HTMLDivElement>(null);
  const [page, setPage] = useState<Page>("today"),
    [prefs, setPrefs] = useState<Preferences>(preferences),
    [selectedDay, setSelectedDay] = useState(0),
    [selectedWeek, setSelectedWeek] = useState(1),
    [skill, setSkill] = useState<Skill>("vocabulary"),
    [loginOpen, setLoginOpen] = useState(false),
    [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [loginError, setLoginError] = useState(""),
    [busy, setBusy] = useState(false),
    [menu, setMenu] = useState(false),
    [celebrate, setCelebrate] = useState(false);
  useGardenMotion(
    root,
    page,
    prefs.motion === "none" ? "none" : prefs.motion === "low" ? "low" : "full",
    garden.active,
  );
  const currentDay = getCurrentDay(garden.state.startDate),
    dayNumber = selectedDay || currentDay,
    day = days[dayNumber - 1],
    week = Math.ceil(dayNumber / 7),
    lesson = lessons[page === "classroom" ? selectedWeek - 1 : week - 1],
    isDone = garden.state.completed.includes(dayNumber);
  useEffect(() => {
    document.documentElement.dataset.theme = prefs.theme;
    document.documentElement.dataset.density = prefs.density;
    document.documentElement.dataset.motion = prefs.motion;
    document.documentElement.dataset.font = prefs.font;
    try {
      localStorage.setItem("english-garden.preferences", JSON.stringify(prefs));
    } catch {}
  }, [prefs]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [page]);
  useEffect(() => {
    if (!garden.active) setLoginOpen(false);
  }, [garden.active]);
  function navigate(next: Page) {
    setPage(next);
    setMenu(false);
  }
  function classroom(nextSkill: Skill, w = week) {
    setSelectedWeek(w);
    setSkill(nextSkill);
    navigate("classroom");
  }
  function checkin() {
    garden.update((prev) => ({
      ...prev,
      completed: isDone
        ? prev.completed.filter((x) => x !== dayNumber)
        : [...prev.completed, dayNumber],
      dates: isDone ? prev.dates : [...new Set([...prev.dates, dateKey()])],
    }));
    if (!isDone) {
      setCelebrate(true);
      setTimeout(() => setCelebrate(false), 2600);
    }
  }
  const tasks = [
    {
      key: "vocab",
      title: "温习几个词，把表达留下",
      time: 10,
      skill: "vocabulary" as Skill,
      Icon: Leaf,
    },
    {
      key: "main",
      title:
        dayNumber === 1
          ? "认识花园，写下自己的起点"
          : `${t[daySkills[(dayNumber - 1) % 7] as "grammar" | "listening" | "reading" | "writing" | "speaking"]} · ${lesson.title}`,
      time: 30,
      skill: daySkills[(dayNumber - 1) % 7],
      Icon: BookOpen,
    },
    {
      key: "speak",
      title: "轮流聊一聊，听见彼此的进步",
      time: 15,
      skill: "speaking" as Skill,
      Icon: Headphones,
    },
  ];
  const heading = nav.find(([key]) => key === page)?.[1];
  const modules: Record<string, React.ReactNode> = {
    tasks: (
      <section className="paper daily-tasks">
        <div className="row justify-between">
          <h2>{t.checklist}</h2>
          <span className="tag">60 {t.minutes}</span>
        </div>
        <p className="muted">
          10 分钟词卡 · 30 分钟主课 · 15 分钟口语 · 5 分钟记录
        </p>
        <div className="task-list">
          {tasks.map(({ key, title, time, skill, Icon }) => (
            <div className="task-row" key={key}>
              <button
                className={
                  "task-check " +
                  (garden.state.checks[`${dayNumber}.${key}`] ? "checked" : "")
                }
                aria-label={`${title}标记完成`}
                aria-pressed={Boolean(
                  garden.state.checks[`${dayNumber}.${key}`],
                )}
                onClick={() =>
                  garden.update((prev) => ({
                    ...prev,
                    checks: {
                      ...prev.checks,
                      [`${dayNumber}.${key}`]:
                        !prev.checks[`${dayNumber}.${key}`],
                    },
                  }))
                }
              >
                {garden.state.checks[`${dayNumber}.${key}`] && (
                  <Check size={16} />
                )}
              </button>
              <button className="task-open" onClick={() => classroom(skill)}>
                <span
                  className={
                    "task-icon " + (key === "main" ? "main-task" : key)
                  }
                >
                  <Icon size={20} />
                </span>
                <span>
                  <strong>{title}</strong>
                  <small>
                    {time} {t.minutes}
                  </small>
                </span>
                <ArrowUpRight size={18} />
              </button>
            </div>
          ))}
        </div>
        <div className="day-instruction">
          <strong>{t.partnerTask}</strong>
          <p>{day.speaking}</p>
          <details>
            <summary>{t.originalPlan}</summary>
            <p>{day.main}</p>
            <p>
              {t.output}：{day.output}
            </p>
            <p className="muted">
              原计划题册任务需要合法授权材料；本站提供相应技能的原创微练习，不能替代正式完整试卷。
            </p>
          </details>
        </div>
        <button
          className={"button w-full " + (isDone ? "secondary" : "primary")}
          onClick={checkin}
        >
          <Check size={18} />
          {isDone ? t.undo : t.checkin}
        </button>
      </section>
    ),
    timer: <Timer />,
    growth: (
      <section className="paper growth">
        <div className="row justify-between">
          <h2>{t.progress}</h2>
          <Sprout size={20} />
        </div>
        <div className="growth-stats">
          <div>
            <strong>
              {garden.state.completed.length}
              <small> / 336</small>
            </strong>
            <span>{t.daysDone}</span>
          </div>
          <div>
            <strong>{getStreak(garden.state.dates)}</strong>
            <span>{t.streak}</span>
          </div>
          <div>
            <strong>{Object.keys(garden.state.reviews).length}</strong>
            <span>{t.words}</span>
          </div>
        </div>
        <div className="progress-track">
          <i
            style={{ width: `${(garden.state.completed.length / 336) * 100}%` }}
          />
        </div>
        <p className="muted">今天留下的作品，会成为下次进步的起点。</p>
      </section>
    ),
    note: (
      <section className="paper">
        <div className="row">
          <PenLine size={19} />
          <h2>{t.note}</h2>
        </div>
        <textarea
          aria-label={t.note}
          value={garden.state.notes[`day.${dayNumber}`] ?? ""}
          maxLength={3000}
          placeholder={t.notePlaceholder}
          onChange={(e) =>
            garden.update((prev) => ({
              ...prev,
              notes: { ...prev.notes, [`day.${dayNumber}`]: e.target.value },
            }))
          }
        />
        <p className="muted">{garden.status}</p>
      </section>
    ),
  };
  return (
    <div className="app-shell" ref={root}>
      <aside className={"sidebar " + (menu ? "open" : "")}>
        <a
          className="brand"
          href="#today"
          onClick={(e) => {
            e.preventDefault();
            navigate("today");
          }}
        >
          <span className="brand-icon">
            <Sprout size={25} />
          </span>
          <div>
            <strong>{t.app}</strong>
            <small>{t.brand}</small>
          </div>
        </a>
        <span className="sidebar-caption">种下今天的小进步</span>
        <nav>
          {nav.map(([key, label, Icon]) => (
            <button
              key={key}
              className={page === key ? "active" : ""}
              onClick={() => navigate(key)}
            >
              <Icon size={20} />
              <span>{label}</span>
              {key === "together" && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="tiny-plant">
            <Sprout size={34} />
          </div>
          <p>
            {t.tagline}
            <br />
            一起，把英语变成日常。
          </p>
          <button
            className="connection-button"
            onClick={() => setLoginOpen(true)}
          >
            <Lock size={14} />
            {garden.auth ? t.private : t.local}
          </button>
          <a href="https://ljy2452545431.github.io/" className="blog-link">
            个人博客 <ArrowUpRight size={13} />
          </a>
        </div>
      </aside>
      {menu && (
        <button
          className="sidebar-backdrop"
          aria-label={t.close}
          onClick={() => setMenu(false)}
        />
      )}
      <main className="main">
        {garden.recovery && (
          <div className="notice">
            <p>发现未同步备份，请到“我的花园”选择恢复方式。</p>
            <button
              className="button secondary"
              onClick={() => navigate("settings")}
            >
              处理未同步记录
            </button>
          </div>
        )}
        <header className="topbar">
          <div className="row">
            <button
              className="icon-button mobile-menu"
              aria-label="展开菜单"
              onClick={() => setMenu(true)}
            >
              <Menu size={21} />
            </button>
            <span className="breadcrumb">
              我的学习花园 <span>/</span> <strong>{heading}</strong>
            </span>
          </div>
          <div className="row">
            <button
              className="icon-button theme-shortcut"
              aria-label={t.themes}
              onClick={() => navigate("settings")}
            >
              <Palette size={20} />
            </button>
            <button
              className="profile-button"
              onClick={() => setLoginOpen(true)}
            >
              <span className="avatar-small">
                {garden.state.nickname.slice(0, 1)}
              </span>
              <span>
                {garden.auth ? garden.auth.user.displayName : t.local}
              </span>
            </button>
          </div>
        </header>
        {!garden.active ? (
          <section className="welcome-gate">
            <div className="gate-copy">
              <span className="eyebrow">A LITTLE EVERY DAY</span>
              <h1>{t.gateTitle}</h1>
              <p>{t.gateDescription}</p>
              <div className="row flex-wrap">
                <button
                  className="button primary"
                  onClick={() => setLoginOpen(true)}
                >
                  <Lock size={17} />
                  {t.login}
                </button>
                <button className="button secondary" onClick={garden.preview}>
                  {t.preview}
                  <ArrowRight size={17} />
                </button>
              </div>
              <p className="muted mt-5">
                {configured ? t.loginIntro : t.notConfigured}
              </p>
            </div>
            <GardenScene />
            <div className="gate-badges">
              <span>
                <CalendarDays size={18} />
                48 周，336 个学习日
              </span>
              <span>
                <Heart size={18} />
                为两个人准备
              </span>
              <span>
                <Palette size={18} />
                五种风格，随心安排
              </span>
            </div>
          </section>
        ) : (
          <>
            {page === "today" && (
              <>
                <section className="hero">
                  <div className="hero-copy">
                    <div className="row">
                      <span className="eyebrow">OUR LITTLE ENGLISH GARDEN</span>
                      <span className="hero-chip">第 {week} 周</span>
                    </div>
                    <h1>
                      慢慢来，
                      <br />
                      也能走很远<span>。</span>
                    </h1>
                    <p>
                      今天，和搭档一起种下
                      <br className="mobile-br" />
                      属于你们的第 {dayNumber} 颗种子。
                    </p>
                    <button
                      className="button primary"
                      onClick={() => classroom(daySkills[(dayNumber - 1) % 7])}
                    >
                      {t.start}
                      <ArrowRight size={17} />
                    </button>
                    <div className="hero-meta">
                      <span>
                        <Flame size={14} />
                        每天 1 小时
                      </span>
                      <i />
                      <span>暂以雅思 6.0 为参考目标</span>
                    </div>
                  </div>
                  <GardenCompanion motion={prefs.motion} />
                  <span className="hero-handwritten">
                    a little better, together.
                  </span>
                </section>
                <div className="day-toolbar">
                  <div>
                    <strong>第 {String(dayNumber).padStart(3, "0")} 天</strong>
                    <span>{lesson.title}</span>
                  </div>
                  <div className="row">
                    <button
                      className="icon-button"
                      aria-label="前一天"
                      disabled={dayNumber === 1}
                      onClick={() => setSelectedDay(dayNumber - 1)}
                    >
                      <ChevronLeft size={18} />
                    </button>
                    <button className="pill" onClick={() => setSelectedDay(0)}>
                      {t.backToday}
                    </button>
                    <button
                      className="icon-button"
                      aria-label="后一天"
                      disabled={dayNumber === 336}
                      onClick={() => setSelectedDay(dayNumber + 1)}
                    >
                      <ChevronRight size={18} />
                    </button>
                  </div>
                </div>
                <div className="dashboard-grid">
                  {prefs.order.map((key) => (
                    <div className={"module module-" + key} key={key}>
                      {modules[key]}
                    </div>
                  ))}
                </div>
              </>
            )}
            {page === "plan" && (
              <PlanPage
                week={week}
                dayNumber={dayNumber}
                lessons={lessons}
                garden={garden}
                classroom={classroom}
                onDay={(n) => {
                  setSelectedDay(n);
                  navigate("today");
                }}
              />
            )}
            {page === "classroom" && (
              <>
                <PageIntro
                  eyebrow="GROW YOUR ENGLISH"
                  title="在这里，练一点真的英语。"
                  text={t.materialsNote}
                />
                <div className="lesson-week-picker">
                  <label htmlFor="lesson-week">本周课程</label>
                  <select
                    id="lesson-week"
                    value={selectedWeek}
                    onChange={(e) => setSelectedWeek(Number(e.target.value))}
                  >
                    {lessons.map((w) => (
                      <option value={w.week} key={w.week}>
                        第 {w.week} 周 · {w.title} · {w.level}
                      </option>
                    ))}
                  </select>
                </div>
                <Classroom
                  key={`${selectedWeek}.${skill}`}
                  lesson={lesson}
                  garden={garden}
                  initialSkill={skill}
                />
              </>
            )}
            {page === "practice" && <Practice garden={garden} week={week} />}
            {page === "together" && (
              <>
                <PageIntro
                  eyebrow="BETTER TOGETHER"
                  title="把小小的进步，分享给彼此。"
                  text="一句鼓励，一次耐心倾听，一段一起坚持的日子。"
                />
                <Together
                  garden={garden}
                  openLogin={() => setLoginOpen(true)}
                />
              </>
            )}
            {page === "library" && <LibraryPage classroom={classroom} />}
            {page === "settings" && (
              <>
                <PageIntro
                  eyebrow="MAKE IT FEEL LIKE YOU"
                  title="你的花园，你来安排。"
                  text="主题、布局、字号与动画，各自保存。没有哪一种风格是必须选的。"
                />
                <Settings prefs={prefs} setPrefs={setPrefs} garden={garden} />
              </>
            )}
          </>
        )}
        <footer className="page-footer">
          <Sprout size={15} />
          <span>一起学英语 · 从小小的坚持开始</span>
          <span className="footer-status">
            {garden.auth
              ? "私密空间 · " + garden.status
              : t.local + " · 无跨设备同步"}
          </span>
        </footer>
      </main>
      <nav className="bottom-nav" aria-label={t.mobileNavigation}>
        {nav
          .filter(([key]) =>
            ["today", "plan", "classroom", "together", "settings"].includes(
              key,
            ),
          )
          .map(([key, label, Icon]) => (
            <button
              className={page === key ? "active" : ""}
              aria-current={page === key ? "page" : undefined}
              key={key}
              onClick={() => {
                garden.active ? navigate(key) : setLoginOpen(true);
              }}
            >
              <Icon size={21} />
              <span>
                {key === "settings"
                  ? "我的"
                  : key === "classroom"
                    ? "课堂"
                    : key === "together"
                      ? "一起"
                      : key === "today"
                        ? "今日"
                        : "计划"}
              </span>
              <span className="sr-only">{label}</span>
            </button>
          ))}
      </nav>
      {loginOpen && (
        <div className="modal-backdrop" onClick={() => setLoginOpen(false)}>
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="login-title"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal-close icon-button"
              aria-label={t.close}
              onClick={() => setLoginOpen(false)}
            >
              <X size={21} />
            </button>
            <span className="modal-icon">
              <Lock size={27} />
            </span>
            <h2 id="login-title">{t.login}</h2>
            {garden.auth ? (
              <>
                <p>当前账号：{garden.auth.user.displayName}</p>
                <button
                  className="button secondary"
                  onClick={async () => {
                    try {
                      await garden.logout();
                      setLoginOpen(false);
                    } catch (e) {
                      setLoginError((e as Error).message);
                    }
                  }}
                >
                  <LogOut size={17} />
                  {t.logout}
                </button>
              </>
            ) : configured ? (
              <form
                className="stack"
                onSubmit={async (e) => {
                  e.preventDefault();
                  setBusy(true);
                  setLoginError("");
                  try {
                    await garden.login(username, password);
                    setPassword("");
                    setLoginOpen(false);
                  } catch (e) {
                    setLoginError((e as Error).message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <p className="muted">
                  仅预先创建的两个账号可进入。登录令牌仅保存在内存，刷新后需要重新登录。
                </p>
                <label htmlFor="username">{t.username}</label>
                <input
                  autoFocus
                  id="username"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                />
                <label htmlFor="password">{t.password}</label>
                <input
                  id="password"
                  autoComplete="current-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button className="button primary" disabled={busy}>
                  {busy ? "正在登录…" : t.login}
                </button>
              </form>
            ) : (
              <>
                <p className="muted">{t.notConfigured}</p>
                <button
                  className="button primary"
                  onClick={() => {
                    garden.preview();
                    setLoginOpen(false);
                  }}
                >
                  {t.preview}
                  <ArrowRight size={17} />
                </button>
              </>
            )}
            {loginError && (
              <p className="notice" role="alert">
                {loginError}
              </p>
            )}
          </section>
        </div>
      )}
      {celebrate && (
        <div className="celebration" role="status">
          <Sprout size={26} />
          <strong>今天的小种子，种下了。</strong>
          <span>不用走得很快，只要继续走。</span>
          {Array.from({ length: 9 }, (_, i) => (
            <i key={i} style={{ "--i": i } as React.CSSProperties} />
          ))}
        </div>
      )}
    </div>
  );
}
