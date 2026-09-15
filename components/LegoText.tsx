"use client";

import { memo, useEffect, useRef, useState } from "react";
import {
  DEFAULT_LEGO_SHADOW_OFFSET_X,
  DEFAULT_LEGO_SHADOW_OFFSET_Y,
  legoCellAtRelativePoint,
  legoCellIsFilled,
  legoCellIsVisible,
  legoCellKey,
  legoLetterIndexForCoverage,
  legoLetterTileAt,
  legoStudSizeForWidth,
  legoTileAtlasRect,
  LEGO_TEXT_SHADOW_OPACITY,
  LEGO_TEXT_TILE_PATHS,
  LEGO_TILE_ATLAS_PATH,
} from "@/lib/legoText";
import { centeredRunLayout } from "@/lib/warpText";
import type { CharGlyphMetrics } from "@/lib/warpText";
import styles from "./LegoText.module.css";

type LegoTextProps = {
  text: string;
  fontSize?: string;
  fontFamily?: string;
  fontWeight?: number;
  showDefaultText?: boolean;
  onGridChange?: (studSize: number) => void;
  toggledCells?: ReadonlySet<string>;
  cellTiles?: ReadonlyMap<string, string | null>;
  onToggleCells?: (cells: readonly string[]) => void;
  onPaintCells?: (cells: readonly string[]) => void;
  paintTile?: string | null;
  onReady?: () => void;
  onEditingChange?: (editing: boolean, point: { x: number; y: number }) => void;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  canvasArea?: { left: number; top: number; width: number; height: number };
};

type CellPlan = { defaultFilled: boolean; defaultTilePath: string };
type GridPlan = { key: string; studSize: number; cells: Map<string, CellPlan> };
type VisibleCell = { tilePath: string; startX: number; startY: number };
type CanvasSnapshot = {
  context: CanvasRenderingContext2D;
  atlas: CanvasImageSource;
  plan: GridPlan;
  visibleCells: Map<string, VisibleCell>;
  appliedToggledCells: Set<string>;
  appliedCellTiles: Map<string, string | null>;
  showDefaultText: boolean;
  width: number;
  height: number;
  textFrameX: number;
  textFrameY: number;
  artSize: number;
  artOffset: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
};

const TILE_ART_SCALE = 1;
const EMPTY_TOGGLED_CELLS: ReadonlySet<string> = new Set<string>();
let tileAtlasPromise: Promise<CanvasImageSource> | null = null;

function parseCellKey(cell: string): { column: number; row: number } | null {
  const match = /^(-?\d+):(-?\d+)$/.exec(cell);
  if (!match) return null;
  return { column: Number(match[1]), row: Number(match[2]) };
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load LEGO tile atlas."));
    image.src = src;
  });
}

async function loadTileAtlas(): Promise<CanvasImageSource> {
  if (!tileAtlasPromise) {
    tileAtlasPromise = (async () => {
      if (typeof createImageBitmap === "function" && typeof fetch === "function") {
        try {
          const response = await fetch(LEGO_TILE_ATLAS_PATH);
          if (response.ok) return await createImageBitmap(await response.blob());
        } catch {
          // Fall through to the universally-supported image element path.
        }
      }
      return loadImage(LEGO_TILE_ATLAS_PATH);
    })();
  }
  return tileAtlasPromise;
}

function drawAtlasTile(
  context: CanvasRenderingContext2D,
  atlas: CanvasImageSource,
  tilePath: string,
  x: number,
  y: number,
  size: number
) {
  const source = legoTileAtlasRect(tilePath);
  context.drawImage(atlas, source.x, source.y, source.size, source.size, x, y, size, size);
}

function rectanglesIntersect(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

function visibleCellFor(snapshot: CanvasSnapshot, cell: string): VisibleCell | null {
  const coordinates = parseCellKey(cell);
  if (!coordinates) return null;
  const customExists = snapshot.appliedCellTiles.has(cell);
  const customTile = snapshot.appliedCellTiles.get(cell);
  const plan = snapshot.plan.cells.get(cell);
  const authoredFilled = customExists
    ? customTile !== null
    : snapshot.showDefaultText && Boolean(plan?.defaultFilled);
  if (!legoCellIsVisible(authoredFilled, snapshot.appliedToggledCells.has(cell))) return null;
  return {
    tilePath: typeof customTile === "string"
      ? customTile
      : plan?.defaultTilePath ?? LEGO_TEXT_TILE_PATHS[0],
    startX: snapshot.textFrameX + coordinates.column * snapshot.plan.studSize,
    startY: snapshot.textFrameY + coordinates.row * snapshot.plan.studSize,
  };
}

function redrawDirtyCells(snapshot: CanvasSnapshot, cells: readonly string[]) {
  if (cells.length === 0) return;
  const {
    context,
    atlas,
    visibleCells,
    artSize,
    artOffset,
    shadowOffsetX,
    shadowOffsetY,
    width,
    height,
  } = snapshot;
  let dirtyX = width;
  let dirtyY = height;
  let dirtyRight = 0;
  let dirtyBottom = 0;

  cells.forEach((cell) => {
    const coordinates = parseCellKey(cell);
    if (!coordinates) return;
    const faceX = snapshot.textFrameX + coordinates.column * snapshot.plan.studSize - artOffset;
    const faceY = snapshot.textFrameY + coordinates.row * snapshot.plan.studSize - artOffset;
    dirtyX = Math.min(dirtyX, faceX + Math.min(0, shadowOffsetX) - 1);
    dirtyY = Math.min(dirtyY, faceY + Math.min(0, shadowOffsetY) - 1);
    dirtyRight = Math.max(dirtyRight, faceX + artSize + Math.max(0, shadowOffsetX) + 1);
    dirtyBottom = Math.max(dirtyBottom, faceY + artSize + Math.max(0, shadowOffsetY) + 1);
  });

  dirtyX = Math.max(0, dirtyX);
  dirtyY = Math.max(0, dirtyY);
  dirtyRight = Math.min(width, dirtyRight);
  dirtyBottom = Math.min(height, dirtyBottom);
  const dirtyWidth = Math.max(0, dirtyRight - dirtyX);
  const dirtyHeight = Math.max(0, dirtyBottom - dirtyY);
  if (!dirtyWidth || !dirtyHeight) return;

  context.clearRect(dirtyX, dirtyY, dirtyWidth, dirtyHeight);
  context.save();
  context.beginPath();
  context.rect(dirtyX, dirtyY, dirtyWidth, dirtyHeight);
  context.clip();
  context.filter = "brightness(0)";
  context.globalAlpha = LEGO_TEXT_SHADOW_OPACITY;
  visibleCells.forEach(({ tilePath, startX, startY }) => {
    const x = startX - artOffset + shadowOffsetX;
    const y = startY - artOffset + shadowOffsetY;
    if (rectanglesIntersect(x, y, artSize, artSize, dirtyX, dirtyY, dirtyWidth, dirtyHeight)) {
      drawAtlasTile(context, atlas, tilePath, x, y, artSize);
    }
  });
  context.restore();

  context.save();
  context.beginPath();
  context.rect(dirtyX, dirtyY, dirtyWidth, dirtyHeight);
  context.clip();
  visibleCells.forEach(({ tilePath, startX, startY }) => {
    const x = startX - artOffset;
    const y = startY - artOffset;
    if (rectanglesIntersect(x, y, artSize, artSize, dirtyX, dirtyY, dirtyWidth, dirtyHeight)) {
      drawAtlasTile(context, atlas, tilePath, x, y, artSize);
    }
  });
  context.restore();
}

function updateSnapshotCells(snapshot: CanvasSnapshot, cells: readonly string[]) {
  cells.forEach((cell) => {
    const visible = visibleCellFor(snapshot, cell);
    if (visible) snapshot.visibleCells.set(cell, visible);
    else snapshot.visibleCells.delete(cell);
  });
  redrawDirtyCells(snapshot, cells);
}

function drawFullSnapshot(snapshot: CanvasSnapshot) {
  const { context, width, height, visibleCells, atlas, artOffset, artSize } = snapshot;
  context.clearRect(0, 0, width, height);
  context.save();
  context.filter = "brightness(0)";
  context.globalAlpha = LEGO_TEXT_SHADOW_OPACITY;
  visibleCells.forEach(({ tilePath, startX, startY }) => {
    drawAtlasTile(
      context,
      atlas,
      tilePath,
      startX - artOffset + snapshot.shadowOffsetX,
      startY - artOffset + snapshot.shadowOffsetY,
      artSize
    );
  });
  context.restore();
  visibleCells.forEach(({ tilePath, startX, startY }) => {
    drawAtlasTile(context, atlas, tilePath, startX - artOffset, startY - artOffset, artSize);
  });
}

function changedMapKeys<T>(previous: ReadonlyMap<string, T>, next: ReadonlyMap<string, T>) {
  return Array.from(new Set([...previous.keys(), ...next.keys()])).filter(
    (key) => previous.has(key) !== next.has(key) || previous.get(key) !== next.get(key)
  );
}

function changedSetKeys(previous: ReadonlySet<string>, next: ReadonlySet<string>) {
  return Array.from(new Set([...previous, ...next])).filter(
    (key) => previous.has(key) !== next.has(key)
  );
}

export const LegoText = memo(function LegoText({
  text,
  fontSize = "var(--headline-font-size, 128px)",
  fontFamily = "var(--headline-font-family, sans-serif)",
  fontWeight = 900,
  showDefaultText = true,
  onGridChange,
  toggledCells = EMPTY_TOGGLED_CELLS,
  cellTiles,
  onToggleCells,
  onPaintCells,
  paintTile = LEGO_TEXT_TILE_PATHS[0],
  onReady,
  onEditingChange,
  shadowOffsetX = DEFAULT_LEGO_SHADOW_OFFSET_X,
  shadowOffsetY = DEFAULT_LEGO_SHADOW_OFFSET_Y,
  canvasArea,
}: LegoTextProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const studSizeRef = useRef(16);
  const textFrameOriginRef = useRef({ x: 0, y: 0 });
  const gridPlanRef = useRef<GridPlan | null>(null);
  const canvasSnapshotRef = useRef<CanvasSnapshot | null>(null);
  const toggledCellsRef = useRef(new Set(toggledCells));
  const cellTilesRef = useRef(new Map(cellTiles ?? []));
  const editingRef = useRef(false);
  const visitedCellsRef = useRef<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const next = new Set(toggledCells);
    const snapshot = canvasSnapshotRef.current;
    if (snapshot) {
      const changed = changedSetKeys(snapshot.appliedToggledCells, next);
      snapshot.appliedToggledCells = new Set(next);
      updateSnapshotCells(snapshot, changed);
    }
    toggledCellsRef.current = next;
  }, [toggledCells]);

  useEffect(() => {
    const next = new Map(cellTiles ?? []);
    const snapshot = canvasSnapshotRef.current;
    if (snapshot) {
      const changed = changedMapKeys(snapshot.appliedCellTiles, next);
      snapshot.appliedCellTiles = new Map(next);
      updateSnapshotCells(snapshot, changed);
    }
    cellTilesRef.current = next;
  }, [cellTiles]);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;

    let disposed = false;
    let scheduledFrame: number | null = null;
    let drawVersion = 0;
    const notifyReady = () => { if (!disposed) onReady?.(); };
    const finishDrawing = () => {
      if (disposed) return;
      setReady(true);
      onReady?.();
    };

    const buildGridPlan = (
      textFrameWidth: number,
      textFrameHeight: number,
      geometryKey: string
    ): GridPlan | null => {
      const mask = document.createElement("canvas");
      mask.width = textFrameWidth;
      mask.height = textFrameHeight;
      const maskContext = mask.getContext("2d");
      if (!maskContext) return null;

      const probe = document.createElement("span");
      Object.assign(probe.style, {
        position: "absolute",
        visibility: "hidden",
        whiteSpace: "nowrap",
        fontFamily,
        fontSize,
        fontWeight: String(fontWeight),
        lineHeight: "1",
      });
      probe.textContent = text;
      root.appendChild(probe);
      const computed = window.getComputedStyle(probe);
      let resolvedSize = Number.parseFloat(computed.fontSize) || 128;
      const resolvedFamily = computed.fontFamily || fontFamily;
      const resolvedWeight = computed.fontWeight || String(fontWeight);
      probe.remove();

      const setMaskFont = () => { maskContext.font = `${resolvedWeight} ${resolvedSize}px ${resolvedFamily}`; };
      const measureCharacters = (): CharGlyphMetrics[] => Array.from(text).map((character) => {
        const metrics = maskContext.measureText(character);
        return {
          advance: metrics.width,
          boundingBoxLeft: metrics.actualBoundingBoxLeft,
          boundingBoxRight: metrics.actualBoundingBoxRight,
          boundingBoxAscent: metrics.actualBoundingBoxAscent,
          boundingBoxDescent: metrics.actualBoundingBoxDescent,
        };
      });
      const runBounds = (characters: CharGlyphMetrics[]) => {
        if (characters.length === 0) return { width: 0, height: 0 };
        const advanceBeforeLast = characters
          .slice(0, -1)
          .reduce((sum, character) => sum + character.advance, 0);
        return {
          width: advanceBeforeLast
            + characters[characters.length - 1].boundingBoxRight
            + characters[0].boundingBoxLeft,
          height: Math.max(...characters.map((character) => character.boundingBoxAscent))
            + Math.max(...characters.map((character) => character.boundingBoxDescent)),
        };
      };

      setMaskFont();
      let characterMetrics = measureCharacters();
      const bounds = runBounds(characterMetrics);
      resolvedSize *= Math.min(
        1,
        (textFrameWidth * 0.86) / Math.max(bounds.width, 1),
        (textFrameHeight * 0.78) / Math.max(bounds.height, 1)
      );
      setMaskFont();
      characterMetrics = measureCharacters();
      maskContext.textBaseline = "alphabetic";
      maskContext.fillStyle = "#000";
      const layout = centeredRunLayout(characterMetrics, 0, textFrameWidth, textFrameHeight);
      const studSize = legoStudSizeForWidth(textFrameWidth);
      const columns = Math.ceil(textFrameWidth / studSize);
      const rows = Math.ceil(textFrameHeight / studSize);
      const coverageByCell = new Map<string, number[]>();

      Array.from(text).forEach((character, letterIndex) => {
        maskContext.clearRect(0, 0, textFrameWidth, textFrameHeight);
        maskContext.fillText(character, layout.charX[letterIndex], layout.baselineY);
        // One temporary RGBA mask exists at a time. Its compact grid coverage
        // survives; the large pixel array is discarded after this iteration.
        const pixels = maskContext.getImageData(0, 0, textFrameWidth, textFrameHeight).data;
        for (let row = 0; row < rows; row += 1) {
          for (let column = 0; column < columns; column += 1) {
            const cell = legoCellKey(column, row);
            const coverages = coverageByCell.get(cell) ?? Array(text.length).fill(0);
            let alpha = 0;
            for (let sampleY = 0; sampleY < 3; sampleY += 1) {
              for (let sampleX = 0; sampleX < 3; sampleX += 1) {
                const x = Math.floor(column * studSize + studSize * ((sampleX + 0.5) / 3));
                const y = Math.floor(row * studSize + studSize * ((sampleY + 0.5) / 3));
                if (x < textFrameWidth && y < textFrameHeight) {
                  alpha += pixels[(y * textFrameWidth + x) * 4 + 3] / 255;
                }
              }
            }
            coverages[letterIndex] = alpha / 9;
            coverageByCell.set(cell, coverages);
          }
        }
      });

      const cells = new Map<string, CellPlan>();
      const letterCenters = characterMetrics.map(
        (metrics, index) => layout.charX[index]
          + (metrics.boundingBoxRight - metrics.boundingBoxLeft) / 2
      );
      coverageByCell.forEach((coverages, cell) => {
        const coordinates = parseCellKey(cell);
        if (!coordinates) return;
        const coverage = Math.max(0, ...coverages);
        const centerX = coordinates.column * studSize + studSize / 2;
        const nearestLetter = letterCenters.reduce(
          (closest, center, index) =>
            Math.abs(center - centerX) < Math.abs(letterCenters[closest] - centerX)
              ? index
              : closest,
          0
        );
        cells.set(cell, {
          defaultFilled: legoCellIsFilled(coverage, coordinates.column, coordinates.row),
          defaultTilePath: legoLetterTileAt(
            legoLetterIndexForCoverage(coverages, nearestLetter)
          ),
        });
      });
      return { key: geometryKey, studSize, cells };
    };

    const draw = async (version: number) => {
      const textFrameWidth = root.offsetWidth;
      const textFrameHeight = root.offsetHeight;
      if (!textFrameWidth || !textFrameHeight) { notifyReady(); return; }
      const width = canvasArea?.width ?? textFrameWidth;
      const height = canvasArea?.height ?? textFrameHeight;
      const textFrameX = -(canvasArea?.left ?? 0);
      const textFrameY = -(canvasArea?.top ?? 0);
      if (!width || !height) { notifyReady(); return; }

      let context: CanvasRenderingContext2D | null = null;
      try { context = canvas.getContext("2d"); } catch { notifyReady(); return; }
      if (!context) { notifyReady(); return; }

      let atlas: CanvasImageSource;
      try { atlas = await loadTileAtlas(); } catch { notifyReady(); return; }
      if (disposed || version !== drawVersion) return;

      const geometryKey = [text, textFrameWidth, textFrameHeight, fontFamily, fontSize, fontWeight].join("|");
      let plan = gridPlanRef.current;
      if (!plan || plan.key !== geometryKey) {
        plan = buildGridPlan(textFrameWidth, textFrameHeight, geometryKey);
        if (!plan) { notifyReady(); return; }
        gridPlanRef.current = plan;
      }

      canvas.width = Math.max(1, Math.round(width));
      canvas.height = Math.max(1, Math.round(height));
      context.setTransform(1, 0, 0, 1, 0, 0);
      textFrameOriginRef.current = { x: textFrameX, y: textFrameY };
      studSizeRef.current = plan.studSize;
      onGridChange?.(plan.studSize);

      const snapshot: CanvasSnapshot = {
        context,
        atlas,
        plan,
        visibleCells: new Map(),
        appliedToggledCells: new Set(toggledCellsRef.current),
        appliedCellTiles: new Map(cellTilesRef.current),
        showDefaultText,
        width,
        height,
        textFrameX,
        textFrameY,
        artSize: plan.studSize * TILE_ART_SCALE,
        artOffset: (plan.studSize * TILE_ART_SCALE - plan.studSize) / 2,
        shadowOffsetX,
        shadowOffsetY,
      };
      const candidates = new Set([
        ...plan.cells.keys(),
        ...snapshot.appliedCellTiles.keys(),
        ...snapshot.appliedToggledCells,
      ]);
      candidates.forEach((cell) => {
        const visible = visibleCellFor(snapshot, cell);
        if (!visible) return;
        if (
          visible.startX + plan.studSize <= 0
          || visible.startY + plan.studSize <= 0
          || visible.startX >= width
          || visible.startY >= height
        ) return;
        snapshot.visibleCells.set(cell, visible);
      });
      canvasSnapshotRef.current = snapshot;
      drawFullSnapshot(snapshot);
      finishDrawing();
    };

    const scheduleDraw = () => {
      if (disposed || scheduledFrame !== null) return;
      scheduledFrame = requestAnimationFrame(() => {
        scheduledFrame = null;
        drawVersion += 1;
        void draw(drawVersion);
      });
    };

    scheduleDraw();
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleDraw);
    observer?.observe(root);
    void document.fonts?.ready.then(scheduleDraw);
    window.addEventListener("resize", scheduleDraw);
    return () => {
      disposed = true;
      drawVersion += 1;
      if (scheduledFrame !== null) cancelAnimationFrame(scheduledFrame);
      observer?.disconnect();
      window.removeEventListener("resize", scheduleDraw);
    };
  }, [
    canvasArea?.height,
    canvasArea?.left,
    canvasArea?.top,
    canvasArea?.width,
    fontFamily,
    fontSize,
    fontWeight,
    onGridChange,
    onReady,
    shadowOffsetX,
    shadowOffsetY,
    showDefaultText,
    text,
  ]);

  const cellFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const canvasX = event.nativeEvent.offsetX;
    const canvasY = event.nativeEvent.offsetY;
    const root = rootRef.current;
    const canvasWidth = canvas.clientWidth || canvasArea?.width || root?.offsetWidth || 0;
    const canvasHeight = canvas.clientHeight || canvasArea?.height || root?.offsetHeight || 0;
    if (canvasX < 0 || canvasY < 0 || canvasX >= canvasWidth || canvasY >= canvasHeight) return null;
    return legoCellAtRelativePoint(
      canvasX - (canvasArea ? -canvasArea.left : textFrameOriginRef.current.x),
      canvasY - (canvasArea ? -canvasArea.top : textFrameOriginRef.current.y),
      studSizeRef.current
    );
  };

  const editTileAtPointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const snapshot = canvasSnapshotRef.current;
    const cell = cellFromEvent(event);
    if (!cell || visitedCellsRef.current.has(cell)) return;
    visitedCellsRef.current.add(cell);
    event.preventDefault();
    event.stopPropagation();
    if (snapshot) {
      if (onPaintCells) {
        snapshot.appliedCellTiles.set(cell, paintTile);
        cellTilesRef.current.set(cell, paintTile);
      }
      else if (onToggleCells) {
        if (snapshot.appliedToggledCells.has(cell)) {
          snapshot.appliedToggledCells.delete(cell);
          toggledCellsRef.current.delete(cell);
        } else {
          snapshot.appliedToggledCells.add(cell);
          toggledCellsRef.current.add(cell);
        }
      }
      updateSnapshotCells(snapshot, [cell]);
    }
  };

  const startEditing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if ((!onPaintCells && !onToggleCells) || event.button > 0) return;
    editingRef.current = true;
    onEditingChange?.(true, { x: event.clientX, y: event.clientY });
    visitedCellsRef.current.clear();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    editTileAtPointer(event);
  };

  const continueEditing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (editingRef.current) editTileAtPointer(event);
  };

  const stopEditing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!editingRef.current) return;
    editingRef.current = false;
    const editedCells = Array.from(visitedCellsRef.current);
    if (onPaintCells) onPaintCells(editedCells);
    else onToggleCells?.(editedCells);
    onEditingChange?.(false, { x: event.clientX, y: event.clientY });
    visitedCellsRef.current.clear();
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  };

  return (
    <div
      ref={rootRef}
      data-testid="lego-text"
      data-ready={ready}
      data-edited-count={toggledCells.size + (cellTiles?.size ?? 0)}
      className={styles.root}
    >
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        style={canvasArea ? {
          inset: "auto",
          left: `${canvasArea.left}px`,
          top: `${canvasArea.top}px`,
          width: `${canvasArea.width}px`,
          height: `${canvasArea.height}px`,
        } : undefined}
        role="img"
        aria-label={`${text} built from editable LEGO tiles`}
        onPointerDown={startEditing}
        onPointerMove={continueEditing}
        onPointerUp={stopEditing}
        onPointerCancel={stopEditing}
      />
      <span className={styles.fallback} aria-hidden="true">{text}</span>
    </div>
  );
});
