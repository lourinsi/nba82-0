"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import {
  hasHowToBeenSeenThisPageLoad,
  isHowToDismissed,
  markHowToSeenThisPageLoad,
  setHowToDismissed,
  subscribeToHowToOpen,
  subscribeToHowToState,
} from "./clientPreferences";
import type { HowToOverlayContent } from "./howToContent";

type HowToOverlayProps = {
  content: HowToOverlayContent;
  storageKey: string;
};

export default function HowToOverlay({ content, storageKey }: HowToOverlayProps) {
  const [closed, setClosed] = useState(false);
  const [forcedOpen, setForcedOpen] = useState(false);
  const panelRef = useRef<HTMLElement | null>(null);
  const dismissed = useSyncExternalStore(
    subscribeToHowToState,
    () => isHowToDismissed(storageKey),
    () => true,
  );
  const seenThisPageLoad = useSyncExternalStore(
    subscribeToHowToState,
    () => hasHowToBeenSeenThisPageLoad(storageKey),
    () => true,
  );
  const visible = forcedOpen || (!closed && !dismissed && !seenThisPageLoad);
  const titleId = `${storageKey.replace(/[^a-z0-9_-]/gi, "-")}-title`;

  useEffect(
    () =>
      subscribeToHowToOpen(storageKey, () => {
        setClosed(false);
        setForcedOpen(true);
      }),
    [storageKey],
  );

  useEffect(() => {
    if (!visible) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const focusTimer = window.setTimeout(() => panelRef.current?.focus(), 0);

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        markHowToSeenThisPageLoad(storageKey);
        setForcedOpen(false);
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
  }, [storageKey, visible]);

  function closeOverlay() {
    markHowToSeenThisPageLoad(storageKey);
    setForcedOpen(false);
    setClosed(true);
  }

  function dismissOverlay() {
    setHowToDismissed(storageKey, true);
    markHowToSeenThisPageLoad(storageKey);
    setForcedOpen(false);
    setClosed(true);
  }

  if (!visible) {
    return null;
  }

  return (
    <div className="how-to-overlay">
      <button
        aria-label="Dismiss how to play guide"
        className="how-to-backdrop"
        tabIndex={-1}
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
