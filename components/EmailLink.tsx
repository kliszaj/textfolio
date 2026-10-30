"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

const COPIED_MS = 2600;

// An email address that copies itself when clicked, rather than opening a
// mail app (which many visitors don't use): its own label slides out, "Email
// copied to clipboard" slides in, in the same place, and a few seconds later
// it eases back. Both labels share one grid cell, so the link doesn't change
// size as they swap. A modified click (new tab, etc.) is left alone, and if
// the clipboard refuses, the link opens the mail app as usual.
export function EmailLink({ email, className = "", children }: { email: string; className?: string; children?: ReactNode }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);

  return (
    <a
      href={`mailto:${email}`}
      data-copied={copied}
      className={`email-link ${className}`}
      onClick={(event) => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !navigator.clipboard) return;
        event.preventDefault();
        navigator.clipboard.writeText(email).then(
          () => {
            setCopied(true);
            if (timer.current !== null) window.clearTimeout(timer.current);
            timer.current = window.setTimeout(() => setCopied(false), COPIED_MS);
          },
          () => {
            window.location.href = `mailto:${email}`;
          },
        );
      }}
    >
      <span className="email-link-label">{children ?? email}</span>
      <span className="email-link-copied" aria-hidden="true">Email copied to clipboard</span>
      <span role="status" aria-live="polite" className="sr-only">{copied ? "Email copied to clipboard" : ""}</span>
    </a>
  );
}
