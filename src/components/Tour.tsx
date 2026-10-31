import { useEffect, useLayoutEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { navTabs, type Tab } from "./BottomNav";

const poses = {
  celebrate: "/assets/cashew-08-celebrate.svg",
  hiker: "/assets/cashew-10-hiker.svg",
  summit: "/assets/cashew-09-summit.svg",
  "stuffed-cheeks": "/assets/cashew-06-stuffed-cheeks.svg",
  "loved-it": "/assets/cashew-02-loved-it.svg",
  default: "/assets/cashew-01-default.svg",
};

type Step = {
  tab: Tab; // page shown behind the overlay
  target?: string; // matches a data-tour attribute; no target = Cashew in the center
  pose: keyof typeof poses;
  text: string;
};

const steps: Step[] = [
  { tab: "feed", pose: "celebrate", text: "Hey, I'm Cashew! Let me show you around." },
  { tab: "feed", target: "nav-log", pose: "hiker", text: "Just finished a hike? Log it here!" },
  { tab: "accomplishments", target: "mountain", pose: "summit", text: "You'll place each hike on your mountain. Your favorite sits at the summit." },
  { tab: "accomplishments", target: "nav-accomplishments", pose: "stuffed-cheeks", text: "Every hike earns an ingredient for your jar. Views get chocolate, climbs get almonds, and more!" },
  { tab: "feed", target: "nav-feed", pose: "loved-it", text: "This is where you see your friends' hikes. Like and comment away!" },
  { tab: "profile", target: "nav-profile", pose: "default", text: "Your profile shows your mountain and your mix." },
  { tab: "feed", pose: "celebrate", text: "That's it! Go log your first hike." },
];

const GUTTER = 16; // keep the callout this far from the screen edges
const TOP_BAR = 60; // room for the Skip link
const MASCOT_W = window.innerWidth <= 360 ? 104 : 136; // keep in step with .tour-mascot
const NAV_SPOT = 84; // diameter of the raised white circle behind a nav tab

type Box = { left: number; top: number; width: number; height: number };

function sameBox(a: Box | null, b: Box | null) {
  if (!a || !b) return a === b;
  return a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;
}

export default function Tour({
  onShowTab,
  onFinish,
}: {
  onShowTab: (tab: Tab) => void;
  onFinish: (next?: Tab) => void;
}) {
  const [index, setIndex] = useState(0);
  const [target, setTarget] = useState<Box | null>(null);
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });
  const step = steps[index];
  const isLast = index === steps.length - 1;
  const navTab = step.target?.startsWith("nav-") ? navTabs.find((tab) => `nav-${tab.id}` === step.target) : undefined;

  // Switch the page behind the tour in the same update as the step, so the target is on screen when it's measured
  const goTo = (nextIndex: number) => {
    setIndex(nextIndex);
    onShowTab(steps[nextIndex].tab);
  };

  useEffect(() => {
    onShowTab(steps[0].tab);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Lock the page behind the tour: no scrolling, and no tapping or tabbing into it
  useEffect(() => {
    const root = document.getElementById("root");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    root?.setAttribute("inert", "");
    return () => {
      document.body.style.overflow = previousOverflow;
      root?.removeAttribute("inert");
    };
  }, []);

  // Track the highlighted element every frame so the spotlight follows tab switches, fonts loading and resizes
  useLayoutEffect(() => {
    setTarget(null);
    let frame = 0;
    let last: Box | null = null;
    const measure = () => {
      const element = step.target ? document.querySelector(`[data-tour="${step.target}"]`) : null;
      const rect = element?.getBoundingClientRect();
      const next = rect && rect.width > 0 ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : null;
      if (!sameBox(next, last)) {
        last = next;
        setTarget(next);
      }
      setViewport((current) =>
        current.w === window.innerWidth && current.h === window.innerHeight ? current : { w: window.innerWidth, h: window.innerHeight },
      );
      frame = requestAnimationFrame(measure);
    };
    measure();
    return () => cancelAnimationFrame(frame);
  }, [step.target]);

  const next = () => {
    if (!isLast) goTo(index + 1);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onFinish();
      if (event.key === "Enter" || event.key === " " || event.key === "ArrowRight") {
        event.preventDefault();
        next();
      }
      if (event.key === "ArrowLeft" && index > 0) goTo(index - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  // Spotlight: a raised white circle for nav tabs, a padded cut-out for anything else.
  // With no target it shrinks to nothing in the middle, so the overlay covers everything.
  let spot: Box = { left: viewport.w / 2, top: viewport.h / 2, width: 0, height: 0 };
  if (target && navTab) {
    const centerY = Math.min(target.top + target.height / 2 - 10, viewport.h - NAV_SPOT / 2 - 6);
    spot = { left: target.left + target.width / 2 - NAV_SPOT / 2, top: centerY - NAV_SPOT / 2, width: NAV_SPOT, height: NAV_SPOT };
  } else if (target) {
    spot = { left: target.left - 6, top: target.top - 6, width: target.width + 12, height: target.height + 12 };
  }

  const waitingForTarget = !!step.target && !target;
  const centerX = spot.left + spot.width / 2;

  // Callout (Cashew + bubble) goes on whichever side of the spotlight has more room,
  // with Cashew nearest the target so he never sits on top of it
  let callout: { style: CSSProperties; placement: "above" | "below"; mascotSide: "left" | "right" } | null = null;
  if (target) {
    const width = Math.min(340, viewport.w - GUTTER * 2);
    const spaceAbove = spot.top - TOP_BAR;
    const spaceBelow = viewport.h - (spot.top + spot.height) - GUTTER;
    const placement = spaceAbove >= spaceBelow ? "above" : "below";
    const mascotSide = centerX < viewport.w / 2 ? "left" : "right";
    const left =
      mascotSide === "left"
        ? Math.min(Math.max(centerX - MASCOT_W / 2, GUTTER), viewport.w - GUTTER - width)
        : Math.max(Math.min(centerX + MASCOT_W / 2, viewport.w - GUTTER), width + GUTTER) - width;
    callout = {
      placement,
      mascotSide,
      style:
        placement === "above"
          ? { left, width, bottom: viewport.h - spot.top + 10 }
          : { left, width, top: spot.top + spot.height + 12 },
    };
  }

  return createPortal(
    <div aria-label="TrailMix tour" aria-modal="true" className="tour" role="dialog">
      <div
        className={`tour-spot ${navTab ? "nav" : ""} ${waitingForTarget ? "waiting" : ""}`}
        style={{ left: spot.left, top: spot.top, width: spot.width, height: spot.height }}
      >
        {navTab && target && (
          <span className="tour-nav-tab">
            {navTab.icon}
            <span>{navTab.label}</span>
          </span>
        )}
      </div>

      {/* Catches every tap so nothing behind the tour can be pressed */}
      <div aria-hidden="true" className="tour-catcher" onClick={next} />

      {!isLast && (
        <button className="tour-skip" onClick={() => onFinish()} type="button">Skip</button>
      )}

      {!step.target && (
        <div className="tour-center" key={`center-${index}`}>
          <div aria-live="polite" className="tour-bubble">
            {step.text}
            {!isLast && <small>Tap anywhere to continue</small>}
            <span className="tour-tail" />
          </div>
          <img alt="Cashew the squirrel" src={poses[step.pose]} />
          {isLast && (
            <div className="tour-actions">
              <button className="primary-button" onClick={() => onFinish("log")} type="button">
                Log a hike
                <span aria-hidden="true">→</span>
              </button>
              <button className="tour-link" onClick={() => onFinish()} type="button">I'll look around</button>
            </div>
          )}
        </div>
      )}

      {/* step.target too: the previous step's target can linger for a frame */}
      {callout && step.target && (
        <div
          className={`tour-callout ${callout.placement} mascot-${callout.mascotSide}`}
          key={`callout-${index}`}
          style={callout.style}
        >
          <img alt="Cashew the squirrel" className="tour-mascot" src={poses[step.pose]} />
          <div aria-live="polite" className="tour-bubble">
            {step.text}
            <small>Tap anywhere to continue</small>
            <span className="tour-tail" />
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}
