import { useEffect, useMemo, useRef, useState } from "react";
import { useUsers } from "../context/UsersContext";
import { fetchLeaderboard, type LeaderboardEntry } from "../lib/db";
import type { Friend } from "../types";

// You and your friends ranked by hikes logged this week, or all time by ingredients
// unlocked (then total hikes). Counts come from Supabase (get_leaderboard, supabase/012).

type Mode = "week" | "all";
const TOTAL_INGREDIENTS = 12;
const HIKES_PER_UNLOCK = 2;
const STARTER_INGREDIENTS = 3;

const poses = {
  summit: "/assets/cashew-09-summit.svg",
  hiker: "/assets/cashew-10-hiker.svg",
  sleepy: "/assets/cashew-11-sleepy.svg",
};

// Higher is better, compared left to right
function score(entry: LeaderboardEntry, mode: Mode): number[] {
  return mode === "week" ? [entry.weekHikes] : [entry.ingredients, entry.totalHikes];
}

function compare(a: number[], b: number[]): number {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}

// How many more hikes `me` needs to rank above `other`
function hikesToPass(me: LeaderboardEntry, other: LeaderboardEntry, mode: Mode): number {
  if (mode === "week") return other.weekHikes - me.weekHikes + 1;
  for (let more = 1; more <= 100; more++) {
    const total = me.totalHikes + more;
    const ingredients = Math.min(TOTAL_INGREDIENTS, Math.max(me.ingredients, STARTER_INGREDIENTS + Math.floor(total / HIKES_PER_UNLOCK)));
    if (compare([ingredients, total], score(other, mode)) > 0) return more;
  }
  return 1;
}

const handleOf = (person: Friend) => (person.username ? `@${person.username}` : person.name);

function Avatar({ person }: { person: Friend }) {
  return (
    <span aria-hidden="true" className="lb-avatar" style={{ background: person.color }}>
      {person.avatar ? <img alt="" src={person.avatar} /> : person.name.charAt(0).toUpperCase()}
    </span>
  );
}

// A tiny TrailMix jar that fills with their ingredients
function MiniJar({ ingredients }: { ingredients: number }) {
  const fill = Math.max(0, Math.min(1, ingredients / TOTAL_INGREDIENTS)) * 17;
  return (
    <svg aria-hidden="true" className="lb-jar" height="26" viewBox="0 0 22 26" width="22">
      <defs>
        <clipPath id="lb-jar-body">
          <path d="M4 7h14v13.5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z" />
        </clipPath>
      </defs>
      <path d="M4 7h14v13.5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z" fill="#e2efd7" />
      <g clipPath="url(#lb-jar-body)">
        <rect fill="#c98a4e" height={fill} width="14" x="4" y={24.5 - fill} />
        {fill > 3 && (
          <>
            <circle cx="7.5" cy={23 - fill * 0.25} fill="#6e4434" r="1.3" />
            <circle cx="13.5" cy={22.5 - fill * 0.5} fill="#e66a3c" r="1.2" />
            <circle cx="10.5" cy={23.5 - fill * 0.75} fill="#f1bd4e" r="1.1" />
          </>
        )}
      </g>
      <path d="M4 7h14v13.5a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z" fill="none" stroke="#315842" strokeWidth="1.6" />
      <rect fill="#e9663f" height="4.5" rx="1.2" stroke="#315842" strokeWidth="1.3" width="16" x="3" y="2.2" />
    </svg>
  );
}

type Row = { entry: LeaderboardEntry; person: Friend; rank: number };

function LeaderRow({ row, mode, isMe, onOpen, rowRef }: {
  row: Row;
  mode: Mode;
  isMe: boolean;
  onOpen: () => void;
  rowRef?: React.Ref<HTMLButtonElement>;
}) {
  const { entry, person, rank } = row;
  const count =
    mode === "week"
      ? `${entry.weekHikes} ${entry.weekHikes === 1 ? "hike" : "hikes"}`
      : `${entry.ingredients}/${TOTAL_INGREDIENTS} ingredients`;
  return (
    <button
      aria-label={`#${rank} ${handleOf(person)}${isMe ? " (you)" : ""}, ${count}`}
      className={`lb-row ${rank <= 3 ? `lb-top lb-top-${rank}` : ""} ${isMe ? "lb-me" : ""}`}
      onClick={onOpen}
      ref={rowRef}
      type="button"
    >
      <span className="lb-rank">{rank}</span>
      <Avatar person={person} />
      <span className="lb-name">
        {handleOf(person)}
        {isMe && <small>You</small>}
      </span>
      <MiniJar ingredients={entry.ingredients} />
      <span className="lb-count">{count}</span>
    </button>
  );
}

export default function Leaderboard({
  friendIds,
  refreshKey,
  onFindFriends,
}: {
  friendIds: string[]; // the signed-in user's friends
  refreshKey: number; // changes when the user's own hikes change, to reload the counts
  onFindFriends: () => void;
}) {
  const { currentUser, getUser, openProfile } = useUsers();
  const [mode, setMode] = useState<Mode>("week");
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const friendsKey = [...friendIds].sort().join(",");

  useEffect(() => {
    let cancelled = false;
    setLoadError("");
    fetchLeaderboard()
      .then((rows) => { if (!cancelled) setEntries(rows); })
      .catch((error) => {
        console.error("Couldn't load the leaderboard", error);
        if (!cancelled) setLoadError((error as { message?: string })?.message ?? "Something went wrong.");
      });
    return () => { cancelled = true; };
  }, [friendsKey, refreshKey]);

  // Best first; people tied on every count share a rank and are listed by name
  const rows: Row[] = useMemo(() => {
    const sorted = (entries ?? [])
      .map((entry) => ({ entry, person: entry.userId === currentUser.id ? currentUser : getUser(entry.userId) }))
      .sort((a, b) => compare(score(b.entry, mode), score(a.entry, mode)) || handleOf(a.person).localeCompare(handleOf(b.person)));
    return sorted.map((item) => ({
      ...item,
      rank: 1 + sorted.filter((other) => compare(score(other.entry, mode), score(item.entry, mode)) > 0).length,
    }));
  }, [entries, mode, currentUser, getUser]);

  // Your row is pinned to the bottom while it's scrolled out of view
  const myRowRef = useRef<HTMLButtonElement>(null);
  const [myRowVisible, setMyRowVisible] = useState(true);
  useEffect(() => {
    const element = myRowRef.current;
    if (!element) return;
    const observer = new IntersectionObserver(([entry]) => setMyRowVisible(entry.isIntersecting), {
      rootMargin: "0px 0px -90px 0px", // the bottom nav covers the last 90px
      threshold: 0.6,
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [rows]);

  if (friendIds.length === 0) {
    return (
      <div className="feed-empty feed-empty-start">
        <img alt="" src="/assets/cashew-10-hiker.svg" />
        <h2>Add friends to see how you stack up!</h2>
        <button onClick={onFindFriends} type="button">Find friends</button>
      </div>
    );
  }

  const myRow = rows.find((row) => row.entry.userId === currentUser.id);

  // Cashew's line about your spot
  let cashew: { pose: keyof typeof poses; line: string } | null = null;
  if (myRow) {
    const noHikes = mode === "week" ? myRow.entry.weekHikes === 0 : myRow.entry.totalHikes === 0;
    if (noHikes) {
      cashew = { pose: "sleepy", line: mode === "week" ? "No hikes yet this week. Time to get outside!" : "No hikes yet. Time to get outside!" };
    } else if (myRow.rank === 1) {
      cashew = { pose: "summit", line: "You're on top! Keep it up." };
    } else {
      // The person just above you: the lowest score that's still better than yours
      const above = rows.filter((row) => row.rank < myRow.rank).slice(-1)[0];
      const more = hikesToPass(myRow.entry, above.entry, mode);
      cashew = { pose: "hiker", line: `${more} more hike${more === 1 ? "" : "s"} to pass ${handleOf(above.person)}!` };
    }
  }

  return (
    <div className="leaderboard">
      <div aria-label="Leaderboard period" className="lb-toggle" role="group">
        <button aria-pressed={mode === "week"} className={mode === "week" ? "selected" : ""} onClick={() => setMode("week")} type="button">
          This week
        </button>
        <button aria-pressed={mode === "all"} className={mode === "all" ? "selected" : ""} onClick={() => setMode("all")} type="button">
          All time
        </button>
      </div>

      {loadError && <p className="trail-search-note" role="alert">Couldn't load the leaderboard: {loadError}</p>}
      {!loadError && entries === null && <p className="trail-search-note">Loading the leaderboard…</p>}

      {cashew && (
        <div className="lb-cashew">
          <img alt="" src={poses[cashew.pose]} />
          <p>{cashew.line}</p>
        </div>
      )}

      {rows.length > 0 && (
        <>
          <p className="lb-caption">
            {mode === "week" ? "Hikes logged since Monday" : "Ingredients unlocked, then total hikes"}
          </p>
          <div className="lb-list">
            {rows.map((row) => {
              const isMe = row.entry.userId === currentUser.id;
              return (
                <LeaderRow
                  isMe={isMe}
                  key={row.entry.userId}
                  mode={mode}
                  onOpen={() => openProfile(row.entry.userId)}
                  row={row}
                  rowRef={isMe ? myRowRef : undefined}
                />
              );
            })}
          </div>
        </>
      )}

      {myRow && !myRowVisible && (
        <div className="lb-pinned">
          <LeaderRow isMe mode={mode} onOpen={() => openProfile(currentUser.id)} row={myRow} />
        </div>
      )}
    </div>
  );
}
