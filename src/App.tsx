import { useEffect, useMemo, useRef, useState } from "react";
import BottomNav, { type Tab } from "./components/BottomNav";
import Authpage, { type AuthUser } from "./components/Authpage";
import Feed from "./components/Feed";
import Profile from "./components/Profile";
import Settings from "./components/Settings";
import { friends, initialFeedPosts, type FeedPost } from "./data/feedPosts";
import { type Trail } from "./data/trails";
import {
  deleteHikeLog,
  fetchHikeLogs,
  fetchTrails,
  fetchUnlockedIngredients,
  saveHikeLog,
  saveRanking,
  type HikeLog,
} from "./lib/hikes";

const detailOptions = [
  { label: "Views",       ingredient: "Chocolate",  color: "#6f4434", shape: "chocolate",  icon: "/assets/chocolate.svg" },
  { label: "Waterfall",  ingredient: "Dried Fruit", color: "#6b405f", shape: "dried-fruit", icon: "/assets/dried-fruit.svg" },
  { label: "Climb",      ingredient: "Almonds",     color: "#d7a15f", shape: "almonds",    icon: "/assets/almonds.svg" },
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

type MascotVariant =
  | "default" | "loved-it" | "its-fine" | "not-for-me" | "thinking"
  | "stuffed-cheeks" | "toss" | "celebrate" | "summit" | "hiker"
  | "sleepy" | "oops";

const mascotData: Record<MascotVariant, { src: string; lines: string[] }> = {
  "default":        { src: "/assets/cashew-01-default.svg",       lines: ["Ooh, where'd you go today?", "New hike? Tell me everything.", "I smell a new trail on you."] },
  "loved-it":       { src: "/assets/cashew-02-loved-it.svg",      lines: ["Ahh, a good one! I can tell.", "Say less. I'm already jealous.", "That's going in the good snack pile."] },
  "its-fine":       { src: "/assets/cashew-03-its-fine.svg",      lines: ["Not bad. Solid trail snack.", "A perfectly decent hike. Respect.", "Middle of the bag. Like a peanut."] },
  "not-for-me":     { src: "/assets/cashew-04-not-for-me.svg",    lines: ["Oof. We don't have to talk about it.", "Can't love every trail. Or every raisin.", "Noted. We won't go back."] },
  "thinking":       { src: "/assets/cashew-05-thinking.svg",      lines: ["Hmm, where does this one go?", "Higher or lower? Take your time.", "Is it summit worthy? Drag it up and see."] },
  "stuffed-cheeks": { src: "/assets/cashew-06-stuffed-cheeks.svg",lines: ["Mmf... saving your hike...", "Hold on, my mouth is full.", "Stashing this for later..."] },
  "toss":           { src: "/assets/cashew-07-toss.svg",          lines: ["{ingredient} for the mix!", "Into the jar it goes!", "One {ingredient}, coming right up."] },
  "celebrate":      { src: "/assets/cashew-08-celebrate.svg",     lines: ["{trail} is #{rank}! Big hike energy.", "Look at your mix growing!", "New ingredient unlocked. I'm so proud."] },
  "summit":         { src: "/assets/cashew-09-summit.svg",        lines: ["New summit! {trail} is your #1!", "We have a new champion!", "Top of the mountain, baby."] },
  "hiker":          { src: "/assets/cashew-10-hiker.svg",         lines: ["Ready when you are, trail buddy.", "Lace up. Snacks packed. Let's go.", "Every hike adds to your mix."] },
  "sleepy":         { src: "/assets/cashew-11-sleepy.svg",        lines: ["Zzz... wake me when you hike.", "No hikes yet. My jar is so empty.", "It's quiet in here. Too quiet."] },
  "oops":           { src: "/assets/cashew-12-oops.svg",          lines: ["Oops! I dropped something. Try again?", "That didn't work. Not your fault. Probably mine.", "Hmm, can't find that trail. Want to add it?"] },
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function applyVars(line: string, vars: { trail?: string; rank?: number; ingredient?: string }): string {
  return line
    .replace("{trail}", vars.trail ?? "")
    .replace("{rank}", vars.rank != null ? String(vars.rank) : "")
    .replace("{ingredient}", vars.ingredient ?? "");
}

function getResultVariant(rank: number, total: number): MascotVariant {
  if (rank === 1) return "summit";
  if (rank <= Math.ceil(total / 3)) return "celebrate";
  if (rank <= Math.ceil((2 * total) / 3)) return "its-fine";
  return "not-for-me";
}

// New users start with the first few ingredients; each logged hike unlocks the next one
// (saved to user_ingredients, keyed by detailOptions[i].shape).
const STARTER_INGREDIENTS = 3;

function unlockedIndexes(unlockedKeys: string[]): Set<number> {
  const unlocked = new Set<number>();
  detailOptions.forEach((option, index) => {
    if (index < STARTER_INGREDIENTS || unlockedKeys.includes(option.shape)) unlocked.add(index);
  });
  return unlocked;
}

function nextUnlockIndex(unlockedKeys: string[]): number | null {
  const unlocked = unlockedIndexes(unlockedKeys);
  const index = detailOptions.findIndex((_, i) => !unlocked.has(i));
  return index === -1 ? null : index;
}

// Shapes for the ingredients picked on each hike, oldest pick first
function hikeShapes(logs: HikeLog[]): string[] {
  return logs.flatMap((log) =>
    log.highlights.map((label) => detailOptions.find((option) => option.label === label)?.shape).filter((s): s is string => !!s),
  );
}

// Jar fills up as more ingredients are picked (17 piece positions in the CSS)
function buildJarMix(shapes: string[]): string[] {
  if (shapes.length === 0) return [];
  return Array.from({ length: Math.min(17, shapes.length * 3) }, (_, i) => shapes[i % shapes.length]);
}

function formatHikeDate(date: string): string {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "message" in error) return String(error.message);
  return "Something went wrong.";
}

type RankItem = { id: string; name: string };

// Placeholder id for the hike being logged, before it has a database row
const NEW_HIKE = "new";

const ingredientCategories: { label: string; indices: number[] }[] = [
  { label: "Sweet",        indices: [0] },
  { label: "Dried Fruit",  indices: [1, 3, 6, 7, 8] },
  { label: "Nuts & Seeds", indices: [2, 5, 11] },
  { label: "Crunchy",      indices: [4, 9, 10] },
];

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
        background: #fffcf7 !important;
        border: 1.5px solid #d4b48a !important;
        box-shadow: 0 3px 10px rgba(100,60,20,0.14) !important;
        border-radius: 14px !important;
        padding: 8px 14px !important;
        font-weight: 600;
        color: #5a3e2b;
      }
      .speech-bubble-tail {
        position: absolute;
        bottom: -11px;
        right: 16px;
        width: 0;
        height: 0;
        border-left: 7px solid transparent;
        border-right: 7px solid transparent;
        border-top: 11px solid #d4b48a;
        pointer-events: none;
      }
      .speech-bubble-tail::after {
        content: '';
        position: absolute;
        bottom: 2px;
        left: -6px;
        width: 0;
        height: 0;
        border-left: 6px solid transparent;
        border-right: 6px solid transparent;
        border-top: 10px solid #fffcf7;
      }

      /* ── Bottom nav: 4 tabs, full labels ── */
      .bottom-nav {
        display: flex !important;
      }
      .nav-tab {
        flex: 1 !important;
        min-width: 0 !important;
        padding-left: 2px !important;
        padding-right: 2px !important;
      }
      .nav-tab span {
        font-size: 9px !important;
        white-space: normal !important;
        word-break: break-word !important;
        text-align: center !important;
        line-height: 1.2 !important;
        max-width: 100% !important;
        display: block !important;
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

      /* ── Accomplishments ── */
      .accomplishments-screen {
        padding: 0 0 24px;
      }
      .accom-header {
        padding: 20px 16px 0;
      }
      .accom-header > h1 {
        font-size: 26px;
        font-weight: 700;
        color: #3a2c1e;
        margin: 0 0 16px;
      }
      .accom-stats-row {
        display: flex;
        gap: 8px;
        margin-bottom: 20px;
        overflow-x: auto;
      }
      .accom-stat {
        background: #f5f0e8;
        border-radius: 12px;
        padding: 10px 10px;
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2px;
      }
      .accom-stat b {
        font-size: 16px;
        color: #3a2c1e;
        line-height: 1.1;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        max-width: 100%;
        display: block;
        text-align: center;
      }
      .accom-stat small {
        font-size: 10px;
        color: #8a7e70;
        text-align: center;
        white-space: nowrap;
      }
      .accom-tabs {
        display: flex;
        border-bottom: 1.5px solid #e8dfd4;
      }
      .accom-tab-btn {
        flex: 1;
        background: none;
        border: none;
        padding: 10px 0 11px;
        font-size: 14px;
        font-weight: 600;
        color: #8a7e70;
        cursor: pointer;
        border-bottom: 2.5px solid transparent;
        margin-bottom: -1.5px;
      }
      .accom-tab-btn.active {
        color: #c2571f;
        border-bottom-color: #c2571f;
      }
      .accomplishments-screen .mountain-scene {
        margin: 16px 16px 0;
      }
      .accom-rank-list-section {
        padding: 8px 16px 8px;
      }
      .accom-rank-item {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 11px 12px;
        border-radius: 10px;
        cursor: grab;
        user-select: none;
        touch-action: none;
        -webkit-user-select: none;
      }
      .accom-rank-item.dragging {
        background: #fff0d8;
        opacity: 0.9;
      }
      .accom-rank-item .ar-num {
        font-size: 12px;
        color: #8a7e70;
        width: 26px;
        flex-shrink: 0;
        font-weight: 600;
      }
      .accom-rank-item .ar-name {
        flex: 1;
        font-size: 14px;
        color: #3a2c1e;
        font-weight: 500;
      }
      .accom-rank-item .ar-rating {
        font-size: 15px;
        flex-shrink: 0;
      }
      .accom-rank-item .ar-drag {
        font-size: 16px;
        color: #c8b89a;
        flex-shrink: 0;
      }
      .hike-detail-overlay, .ingredient-hike-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.35);
        z-index: 200;
        display: flex;
        align-items: flex-end;
      }
      .hike-detail-sheet, .ingredient-hike-sheet {
        background: #fffcf7;
        border-radius: 20px 20px 0 0;
        padding: 8px 20px 36px;
        width: 100%;
        max-height: 72vh;
        overflow-y: auto;
        box-sizing: border-box;
      }
      .sheet-handle {
        width: 36px;
        height: 4px;
        background: #ddd;
        border-radius: 2px;
        margin: 0 auto 16px;
      }
      .hike-detail-sheet h2, .ingredient-hike-sheet h2 {
        font-size: 18px;
        color: #3a2c1e;
        margin: 0 0 4px;
      }
      .sheet-meta {
        font-size: 13px;
        color: #8a7e70;
        margin-bottom: 16px;
      }
      .sheet-detail-row {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        padding: 10px 0;
        border-top: 1px solid #ede5d8;
        font-size: 14px;
        color: #3a2c1e;
      }
      .sheet-detail-row .sdr-label {
        font-size: 12px;
        color: #8a7e70;
        width: 80px;
        flex-shrink: 0;
        padding-top: 1px;
      }
      .sheet-close-btn {
        width: 100%;
        margin-top: 20px;
        padding: 13px;
        background: #f0e8dc;
        border: none;
        border-radius: 12px;
        font-size: 15px;
        font-weight: 600;
        color: #5a3e2b;
        cursor: pointer;
        display: block;
      }
      .accom-jar-stage {
        position: relative !important;
        height: 280px !important;
        width: 100% !important;
        display: flex !important;
        justify-content: center !important;
        align-items: flex-end !important;
      }
      .accom-ingredient-categories {
        padding: 16px 16px 0;
      }
      .accom-category {
        margin-bottom: 22px;
      }
      .accom-category > h3 {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #8a7e70;
        margin: 0 0 10px;
      }
      .accom-ingredient-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
      }
      .accom-ingredient-cell {
        background: #f5f0e8;
        border-radius: 12px;
        padding: 12px 6px 10px;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 5px;
        border: 1.5px solid transparent;
      }
      .accom-ingredient-cell.unlocked {
        cursor: pointer;
      }
      .accom-ingredient-cell.locked {
        opacity: 0.42;
        cursor: not-allowed;
        filter: grayscale(0.7);
      }
      .accom-ingredient-cell img {
        width: 44px;
        height: 44px;
        object-fit: contain;
      }
      .accom-ingredient-cell .ai-name {
        font-size: 11px;
        font-weight: 600;
        color: #3a2c1e;
        text-align: center;
      }
      .accom-ingredient-cell .ai-count {
        font-size: 10px;
        color: #8a7e70;
      }
      .accom-ingredient-cell .ai-lock {
        font-size: 24px;
        width: 44px;
        height: 44px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      .ingredient-hike-sheet .ids-img {
        width: 64px;
        height: 64px;
        object-fit: contain;
        display: block;
        margin: 12px auto 8px;
      }
      .ingredient-hike-sheet h2 {
        text-align: center;
      }
      .ids-subtitle {
        font-size: 13px;
        color: #8a7e70;
        text-align: center;
        margin-bottom: 14px;
      }
      .ids-hike-row {
        padding: 10px 0;
        border-top: 1px solid #ede5d8;
        font-size: 14px;
        color: #3a2c1e;
      }
      .ids-section-label {
        font-size: 11px;
        text-transform: uppercase;
        letter-spacing: 0.06em;
        color: #8a7e70;
        margin-bottom: 6px;
      }
      .accom-empty {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 40px 24px;
        gap: 16px;
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
  headerAction,
}: {
  step?: number;
  children: React.ReactNode;
  onBack?: () => void;
  headerAction?: React.ReactNode;
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
        {headerAction ?? <span className="header-spacer" />}
      </header>
      {step !== undefined && <Progress step={step} />}
      {children}
    </main>
  );
}

function Mascot({
  variant,
  small = false,
  trail,
  rank,
  ingredient,
}: {
  variant: MascotVariant;
  small?: boolean;
  trail?: string;
  rank?: number;
  ingredient?: string;
}) {
  const data = mascotData[variant];
  const [line] = useState(() => applyVars(pickRandom(data.lines), { trail, rank, ingredient }));
  const size = small ? 144 : 144;
  return (
    <div className="mascot-prompt">
      <div className="speech-bubble">
        {line}
        <span className="speech-bubble-tail" />
      </div>
      <img alt="TrailMix mascot" src={data.src} style={{ width: size, height: "auto", display: "block" }} />
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
  trails,
  loadError,
  selected,
  setSelected,
  onNext,
}: {
  trails: Trail[] | null;
  loadError: string;
  selected: Trail | null;
  setSelected: (trail: Trail) => void;
  onNext: () => void;
}) {
  const [query, setQuery] = useState("");
  const filtered = (trails ?? []).filter((trail) => trail.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <Shell step={1}>
      <section className="screen-content trail-screen">
        <div className="screen-title">
          <span className="eyebrow">Pick your path</span>
          <h1>Which trail did you hike</h1>
        </div>
        {loadError ? <Mascot key="oops" variant="oops" /> : <Mascot variant="default" />}
        <label className="search-field">
          <span aria-hidden="true">⌕</span>
          <input onChange={(event) => setQuery(event.target.value)} placeholder="Search trails" value={query} />
        </label>
        <div className="section-heading">
          <h2>Near you</h2>
          <span>Orange County</span>
        </div>
        <div className="trail-list">
          {loadError && <p className="unlock-note">Couldn't load trails: {loadError}</p>}
          {!loadError && !trails && <p className="unlock-note">Loading trails…</p>}
          {trails && filtered.length === 0 && (
            <p className="unlock-note">{trails.length === 0 ? "No trails yet." : "No trails match your search."}</p>
          )}
          {filtered.map((trail) => (
            <button
              className={`trail-card ${selected?.id === trail.id ? "selected" : ""}`}
              key={trail.id}
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
  const ratingVariant: MascotVariant =
    rating === "Loved it!" ? "loved-it" :
    rating === "It was fine" ? "its-fine" :
    rating === "Not for me" ? "not-for-me" :
    "default";
  return (
    <Shell onBack={onBack} step={2}>
      <section className="screen-content rate-screen">
        <div className="hero-photo">
          <img alt={`View from ${trail.name}`} src={trail.image} />
          <span className="photo-sticker">Today · {trail.area ?? "Orange County"}</span>
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
        <Mascot key={ratingVariant} variant={ratingVariant} />
      </section>
      <div className="sticky-action">
        <Button disabled={!rating} onClick={onNext}>Next</Button>
      </div>
    </Shell>
  );
}

function RankTrail({
  trailName,
  ranking,
  setRanking,
  lowerRanking,
  setLowerRanking,
  onNext,
  onBack,
}: {
  trailName: string;
  ranking: RankItem[];
  setRanking: (ranking: RankItem[]) => void;
  lowerRanking: RankItem[];
  setLowerRanking: (ranking: RankItem[]) => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const [showLowerRanks, setShowLowerRanks] = useState(!ranking.some((item) => item.id === NEW_HIKE));
  const newItem = [...ranking, ...lowerRanking].find((item) => item.id === NEW_HIKE)!;
  // Only offer the lower-ranks view once there are more hikes than mountain spots
  const hasLowerRanks = ranking.length + lowerRanking.length > 4;
  const draggingIndex = useRef<number | null>(null);
  const dragY = useRef(0);
  // Change 2: track whether the user has dragged at least once and the live drag position
  const [hasDragged, setHasDragged] = useState(false);
  const [dragPos, setDragPos] = useState<number | null>(null);

  const move = (items: RankItem[], updateItems: (items: RankItem[]) => void, from: number, to: number) => {
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
    // items[dragPos - 1] has a higher rank → the new hike is below them
    // items[dragPos + 1] has a lower rank → the new hike is above them
    const higherNeighbor = items[dragPos - 1]?.name;
    const lowerNeighbor = items[dragPos + 1]?.name;
    const parts: string[] = [];
    if (lowerNeighbor) parts.push(`Above ${lowerNeighbor}`);
    if (higherNeighbor) parts.push(`below ${higherNeighbor}`);
    if (parts.length === 0) return "Your top-ranked hike!";
    return parts.join(", ");
  };

  const openLowerRanks = () => {
    setRanking(ranking.filter((item) => item.id !== NEW_HIKE));
    setLowerRanking([newItem, ...lowerRanking.filter((item) => item.id !== NEW_HIKE)]);
    setShowLowerRanks(true);
  };

  const returnToMountain = () => {
    setLowerRanking(lowerRanking.filter((item) => item.id !== NEW_HIKE));
    setRanking([...ranking.filter((item) => item.id !== NEW_HIKE), newItem]);
    setShowLowerRanks(false);
  };

  const dragContext = getDragContext();

  return (
    <Shell onBack={onBack} step={3}>
      <section className="screen-content rank-screen">
        <div className="screen-title">
          <span className="eyebrow">Your personal peaks</span>
          <h1>{showLowerRanks ? "Rank it with the rest" : "Place it on your mountain"}</h1>
          <p>{showLowerRanks ? `Drag ${trailName} anywhere from #4 down.` : `Drag ${trailName} up or down to rank it.`}</p>
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
                {ranking.slice(0, 4).map((item, index) => {
                  const isNew = item.id === NEW_HIKE;
                  return (
                    <div
                      className={`rank-item rank-${index + 1} ${isNew ? "new-trail" : ""} ${isNew && !hasDragged ? "show-hint" : ""}`}
                      key={item.id}
                      onPointerDown={(event) => {
                        if (!isNew) return;
                        event.currentTarget.setPointerCapture(event.pointerId);
                        startDrag(index, event.clientY);
                      }}
                      onPointerMove={(event) => handleMove(event.clientY)}
                      onPointerUp={stopDrag}
                    >
                      <span className="rank-number">#{index + 1}</span>
                      <span className="rank-name">{item.name}</span>
                      {isNew && <span className="drag-handle">⠿</span>}
                    </div>
                  );
                })}
              </div>
              {/* Change 2: live context during drag */}
              {dragContext && (
                <div className="drag-context-strip">{dragContext}</div>
              )}
              <img alt="" className="figma-mountain-guide" src="/assets/2cec3.svg" />
            </div>
            {!hasDragged && <Mascot variant="thinking" />}
            {hasLowerRanks && (
              <button className="lower-ranks-button" onClick={openLowerRanks}>
                <span><b>Didn't make the top four?</b><small>Rank it with the rest of your hikes</small></span>
                <img alt="" src="/assets/cashew-04-not-for-me.svg" style={{ width: 80, height: "auto" }} />
              </button>
            )}
          </>
        ) : (
          <div className="lower-ranks-view">
            <button className="return-mountain" onClick={returnToMountain}>← Put it back on the mountain</button>
            <div className="lower-ranks-list">
              {lowerRanking.map((item, index) => {
                const isNew = item.id === NEW_HIKE;
                return (
                  <div
                    className={`lower-rank-item ${isNew ? "new-trail" : ""} ${isNew && !hasDragged ? "show-hint" : ""}`}
                    key={item.id}
                    onPointerDown={(event) => {
                      if (!isNew) return;
                      event.currentTarget.setPointerCapture(event.pointerId);
                      startDrag(index, event.clientY);
                    }}
                    onPointerMove={(event) => handleMove(event.clientY)}
                    onPointerUp={stopDrag}
                  >
                    <span className="rank-number">#{index + ranking.length + 1}</span>
                    <span className="rank-name">{item.name}</span>
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
  trailName,
  unlocked,
  selectedDetails,
  setSelectedDetails,
  photos,
  setPhotos,
  caption,
  setCaption,
  taggedFriends,
  setTaggedFriends,
  saving,
  saveError,
  onSave,
  onBack,
}: {
  trailName: string;
  unlocked: Set<number>;
  selectedDetails: number[];
  setSelectedDetails: (indexes: number[]) => void;
  photos: File[];
  setPhotos: React.Dispatch<React.SetStateAction<File[]>>;
  caption: string;
  setCaption: (caption: string) => void;
  taggedFriends: string[];
  setTaggedFriends: React.Dispatch<React.SetStateAction<string[]>>;
  saving: boolean;
  saveError: string;
  onSave: () => void;
  onBack: () => void;
}) {
  const photoInput = useRef<HTMLInputElement>(null);
  const photoPreviews = useMemo(() => photos.map((file) => URL.createObjectURL(file)), [photos]);
  useEffect(() => () => photoPreviews.forEach((url) => URL.revokeObjectURL(url)), [photoPreviews]);
  const [friend, setFriend] = useState("");
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
          <span className="eyebrow">{trailName}</span>
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
              const isLocked = !unlocked.has(index);
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
        {selectedDetails.length > 0 && (
          <Mascot
            key={selectedDetails[selectedDetails.length - 1]}
            ingredient={detailOptions[selectedDetails[selectedDetails.length - 1]]?.ingredient}
            variant="toss"
          />
        )}
        <div className="field-group">
          <div className="section-heading"><h2>Photos</h2><span>{photos.length} added</span></div>
          <div className="photo-row">
            <button className="add-photo" onClick={() => photoInput.current?.click()} type="button"><span>+</span><small>Add</small></button>
            <input
              accept="image/*"
              hidden
              multiple
              onChange={(event) => {
                const files = Array.from(event.target.files ?? []);
                setPhotos((current) => [...current, ...files]);
                event.target.value = "";
              }}
              ref={photoInput}
              type="file"
            />
            {photoPreviews.map((src, index) => (
              <img
                alt={`Photo ${index + 1} (tap to remove)`}
                key={src}
                onClick={() => setPhotos((current) => current.filter((_, i) => i !== index))}
                src={src}
              />
            ))}
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
        {saving && <Mascot variant="stuffed-cheeks" />}
        {!saving && saveError && (
          <>
            <Mascot key={saveError} variant="oops" />
            <p className="auth-error" role="alert">{saveError}</p>
          </>
        )}
      </section>
      <div className="sticky-action">
        <Button disabled={selectedDetails.length === 0 || saving} onClick={onSave}>{saving ? "Saving…" : "Save"}</Button>
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
  previousShapes,
  unlockIndex,
  jarOwner,
  onRestart,
  onBack,
}: {
  rank: number;
  details: number[];
  trail: Trail;
  ranking: RankItem[];
  lowerRanking: RankItem[];
  previousShapes: string[];
  unlockIndex: number | null;
  jarOwner: string;
  onRestart: () => void;
  onBack?: () => void;
}) {
  const choices = details.map((detail) => detailOptions[detail]);
  const mix = useMemo(() => buildJarMix(previousShapes), [previousShapes]);

  // Change 7: newly unlocked ingredient (none once everything is unlocked)
  const newlyUnlocked = unlockIndex !== null ? detailOptions[unlockIndex] : null;

  // Stats
  const totalHikes = ranking.length + lowerRanking.length;
  const miles = trail.meta.split("·")[0].trim();
  const resultVariant = getResultVariant(rank, totalHikes);

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
            <div className="jar-label"><b>TRAIL</b><span>MIX</span><small>{jarOwner}'s jar</small></div>
          </div>
          <div className="ground-shadow" />
        </div>
        <div className="rank-result">
          <span>{trail.name} is</span>
          <b>#{rank}</b>
          <small>in your personal rankings</small>
        </div>
        <Mascot
          ingredient={choices[0]?.ingredient}
          rank={rank}
          trail={trail.name}
          variant={resultVariant}
        />

        {/* Change 7: newly unlocked ingredient */}
        {newlyUnlocked && (
          <div className="new-unlock-row">
            <img alt={newlyUnlocked.ingredient} className="new-unlock-img" src={newlyUnlocked.icon} />
            <div className="new-unlock-copy">
              <small>New ingredient unlocked</small>
              <b>{newlyUnlocked.ingredient}</b>
              <span>for {newlyUnlocked.label.toLowerCase()} on the trail</span>
            </div>
          </div>
        )}

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
          {allRanked.map((item, index) => {
            const isNew = item.id === NEW_HIKE;
            return (
              <div className={`full-rank-item ${isNew ? "highlight" : ""}`} key={item.id}>
                <span className="fr-num">#{index + 1}</span>
                <span className="fr-name">{item.name}</span>
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

function AccomplishmentsMountain({
  ranking,
  setRanking,
  onDrop,
  onSelectHike,
}: {
  ranking: HikeLog[];
  setRanking: (r: HikeLog[]) => void;
  onDrop: () => void;
  onSelectHike: (id: string) => void;
}) {
  const draggingIndex = useRef<number | null>(null);
  const dragY = useRef(0);
  const pointerStartY = useRef(0);
  const [dragPos, setDragPos] = useState<number | null>(null);

  const handleMove = (y: number) => {
    if (draggingIndex.current === null) return;
    const delta = y - dragY.current;
    if (Math.abs(delta) > 42) {
      const from = draggingIndex.current;
      const to = from + (delta > 0 ? 1 : -1);
      if (to < 0 || to >= ranking.length) return;
      const next = [...ranking];
      const [item] = next.splice(from, 1);
      next.splice(to, 0, item);
      draggingIndex.current = to;
      dragY.current = y;
      setRanking(next);
      setDragPos(to);
    }
  };

  const ratingColor = (r: string) =>
    r === "Loved it!" ? "#e25e3f" : r === "Not for me" ? "#6e8370" : "#d5a23e";
  const ratingIcon = (r: string) =>
    r === "Loved it!" ? "♥" : r === "Not for me" ? "−" : "●";

  return (
    <div>
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
          {ranking.slice(0, 4).map((hike, index) => (
            <div className={`rank-item rank-${index + 1}`} key={hike.id}>
              <span className="rank-number">#{index + 1}</span>
              <span className="rank-name">{hike.trailName}</span>
            </div>
          ))}
        </div>
        <img alt="" className="figma-mountain-guide" src="/assets/2cec3.svg" />
      </div>
      <div className="accom-rank-list-section">
        {ranking.map((hike, index) => (
          <div
            className={`accom-rank-item ${dragPos === index ? "dragging" : ""}`}
            key={hike.id}
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture(e.pointerId);
              draggingIndex.current = index;
              dragY.current = e.clientY;
              pointerStartY.current = e.clientY;
              setDragPos(index);
            }}
            onPointerMove={(e) => handleMove(e.clientY)}
            onPointerUp={(e) => {
              const isTap = Math.abs(e.clientY - pointerStartY.current) < 10;
              draggingIndex.current = null;
              setDragPos(null);
              if (isTap) onSelectHike(hike.id);
              else onDrop();
            }}
          >
            <span className="ar-num">#{index + 1}</span>
            <span className="ar-name">{hike.trailName}</span>
            {hike.reaction && (
              <span className="ar-rating" style={{ color: ratingColor(hike.reaction) }}>
                {ratingIcon(hike.reaction)}
              </span>
            )}
            <span className="ar-drag">⠿</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Accomplishments({ onLogHike, userId }: { onLogHike: () => void; userId: string }) {
  const [subTab, setSubTab] = useState<"mountain" | "trailmix">("mountain");
  const [accomRanking, setAccomRanking] = useState<HikeLog[] | null>(null);
  const [unlockedKeys, setUnlockedKeys] = useState<string[]>([]);
  const [loadError, setLoadError] = useState("");
  const [selectedHike, setSelectedHike] = useState<string | null>(null);
  const [selectedIngredient, setSelectedIngredient] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([fetchHikeLogs(userId), fetchUnlockedIngredients(userId)])
      .then(([logs, keys]) => {
        if (cancelled) return;
        setAccomRanking(logs);
        setUnlockedKeys(keys);
      })
      .catch((error) => { if (!cancelled) setLoadError(errorMessage(error)); });
    return () => { cancelled = true; };
  }, [userId]);

  const logs = accomRanking ?? [];
  const unlocked = unlockedIndexes(unlockedKeys);
  const totalHikes = logs.length;
  const totalMiles = logs.reduce((sum, log) => sum + log.miles, 0);
  const topHike = logs[0]?.trailName ?? "—";

  const persistRanking = () => {
    if (!accomRanking) return;
    saveRanking(accomRanking)
      .then(setAccomRanking)
      .catch((error) => setLoadError(errorMessage(error)));
  };

  const hikesForIngredient = (idx: number) =>
    logs.filter((log) => log.highlights.includes(detailOptions[idx].label));

  const jarMix = useMemo(() => buildJarMix(hikeShapes(accomRanking ?? [])), [accomRanking]);

  const selectedHikeData = logs.find((log) => log.id === selectedHike) ?? null;
  const ratingColor = (r: string) =>
    r === "Loved it!" ? "#e25e3f" : r === "Not for me" ? "#6e8370" : "#d5a23e";
  const ratingIcon = (r: string) =>
    r === "Loved it!" ? "♥" : r === "Not for me" ? "−" : "●";

  return (
    <section className="screen-content accomplishments-screen">
      <div className="accom-header">
        <h1>Accomplishments</h1>
        <div className="accom-stats-row">
          <div className="accom-stat">
            <b>{totalHikes}</b>
            <small>hikes</small>
          </div>
          <div className="accom-stat">
            <b>{totalMiles.toFixed(1)} mi</b>
            <small>miles</small>
          </div>
          <div className="accom-stat">
            <b>{unlocked.size} of {detailOptions.length}</b>
            <small>ingredients</small>
          </div>
          <div className="accom-stat" style={{ flex: 2, minWidth: 0 }}>
            <b style={{ fontSize: 12 }}>{topHike}</b>
            <small>current #1</small>
          </div>
        </div>
        <div className="accom-tabs">
          <button
            className={`accom-tab-btn ${subTab === "mountain" ? "active" : ""}`}
            onClick={() => setSubTab("mountain")}
            type="button"
          >
            Mountain
          </button>
          <button
            className={`accom-tab-btn ${subTab === "trailmix" ? "active" : ""}`}
            onClick={() => setSubTab("trailmix")}
            type="button"
          >
            TrailMix
          </button>
        </div>
      </div>

      {loadError && (
        <div className="accom-empty">
          <Mascot variant="oops" />
          <p className="auth-error" role="alert">{loadError}</p>
        </div>
      )}

      {!loadError && accomRanking && subTab === "mountain" && (
        totalHikes === 0 ? (
          <div className="accom-empty">
            <Mascot variant="sleepy" />
            <button className="primary-button" onClick={onLogHike} type="button">
              Log a Hike →
            </button>
          </div>
        ) : (
          <AccomplishmentsMountain
            onDrop={persistRanking}
            onSelectHike={setSelectedHike}
            ranking={accomRanking}
            setRanking={setAccomRanking}
          />
        )
      )}

      {!loadError && accomRanking && subTab === "trailmix" && (
        <div>
          <div style={{ display: "flex", justifyContent: "center", padding: "16px 16px 0" }}>
            <Mascot key={totalHikes === 0 ? "sleepy" : "celebrate"} variant={totalHikes === 0 ? "sleepy" : "celebrate"} />
          </div>
          <div className="accom-jar-stage">
            <div className="jar-lid"><span /><span /><span /></div>
            <div className="jar">
              <div className="jar-shine" />
              <div className="mix">
                {jarMix.map((type, i) => (
                  <Ingredient className={`piece piece-${i}`} key={i} type={type} />
                ))}
              </div>
              <div className="jar-label"><b>TRAIL</b><span>MIX</span></div>
            </div>
            <div className="ground-shadow" />
          </div>
          <div className="accom-ingredient-categories">
            <div className="accom-ingredient-grid">
              {detailOptions.map((opt, idx) => {
                const isUnlocked = unlocked.has(idx);
                const hikeCount = hikesForIngredient(idx).length;
                return (
                  <div
                    className={`accom-ingredient-cell ${isUnlocked ? "unlocked" : "locked"}`}
                    key={idx}
                    onClick={() => { if (isUnlocked) setSelectedIngredient(idx); }}
                  >
                    {isUnlocked ? (
                      <img alt={opt.ingredient} src={opt.icon} />
                    ) : (
                      <div className="ai-lock">🔒</div>
                    )}
                    <span className="ai-name">{opt.ingredient}</span>
                    {isUnlocked ? (
                      <span className="ai-count">{hikeCount} {hikeCount === 1 ? "hike" : "hikes"}</span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {selectedHikeData && (
        <div className="hike-detail-overlay" onClick={() => setSelectedHike(null)}>
          <div className="hike-detail-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <h2>{selectedHikeData.trailName}</h2>
            <div className="sheet-meta">
              #{logs.indexOf(selectedHikeData) + 1} in your rankings · {formatHikeDate(selectedHikeData.date)}
            </div>
            {selectedHikeData.reaction && (
              <div className="sheet-detail-row">
                <span className="sdr-label">Reaction</span>
                <span style={{ color: ratingColor(selectedHikeData.reaction), fontWeight: 600 }}>
                  {ratingIcon(selectedHikeData.reaction)} {selectedHikeData.reaction}
                </span>
              </div>
            )}
            {selectedHikeData.difficulty && (
              <div className="sheet-detail-row">
                <span className="sdr-label">Difficulty</span>
                <span>{selectedHikeData.difficulty}</span>
              </div>
            )}
            {selectedHikeData.highlights.length > 0 && (
              <div className="sheet-detail-row">
                <span className="sdr-label">Trail mix</span>
                <span>
                  {selectedHikeData.highlights
                    .map((label) => detailOptions.find((option) => option.label === label)?.ingredient ?? label)
                    .join(", ")}
                </span>
              </div>
            )}
            {selectedHikeData.caption ? (
              <div className="sheet-detail-row">
                <span className="sdr-label">Caption</span>
                <span style={{ fontStyle: "italic" }}>"{selectedHikeData.caption}"</span>
              </div>
            ) : null}
            {selectedHikeData.photos.length > 0 && (
              <div className="sheet-detail-row">
                <span className="sdr-label">Photos</span>
                <span style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                  {selectedHikeData.photos.map((url) => (
                    <img alt="" key={url} src={url} style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 10 }} />
                  ))}
                </span>
              </div>
            )}
            <button className="sheet-close-btn" onClick={() => setSelectedHike(null)} type="button">
              Done
            </button>
          </div>
        </div>
      )}

      {selectedIngredient !== null && (
        <div className="ingredient-hike-overlay" onClick={() => setSelectedIngredient(null)}>
          <div className="ingredient-hike-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-handle" />
            <img alt={detailOptions[selectedIngredient].ingredient} className="ids-img" src={detailOptions[selectedIngredient].icon} />
            <h2>{detailOptions[selectedIngredient].ingredient}</h2>
            <div className="ids-subtitle">
              Unlocked for {detailOptions[selectedIngredient].label.toLowerCase()} on the trail
            </div>
            <div className="ids-section-label">Hikes that added this</div>
            {hikesForIngredient(selectedIngredient).map((log) => (
              <div className="ids-hike-row" key={log.id}>{log.trailName}</div>
            ))}
            {hikesForIngredient(selectedIngredient).length === 0 && (
              <div className="ids-hike-row">None yet. Pick it on your next hike!</div>
            )}
            <button className="sheet-close-btn" onClick={() => setSelectedIngredient(null)} type="button">
              Done
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default function App() {
  document.title = "TrailMix";
  const [tab, setTab] = useState<Tab>("feed");
  const [showSettings, setShowSettings] = useState(false);
  const [posts, setPosts] = useState<FeedPost[]>(initialFeedPosts);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [friendUsernames, setFriendUsernames] = useState(() => Object.values(friends).map((friend) => friend.username));

  const switchTab = (next: Tab) => {
    setTab(next);
    setShowSettings(false);
    window.scrollTo({ top: 0 });
  };

  // Throws if the hike can't be deleted, so the post can show the error and stay put
  const deletePost = async (post: FeedPost) => {
    if (post.logId && user) await deleteHikeLog(user.id, post.logId);
    setPosts((current) => current.filter((item) => item.id !== post.id));
  };

  const updatePost = (id: string, update: (post: FeedPost) => FeedPost) => {
    setPosts((current) => current.map((post) => (post.id === id ? update(post) : post)));
  };

  const toggleFriend = (username: string) => {
    setFriendUsernames((current) =>
      current.includes(username) ? current.filter((friend) => friend !== username) : [...current, username],
    );
  };

  if (!user) return <Authpage onAuthenticated={setUser} />;

  return (
    <>
      {tab === "feed" && (
        <Shell>
          <Feed onDeletePost={deletePost} onUpdatePost={updatePost} posts={posts} />
        </Shell>
      )}
      {tab === "accomplishments" && (
        <Shell>
          <Accomplishments onLogHike={() => switchTab("log")} userId={user.id} />
        </Shell>
      )}
      {tab === "profile" && showSettings && (
        <Shell onBack={() => setShowSettings(false)}>
          <Settings onUpdateUser={(changes) => setUser({ ...user, ...changes })} user={user} />
        </Shell>
      )}
      {tab === "profile" && !showSettings && (
        <Shell
          headerAction={
            <button aria-label="Settings" className="header-back header-settings" onClick={() => { setShowSettings(true); window.scrollTo({ top: 0 }); }} type="button">
              <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
              </svg>
            </button>
          }
        >
          <Profile
            onDeletePost={deletePost}
            onLogHike={() => switchTab("log")}
            onSignOut={() => { setUser(null); setTab("feed"); setShowSettings(false); }}
            onToggleFriend={toggleFriend}
            onUpdatePost={updatePost}
            posts={posts}
            friendUsernames={friendUsernames}
            user={user}
          />
        </Shell>
      )}
      {/* Kept mounted while hidden so an in-progress log survives tab switches. */}
      <div hidden={tab !== "log"}>
        <LogHikeFlow
          active={tab === "log"}
          onLogHike={(post) => {
            setPosts((current) => [post, ...current]);
            switchTab("profile");
          }}
          user={user}
        />
      </div>
      <BottomNav active={tab} onChange={switchTab} />
    </>
  );
}

function LogHikeFlow({ active, onLogHike, user }: { active: boolean; onLogHike: (post: FeedPost) => void; user: AuthUser }) {
  const [step, setStep] = useState(1);
  const [trails, setTrails] = useState<Trail[] | null>(null);
  const [trailsError, setTrailsError] = useState("");
  const [pastLogs, setPastLogs] = useState<HikeLog[]>([]);
  const [unlockedKeys, setUnlockedKeys] = useState<string[]>([]);
  const historyLoad = useRef<Promise<HikeLog[]>>(Promise.resolve([]));
  const [selectedTrail, setSelectedTrail] = useState<Trail | null>(null);
  const [rating, setRating] = useState("");
  const [difficulty, setDifficulty] = useState(2);
  const [ranking, setRanking] = useState<RankItem[]>([]);
  const [lowerRanking, setLowerRanking] = useState<RankItem[]>([]);
  const [selectedDetails, setSelectedDetails] = useState<number[]>([0]);
  const [photos, setPhotos] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [taggedFriends, setTaggedFriends] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saved, setSaved] = useState<{ logId: string; photoUrls: string[]; unlockIndex: number | null; previousShapes: string[] } | null>(null);

  useEffect(() => {
    fetchTrails().then(setTrails).catch((error) => setTrailsError(errorMessage(error)));
  }, []);

  // Refresh past hikes whenever a new log starts, so rankings changed on Accomplishments are picked up
  useEffect(() => {
    if (!active || step !== 1) return;
    historyLoad.current = Promise.all([fetchHikeLogs(user.id), fetchUnlockedIngredients(user.id)])
      .then(([logs, keys]) => {
        setPastLogs(logs);
        setUnlockedKeys(keys);
        return logs;
      })
      .catch((error) => {
        console.error("Couldn't load past hikes", error);
        return [];
      });
  }, [active, step, user.id]);

  const go = (next: number) => {
    setStep(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Places the new hike at the bottom of the mountain (or #4); the user drags it from there
  const startRanking = async () => {
    const logs = await historyLoad.current;
    const existing = logs.map((log) => ({ id: log.id, name: log.trailName }));
    setRanking([...existing.slice(0, 3), { id: NEW_HIKE, name: selectedTrail!.name }]);
    setLowerRanking(existing.slice(3));
    go(3);
  };

  const allRanked = [...ranking, ...lowerRanking];
  const rank = allRanked.findIndex((item) => item.id === NEW_HIKE) + 1;

  const save = async () => {
    if (!selectedTrail) return;
    setSaving(true);
    setSaveError("");
    try {
      const unlockIndex = nextUnlockIndex(unlockedKeys);
      const { logId, photoUrls } = await saveHikeLog({
        userId: user.id,
        trail: selectedTrail,
        date: todayISO(),
        reaction: rating,
        difficulty: ["Easy", "Moderate", "Tough"][difficulty - 1],
        highlights: selectedDetails.map((index) => detailOptions[index].label),
        caption,
        rank,
        reranked: allRanked
          .filter((item) => item.id !== NEW_HIKE)
          .map((item) => pastLogs.find((log) => log.id === item.id)!),
        photos,
        unlockedIngredient: unlockIndex !== null ? detailOptions[unlockIndex].shape : null,
      });
      setSaved({ logId, photoUrls, unlockIndex, previousShapes: hikeShapes(pastLogs) });
      go(5);
    } catch (error) {
      setSaveError(`Couldn't save your hike: ${errorMessage(error)}`);
    } finally {
      setSaving(false);
    }
  };

  if (step === 1) return <TrailSelect loadError={trailsError} onNext={() => { if (selectedTrail) go(2); }} selected={selectedTrail} setSelected={setSelectedTrail} trails={trails} />;
  if (!selectedTrail) return null;
  if (step === 2) return <RateTrail difficulty={difficulty} onBack={() => go(1)} onNext={startRanking} rating={rating} setDifficulty={setDifficulty} setRating={setRating} trail={selectedTrail} />;
  if (step === 3) return <RankTrail lowerRanking={lowerRanking} onBack={() => go(2)} onNext={() => go(4)} ranking={ranking} setLowerRanking={setLowerRanking} setRanking={setRanking} trailName={selectedTrail.name} />;
  if (step === 4 || !saved) return (
    <AddDetails
      caption={caption}
      onBack={() => go(3)}
      onSave={save}
      photos={photos}
      saveError={saveError}
      saving={saving}
      selectedDetails={selectedDetails}
      setCaption={setCaption}
      setPhotos={setPhotos}
      setSelectedDetails={setSelectedDetails}
      setTaggedFriends={setTaggedFriends}
      taggedFriends={taggedFriends}
      trailName={selectedTrail.name}
      unlocked={unlockedIndexes(unlockedKeys)}
    />
  );
  return (
    <Result
      details={selectedDetails}
      jarOwner={user.name.split(" ")[0]}
      lowerRanking={lowerRanking}
      onRestart={() => {
        onLogHike({
          id: `post-${Date.now()}`,
          friend: {
            name: user.name,
            username: user.email.split("@")[0].toLowerCase(),
            color: "#e66a3c",
          },
          trail: selectedTrail,
          image: saved.photoUrls[0] ?? selectedTrail.image,
          caption: caption.trim() || `A day out on ${selectedTrail.name}.`,
          date: todayISO(),
          likes: 0,
          liked: false,
          saved: false,
          taggedUsers: taggedFriends.map((name) => name.toLowerCase()),
          comments: [],
          logId: saved.logId,
        });
        setRating("");
        setDifficulty(2);
        setCaption("");
        setPhotos([]);
        setTaggedFriends([]);
        setSelectedDetails([0]);
        setSelectedTrail(null);
        setSaved(null);
        setSaveError("");
        go(1);
      }}
      previousShapes={saved.previousShapes}
      rank={rank}
      ranking={ranking}
      trail={selectedTrail}
      unlockIndex={saved.unlockIndex}
    />
  );
}
