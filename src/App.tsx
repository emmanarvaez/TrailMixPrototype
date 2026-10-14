import { useMemo, useRef, useState } from "react";

type Trail = {
  name: string;
  meta: string;
  image: string;
};

const trailPhotos = [
  "https://images.unsplash.com/photo-1642746194421-8a5e8eabf323?auto=format&fit=crop&w=900&q=88",
  "https://images.unsplash.com/photo-1603642696724-f522cbcca174?auto=format&fit=crop&w=900&q=88",
  "https://images.unsplash.com/photo-1605068533794-cd164042be22?auto=format&fit=crop&w=900&q=88",
  "https://images.unsplash.com/photo-1579912583830-cfec19b43150?auto=format&fit=crop&w=900&q=88",
];

const trails: Trail[] = [
  { name: "Bommer Canyon Loop", meta: "4.2 mi · 560 ft · Moderate", image: trailPhotos[0] },
  { name: "Top of the World", meta: "2.4 mi · 510 ft · Moderate", image: trailPhotos[1] },
  { name: "Holy Jim Falls", meta: "2.8 mi · 650 ft · Moderate", image: trailPhotos[2] },
  { name: "Crystal Cove Moro Ridge", meta: "5.0 mi · 820 ft · Hard", image: trailPhotos[3] },
];

const detailOptions = [
  { label: "Views",       ingredient: "Chocolate",  color: "#6f4434", shape: "chocolate",  icon: "/assets/chocolate.svg" },
  { label: "Waterfall",  ingredient: "Dried Fruit", color: "#6b405f", shape: "dried-fruit", icon: "/assets/dried-fruit.svg" },
  { label: "Climb",      ingredient: "Almonds",     color: "#d7a15f", shape: "almonds",    icon: "/assets/almonds.svg" },
  { label: "Wildlife",   ingredient: "Cashews",     color: "#c8a04a", shape: "cashew",     icon: "/assets/cashew.svg" },
  { label: "Sunset",     ingredient: "Cranberries", color: "#c94f3a", shape: "cranberries",icon: "/assets/cranberries.svg" },
  { label: "Rocky",      ingredient: "Pretzels",    color: "#bd783f", shape: "pretzel",    icon: "/assets/pretzel.svg" },
  { label: "Forest",     ingredient: "Nuts",        color: "#5a7a3a", shape: "nuts",       icon: "/assets/nuts.svg" },
  { label: "Summit",     ingredient: "Apricot",     color: "#d4813a", shape: "apricot",    icon: "/assets/apricot.svg" },
  { label: "Meadow",     ingredient: "Banana",      color: "#c9a820", shape: "banana",     icon: "/assets/banana.svg" },
  { label: "River",      ingredient: "Dates",       color: "#7a4e2a", shape: "date",       icon: "/assets/date.svg" },
  { label: "Campfire",   ingredient: "Popcorn",     color: "#d4b030", shape: "popcorn",    icon: "/assets/popcorn.svg" },
  { label: "Snack Break",ingredient: "Chex",        color: "#b8763a", shape: "chex",       icon: "/assets/chex.svg" },
  { label: "Shade",      ingredient: "Pistachios",  color: "#7a9e4a", shape: "pistachios", icon: "/assets/pistachios.svg" },
];

const ratings = [
  { label: "Loved it!", icon: "♥", color: "#e25e3f" },
  { label: "It was fine", icon: "●", color: "#d5a23e" },
  { label: "Not for me", icon: "−", color: "#6e8370" },
];

const availableFriends = ["Caine", "Kaylee", "Oscar", "Amanda", "Emma"];

// Ingredients unlocked before this hike (one per previously completed hike).
// Index UNLOCKED_COUNT is the ingredient this hike unlocks.
const UNLOCKED_COUNT = 8;

function GlobalStyles() {
  return (
    <style>{`
      /* ── Change 1: speech bubble ── */
      .mascot-prompt {
        pointer-events: none !important;
        cursor: default !important;
      }
      .speech-bubble {
        position: relative !important;
        cursor: default !important;
        box-shadow: none !important;
        border: none !important;
        background: #fff8f0 !important;
        border-radius: 14px !important;
        padding: 8px 14px !important;
        font-weight: 600;
        color: #5a3e2b;
      }
      .speech-bubble-tail {
        position: absolute;
        bottom: -9px;
        right: 16px;
        width: 0;
        height: 0;
        border-left: 7px solid transparent;
        border-right: 7px solid transparent;
        border-top: 10px solid #fff8f0;
        pointer-events: none;
      }

      /* ── Change 2: drag hint ── */
      @keyframes bounce-hint {
        0%, 100% { transform: translateY(0); }
        40%       { transform: translateY(-7px); }
      }
      .rank-item.new-trail.show-hint {
        animation: bounce-hint 1.4s ease-in-out infinite;
      }
      .drag-first-hint {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 4px;
        font-size: 11px;
        color: #8a6e4b;
        padding: 2px 8px 0;
        opacity: 0.85;
      }
      .drag-context-strip {
        text-align: center;
        font-size: 11px;
        color: #5a3e2b;
        background: rgba(255,248,240,0.9);
        border-radius: 8px;
        padding: 4px 12px;
        margin: 6px 16px 0;
        line-height: 1.5;
        font-weight: 500;
      }

      /* ── Logo ── */
      .wordmark-logo {
        height: 28px;
        width: auto;
        display: block;
      }

      /* ── Change 4: ingredient icons bigger, vertical layout ── */
      .detail-chip {
        flex-direction: column !important;
        align-items: center !important;
        padding: 12px 6px 10px !important;
        gap: 7px !important;
        text-align: center !important;
      }
      .detail-grid {
        grid-template-columns: repeat(3, 1fr) !important;
      }
      .chip-ingredient-img {
        width: 56px;
        height: 56px;
        object-fit: contain;
        flex-shrink: 0;
      }
      .detail-chip > .chip-text {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 1px;
      }

      /* ── Change 5: locked ingredients ── */
      .detail-chip.locked {
        opacity: 0.42;
        cursor: not-allowed !important;
        pointer-events: none !important;
        filter: grayscale(0.7);
      }
      .lock-badge {
        font-size: 28px;
        line-height: 1;
        display: block;
        width: 56px;
        height: 56px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      /* ── Change 3: friend chips ── */
      .tagged-friends {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 6px !important;
        margin-top: 8px !important;
      }
      .friend-chip {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        background: #e8f0e9;
        border: none;
        border-radius: 20px;
        padding: 5px 10px 5px 6px;
        font-size: 13px;
        cursor: pointer;
        color: #3a4f3c;
        font-weight: 500;
      }
      .friend-chip .chip-avatar {
        width: 20px;
        height: 20px;
        border-radius: 50%;
        background: #5a8c5e;
        color: white;
        font-size: 11px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        flex-shrink: 0;
      }
      .friend-chip .chip-remove {
        font-size: 14px;
        color: #8a7e70;
        margin-left: 2px;
        line-height: 1;
      }

      /* ── Change 7: result summary ── */
      .new-unlock-row {
        display: flex;
        align-items: center;
        gap: 12px;
        background: #fff8f0;
        border-radius: 14px;
        padding: 12px 14px;
        margin: 16px 16px 0;
      }
      .new-unlock-img {
        width: 44px;
        height: 44px;
        object-fit: contain;
        flex-shrink: 0;
      }
      .new-unlock-copy small {
        display: block;
        font-size: 11px;
        color: #8a7e70;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        margin-bottom: 3px;
      }
      .new-unlock-copy b {
        font-size: 15px;
        color: #3a2c1e;
        display: block;
      }
      .new-unlock-copy span {
        font-size: 12px;
        color: #8a7e70;
      }
      .result-stats-row {
        display: flex;
        gap: 10px;
        justify-content: center;
        margin: 14px 16px 0;
      }
      .result-stat-box {
        display: flex;
        flex-direction: column;
        align-items: center;
        background: #f5f0e8;
        border-radius: 12px;
        padding: 10px 14px;
        flex: 1;
      }
      .result-stat-box b {
        font-size: 22px;
        color: #3a2c1e;
        line-height: 1;
      }
      .result-stat-box small {
        font-size: 11px;
        color: #8a7e70;
        margin-top: 3px;
        text-align: center;
      }
      .full-rankings-section {
        margin: 20px 16px 8px;
      }
      .full-rankings-section h3 {
        font-size: 11px;
        color: #8a7e70;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        margin: 0 0 8px 4px;
      }
      .full-rank-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 8px 12px;
        border-radius: 10px;
        margin-bottom: 2px;
      }
      .full-rank-item.highlight {
        background: #fff0e0;
      }
      .full-rank-item .fr-num {
        font-size: 12px;
        color: #8a7e70;
        width: 26px;
        flex-shrink: 0;
      }
      .full-rank-item .fr-name {
        font-size: 14px;
        color: #3a2c1e;
        flex: 1;
        font-weight: 400;
      }
      .full-rank-item.highlight .fr-name {
        font-weight: 600;
      }
      .new-badge {
        font-size: 10px;
        background: #e25e3f;
        color: white;
        padding: 2px 7px;
        border-radius: 10px;
        text-transform: uppercase;
        letter-spacing: 0.04em;
        font-weight: 700;
        flex-shrink: 0;
      }
    `}</style>
  );
}

function Arrow({ direction = "right" }: { direction?: "right" | "left" }) {
  return direction === "right" ? (
    <img alt="" className="arrow-icon" src="/assets/6a752.svg" />
  ) : (
    <span className="back-arrow">←</span>
  );
}

function Progress({ step }: { step: number }) {
  return (
    <div className="progress-wrap">
      <div className="progress-meta">
        <span>Log a hike</span>
        <span>{step}/5</span>
      </div>
      <div className="progress-track">
        {Array.from({ length: 5 }).map((_, index) => (
          <span className={index < step ? "complete" : ""} key={index} />
        ))}
      </div>
    </div>
  );
}

function Shell({
  step,
  children,
  onBack,
}: {
  step: number;
  children: React.ReactNode;
  onBack?: () => void;
}) {
  return (
    <main className="app-shell">
      <GlobalStyles />
      <header className="app-header">
        {onBack ? (
          <button aria-label="Go back" className="header-back" onClick={onBack}>
            <Arrow direction="left" />
          </button>
        ) : <span className="header-spacer" />}
        <div className="wordmark">
          <svg fill="none" height="22" viewBox="0 0 48 10" width="106" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.34 8.928V1.008H4.068V8.928H2.34ZM0 2.46V1.008H6.408V2.46H0Z" fill="#3A2A1E"/>
            <path d="M7.18538 8.928V2.628H8.61337L8.62537 4.776H8.85338C8.91738 4.24 9.02537 3.804 9.17737 3.468C9.33737 3.132 9.55737 2.884 9.83737 2.724C10.1174 2.564 10.4654 2.484 10.8814 2.484C10.9534 2.484 11.0294 2.488 11.1094 2.496C11.1974 2.496 11.2974 2.508 11.4094 2.532L11.3374 4.368C11.2174 4.312 11.0854 4.272 10.9414 4.248C10.7974 4.224 10.6694 4.212 10.5574 4.212C10.2454 4.212 9.97738 4.284 9.75338 4.428C9.52938 4.572 9.34537 4.78 9.20138 5.052C9.06537 5.316 8.97337 5.64 8.92537 6.024V8.928H7.18538Z" fill="#3A2A1E"/>
            <path d="M13.7708 9.096C13.4188 9.096 13.1068 9.028 12.8348 8.892C12.5628 8.748 12.3507 8.544 12.1987 8.28C12.0467 8.016 11.9707 7.688 11.9707 7.296C11.9707 6.952 12.0348 6.664 12.1628 6.432C12.2988 6.2 12.4947 6.012 12.7507 5.868C13.0067 5.724 13.3228 5.604 13.6988 5.508C14.0748 5.412 14.5027 5.328 14.9827 5.256C15.2387 5.216 15.4468 5.18 15.6068 5.148C15.7748 5.108 15.8988 5.048 15.9788 4.968C16.0588 4.88 16.0988 4.756 16.0988 4.596C16.0988 4.372 16.0188 4.18 15.8588 4.02C15.6988 3.86 15.4467 3.78 15.1027 3.78C14.8707 3.78 14.6548 3.82 14.4548 3.9C14.2628 3.98 14.0948 4.1 13.9508 4.26C13.8148 4.42 13.7148 4.624 13.6508 4.872L12.1267 4.404C12.2228 4.076 12.3587 3.792 12.5347 3.552C12.7188 3.312 12.9387 3.112 13.1947 2.952C13.4507 2.784 13.7428 2.66 14.0708 2.58C14.3988 2.5 14.7548 2.46 15.1388 2.46C15.7548 2.46 16.2548 2.56 16.6388 2.76C17.0308 2.952 17.3228 3.256 17.5148 3.672C17.7068 4.08 17.8027 4.608 17.8027 5.256V6.336C17.8027 6.616 17.8068 6.9 17.8148 7.188C17.8308 7.476 17.8468 7.768 17.8628 8.064C17.8868 8.352 17.9107 8.64 17.9347 8.928H16.4107C16.3787 8.728 16.3468 8.5 16.3148 8.244C16.2908 7.98 16.2708 7.716 16.2548 7.452H16.0387C15.9267 7.756 15.7668 8.032 15.5588 8.28C15.3507 8.528 15.0948 8.728 14.7908 8.88C14.4948 9.024 14.1548 9.096 13.7708 9.096ZM14.5028 7.848C14.6548 7.848 14.8067 7.82 14.9587 7.764C15.1187 7.708 15.2708 7.632 15.4148 7.536C15.5668 7.432 15.7028 7.304 15.8228 7.152C15.9508 7 16.0548 6.828 16.1348 6.636L16.1108 5.628L16.3867 5.688C16.2427 5.792 16.0748 5.876 15.8828 5.94C15.6908 5.996 15.4908 6.04 15.2828 6.072C15.0828 6.104 14.8827 6.14 14.6827 6.18C14.4827 6.22 14.3027 6.272 14.1427 6.336C13.9907 6.4 13.8668 6.488 13.7708 6.6C13.6827 6.704 13.6388 6.852 13.6388 7.044C13.6388 7.292 13.7187 7.488 13.8787 7.632C14.0387 7.776 14.2468 7.848 14.5028 7.848Z" fill="#3A2A1E"/>
            <path d="M19.3143 8.928V2.628H21.0423V8.928H19.3143ZM20.1903 1.68C19.8543 1.68 19.5943 1.612 19.4103 1.476C19.2343 1.332 19.1463 1.124 19.1463 0.852C19.1463 0.572 19.2343 0.36 19.4103 0.216C19.5943 0.072 19.8543 0 20.1903 0C20.5343 0 20.7943 0.072 20.9703 0.216C21.1543 0.36 21.2463 0.572 21.2463 0.852C21.2463 1.116 21.1543 1.32 20.9703 1.464C20.7943 1.608 20.5343 1.68 20.1903 1.68Z" fill="#3A2A1E"/>
            <path d="M22.6424 8.928V0.348H24.3464V8.928H22.6424Z" fill="#3A2A1E"/>
            <path d="M26.66 8.928V1.008H29.264L31.472 6.972H31.532L33.692 1.008H36.176V8.928H34.532L34.64 2.76H34.508L32.108 8.928H30.668L28.304 2.76H28.172L28.28 8.928H26.66Z" fill="#C2571F"/>
            <path d="M37.8494 8.928V2.628H39.5774V8.928H37.8494ZM38.7254 1.68C38.3894 1.68 38.1294 1.612 37.9454 1.476C37.7694 1.332 37.6814 1.124 37.6814 0.852C37.6814 0.572 37.7694 0.36 37.9454 0.216C38.1294 0.072 38.3894 0 38.7254 0C39.0694 0 39.3294 0.072 39.5054 0.216C39.6894 0.36 39.7814 0.572 39.7814 0.852C39.7814 1.116 39.6894 1.32 39.5054 1.464C39.3294 1.608 39.0694 1.68 38.7254 1.68Z" fill="#C2571F"/>
            <path d="M40.5536 8.928L42.6416 5.772L40.5536 2.628H42.5456L43.6976 5.004H43.9016L45.0536 2.628H47.0336L44.9456 5.772L47.0576 8.928H45.0776L43.9016 6.54H43.6976L42.5456 8.928H40.5536Z" fill="#C2571F"/>
          </svg>
        </div>
        <span className="header-spacer" />
      </header>
      <Progress step={step} />
      {children}
    </main>
  );
}

function Squirrel({ mood = "eager", small = false }: { mood?: "eager" | "wow" | "down"; small?: boolean }) {
  const size = small ? 72 : 120;
  const style = {
    width: size,
    height: "auto",
    display: "block",
    transition: "transform 0.3s ease",
    ...(mood === "eager" && { transform: "rotate(-8deg)" }),
    ...(mood === "wow"   && { transform: "rotate(-12deg) scale(1.15)", filter: "drop-shadow(0 4px 8px rgba(0,0,0,0.18))" }),
    ...(mood === "down"  && { transform: "rotate(14deg)", opacity: 0.7 }),
  };
  return <img alt="TrailMix mascot" src="/assets/cashew.svg" style={style} />;
}

function Button({
  children,
  onClick,
  disabled = false,
  secondary = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  secondary?: boolean;
}) {
  return (
    <button className={`primary-button ${secondary ? "secondary" : ""}`} disabled={disabled} onClick={onClick}>
      {children}
      {!secondary && <span aria-hidden="true">→</span>}
    </button>
  );
}

function TrailSelect({
  selected,
  setSelected,
  onNext,
}: {
  selected: Trail | null;
  setSelected: (trail: Trail) => void;
  onNext: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = trails.filter((trail) => trail.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <Shell step={1}>
      <section className="screen-content trail-screen">
        <div className="screen-title">
          <span className="eyebrow">Pick your path</span>
          <h1>Which trail did you hike</h1>
        </div>
        <label className="search-field">
          <span aria-hidden="true">⌕</span>
          <input onChange={(event) => setQuery(event.target.value)} placeholder="Search trails" value={query} />
        </label>
        <div className="section-heading">
          <h2>Near you</h2>
          <span>Orange County</span>
        </div>
        <div className="trail-list">
          {filtered.map((trail) => (
            <button
              className={`trail-card ${selected?.name === trail.name ? "selected" : ""}`}
              key={trail.name}
              onClick={() => {
                setSelected(trail);
                window.setTimeout(onNext, 140);
              }}
            >
              <img alt="" src={trail.image} />
              <span className="trail-copy">
                <b>{trail.name}</b>
                <small>{trail.meta}</small>
              </span>
              <Arrow />
            </button>
          ))}
        </div>
      </section>
      <div className="sticky-action">
        <Button disabled={!selected} onClick={onNext}>Next</Button>
      </div>
    </Shell>
  );
}

function RateTrail({
  trail,
  rating,
  setRating,
  difficulty,
  setDifficulty,
  onNext,
  onBack,
}: {
  trail: Trail;
  rating: string;
  setRating: (rating: string) => void;
  difficulty: number;
  setDifficulty: (difficulty: number) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  return (
    <Shell onBack={onBack} step={2}>
      <section className="screen-content rate-screen">
        <div className="hero-photo">
          <img alt={`View from ${trail.name}`} src={trail.image} />
          <span className="photo-sticker">Yesterday · Laguna Beach</span>
          <svg className="photo-sun" viewBox="0 0 100 100"><circle cx="50" cy="50" r="31" /></svg>
        </div>
        <div className="screen-title compact">
          <span className="eyebrow">{trail.name}</span>
          <h1>How was it?</h1>
        </div>
        <div className="rating-list">
          {ratings.map((item) => (
            <button className={`rating-card ${rating === item.label ? "selected" : ""}`} key={item.label} onClick={() => setRating(item.label)}>
              <span className="rating-icon" style={{ background: item.color }}>{item.icon}</span>
              <span>{item.label}</span>
              <span className="radio">{rating === item.label && <i />}</span>
            </button>
          ))}
        </div>
        <div className="difficulty-field">
          <div className="section-heading">
            <h2>How difficult was it?</h2>
            <span>{["Easy", "Moderate", "Tough"][difficulty - 1]}</span>
          </div>
          <input
            aria-label="Hike difficulty"
            max="3"
            min="1"
            onChange={(event) => setDifficulty(Number(event.target.value))}
            step="1"
            type="range"
            value={difficulty}
          />
          <div className="difficulty-labels"><span>Easy</span><span>Moderate</span><span>Tough</span></div>
        </div>
        {/* Change 1: speech bubble — not a button, no hover/press states, tail points at mascot */}
        <div className="mascot-prompt">
          <div className="speech-bubble">
            Spill it!
            <span className="speech-bubble-tail" />
          </div>
          <Squirrel small />
        </div>
      </section>
      <div className="sticky-action">
        <Button disabled={!rating} onClick={onNext}>Next</Button>
      </div>
    </Shell>
  );
}

function RankTrail({
  ranking,
  setRanking,
  lowerRanking,
  setLowerRanking,
  onNext,
  onBack,
}: {
  ranking: string[];
  setRanking: (ranking: string[]) => void;
  lowerRanking: string[];
  setLowerRanking: (ranking: string[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [showLowerRanks, setShowLowerRanks] = useState(!ranking.includes("Bommer Canyon Loop"));
  const draggingIndex = useRef<number | null>(null);
  const dragY = useRef(0);
  // Change 2: track whether the user has dragged at least once and the live drag position
  const [hasDragged, setHasDragged] = useState(false);
  const [dragPos, setDragPos] = useState<number | null>(null);

  const move = (items: string[], updateItems: (items: string[]) => void, from: number, to: number) => {
    if (from === to || to < 0 || to >= items.length) return;
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    draggingIndex.current = to;
    updateItems(next);
    setDragPos(to);
  };

  const startDrag = (index: number, y: number) => {
    draggingIndex.current = index;
    dragY.current = y;
    setDragPos(index);
  };

  const handleMove = (y: number) => {
    if (draggingIndex.current === null) return;
    const delta = y - dragY.current;
    if (Math.abs(delta) > 42) {
      const items = showLowerRanks ? lowerRanking : ranking;
      const updateItems = showLowerRanks ? setLowerRanking : setRanking;
      move(items, updateItems, draggingIndex.current, draggingIndex.current + (delta > 0 ? 1 : -1));
      dragY.current = y;
    }
  };

  const stopDrag = () => {
    draggingIndex.current = null;
    setDragPos(null);
    setHasDragged(true);
  };

  // Compute the "Above X, below Y" context text while dragging
  const getDragContext = (): string | null => {
    if (dragPos === null) return null;
    const items = showLowerRanks ? lowerRanking : ranking.slice(0, 4);
    // items[dragPos - 1] has a higher rank → Bommer is below them
    // items[dragPos + 1] has a lower rank → Bommer is above them
    const higherNeighbor = items[dragPos - 1];
    const lowerNeighbor = items[dragPos + 1];
    const parts: string[] = [];
    if (lowerNeighbor) parts.push(`Above ${lowerNeighbor}`);
    if (higherNeighbor) parts.push(`below ${higherNeighbor}`);
    if (parts.length === 0) return "Your top-ranked hike!";
    return parts.join(", ");
  };

  const openLowerRanks = () => {
    setRanking(ranking.filter((name) => name !== "Bommer Canyon Loop"));
    setLowerRanking(["Bommer Canyon Loop", ...lowerRanking.filter((name) => name !== "Bommer Canyon Loop")]);
    setShowLowerRanks(true);
  };

  const returnToMountain = () => {
    setLowerRanking(lowerRanking.filter((name) => name !== "Bommer Canyon Loop"));
    setRanking([...ranking.filter((name) => name !== "Bommer Canyon Loop"), "Bommer Canyon Loop"]);
    setShowLowerRanks(false);
  };

  const dragContext = getDragContext();

  return (
    <Shell onBack={onBack} step={3}>
      <section className="screen-content rank-screen">
        <div className="screen-title">
          <span className="eyebrow">Your personal peaks</span>
          <h1>{showLowerRanks ? "Rank it with the rest" : "Place it on your mountain"}</h1>
          <p>{showLowerRanks ? "Drag Bommer Canyon anywhere from #4 down." : "Drag Bommer Canyon up or down to rank it."}</p>
        </div>
        {!showLowerRanks ? (
          <>
            <div className="mountain-scene">
              <div className="sun-disc" />
              <div className="cloud cloud-one" />
              <div className="cloud cloud-two" />
              <svg aria-hidden="true" className="mountains" preserveAspectRatio="none" viewBox="0 0 390 430">
                <path className="mountain-back" d="M-20 340 90 115l58 101 57-142 205 266Z" />
                <path className="mountain-front" d="M-15 410 105 212l67 83 61-113 170 228Z" />
                <path className="snow" d="m205 74 57 72-34-13-20 26-28-25-32 19Z" />
                <path className="ridge" d="m22 382 87-167 65 81 61-113 145 201" />
              </svg>
              <div className="rank-list">
                {ranking.slice(0, 4).map((name, index) => {
                  const isNew = name === "Bommer Canyon Loop";
                  return (
                    <div
                      className={`rank-item rank-${index + 1} ${isNew ? "new-trail" : ""} ${isNew && !hasDragged ? "show-hint" : ""}`}
                      key={name}
                      onPointerDown={(event) => {
                        if (!isNew) return;
                        event.currentTarget.setPointerCapture(event.pointerId);
                        startDrag(index, event.clientY);
                      }}
                      onPointerMove={(event) => handleMove(event.clientY)}
                      onPointerUp={stopDrag}
                    >
                      <span className="rank-number">#{index + 1}</span>
                      <span className="rank-name">{name}</span>
                      {isNew && <span className="drag-handle">⠿</span>}
                    </div>
                  );
                })}
              </div>
              {/* Change 2: first-time hint label */}
              {!hasDragged && (
                <div className="drag-first-hint">
                  <span style={{ fontSize: 14 }}>✋</span>
                  <span>Drag me up or down</span>
                </div>
              )}
              {/* Change 2: live context during drag */}
              {dragContext && (
                <div className="drag-context-strip">{dragContext}</div>
              )}
              <img alt="" className="figma-mountain-guide" src="/assets/2cec3.svg" />
            </div>
            <button className="lower-ranks-button" onClick={openLowerRanks}>
              <span><b>Didn't make the top four?</b><small>Rank it with the rest of your hikes</small></span>
              <Squirrel mood="down" small />
            </button>
          </>
        ) : (
          <div className="lower-ranks-view">
            <button className="return-mountain" onClick={returnToMountain}>← Put it back on the mountain</button>
            <div className="lower-ranks-list">
              {lowerRanking.map((name, index) => {
                const isNew = name === "Bommer Canyon Loop";
                return (
                  <div
                    className={`lower-rank-item ${isNew ? "new-trail" : ""} ${isNew && !hasDragged ? "show-hint" : ""}`}
                    key={name}
                    onPointerDown={(event) => {
                      if (!isNew) return;
                      event.currentTarget.setPointerCapture(event.pointerId);
                      startDrag(index, event.clientY);
                    }}
                    onPointerMove={(event) => handleMove(event.clientY)}
                    onPointerUp={stopDrag}
                  >
                    <span className="rank-number">#{index + 4}</span>
                    <span className="rank-name">{name}</span>
                    {isNew && <span className="drag-handle">⠿</span>}
                  </div>
                );
              })}
              {/* Change 2: context during drag in lower ranks view */}
              {dragContext && (
                <div className="drag-context-strip">{dragContext}</div>
              )}
            </div>
          </div>
        )}
      </section>
      <div className="sticky-action">
        <Button onClick={onNext}>Next</Button>
      </div>
    </Shell>
  );
}

function AddDetails({
  selectedDetails,
  setSelectedDetails,
  caption,
  setCaption,
  onSave,
  onBack,
}: {
  selectedDetails: number[];
  setSelectedDetails: (indexes: number[]) => void;
  caption: string;
  setCaption: (caption: string) => void;
  onSave: () => void;
  onBack: () => void;
}) {
  const [added, setAdded] = useState(false);
  const [friend, setFriend] = useState("");
  const [taggedFriends, setTaggedFriends] = useState<string[]>([]);
  const friendSuggestions = friend.trim()
    ? availableFriends.filter(
        (name) =>
          name.toLowerCase().includes(friend.trim().toLowerCase()) &&
          !taggedFriends.includes(name),
      )
    : [];

  const tagFriend = (name: string) => {
    setTaggedFriends((current) => [...current, name]);
    setFriend("");
  };

  return (
    <Shell onBack={onBack} step={4}>
      <section className="screen-content details-screen">
        <div className="screen-title compact">
          <span className="eyebrow">Bommer Canyon Loop</span>
          <h1>Add details</h1>
        </div>
        <div className="field-group">
          <div className="section-heading"><h2>What made this one?</h2><span>Select multiple</span></div>
          {/* Change 6: explain what ingredients are for */}
          <p className="unlock-note" style={{ marginBottom: 4 }}>
            Each hike adds an ingredient to your trail mix jar. Your jar shows what kind of hiker you are.
          </p>
          {/* Change 4 + 5: bigger vertical chips, locked state */}
          <div className="detail-grid">
            {detailOptions.map((option, index) => {
              const isLocked = index >= UNLOCKED_COUNT;
              const isSelected = selectedDetails.includes(index);
              return (
                <button
                  className={`detail-chip ${isSelected ? "selected" : ""} ${isLocked ? "locked" : ""}`}
                  disabled={isLocked}
                  key={option.label}
                  onClick={() => {
                    if (isLocked) return;
                    setSelectedDetails(
                      isSelected
                        ? selectedDetails.filter((item) => item !== index)
                        : [...selectedDetails, index],
                    );
                  }}
                >
                  {isLocked ? (
                    <span className="lock-badge">🔒</span>
                  ) : (
                    <img alt={option.ingredient} className="chip-ingredient-img" src={option.icon} />
                  )}
                  <span className="chip-text">
                    <b>{option.label}</b>
                    <small>{isLocked ? "Locked" : option.ingredient}</small>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        <div className="field-group">
          <div className="section-heading"><h2>Photos</h2><span>2 added</span></div>
          <div className="photo-row">
            <button className="add-photo" onClick={() => setAdded(true)}><span>+</span><small>{added ? "Added" : "Add"}</small></button>
            <img alt="Bommer Canyon view" src={trailPhotos[0]} />
            <img alt="Trail at sunset" src={trailPhotos[1]} />
          </div>
        </div>
        <label className="text-field">
          <span>Caption</span>
          <textarea maxLength={140} onChange={(event) => setCaption(event.target.value)} placeholder="What do you want to remember?" value={caption} />
          <small>{caption.length}/140</small>
        </label>
        {/* Change 3: tag friends with filter → chip → remove */}
        <div className="friend-field">
          <span>Tag Friends</span>
          <div className="friend-search">
            <span className="mini-avatar">+</span>
            <input
              autoComplete="off"
              onChange={(event) => setFriend(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && friendSuggestions.length) {
                  event.preventDefault();
                  tagFriend(friendSuggestions[0]);
                }
              }}
              placeholder="Search friends"
              value={friend}
            />
          </div>
          {friend.trim() && (
            <div className="friend-results">
              {friendSuggestions.length ? friendSuggestions.map((name) => (
                <button key={name} onClick={() => tagFriend(name)} type="button">
                  <span className="friend-avatar">{name.charAt(0)}</span>
                  <span><b>{name}</b><small>@{name.toLowerCase()}</small></span>
                  <i>+</i>
                </button>
              )) : (
                <p>No TrailMix friends found</p>
              )}
            </div>
          )}
          {taggedFriends.length > 0 && (
            <div className="tagged-friends">
              {taggedFriends.map((name) => (
                <button
                  aria-label={`Remove ${name}`}
                  className="friend-chip"
                  key={name}
                  onClick={() => setTaggedFriends((current) => current.filter((n) => n !== name))}
                  type="button"
                >
                  <span className="chip-avatar">{name.charAt(0)}</span>
                  {name}
                  <span aria-hidden="true" className="chip-remove">×</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </section>
      <div className="sticky-action">
        <Button disabled={selectedDetails.length === 0} onClick={onSave}>Save</Button>
      </div>
    </Shell>
  );
}

const ingredientIcons: Record<string, string> = {
  chocolate:    "/assets/chocolate.svg",
  "dried-fruit":"/assets/dried-fruit.svg",
  almonds:      "/assets/almonds.svg",
  cashew:       "/assets/cashew.svg",
  cranberries:  "/assets/cranberries.svg",
  pretzel:      "/assets/pretzel.svg",
  nuts:         "/assets/nuts.svg",
  apricot:      "/assets/apricot.svg",
  banana:       "/assets/banana.svg",
  date:         "/assets/date.svg",
  popcorn:      "/assets/popcorn.svg",
  chex:         "/assets/chex.svg",
  pistachios:   "/assets/pistachios.svg",
};

function Ingredient({ type, className = "" }: { type: string; className?: string }) {
  const src = ingredientIcons[type];
  if (src) return <img alt={type} className={`ingredient ${type} ${className}`} src={src} />;
  return <span className={`ingredient ${className}`} />;
}

function Result({
  rank,
  details,
  trail,
  ranking,
  lowerRanking,
  onRestart,
  onBack,
}: {
  rank: number;
  details: number[];
  trail: Trail;
  ranking: string[];
  lowerRanking: string[];
  onRestart: () => void;
  onBack: () => void;
}) {
  const choices = details.map((detail) => detailOptions[detail]);
  const mix = useMemo(() => [
    "almonds", "cranberries", "pretzel", "chocolate", "cashew", "dried-fruit",
    "nuts", "almonds", "cranberries", "cashew", "pretzel", "chocolate",
    "dried-fruit", "nuts", "almonds", "cashew", "pretzel",
  ], []);

  // Change 7: newly unlocked ingredient (UNLOCKED_COUNT is the index now unlocked)
  const newlyUnlocked = detailOptions[UNLOCKED_COUNT];

  // Stats
  const totalHikes = ranking.length + lowerRanking.length;
  const miles = trail.meta.split("·")[0].trim();

  // Full ranked list combining mountain + lower ranks
  const allRanked = [...ranking, ...lowerRanking];

  // Ref for scrolling to the full rankings section
  const rankingsRef = useRef<HTMLDivElement>(null);

  return (
    <Shell onBack={onBack} step={5}>
      <section className="screen-content result-screen">
        <div className="result-copy">
          <span className="eyebrow">Hike logged</span>
          <h1>Into the mix!</h1>
          <p>{choices.map((choice) => choice.ingredient).join(", ")} added to your growing collection.</p>
        </div>
        <div className="jar-stage">
          <div className="reaction-burst"><span>!</span></div>
          <Squirrel mood="wow" />
          {choices.map((choice, index) => (
            <div className={`falling-wrap fall-${index % 3}`} key={choice.ingredient}>
              <Ingredient className="falling-ingredient" type={choice.shape} />
              <span className="ingredient-label">{choice.ingredient}</span>
            </div>
          ))}
          <div className="jar-lid"><span /><span /><span /></div>
          <div className="jar">
            <div className="jar-shine" />
            <div className="mix">
              {mix.map((type, index) => <Ingredient className={`piece piece-${index}`} key={index} type={type} />)}
              {choices.map((choice, index) => (
                <Ingredient className={`new-piece new-piece-${index % 3}`} key={choice.ingredient} type={choice.shape} />
              ))}
            </div>
            <div className="jar-label"><b>TRAIL</b><span>MIX</span><small>Alex's jar</small></div>
          </div>
          <div className="ground-shadow" />
        </div>
        <div className="rank-result">
          <span>Bommer Canyon Loop is</span>
          <b>#{rank}</b>
          <small>in your personal rankings</small>
        </div>

        {/* Change 7: newly unlocked ingredient */}
        <div className="new-unlock-row">
          <img alt={newlyUnlocked.ingredient} className="new-unlock-img" src={newlyUnlocked.icon} />
          <div className="new-unlock-copy">
            <small>New ingredient unlocked</small>
            <b>{newlyUnlocked.ingredient}</b>
            <span>for {newlyUnlocked.label.toLowerCase()} on the trail</span>
          </div>
        </div>

        {/* Change 7: quick stats */}
        <div className="result-stats-row">
          <div className="result-stat-box">
            <b>{totalHikes}</b>
            <small>hikes logged</small>
          </div>
          <div className="result-stat-box">
            <b>#{rank}</b>
            <small>your ranking</small>
          </div>
          <div className="result-stat-box">
            <b>{miles}</b>
            <small>this hike</small>
          </div>
        </div>

        {/* Change 7: full ranked hike list */}
        <div className="full-rankings-section" ref={rankingsRef}>
          <h3>Your rankings</h3>
          {allRanked.map((name, index) => {
            const isNew = name === "Bommer Canyon Loop";
            return (
              <div className={`full-rank-item ${isNew ? "highlight" : ""}`} key={name}>
                <span className="fr-num">#{index + 1}</span>
                <span className="fr-name">{name}</span>
                {isNew && <span className="new-badge">New</span>}
              </div>
            );
          })}
        </div>
      </section>
      <div className="dual-action sticky-action">
        <Button
          secondary
          onClick={() => rankingsRef.current?.scrollIntoView({ behavior: "smooth" })}
        >
          My rankings
        </Button>
        <Button onClick={onRestart}>Done</Button>
      </div>
    </Shell>
  );
}

export default function App() {
  const [step, setStep] = useState(1);
  const [selectedTrail, setSelectedTrail] = useState<Trail | null>(null);
  const [rating, setRating] = useState("");
  const [difficulty, setDifficulty] = useState(2);
  const [ranking, setRanking] = useState([
    "Holy Jim Falls",
    "Bommer Canyon Loop",
    "Top of the World",
    "Crystal Cove Moro Ridge",
  ]);
  const [lowerRanking, setLowerRanking] = useState([
    "Peters Canyon Loop",
    "Quail Hill Trail",
    "Black Star Canyon",
    "Buck Gully Trail",
    "Laguna Coast Loop",
    "Santiago Oaks",
    "Moro Canyon Trail",
    "Red Rock Canyon",
  ]);
  const [selectedDetails, setSelectedDetails] = useState<number[]>([0]);
  const [caption, setCaption] = useState("");

  const go = (next: number) => {
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (step === 1) return <TrailSelect onNext={() => go(2)} selected={selectedTrail} setSelected={setSelectedTrail} />;
  if (step === 2) return <RateTrail difficulty={difficulty} onBack={() => go(1)} onNext={() => go(3)} rating={rating} setDifficulty={setDifficulty} setRating={setRating} trail={selectedTrail ?? trails[0]} />;
  if (step === 3) return <RankTrail lowerRanking={lowerRanking} onBack={() => go(2)} onNext={() => go(4)} ranking={ranking} setLowerRanking={setLowerRanking} setRanking={setRanking} />;
  if (step === 4) return <AddDetails caption={caption} onBack={() => go(3)} onSave={() => go(5)} selectedDetails={selectedDetails} setCaption={setCaption} setSelectedDetails={setSelectedDetails} />;
  return (
    <Result
      details={selectedDetails}
      lowerRanking={lowerRanking}
      onBack={() => go(4)}
      onRestart={() => {
        setRating("");
        setDifficulty(2);
        setCaption("");
        setSelectedDetails([0]);
        setSelectedTrail(null);
        go(1);
      }}
      rank={
        ranking.includes("Bommer Canyon Loop")
          ? ranking.indexOf("Bommer Canyon Loop") + 1
          : lowerRanking.indexOf("Bommer Canyon Loop") + ranking.length + 1
      }
      ranking={ranking}
      trail={selectedTrail ?? trails[0]}
    />
  );
}
