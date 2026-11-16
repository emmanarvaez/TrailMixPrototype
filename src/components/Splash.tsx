import { useEffect, useState, type CSSProperties } from "react";

// The animated splash shown on the way into the app (after signing in, or opening the app
// still signed in): Cashew tosses ingredients into the TrailMix jar, then it fades into the app. The whole timeline is CSS animation; the
// final frame is the resting state, so skipping (a tap, or "reduce motion") just turns
// the animations off. If the app isn't ready when it ends, it holds on that frame.

// Ingredients Cashew tosses, in order
const TOSSES = ["chocolate-chips", "almonds", "raisins", "sunflower-seeds", "chocolate", "pretzel"];

// Timeline in ms
const FIRST_TOSS = 450;
const TOSS_GAP = 160;
const FLIGHT = 420;
const LAST_LANDING = FIRST_TOSS + TOSS_GAP * (TOSSES.length - 1) + FLIGHT;
const FINAL_HOLD = 800; // a beat on the finished frame before fading into the app
const TIMELINE_END = LAST_LANDING + 400 + FINAL_HOLD; // the one-liner fades in, then the hold
const REDUCED_MOTION_HOLD = 1000;
const FADE_OUT = 600;

// Each landing adds three pieces to the mix (17 slots in the jar's CSS), bottom row first
const SLOTS = Array.from({ length: 17 }, (_, slot) => ({ slot, toss: Math.min(Math.floor(slot / 3), TOSSES.length - 1) }));

// Laid out at a fixed size and scaled down to fit, so it never stretches
const STAGE_WIDTH = 372;
const CONTENT_HEIGHT = 460;

const ms = (value: number) => `${value}ms`;

export default function Splash({ ready, onDone }: { ready: boolean; onDone: () => void }) {
  const [reduceMotion] = useState(() => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  const [skipped, setSkipped] = useState(reduceMotion); // showing the final frame with no animation
  const [finished, setFinished] = useState(false); // the animation (or the reduced-motion hold) is over
  const [leaving, setLeaving] = useState(false);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const timer = setTimeout(() => setFinished(true), reduceMotion ? REDUCED_MOTION_HOLD : TIMELINE_END);
    return () => clearTimeout(timer);
  }, [reduceMotion]);

  useEffect(() => {
    if (!finished || !ready) return;
    setLeaving(true);
    const timer = setTimeout(onDone, FADE_OUT);
    return () => clearTimeout(timer);
  }, [finished, ready, onDone]);

  useEffect(() => {
    const fit = () => setScale(Math.min(1, (window.innerWidth - 32) / STAGE_WIDTH, (window.innerHeight - 48) / CONTENT_HEIGHT));
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);

  // A tap goes straight to the app, or to the final frame while the app is still loading
  const skip = () => {
    setSkipped(true);
    setFinished(true);
  };

  return (
    <div
      aria-label="TrailMix"
      className={`splash ${skipped ? "splash-still" : ""} ${leaving ? "splash-leaving" : ""}`}
      onPointerDown={skip}
      role="img"
      style={{ "--fade-out": ms(FADE_OUT) } as CSSProperties}
    >
      <div className="splash-content" style={{ width: STAGE_WIDTH, transform: `scale(${scale})` }}>
        <img alt="" className="splash-logo" src="/assets/logo-word.svg" />
        <div className="splash-stage">
          <div className="splash-jar">
            <div className="jar-lid" style={{ "--close-at": ms(LAST_LANDING) } as CSSProperties}><span /><span /><span /></div>
            <div className="jar">
              <div className="jar-shine" />
              <div className="mix">
                {SLOTS.map(({ slot, toss }) => (
                  <img
                    alt=""
                    className={`splash-piece piece-${slot}`}
                    key={slot}
                    src={`/assets/${TOSSES[toss]}.svg`}
                    style={{
                      animationDelay: ms(FIRST_TOSS + TOSS_GAP * toss + FLIGHT + (slot % 3) * 40),
                      rotate: `${((slot * 47) % 60) - 30}deg`,
                    }}
                  />
                ))}
              </div>
              <div className="jar-label"><b>TRAIL</b><span>MIX</span></div>
            </div>
            <div className="ground-shadow" />
          </div>
          <img
            alt=""
            className="splash-cashew"
            src="/assets/cashew-07-toss.svg"
            style={{ "--toss-at": ms(FIRST_TOSS), "--toss-gap": ms(TOSS_GAP), "--tosses": TOSSES.length } as CSSProperties}
          />
          {TOSSES.map((type, index) => (
            <span className="splash-fly" key={type} style={{ animationDelay: ms(FIRST_TOSS + TOSS_GAP * index), animationDuration: ms(FLIGHT) }}>
              <img alt="" src={`/assets/${type}.svg`} style={{ animationDelay: ms(FIRST_TOSS + TOSS_GAP * index), animationDuration: ms(FLIGHT) }} />
            </span>
          ))}
        </div>
        <p className="splash-line" style={{ animationDelay: ms(LAST_LANDING + 60) }}>Every hike adds to the mix.</p>
      </div>
    </div>
  );
}
