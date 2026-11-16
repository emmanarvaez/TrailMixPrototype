import { createContext, useContext, useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

// Cashew's tips for the Log a Hike flow, in the same spotlight style as the home tour.
// Each screen renders <LogTips ids={[...]} /> for the tips it holds and marks its elements
// with data-tip="…". The first time a tip's element is on screen, the page dims, the
// element is spotlit and Cashew explains it until "Got it" is tapped. Seen tips are saved
// per user in Supabase.

const poses = {
  default: "/assets/cashew-01-default.svg",
  "loved-it": "/assets/cashew-02-loved-it.svg",
  "its-fine": "/assets/cashew-03-its-fine.svg",
  thinking: "/assets/cashew-05-thinking.svg",
  "stuffed-cheeks": "/assets/cashew-06-stuffed-cheeks.svg",
  toss: "/assets/cashew-07-toss.svg",
  celebrate: "/assets/cashew-08-celebrate.svg",
  summit: "/assets/cashew-09-summit.svg",
  hiker: "/assets/cashew-10-hiker.svg",
};

type Tip = {
  targets: string[]; // data-tip names; the spotlight covers all of them
  pose: keyof typeof poses;
  text: string;
};

// Keys are what's saved in profiles.seen_tips
export const TIPS = {
  "log-trail-search": { targets: ["trail-search"], pose: "hiker", text: "Search for the trail you hiked. We've got real OC trails!" },
  "log-reaction": { targets: ["reaction"], pose: "thinking", text: "How did it feel? Go with your gut." },
  "log-difficulty": { targets: ["difficulty"], pose: "its-fine", text: "How hard was it for you? There's no wrong answer." },
  "log-mountain": { targets: ["mountain"], pose: "summit", text: "Drag your hike up or down. Your favorite sits at the summit!" },
  "log-photos": { targets: ["add-photo"], pose: "loved-it", text: "Add at least one photo or video. You can add up to 20!" },
  "log-caption": { targets: ["caption"], pose: "default", text: "Say something about your hike, or leave it blank." },
  "log-tag": { targets: ["tag-friends"], pose: "celebrate", text: "Hiked with friends? Tag them so it shows on their profile too." },
  "log-ingredients": {
    targets: ["ingredients"],
    pose: "stuffed-cheeks",
    text: "Pick what this hike had. Each tag adds an ingredient to your jar, like Scenery = cashews!",
  },
  "log-ingredients-locked": { targets: ["locked-ingredient"], pose: "stuffed-cheeks", text: "Grayed out ones unlock as you log more hikes." },
  "log-jar": { targets: ["jar", "jar-progress"], pose: "toss", text: "Into the jar! Every 2 hikes unlocks a new ingredient." },
  "log-share": { targets: ["share-download"], pose: "celebrate", text: "Want to show it off? Download this for your story!" },
} satisfies Record<string, Tip>;

export type TipId = keyof typeof TIPS;
const ALL_TIPS = Object.keys(TIPS) as TipId[];

type TipsContextValue = {
  seen: string[] | null; // null while loading
  active: boolean; // the Log a Hike tab is showing and nothing else (like the home tour) is
  markSeen: (ids: string[]) => void;
};

export const TipsContext = createContext<TipsContextValue | null>(null);

const GUTTER = 16; // keep the callout this far from the screen edges
const TOP_BAR = 24; // keep the callout clear of the top edge
const GAP = 12; // between the spotlight and the callout
const PAD = 6; // spotlight padding around the element
const CALLOUT_ESTIMATE = 210; // before the callout has been measured

type Box = { left: number; top: number; width: number; height: number };

function sameBox(a: Box | null, b: Box | null) {
  if (!a || !b) return a === b;
  return a.left === b.left && a.top === b.top && a.width === b.width && a.height === b.height;
}

// The box around every on-screen element for a tip, or null if none are showing
function measure(targets: string[]): Box | null {
  const rects = targets
    .flatMap((name) => [...document.querySelectorAll(`[data-tip="${name}"]`)])
    .map((element) => element.getBoundingClientRect())
    .filter((rect) => rect.width > 0 && rect.height > 0);
  if (!rects.length) return null;
  const left = Math.min(...rects.map((rect) => rect.left));
  const top = Math.min(...rects.map((rect) => rect.top));
  const right = Math.max(...rects.map((rect) => rect.right));
  const bottom = Math.max(...rects.map((rect) => rect.bottom));
  return { left, top, width: right - left, height: bottom - top };
}

/** Shows the first of these tips the user hasn't seen, once its element is on screen. */
export default function LogTips({ ids, ready = true }: { ids: TipId[]; ready?: boolean }) {
  const tips = useContext(TipsContext);
  const [current, setCurrent] = useState<TipId | null>(null);
  const pending = tips && tips.active && tips.seen && ready ? ids.filter((id) => !tips.seen!.includes(id)) : [];
  const pendingKey = pending.join(",");

  // Wait for a pending tip's element to appear (some only show up later, like the mountain
  // or a locked card), then give the screen a moment to settle before dimming it
  useEffect(() => {
    if (current || !pendingKey) return;
    const waiting = pendingKey.split(",") as TipId[];
    let frame = 0;
    let timer = 0;
    const look = () => {
      const found = waiting.find((id) => measure(TIPS[id].targets));
      if (found) timer = window.setTimeout(() => setCurrent(found), 450);
      else frame = requestAnimationFrame(look);
    };
    look();
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [current, pendingKey]);

  if (!tips || !current || !pending.includes(current)) return null;
  return (
    <TipOverlay
      key={current}
      onDone={() => {
        tips.markSeen([current]);
        setCurrent(null);
      }}
      onSkip={() => {
        tips.markSeen(ALL_TIPS);
        setCurrent(null);
      }}
      tip={TIPS[current]}
    />
  );
}

function TipOverlay({ tip, onDone, onSkip }: { tip: Tip; onDone: () => void; onSkip: () => void }) {
  const [target, setTarget] = useState<Box | null>(null);
  const [calloutHeight, setCalloutHeight] = useState(CALLOUT_ESTIMATE);
  const [viewport, setViewport] = useState({ w: window.innerWidth, h: window.innerHeight });
  const calloutRef = useRef<HTMLDivElement>(null);
  const gotIt = useRef<HTMLButtonElement>(null);

  // Scroll the element into place (with room for Cashew), then lock the page behind the tip
  useLayoutEffect(() => {
    const box = measure(tip.targets);
    if (box) {
      const room = window.innerHeight - TOP_BAR - GUTTER;
      const needed = box.height + PAD * 2 + GAP + CALLOUT_ESTIMATE;
      const desiredTop = needed <= room ? TOP_BAR + PAD + (room - needed) / 2 : TOP_BAR + PAD + GAP;
      window.scrollBy({ top: box.top - desiredTop, behavior: "instant" });
    }
    const root = document.getElementById("root");
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    root?.setAttribute("inert", "");
    gotIt.current?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = previousOverflow;
      root?.removeAttribute("inert");
    };
  }, [tip]);

  // Follow the element and the callout's size every frame (fonts loading, resizes, images)
  useLayoutEffect(() => {
    let frame = 0;
    let last: Box | null = null;
    const update = () => {
      const next = measure(tip.targets);
      if (!sameBox(next, last)) {
        last = next;
        setTarget(next);
      }
      const height = calloutRef.current?.offsetHeight;
      if (height) setCalloutHeight((current) => (current === height ? current : height));
      setViewport((current) =>
        current.w === window.innerWidth && current.h === window.innerHeight ? current : { w: window.innerWidth, h: window.innerHeight },
      );
      frame = requestAnimationFrame(update);
    };
    update();
    return () => cancelAnimationFrame(frame);
  }, [tip]);

  // The element went away (the screen changed): close the tip without showing it again
  useEffect(() => {
    if (target) return;
    const timer = window.setTimeout(onDone, 600);
    return () => window.clearTimeout(timer);
  }, [target, onDone]);

  if (!target) return null;

  // Cashew and the bubble go above or below the spotlight, never on it. If the element is
  // too tall for both to fit, the spotlight shows its top part and the callout sits below.
  let spot = { left: target.left - PAD, top: target.top - PAD, width: target.width + PAD * 2, height: target.height + PAD * 2 };
  const spaceAbove = spot.top - GAP - TOP_BAR;
  const spaceBelow = viewport.h - (spot.top + spot.height) - GAP - GUTTER;
  let placement: "above" | "below";
  let calloutStyle: CSSProperties;
  if (spaceAbove >= calloutHeight && (spaceAbove > spaceBelow || spaceBelow < calloutHeight)) {
    placement = "above";
    calloutStyle = { bottom: viewport.h - spot.top + GAP };
  } else if (spaceBelow >= calloutHeight) {
    placement = "below";
    calloutStyle = { top: spot.top + spot.height + GAP };
  } else {
    placement = "below";
    const calloutTop = viewport.h - GUTTER - calloutHeight;
    const top = Math.max(spot.top, TOP_BAR);
    spot = { ...spot, top, height: Math.max(0, Math.min(spot.top + spot.height, calloutTop - GAP) - top) };
    calloutStyle = { top: calloutTop };
  }

  const width = Math.min(340, viewport.w - GUTTER * 2);
  const mascotWidth = viewport.w <= 360 ? 104 : 136; // keep in step with .tour-mascot
  const centerX = spot.left + spot.width / 2;
  const mascotSide = centerX < viewport.w / 2 ? "left" : "right";
  const left =
    mascotSide === "left"
      ? Math.min(Math.max(centerX - mascotWidth / 2, GUTTER), viewport.w - GUTTER - width)
      : Math.max(Math.min(centerX + mascotWidth / 2, viewport.w - GUTTER), width + GUTTER) - width;

  return createPortal(
    <div aria-label="Tip from Cashew" aria-modal="true" className="tour log-tip" role="dialog">
      <div className="tour-spot" style={{ left: spot.left, top: spot.top, width: spot.width, height: spot.height }} />

      {/* Blocks taps on the page behind: only "Got it" (or "Skip tips") closes the tip */}
      <div aria-hidden="true" className="tour-catcher log-tip-catcher" />

      <div className={`tour-callout ${placement} mascot-${mascotSide}`} ref={calloutRef} style={{ ...calloutStyle, left, width }}>
        <img alt="Cashew the squirrel" className="tour-mascot" src={poses[tip.pose]} />
        <div aria-live="polite" className="tour-bubble">
          {tip.text}
          <span className="log-tip-actions">
            <button className="tour-skip-inline" onClick={onSkip} type="button">Skip tips</button>
            <button className="log-tip-got-it" onClick={onDone} ref={gotIt} type="button">Got it</button>
          </span>
          <span className="tour-tail" />
        </div>
      </div>
    </div>,
    document.body,
  );
}
