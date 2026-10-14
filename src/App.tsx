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
          <b>TrailMix</b>
        </div>
        <span className="header-spacer" />
      </header>
      <Progress step={step} />
      {children}
    </main>
  );
}

function Squirrel({ small = false }: { mood?: "eager" | "wow" | "down"; small?: boolean }) {
  return (
    <img
      alt="TrailMix mascot"
      src="/assets/cashew.svg"
      style={{ width: small ? 48 : 80, height: "auto", display: "block" }}
    />
  );
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
