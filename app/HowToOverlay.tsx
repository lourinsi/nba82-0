"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { HowToOverlayContent } from "./howToContent";

const DISMISSED_VALUE = "dismissed";
const STORAGE_CHANGE_EVENT = "nba82-how-to-storage-change";

type HowToOverlayProps = {
  content: HowToOverlayContent;
  storageKey: string;
};

function subscribeToStorage(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(STORAGE_CHANGE_EVENT, onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(STORAGE_CHANGE_EVENT, onStoreChange);
  };
}

function dismissedSnapshot(storageKey: string) {
  try {
    return window.localStorage.getItem(storageKey) === DISMISSED_VALUE;
  } catch {
    return false;
  }
}

export default function HowToOverlay({ content, storageKey }: HowToOverlayProps) {
  const [closed, setClosed] = useState(false);
  const panelRef = useRef<HTMLElement | null>(null);
  const dismissed = useSyncExternalStore(
    subscribeToStorage,
    () => dismissedSnapshot(storageKey),
    () => true,
  );
  const visible = !closed && !dismissed;
  const titleId = `${storageKey.replace(/[^a-z0-9_-]/gi, "-")}-title`;

  useEffect(() => {
    if (!visible) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const focusTimer = window.setTimeout(() => panelRef.current?.focus(), 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setClosed(true);
      }
    }

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(focusTimer);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [visible]);

  function closeOverlay() {
    setClosed(true);
  }

  function dismissOverlay() {
    try {
      window.localStorage.setItem(storageKey, DISMISSED_VALUE);
      window.dispatchEvent(new Event(STORAGE_CHANGE_EVENT));
    } catch {
      // Private browsing or storage restrictions should not block the guide from closing.
    }

    setClosed(true);
  }

  if (!visible) {
    return null;
  }

  return (
    <div className="how-to-overlay">
      <button
        aria-label="Close how to play guide"
        className="how-to-backdrop"
        type="button"
        onClick={closeOverlay}
      />

      <section
        ref={panelRef}
        aria-labelledby={titleId}
        aria-modal="true"
        className="how-to-panel"
        role="dialog"
        tabIndex={-1}
      >
        <header className="how-to-header">
          <div>
            <p className="how-to-eyebrow">{content.eyebrow}</p>
            <h2 id={titleId}>{content.title}</h2>
            <p>{content.intro}</p>
          </div>
          <button
            aria-label="Close how to play guide"
            className="how-to-close"
            type="button"
            onClick={closeOverlay}
          >
            X
          </button>
        </header>

        <div className="how-to-section-grid">
          {content.sections.map((section) => (
            <article className="how-to-section-card" key={section.title}>
              {section.eyebrow ? <p className="how-to-section-eyebrow">{section.eyebrow}</p> : null}
              <h3>{section.title}</h3>
              <p>{section.description}</p>

              <ol className="how-to-step-list">
                {section.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>

              {section.tips?.length ? (
                <div className="how-to-tip-box">
                  <span>Tips</span>
                  <ul>
                    {section.tips.map((tip) => (
                      <li key={tip}>{tip}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </article>
          ))}
        </div>

        {content.footer ? <p className="how-to-footer">{content.footer}</p> : null}

        <div className="how-to-actions">
          <button className="how-to-secondary-action" type="button" onClick={closeOverlay}>
            Got It
          </button>
          <button className="how-to-primary-action" type="button" onClick={dismissOverlay}>
            Don&apos;t Show Again
          </button>
        </div>
      </section>
    </div>
  );
}
