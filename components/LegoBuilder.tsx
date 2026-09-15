"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { NAME } from "@/data/letterTreatments";
import {
  DEFAULT_LEGO_BUILDER_PREFERENCES,
  LEGO_BUILDER_STORAGE_KEY,
  LEGO_LAYOUT_STORAGE_KEY,
  LEGO_TILE_OPTIONS,
  legoTileOptionForPath,
  parseLegoBuilderPreferences,
} from "@/lib/legoBuilder";
import type { LegoBuilderPreferences } from "@/lib/legoBuilder";
import { LEGO_TEXT_TILE_PATHS } from "@/lib/legoText";
import { LegoText } from "./LegoText";
import styles from "./LegoBuilder.module.css";

type PaintTool = string | "erase";
type SaveState = "saved" | "dirty" | "ready";

function readSavedPreferences(): LegoBuilderPreferences {
  if (typeof window === "undefined") return DEFAULT_LEGO_BUILDER_PREFERENCES;
  try {
    return parseLegoBuilderPreferences(window.localStorage.getItem(LEGO_BUILDER_STORAGE_KEY));
  } catch {
    return DEFAULT_LEGO_BUILDER_PREFERENCES;
  }
}

export function LegoBuilder() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<LegoBuilderPreferences>(
    DEFAULT_LEGO_BUILDER_PREFERENCES
  );
  const [selectedTool, setSelectedTool] = useState<PaintTool>(LEGO_TEXT_TILE_PATHS[0]);
  const [legoGrid, setLegoGrid] = useState({ size: 18, x: 0, y: 0, width: 0, height: 0 });
  const [saveState, setSaveState] = useState<SaveState>("ready");
  const baseplateRef = useRef<HTMLDivElement>(null);
  const wordFrameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Restore browser-only artwork after hydration so the server and first
    // client render share the same deterministic default.
    const frame = requestAnimationFrame(() => {
      setPreferences(readSavedPreferences());
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  const cellTiles = useMemo(
    () => new Map(Object.entries(preferences.cells)),
    [preferences.cells]
  );
  const background = legoTileOptionForPath(preferences.backgroundTilePath);
  const selectedTile = selectedTool === "erase"
    ? null
    : legoTileOptionForPath(selectedTool);

  const paintCell = useCallback((cell: string) => {
    setPreferences((current) => ({
      ...current,
      cells: {
        ...current.cells,
        [cell]: selectedTool === "erase" ? null : selectedTool,
      },
    }));
    setSaveState("dirty");
  }, [selectedTool]);

  const alignBuilderBackground = useCallback((size: number) => {
    const baseplate = baseplateRef.current;
    const frame = wordFrameRef.current;
    if (!baseplate || !frame) return;
    const next = {
      size,
      x: frame.offsetLeft,
      y: frame.offsetTop,
      width: baseplate.offsetWidth,
      height: baseplate.offsetHeight,
    };
    setLegoGrid((current) =>
      current.size === next.size
      && Math.abs(current.x - next.x) < 0.25
      && Math.abs(current.y - next.y) < 0.25
      && current.width === next.width
      && current.height === next.height
        ? current
        : next
    );
  }, []);

  const chooseBackground = (backgroundTilePath: string) => {
    setPreferences((current) => ({ ...current, backgroundTilePath }));
    setSaveState("dirty");
  };

  const resetWord = () => {
    setPreferences((current) => ({ ...current, showDefaultText: true, cells: {} }));
    setSaveState("dirty");
  };

  const clearCanvas = () => {
    setPreferences((current) => ({ ...current, showDefaultText: false, cells: {} }));
    setSaveState("dirty");
  };

  const revertSaved = () => {
    setPreferences(readSavedPreferences());
    setSaveState("ready");
  };

  const save = () => {
    try {
      window.localStorage.setItem(LEGO_BUILDER_STORAGE_KEY, JSON.stringify(preferences));
      // Old homepage toggles describe a different authored baseline. Clear
      // them when a builder design becomes the source of truth.
      window.localStorage.setItem(LEGO_LAYOUT_STORAGE_KEY, "[]");
      setSaveState("saved");
    } catch {
      setSaveState("dirty");
    }
  };

  const saveAndOpen = () => {
    save();
    router.push("/");
  };

  const paintedCount = Object.values(preferences.cells).filter(
    (tile): tile is string => typeof tile === "string"
  ).length;
  const erasedCount = Object.values(preferences.cells).filter((tile) => tile === null).length;

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Experimental side site</p>
          <h1>LEGO Type Builder</h1>
          <p className={styles.intro}>
            Pick a block, then click or drag across the grid. Every action paints exactly one
            grid cell at a time. Save when this is how ADRIAN should appear on the main site.
          </p>
        </div>
        <Link className={styles.homeLink} href="/">Back to portfolio</Link>
      </header>

      <section className={styles.workspace} aria-label="LEGO word preview">
        <div
          ref={baseplateRef}
          data-testid="lego-builder-baseplate"
          className={styles.baseplate}
          style={{
            backgroundColor: background.swatch,
            backgroundImage: `url(${background.path})`,
            backgroundSize: `${legoGrid.size}px ${legoGrid.size}px`,
            backgroundPosition: `${legoGrid.x}px ${legoGrid.y}px`,
          }}
        >
          <div
            ref={wordFrameRef}
            className={styles.wordFrame}
            style={{
              "--headline-font-size": "clamp(3rem, min(20vw, 18vh), 14.5rem)",
              "--headline-font-family": "var(--font-pp-frama)",
              "--headline-font-weight": "900",
            } as CSSProperties}
          >
            <LegoText
              text={NAME}
              fontSize="var(--headline-font-size)"
              fontFamily="var(--headline-font-family)"
              fontWeight={900}
              showDefaultText={preferences.showDefaultText}
              cellTiles={cellTiles}
              onPaintCell={paintCell}
              onGridChange={alignBuilderBackground}
              canvasArea={legoGrid.width && legoGrid.height ? {
                left: -legoGrid.x,
                top: -legoGrid.y,
                width: legoGrid.width,
                height: legoGrid.height,
              } : undefined}
            />
          </div>
        </div>
        <div className={styles.workspaceFooter}>
          <span>{preferences.showDefaultText ? "Editing blue ADRIAN" : "Building from a blank grid"}</span>
          <span>{paintedCount} painted · {erasedCount} erased · {legoGrid.size}px grid</span>
        </div>
      </section>

      <aside className={styles.controls} aria-label="LEGO builder controls">
        <section className={styles.controlSection}>
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.step}>1 · Paint tool</p>
              <h2>{selectedTile ? selectedTile.name : "Eraser"}</h2>
            </div>
            {selectedTile ? (
              <Image className={styles.selectedPreview} src={selectedTile.path} width={64} height={64} alt="" />
            ) : <span className={styles.eraserPreview} aria-hidden="true">×</span>}
          </div>
          <div className={styles.tilePalette} role="group" aria-label="Block color">
            {LEGO_TILE_OPTIONS.map((option) => (
              <button
                key={option.path}
                type="button"
                className={styles.tileChoice}
                aria-label={option.name}
                aria-pressed={selectedTool === option.path}
                onClick={() => setSelectedTool(option.path)}
              >
                <Image src={option.path} width={64} height={64} alt="" />
              </button>
            ))}
            <button
              type="button"
              className={`${styles.tileChoice} ${styles.eraserChoice}`}
              aria-label="Eraser"
              aria-pressed={selectedTool === "erase"}
              onClick={() => setSelectedTool("erase")}
            >
              ×
            </button>
          </div>
        </section>

        <section className={styles.controlSection}>
          <p className={styles.step}>2 · Baseplate color</p>
          <h2>{background.name}</h2>
          <div className={styles.backgroundPalette} role="group" aria-label="Baseplate color">
            {LEGO_TILE_OPTIONS.map((option) => (
              <button
                key={option.path}
                type="button"
                className={styles.backgroundChoice}
                style={{ backgroundColor: option.swatch }}
                aria-label={option.name}
                aria-pressed={preferences.backgroundTilePath === option.path}
                onClick={() => chooseBackground(option.path)}
              />
            ))}
          </div>
        </section>

        <section className={styles.controlSection}>
          <p className={styles.step}>3 · Starting point</p>
          <div className={styles.secondaryActions}>
            <button type="button" onClick={resetWord}>Reset to blue ADRIAN</button>
            <button type="button" onClick={clearCanvas}>Clear canvas</button>
            <button type="button" onClick={revertSaved}>Revert saved</button>
          </div>
        </section>

        <section className={styles.saveSection}>
          <p aria-live="polite" className={styles.saveStatus} data-state={saveState}>
            {saveState === "saved"
              ? "Saved to the main site"
              : saveState === "dirty"
                ? "Unsaved changes"
                : "Ready to edit"}
          </p>
          <div className={styles.saveActions}>
            <button type="button" className={styles.saveButton} onClick={save}>Save</button>
            <button type="button" className={styles.openButton} onClick={saveAndOpen}>
              Save &amp; view homepage
            </button>
          </div>
        </section>
      </aside>
    </main>
  );
}
