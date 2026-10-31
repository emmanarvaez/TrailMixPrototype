import type { ReactNode } from "react";

export type Tab = "feed" | "log" | "accomplishments" | "profile";

export const navTabs: { id: Tab; label: string; icon: ReactNode }[] = [
  {
    id: "feed",
    label: "Feed",
    icon: (
      <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
        <path d="m2.5 19.5 6-10 4 6 2.5-3.5 6.5 7.5Z" />
        <circle cx="17" cy="6" r="2" />
      </svg>
    ),
  },
  {
    id: "log",
    label: "Log Hike",
    icon: (
      <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2.2" viewBox="0 0 24 24">
        <rect height="17" rx="5" width="17" x="3.5" y="3.5" />
        <path d="M12 8v8M8 12h8" />
      </svg>
    ),
  },
  {
    id: "accomplishments",
    label: "Accomplishments",
    icon: (
      <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M12 2 22 22H2L12 2Z" />
        <path d="M12 8v4M12 2v-1.5H14.5" />
      </svg>
    ),
  },
  {
    id: "profile",
    label: "Profile",
    icon: (
      <svg aria-hidden="true" fill="none" stroke="currentColor" strokeLinecap="round" strokeWidth="2" viewBox="0 0 24 24">
        <circle cx="12" cy="8.5" r="4" />
        <path d="M4.5 20.5c1.2-3.6 4-5.5 7.5-5.5s6.3 1.9 7.5 5.5" />
      </svg>
    ),
  },
];

export default function BottomNav({ active, onChange }: { active: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav aria-label="Main" className="bottom-nav">
      {navTabs.map((tab) => (
        <button
          aria-current={active === tab.id ? "page" : undefined}
          className={`nav-tab ${active === tab.id ? "active" : ""}`}
          data-tour={`nav-${tab.id}`}
          key={tab.id}
          onClick={() => onChange(tab.id)}
          type="button"
        >
          {tab.icon}
          <span>{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
