"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useRef, useSyncExternalStore, type MouseEvent } from "react";
import { flushSync } from "react-dom";

const emptySubscribe = () => () => undefined;
const transitionDuration = 520;

function AnimatedThemeButton({ className, showLabel = false }: { className: string; showLabel?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const themeReady = mounted && (resolvedTheme === "light" || resolvedTheme === "dark");
  const isDark = themeReady && resolvedTheme === "dark";

  const toggleTheme = useCallback((event: MouseEvent<HTMLButtonElement>) => {
    const button = buttonRef.current;
    if (!themeReady || !button) return;

    const nextTheme = isDark ? "light" : "dark";
    const root = document.documentElement;
    const applyTheme = () => {
      root.classList.toggle("dark", nextTheme === "dark");
      setTheme(nextTheme);
    };

    if (
      typeof document.startViewTransition !== "function" ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      applyTheme();
      return;
    }

    const visualViewport = window.visualViewport;
    const viewportLeft = visualViewport?.offsetLeft ?? 0;
    const viewportTop = visualViewport?.offsetTop ?? 0;
    const viewportWidth = visualViewport?.width ?? window.innerWidth;
    const viewportHeight = visualViewport?.height ?? window.innerHeight;
    const { top, left, width, height } = button.getBoundingClientRect();
    const pointerTriggered = event.detail > 0 && (event.clientX !== 0 || event.clientY !== 0);
    const x = viewportLeft + (pointerTriggered ? event.clientX : left + width / 2);
    const y = viewportTop + (pointerTriggered ? event.clientY : top + height / 2);
    const viewportRight = viewportLeft + viewportWidth;
    const viewportBottom = viewportTop + viewportHeight;
    const maxRadius = Math.hypot(
      Math.max(x - viewportLeft, viewportRight - x),
      Math.max(y - viewportTop, viewportBottom - y),
    );
    const clipPath = [
      `circle(0px at ${x}px ${y}px)`,
      `circle(${maxRadius}px at ${x}px ${y}px)`,
    ];

    root.dataset.magicuiThemeVt = "active";
    root.style.setProperty("--magicui-theme-toggle-vt-duration", `${transitionDuration}ms`);

    const cleanup = () => {
      delete root.dataset.magicuiThemeVt;
      root.style.removeProperty("--magicui-theme-toggle-vt-duration");
    };

    const transition = document.startViewTransition(() => {
      flushSync(applyTheme);
    });

    let revealAnimation: Animation | undefined;
    transition.finished.finally(() => {
      revealAnimation?.cancel();
      cleanup();
    });
    transition.ready.then(() => {
      revealAnimation = root.animate(
        { clipPath },
        {
          duration: transitionDuration,
          easing: "ease-in-out",
          fill: "forwards",
          pseudoElement: "::view-transition-new(root)",
        } as KeyframeAnimationOptions,
      );
    });
  }, [isDark, setTheme, themeReady]);

  return (
    <button
      type="button"
      ref={buttonRef}
      className={className}
      aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      aria-pressed={isDark}
      disabled={!themeReady}
      onClick={toggleTheme}
    >
      {isDark ? <Sun aria-hidden="true" /> : <Moon aria-hidden="true" />}
      {showLabel ? <span>{isDark ? "라이트" : "다크"}</span> : null}
    </button>
  );
}

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  return <AnimatedThemeButton className={compact ? "icon-button" : "theme-toggle"} showLabel={!compact} />;
}

export function DockThemeToggle() {
  return <AnimatedThemeButton className="dock-action" showLabel />;
}
