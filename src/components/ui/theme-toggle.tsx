"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useCallback, useRef, useSyncExternalStore } from "react";
import { flushSync } from "react-dom";

const emptySubscribe = () => () => undefined;
const transitionDuration = 520;

function AnimatedThemeButton({ className, showLabel = false }: { className: string; showLabel?: boolean }) {
  const { resolvedTheme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isDark = mounted && resolvedTheme === "dark";

  const toggleTheme = useCallback(() => {
    const button = buttonRef.current;
    if (!mounted || !button) return;

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

    const viewportWidth = window.visualViewport?.width ?? window.innerWidth;
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight;
    const { top, left, width, height } = button.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const maxRadius = Math.hypot(
      Math.max(x, viewportWidth - x),
      Math.max(y, viewportHeight - y),
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

    transition.finished.finally(cleanup);
    transition.ready.then(() => {
      root.animate(
        { clipPath },
        {
          duration: transitionDuration,
          easing: "ease-in-out",
          fill: "forwards",
          pseudoElement: "::view-transition-new(root)",
        } as KeyframeAnimationOptions,
      );
    });
  }, [isDark, mounted, setTheme]);

  return (
    <button
      type="button"
      ref={buttonRef}
      className={className}
      aria-label={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      aria-pressed={isDark}
      disabled={!mounted}
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
