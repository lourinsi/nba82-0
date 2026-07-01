"use client";

import type { CSSProperties, ReactNode } from "react";

export type MobileGameFooterSlot = {
  ariaLabel: string;
  badges?: ReactNode;
  canMove?: boolean;
  className?: string;
  filled?: boolean;
  key: string;
  label: string;
  onClick?: () => void;
  selected?: boolean;
  style?: CSSProperties;
  title?: string;
  token: string;
};

export type MobileGameFooterNavId = "play" | "feed" | "leaderboard" | "challenges" | "profile";

export type MobileGameFooterNavItem = {
  active?: boolean;
  ariaLabel?: string;
  disabled?: boolean;
  icon?: ReactNode;
  id: MobileGameFooterNavId;
  label: string;
  onClick?: () => void;
};

export default function MobileGameFooter({
  className = "",
  navItems,
  slots,
}: {
  className?: string;
  navItems: MobileGameFooterNavItem[];
  slots: MobileGameFooterSlot[];
}) {
  return (
    <footer className={`mobile-game-footer ${className}`.trim()} aria-label="Mobile game navigation">
      <nav className="mobile-lineup-rail" aria-label="Lineup positions">
        {slots.map((slot) => (
          <button
            aria-label={slot.ariaLabel}
            className={`mobile-lineup-slot ${slot.selected ? "mobile-lineup-slot-selected" : ""} ${
              slot.canMove ? "mobile-lineup-slot-can-move" : ""
            } ${slot.filled ? "mobile-lineup-slot-filled" : ""} ${slot.className ?? ""}`.trim()}
            key={slot.key}
            style={slot.style}
            title={slot.title}
            type="button"
            onClick={slot.onClick}
          >
            {slot.badges}
            <span className="mobile-lineup-token">{slot.token}</span>
            <span className="mobile-lineup-label">{slot.label}</span>
          </button>
        ))}
      </nav>

      <nav className="mobile-bottom-nav" aria-label="Primary mobile navigation">
        {navItems.map((item) => (
          <button
            aria-label={item.ariaLabel}
            className={`mobile-bottom-nav-item ${item.active ? "mobile-bottom-nav-item-active" : ""}`}
            disabled={item.disabled}
            key={item.id}
            type="button"
            onClick={item.onClick}
          >
            {item.icon ?? <MobileFooterIcon id={item.id} />}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </footer>
  );
}

function MobileFooterIcon({ id }: { id: MobileGameFooterNavId }) {
  switch (id) {
    case "feed":
      return <IconFeed />;
    case "leaderboard":
      return <IconLeaderboard />;
    case "challenges":
      return <IconChallenges />;
    case "profile":
      return <IconProfile />;
    case "play":
    default:
      return <IconPlay />;
  }
}

function IconProfile() {
  return (
    <svg aria-hidden="true" className="mobile-icon" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.2 20a6.8 6.8 0 0 1 13.6 0" />
    </svg>
  );
}

function IconPlay() {
  return (
    <svg aria-hidden="true" className="mobile-icon" fill="none" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 4v16M4 12h16M6.3 7.2c3.4 1.7 8 1.7 11.4 0M6.3 16.8c3.4-1.7 8-1.7 11.4 0" />
    </svg>
  );
}

function IconFeed() {
  return (
    <svg aria-hidden="true" className="mobile-icon" fill="none" viewBox="0 0 24 24">
      <path d="M5 4h11l3 3v13H5z" />
      <path d="M16 4v4h4M8 11h8M8 15h8M8 19h5" />
    </svg>
  );
}

function IconLeaderboard() {
  return (
    <svg aria-hidden="true" className="mobile-icon" fill="none" viewBox="0 0 24 24">
      <path d="M5 20V10M12 20V4M19 20v-7" />
      <path d="M3 20h18" />
    </svg>
  );
}

function IconChallenges() {
  return (
    <svg aria-hidden="true" className="mobile-icon" fill="none" viewBox="0 0 24 24">
      <path d="M6 4l14 14M14 4l6 6M4 14l6 6" />
      <path d="M14 4h6v6M4 14v6h6" />
    </svg>
  );
}
