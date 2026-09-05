"use client";
import { useEffect, useRef, useState } from "react";
import { SceneTransition, type SceneFrame } from "../scene-transition";

export function useSceneTransition(
  target: SceneFrame,
  onTransition?: (active: boolean) => void,
) {
  const transition = useRef<SceneTransition | null>(null);
  const [frame, setFrame] = useState(target);
  const active = frame !== target;
  useEffect(() => {
    onTransition?.(active);
  }, [active, onTransition]);
  useEffect(() => {
    const controller = transition.current ?? new SceneTransition(target);
    transition.current = controller;
    if (controller.target === target) return;
    controller.retarget(target, performance.now());
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    let request = 0;
    const tick = (now: number) => {
      const next = controller.sample(now, media?.matches);
      setFrame(next);
      if (next !== target) request = requestAnimationFrame(tick);
    };
    request = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(request);
  }, [target]);
  return { frame, active };
}
