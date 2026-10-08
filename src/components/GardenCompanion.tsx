import { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { Leaf, ArrowUpRight } from "./icons";
import { GardenScene } from "./GardenScene";
import { zh as t } from "../i18n/zh";

/** 浇水是本机的小互动，不修改打卡、分数或搭档的真实状态。 */
export function GardenCompanion({ motion }: { motion: string }) {
  const root = useRef<HTMLDivElement>(null);
  const context = useRef<gsap.Context | null>(null);
  const waterTimeline = useRef<gsap.core.Timeline | null>(null);
  const [watered, setWatered] = useState(false);
  useEffect(() => {
    if (motion !== "full") return;
    const media = gsap.matchMedia();
    media.add(
      "(prefers-reduced-motion: no-preference)",
      (ctx) => {
        context.current = ctx;
        return () => {
          context.current = null;
          waterTimeline.current = null;
        };
      },
      root,
    );
    return () => {
      media.revert();
    };
  }, [motion]);
  function water() {
    setWatered(true);
    const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (motion !== "full" || reduced) return;
    if (waterTimeline.current) { waterTimeline.current.invalidate().restart(); return; }
    context.current?.add(() => {
      const leaves = root.current?.querySelectorAll(".sway");
      const drops = root.current?.querySelectorAll(".water-drop");
      if (!leaves || !drops) return;
      gsap.killTweensOf([leaves, drops]);
      waterTimeline.current = gsap
        .timeline()
        .fromTo(
          drops,
          { y: -34, autoAlpha: 0 },
          {
            y: 24,
            autoAlpha: 1,
            duration: 0.45,
            stagger: 0.06,
            ease: "power1.in",
          },
        )
        .to(drops, { autoAlpha: 0, duration: 0.15 }, "-=.08")
        .to(
          leaves,
          {
            rotation: -6,
            svgOrigin: "225 204",
            duration: 0.2,
            ease: "power2.out",
          },
          "<",
        )
        .to(leaves, { rotation: 0, duration: 0.7, ease: "elastic.out(1, .5)" });
    });
  }
  return (
    <div className="garden-companion" ref={root}>
      <div className="garden-stage" data-motion-parallax>
        <div className="garden-orbit" aria-hidden="true" />
        <GardenScene />
        <div className="water-drops" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <i className="water-drop" key={i} />
          ))}
        </div>
      </div>
      <button
        type="button"
        className="garden-water"
        onClick={water}
        aria-label={t.waterGarden}
      >
        <Leaf size={15} />
        {t.waterGarden}
        <ArrowUpRight size={14} />
      </button>
      <span className="garden-whisper" role="status">
        {watered ? t.waterEncouragement : t.gardenEncouragement}
      </span>
    </div>
  );
}
