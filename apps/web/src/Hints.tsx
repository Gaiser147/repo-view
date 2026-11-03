import { useEffect, useLayoutEffect, useState } from "react";
import { store, useRepo } from "./state";

const steps = [
  {
    target: "lenses",
    title: "Start with a question",
    text: "Each lens re-inks the same plan: structure, risk, dependencies, change, pipelines or authors. Keys 1–6 switch lenses.",
  },
  {
    target: "graph",
    title: "Turn and zoom the plan",
    text: "Drag to orbit, scroll or pinch to zoom, right-drag to pan. Hover a point to preview it, click to inspect.",
  },
  {
    target: "history",
    title: "Move through revisions",
    text: "Click a commit to open it. Drag across several commits to compare two revisions in the Evolution lens.",
  },
];

/** Three short tips placed on the elements they describe, shown once after the first repository opens. */
export function Hints() {
  const { started, expanded, historyOpen } = useRepo(),
    [step, setStep] = useState<number>(() => {
      try {
        return localStorage.getItem("repo-view:hints") === "done" ? -1 : 0;
      } catch {
        return 0;
      }
    }),
    [box, setBox] = useState<DOMRect | null>(null);
  const current = step >= 0 ? steps[step] : undefined;
  useLayoutEffect(() => {
    if (!current) return;
    const place = () =>
      setBox(
        document
          .querySelector(`[data-hint="${current.target}"]`)
          ?.getBoundingClientRect() ?? null,
      );
    place();
    addEventListener("resize", place);
    return () => removeEventListener("resize", place);
  }, [current, historyOpen, started]);
  const finish = () => {
    setStep(-1);
    store("repo-view:hints", "done");
  };
  useEffect(() => {
    const restart = () => setStep(0);
    addEventListener("repo-view:hints", restart);
    return () => removeEventListener("repo-view:hints", restart);
  }, []);
  if (!started || expanded || !current || !box) return null;
  const below = current.target !== "history",
    width = Math.min(320, innerWidth - 32),
    left = Math.max(
      16,
      Math.min(
        innerWidth - width - 16,
        current.target === "graph"
          ? box.left + box.width / 2 - width / 2
          : current.target === "lenses"
            ? Math.max(
                box.left + 12,
                (document.querySelector(".lens-card")?.getBoundingClientRect()
                  .right ?? 0) + 12,
              )
            : box.left + 12,
      ),
    ),
    top =
      current.target === "graph"
        ? box.top + box.height * 0.58
        : below
          ? box.bottom + 12
          : box.top - 12;
  return (
    <aside
      className={`hint ${below ? "below" : "above"}`}
      role="dialog"
      aria-label={current.title}
      style={{
        left,
        top,
        width,
        transform: below ? undefined : "translateY(-100%)",
      }}
      onKeyDown={(e) => e.key === "Escape" && finish()}
    >
      <b>{current.title}</b>
      <p>{current.text}</p>
      <div>
        <button className="text-link" onClick={finish}>
          Skip tips
        </button>
        <span className="hint-step">
          {step + 1} / {steps.length}
        </span>
        <button
          className="primary-button small"
          autoFocus
          onClick={() =>
            step === steps.length - 1 ? finish() : setStep(step + 1)
          }
        >
          {step === steps.length - 1 ? "Got it" : "Next tip"}
        </button>
      </div>
    </aside>
  );
}
