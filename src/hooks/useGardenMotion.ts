import { useLayoutEffect, type RefObject } from "react";
import { gsap } from "gsap";

export type GardenMotion = "full" | "low" | "none";

const ENTER_SELECTOR =
  "[data-motion-enter], .hero-copy > *, .gate-copy > *, .page-intro > *";
const CARD_SELECTOR = "[data-motion-card], .paper, .week-card";
const PRESS_SELECTOR =
  "[data-motion-press], .button, .icon-button, .pill, .task-check, .theme-choice, .garden-water, .match-word, .sidebar nav button, .bottom-nav button, .skill-tabs button";

/** 动效始终局限在当前页面；减少动态效果或关闭动画时，内容直接可用。 */
export function useGardenMotion(
  rootRef: RefObject<HTMLElement | null>,
  pageKey: string,
  motion: GardenMotion,
  active: boolean,
) {
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || motion === "none") return;

    const media = gsap.matchMedia();
    media.add(
      {
        allowed: "(prefers-reduced-motion: no-preference)",
        finePointer: "(hover: hover) and (pointer: fine)",
      },
      (context) => {
        if (!context.conditions?.allowed) return;
        const full = motion === "full";
        const duration = full ? 0.56 : 0.18;
        // 异步观察器与事件产生的动画也登记在当前上下文，以便完整撤销。
        const animate = (callback: () => void) => context.add(callback);
        const enter = Array.from(
          root.querySelectorAll<HTMLElement>(ENTER_SELECTOR),
        ).slice(0, 10);
        gsap.fromTo(
          enter,
          { opacity: 0, y: full ? 16 : 0 },
          {
            opacity: 1,
            y: 0,
            duration,
            stagger: full ? 0.055 : 0,
            ease: "power3.out",
            overwrite: "auto",
            clearProps: "opacity,transform",
          },
        );

        const reveal = observeCards(root, animate, full);
        const releasePress = bindPress(root, animate, full);
        const removeParallax =
          full && context.conditions.finePointer
            ? bindHeroPointer(root)
            : () => {};
        const celebration = observeCelebration(root, animate, full);

        return () => {
          reveal?.disconnect();
          releasePress();
          removeParallax();
          celebration.disconnect();
        };
      },
      root,
    );

    return () => media.revert();
  }, [rootRef, pageKey, motion, active]);
}

type Animate = (callback: () => void) => void;

function observeCards(root: HTMLElement, animate: Animate, full: boolean) {
  if (typeof IntersectionObserver === "undefined") return null;
  // 不提前隐藏内容；只对前 12 张卡片首次进入视口时播放，长计划页保持轻量。
  const observer = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .map((entry) => entry.target);
      visible.forEach((card) => observer.unobserve(card));
      if (!visible.length) return;
      animate(() =>
        gsap.fromTo(
          visible,
          { opacity: 0, y: full ? 18 : 0 },
          {
            opacity: 1,
            y: 0,
            duration: full ? 0.5 : 0.18,
            stagger: full ? 0.045 : 0,
            ease: "power3.out",
            overwrite: "auto",
            clearProps: "opacity,transform",
          },
        ),
      );
    },
    { threshold: 0, rootMargin: "0px 0px -16px 0px" },
  );
  Array.from(root.querySelectorAll<HTMLElement>(CARD_SELECTOR))
    .slice(0, 12)
    .filter((card) => !card.parentElement?.closest(CARD_SELECTOR))
    .forEach((card) => observer.observe(card));
  return observer;
}

function bindPress(root: HTMLElement, animate: Animate, full: boolean) {
  let pressed: HTMLElement | null = null;
  const scales = new WeakMap<HTMLElement, (value:number)=>void>();
  const scaleTo = (target: HTMLElement, value: number) => {
    let setter = scales.get(target);
    if (!setter) {
      animate(() => { const x = gsap.quickTo(target, 'scaleX', { duration: .18, ease: 'power2.out' });
        const y = gsap.quickTo(target, 'scaleY', { duration: .18, ease: 'power2.out' });
        setter = value => { x(value); y(value); }; });
      if (setter) scales.set(target, setter);
    }
    setter?.(value);
  };
  const release = () => {
    if (!pressed) return;
    const target = pressed;
    pressed = null;
    scaleTo(target, 1);
  };
  const down = (event: PointerEvent) => {
    if (!full || event.button !== 0 || !(event.target instanceof Element))
      return;
    const target = event.target.closest<HTMLElement>(PRESS_SELECTOR);
    if (
      !target ||
      !root.contains(target) ||
      target.matches(':disabled, [aria-disabled="true"]')
    )
      return;
    release();
    pressed = target;
    scaleTo(target, .965);
  };
  root.addEventListener("pointerdown", down, { passive: true });
  window.addEventListener("pointerup", release, { passive: true });
  window.addEventListener("pointercancel", release, { passive: true });
  window.addEventListener("blur", release);
  return () => {
    root.removeEventListener("pointerdown", down);
    window.removeEventListener("pointerup", release);
    window.removeEventListener("pointercancel", release);
    window.removeEventListener("blur", release);
  };
}

function bindHeroPointer(root: HTMLElement) {
  const hero = root.querySelector<HTMLElement>(
    "[data-motion-hero], .hero, .welcome-gate",
  );
  const artwork = hero?.querySelector<SVGElement | HTMLElement>(
    "[data-motion-artwork], .garden-scene",
  );
  if (!hero || !artwork) return () => {};
  const x = gsap.quickTo(artwork, "x", { duration: 0.7, ease: "power3.out" });
  const y = gsap.quickTo(artwork, "y", { duration: 0.7, ease: "power3.out" });
  const move = (event: PointerEvent) => {
    if (event.pointerType === "touch") return;
    const rect = hero.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    x(
      gsap.utils.clamp(
        -8,
        8,
        ((event.clientX - rect.left) / rect.width - 0.5) * 16,
      ),
    );
    y(
      gsap.utils.clamp(
        -5,
        5,
        ((event.clientY - rect.top) / rect.height - 0.5) * 10,
      ),
    );
  };
  const leave = () => {
    x(0);
    y(0);
  };
  hero.addEventListener("pointermove", move, { passive: true });
  hero.addEventListener("pointerleave", leave, { passive: true });
  return () => {
    hero.removeEventListener("pointermove", move);
    hero.removeEventListener("pointerleave", leave);
  };
}

function observeCelebration(
  root: HTMLElement,
  animate: Animate,
  full: boolean,
) {
  const seen = new WeakSet<Element>();
  const play = (element: Element) => {
    if (seen.has(element)) return;
    seen.add(element);
    animate(() => {
      gsap.fromTo(
        element,
        { opacity: 0, y: full ? 12 : 0, scale: full ? 0.96 : 1 },
        {
          opacity: 1,
          y: 0,
          scale: 1,
          duration: full ? 0.42 : 0.18,
          ease: "power3.out",
          overwrite: "auto",
          clearProps: "opacity,transform",
        },
      );
      if (!full) return;
      const particles = Array.from(
        element.querySelectorAll<HTMLElement>("[data-motion-particle], i"),
      ).slice(0, 9);
      gsap.fromTo(
        particles,
        { x: 0, y: 0, opacity: 1, scale: 0.5 },
        {
          x: (index) => Math.cos((index / 9) * Math.PI * 2) * 56,
          y: (index) => Math.sin((index / 9) * Math.PI * 2) * 36 - 12,
          opacity: 0,
          scale: 1,
          duration: 0.75,
          stagger: 0.025,
          ease: "power2.out",
          overwrite: "auto",
        },
      );
    });
  };
  const selector = "[data-motion-celebration], .celebration";
  root.querySelectorAll(selector).forEach(play);
  const observer = new MutationObserver((records) => {
    records.forEach((record) =>
      record.addedNodes.forEach((node) => {
        if (!(node instanceof Element)) return;
        if (node.matches(selector)) play(node);
        else node.querySelectorAll(selector).forEach(play);
      }),
    );
  });
  observer.observe(root, { childList: true, subtree: true });
  return observer;
}
