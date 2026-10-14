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
  { label: "Views", ingredient: "Chocolate", color: "#6f4434", shape: "chocolate" },
  { label: "Waterfall", ingredient: "Raisins", color: "#6b405f", shape: "raisin" },
  { label: "Climb", ingredient: "Almonds", color: "#d7a15f", shape: "almond" },
  { label: "Wildlife", ingredient: "Seeds", color: "#d2b35b", shape: "seed" },
  { label: "Sunset", ingredient: "M&Ms", color: "#e4673d", shape: "candy" },
  { label: "Rocky", ingredient: "Pretzels", color: "#bd783f", shape: "pretzel" },
];

const ratings = [
  { label: "Loved it", icon: "♥", color: "#e25e3f" },
  { label: "It was fine", icon: "●", color: "#d5a23e" },
  { label: "Not for me", icon: "−", color: "#6e8370" },
];

const availableFriends = ["Caine", "Kaylee", "Oscar", "Amanda", "Emma"];

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
      <header className="app-header">
        {onBack ? (
          <button aria-label="Go back" className="header-back" onClick={onBack}>
            <Arrow direction="left" />
          </button>
        ) : <span className="header-spacer" />}
        <div className="wordmark">
          <span className="wordmark-mark"><span /></span>
          <b>TrailMix</b>
        </div>
        <span className="header-spacer" />
      </header>
      <Progress step={step} />
      {children}
    </main>
  );
}

function Squirrel({ mood = "eager", small = false }: { mood?: "eager" | "wow" | "down"; small?: boolean }) {
  return (
    <div aria-label="TrailMix squirrel mascot" className={`squirrel ${small ? "small" : ""} ${mood}`}>
      <span className="tail" />
      <span className="body"><span className="backpack" /></span>
      <span className="head">
        <i className="ear left" /><i className="ear right" />
        <i className="eye left" /><i className="eye right" />
        <i className="cheek left" /><i className="cheek right" />
        <i className="nose" />
      </span>
      <span className="arm" />
    </div>
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
        <div className="mascot-prompt">
          <div className="speech-bubble">Spill it!</div>
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

  const move = (items: string[], updateItems: (items: string[]) => void, from: number, to: number) => {
    if (from === to || to < 0 || to >= items.length) return;
    const next = [...items];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    draggingIndex.current = to;
    updateItems(next);
  };

  const startDrag = (index: number, y: number) => {
    draggingIndex.current = index;
    dragY.current = y;
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
                      className={`rank-item rank-${index + 1} ${isNew ? "new-trail" : ""}`}
                      key={name}
                      onPointerDown={(event) => {
                        if (!isNew) return;
                        event.currentTarget.setPointerCapture(event.pointerId);
                        startDrag(index, event.clientY);
                      }}
                      onPointerMove={(event) => handleMove(event.clientY)}
                      onPointerUp={() => { draggingIndex.current = null; }}
                    >
                      <span className="rank-number">#{index + 1}</span>
                      <span className="rank-name">{name}</span>
                      {isNew && <span className="drag-handle">⠿</span>}
                    </div>
                  );
                })}
              </div>
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
                    className={`lower-rank-item ${isNew ? "new-trail" : ""}`}
                    key={name}
                    onPointerDown={(event) => {
                      if (!isNew) return;
                      event.currentTarget.setPointerCapture(event.pointerId);
                      startDrag(index, event.clientY);
                    }}
                    onPointerMove={(event) => handleMove(event.clientY)}
                    onPointerUp={() => { draggingIndex.current = null; }}
                  >
                    <span className="rank-number">#{index + 4}</span>
                    <span className="rank-name">{name}</span>
                    {isNew && <span className="drag-handle">⠿</span>}
                  </div>
                );
              })}
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
          <p className="unlock-note">The more hikes you log, the more ingredients you can unlock.</p>
          <div className="detail-grid">
            {detailOptions.map((option, index) => (
              <button
                className={`detail-chip ${selectedDetails.includes(index) ? "selected" : ""}`}
                key={option.label}
                onClick={() => setSelectedDetails(
                  selectedDetails.includes(index)
                    ? selectedDetails.filter((item) => item !== index)
                    : [...selectedDetails, index],
                )}
              >
                <span className={`ingredient-dot ${option.shape}`} style={{ background: option.color }} />
                <span><b>{option.label}</b><small>{option.ingredient}</small></span>
              </button>
            ))}
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
                  key={name}
                  onClick={() => setTaggedFriends((current) => current.filter((friendName) => friendName !== name))}
                  type="button"
                >
                  <span>{name.charAt(0)}</span>{name}<i>×</i>
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

function Ingredient({ type, className = "" }: { type: string; className?: string }) {
  if (type === "pretzel") return <span className={`ingredient pretzel ${className}`}>◎</span>;
  if (type === "almond") return <span className={`ingredient almond ${className}`} />;
  if (type === "raisin") return <span className={`ingredient raisin ${className}`} />;
  if (type === "seed") return <span className={`ingredient seed ${className}`} />;
  if (type === "candy") return <span className={`ingredient candy ${className}`} />;
  return <span className={`ingredient chocolate ${className}`} />;
}

function Result({
  rank,
  details,
  onRestart,
  onRankings,
  onBack,
}: {
  rank: number;
  details: number[];
  onRestart: () => void;
  onRankings: () => void;
  onBack: () => void;
}) {
  const choices = details.map((detail) => detailOptions[detail]);
  const mix = useMemo(() => [
    "almond", "candy", "raisin", "pretzel", "seed", "chocolate",
    "candy", "almond", "raisin", "seed", "pretzel", "chocolate",
    "raisin", "candy", "almond", "seed", "pretzel",
  ], []);

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
      </section>
      <div className="dual-action sticky-action">
        <Button secondary onClick={onRankings}>My rankings</Button>
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
      onBack={() => go(4)}
      onRankings={() => go(3)}
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
          : lowerRanking.indexOf("Bommer Canyon Loop") + 4
      }
    />
  );
}
