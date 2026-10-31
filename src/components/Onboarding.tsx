import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";

type OnboardingScreen = {
  ingredient: { name: string; icon: string };
  mascot: string;
  bubble?: string;
  eyebrow: string;
  title: string;
  body: string;
  cta: string;
};

// Each screen adds one ingredient to the bag at the bottom
const screens: OnboardingScreen[] = [
  {
    ingredient: { name: "Almonds", icon: "/assets/almonds.svg" },
    mascot: "/assets/cashew-13-wave.svg",
    bubble: "Hi there!",
    eyebrow: "Welcome",
    title: "You're in! Welcome to TrailMix",
    body: "Here's how to get the most out of finding, ranking, and sharing OC hikes.",
    cta: "Show me",
  },
  {
    ingredient: { name: "Nuts", icon: "/assets/nuts.svg" },
    mascot: "/assets/cashew-14-trophy.svg",
    eyebrow: "Ingredient 1 · Rank",
    title: "Rank every hike you finish",
    body: "Compare hikes side by side and build your personal top list. The more you rank, the better your recommendations get.",
    cta: "Next",
  },
  {
    ingredient: { name: "Dried Fruit", icon: "/assets/dried-fruit.svg" },
    mascot: "/assets/cashew-15-camera.svg",
    eyebrow: "Ingredient 2 · Share",
    title: "Post your trail moments",
    body: "Share photos from the summit and see where your friends are hiking this week.",
    cta: "Next",
  },
  {
    ingredient: { name: "Chocolate", icon: "/assets/chocolate.svg" },
    mascot: "/assets/cashew-16-map.svg",
    eyebrow: "Ingredient 3 · Discover",
    title: "Find your next favorite trail",
    body: "Get hike picks based on what you love, from easy beach walks to tough climbs.",
    cta: "Start my mix",
  },
];

const SWIPE_DISTANCE = 50;

export default function Onboarding({ onFinish }: { onFinish: () => void }) {
  const [index, setIndex] = useState(0);
  const swipeStartX = useRef<number | null>(null);
  const isLast = index === screens.length - 1;
  const screen = screens[index];

  const goTo = (next: number) => setIndex(Math.max(0, Math.min(screens.length - 1, next)));
  const advance = () => (isLast ? onFinish() : goTo(index + 1));

  const startSwipe = (event: PointerEvent<HTMLDivElement>) => {
    swipeStartX.current = event.clientX;
  };

  const endSwipe = (event: PointerEvent<HTMLDivElement>) => {
    if (swipeStartX.current === null) return;
    const dx = event.clientX - swipeStartX.current;
    swipeStartX.current = null;
    if (dx <= -SWIPE_DISTANCE) goTo(index + 1);
    if (dx >= SWIPE_DISTANCE) goTo(index - 1);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowRight") goTo(index + 1);
    if (event.key === "ArrowLeft") goTo(index - 1);
  };

  return (
    <main className="onboarding">
      <header className="ob-top">
        <span className="ob-ingredient" key={screen.ingredient.icon}>
          <img alt="" src={screen.ingredient.icon} />
        </span>
        {!isLast && (
          <button className="ob-skip" onClick={onFinish} type="button">Skip</button>
        )}
      </header>

      <div
        aria-label="Getting started with TrailMix"
        aria-roledescription="carousel"
        className="ob-viewport"
        onKeyDown={onKeyDown}
        onPointerCancel={() => { swipeStartX.current = null; }}
        onPointerDown={startSwipe}
        onPointerUp={endSwipe}
        role="region"
        tabIndex={0}
      >
        <div className="ob-track" style={{ transform: `translateX(-${index * 100}%)` }}>
          {screens.map((item, i) => (
            <section
              aria-hidden={i !== index}
              aria-label={`${i + 1} of ${screens.length}`}
              aria-roledescription="slide"
              className="ob-slide"
              key={item.title}
            >
              <div className="ob-mascot">
                {item.bubble && (
                  <div className="ob-bubble">{item.bubble}</div>
                )}
                <img alt="" draggable={false} src={item.mascot} />
              </div>
              <span className="eyebrow">{item.eyebrow}</span>
              <h1>{item.title}</h1>
              <p>{item.body}</p>
            </section>
          ))}
        </div>
      </div>

      <footer className="ob-footer">
        <div aria-label={`Step ${index + 1} of ${screens.length}`} className="ob-bag" role="img">
          {screens.map((item, i) => (
            <span className={`ob-bag-slot ${i <= index ? "filled" : ""}`} key={item.ingredient.name}>
              {i <= index && <img alt="" src={item.ingredient.icon} />}
            </span>
          ))}
        </div>
        <button className="primary-button" onClick={advance} type="button">
          {screen.cta}
          <span aria-hidden="true">→</span>
        </button>
        {/* Always rendered so the footer doesn't jump on the last screen */}
        <button
          aria-hidden={!isLast}
          className={`ob-explore ${isLast ? "" : "reserved"}`}
          onClick={onFinish}
          tabIndex={isLast ? 0 : -1}
          type="button"
        >
          I'll explore first
        </button>
      </footer>
    </main>
  );
}
