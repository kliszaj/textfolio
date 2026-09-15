"use client";

import { memo, useEffect, useRef, useState } from "react";
import {
  DEFAULT_LEGO_SHADOW_OFFSET_X,
  DEFAULT_LEGO_SHADOW_OFFSET_Y,
  legoCellAtRelativePoint,
  legoCellIsFilled,
  legoCellIsVisible,
  legoCellKey,
  legoExtrusionCells,
  legoLetterIndexForCoverage,
  legoLetterTileAt,
  legoStudSizeForWidth,
  legoTileAtlasRect,
  LEGO_CANONICAL_COLUMNS,
  LEGO_CANONICAL_ROWS,
  LEGO_CANONICAL_STUD_SIZE,
  LEGO_TEXT_EXTRUSION_TILE_PATH,
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
  faceTilePath?: string;
  extrusionTilePath?: string;
  showDefaultText?: boolean;
  onGridChange?: (studSize: number, originX: number, originY: number) => void;
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
type GridPlan = { key: string; cells: Map<string, CellPlan> };
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
  gridOriginX: number;
  gridOriginY: number;
  studSize: number;
  artSize: number;
  artOffset: number;
  faceTilePath?: string;
  extrusionOffsetColumns: number;
  extrusionOffsetRows: number;
  extrusionTilePath: string;
};

const TILE_ART_SCALE = 1;
const CANONICAL_LETTER_SPACING = LEGO_CANONICAL_STUD_SIZE;
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
    tilePath: snapshot.faceTilePath ?? (
      typeof customTile === "string"
        ? customTile
        : plan?.defaultTilePath ?? LEGO_TEXT_TILE_PATHS[0]
    ),
    startX: snapshot.textFrameX + snapshot.gridOriginX + coordinates.column * snapshot.studSize,
    startY: snapshot.textFrameY + snapshot.gridOriginY + coordinates.row * snapshot.studSize,
  };
}

function extrusionCellsFor(snapshot: CanvasSnapshot): VisibleCell[] {
  return Array.from(
    legoExtrusionCells(
      snapshot.visibleCells.keys(),
      snapshot.extrusionOffsetColumns,
      snapshot.extrusionOffsetRows
    )
  ).flatMap((cell) => {
    const coordinates = parseCellKey(cell);
    if (!coordinates) return [];
    return [{
      tilePath: snapshot.extrusionTilePath,
      startX: snapshot.textFrameX + snapshot.gridOriginX + coordinates.column * snapshot.studSize,
      startY: snapshot.textFrameY + snapshot.gridOriginY + coordinates.row * snapshot.studSize,
    }];
  });
}

function redrawDirtyCells(snapshot: CanvasSnapshot, cells: readonly string[]) {
  if (cells.length === 0) return;
  const {
    context,
    atlas,
    visibleCells,
    artSize,
    artOffset,
    extrusionOffsetColumns,
    extrusionOffsetRows,
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
    const faceX = snapshot.textFrameX + snapshot.gridOriginX + coordinates.column * snapshot.studSize - artOffset;
    const faceY = snapshot.textFrameY + snapshot.gridOriginY + coordinates.row * snapshot.studSize - artOffset;
    const extrusionX = extrusionOffsetColumns * snapshot.studSize;
    const extrusionY = extrusionOffsetRows * snapshot.studSize;
    dirtyX = Math.min(dirtyX, faceX + Math.min(0, extrusionX) - 1);
    dirtyY = Math.min(dirtyY, faceY + Math.min(0, extrusionY) - 1);
    dirtyRight = Math.max(dirtyRight, faceX + artSize + Math.max(0, extrusionX) + 1);
    dirtyBottom = Math.max(dirtyBottom, faceY + artSize + Math.max(0, extrusionY) + 1);
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
  extrusionCellsFor(snapshot).forEach(({ tilePath, startX, startY }) => {
    const x = startX - artOffset;
    const y = startY - artOffset;
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
  extrusionCellsFor(snapshot).forEach(({ tilePath, startX, startY }) => {
    drawAtlasTile(
      context,
      atlas,
      tilePath,
      startX - artOffset,
      startY - artOffset,
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
  faceTilePath,
  extrusionTilePath = LEGO_TEXT_EXTRUSION_TILE_PATH,
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

    const buildGridPlan = (geometryKey: string): GridPlan | null => {
      const textFrameWidth = LEGO_CANONICAL_COLUMNS * LEGO_CANONICAL_STUD_SIZE;
      const textFrameHeight = LEGO_CANONICAL_ROWS * LEGO_CANONICAL_STUD_SIZE;
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
      let resolvedSize = LEGO_CANONICAL_STUD_SIZE * 13;
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
      const trackingWidth = CANONICAL_LETTER_SPACING * Math.max(0, text.length - 1);
      resolvedSize *= Math.min(
        1,
        (textFrameWidth * 0.92 - trackingWidth) / Math.max(bounds.width, 1),
        (textFrameHeight * 0.78) / Math.max(bounds.height, 1)
      );
      setMaskFont();
      characterMetrics = measureCharacters();
      maskContext.textBaseline = "alphabetic";
      maskContext.fillStyle = "#000";
      const layout = centeredRunLayout(
        characterMetrics,
        CANONICAL_LETTER_SPACING,
        textFrameWidth,
        textFrameHeight
      );
      const studSize = LEGO_CANONICAL_STUD_SIZE;
      const columns = LEGO_CANONICAL_COLUMNS;
      const rows = LEGO_CANONICAL_ROWS;
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
            let samples = 0;
            const startX = column * studSize;
            const startY = row * studSize;
            for (let y = startY; y < Math.min(startY + studSize, textFrameHeight); y += 1) {
              for (let x = startX; x < Math.min(startX + studSize, textFrameWidth); x += 1) {
                alpha += pixels[(y * textFrameWidth + x) * 4 + 3] / 255;
                samples += 1;
              }
            }
            coverages[letterIndex] = samples ? alpha / samples : 0;
            coverageByCell.set(cell, coverages);
          }
        }
      });

      const cells = new Map<string, CellPlan>();
      // Coarse grids can round two neighboring glyph edges into the same
      // column even when the vector font leaves air between them. Reserve the
      // grid column nearest every inter-letter midpoint: the yellow face can
      // never bridge it, while the blue extrusion may still travel through it.
      const separatorColumns = new Set<number>();
      characterMetrics.slice(0, -1).forEach((metrics, index) => {
        const currentRight = layout.charX[index] + metrics.boundingBoxRight;
        const nextLeft = layout.charX[index + 1] - characterMetrics[index + 1].boundingBoxLeft;
        separatorColumns.add(Math.floor(((currentRight + nextLeft) / 2) / studSize));
      });
      const counterCutouts = new Set<string>();
      Array.from(text).forEach((character, letterIndex) => {
        if (!"ADR".includes(character.toUpperCase())) return;
        const metrics = characterMetrics[letterIndex];
        const minColumn = Math.max(
          0,
          Math.floor((layout.charX[letterIndex] - metrics.boundingBoxLeft) / studSize)
        );
        const maxColumn = Math.min(
          columns - 1,
          Math.ceil((layout.charX[letterIndex] + metrics.boundingBoxRight) / studSize) - 1
        );
        const minRow = Math.max(
          0,
          Math.floor((layout.baselineY - metrics.boundingBoxAscent) / studSize)
        );
        const maxRow = Math.min(
          rows - 1,
          Math.ceil((layout.baselineY + metrics.boundingBoxDescent) / studSize) - 1
        );
        const coverageAt = (column: number, row: number) =>
          coverageByCell.get(legoCellKey(column, row))?.[letterIndex] ?? 0;
        const isFilled = (column: number, row: number) =>
          legoCellIsFilled(coverageAt(column, row), column, row);
        const exterior = new Set<string>();
        const queue: { column: number; row: number }[] = [];
        const visitExterior = (column: number, row: number) => {
          if (
            column < minColumn
            || column > maxColumn
            || row < minRow
            || row > maxRow
            || isFilled(column, row)
          ) return;
          const key = legoCellKey(column, row);
          if (exterior.has(key)) return;
          exterior.add(key);
          queue.push({ column, row });
        };
        for (let column = minColumn; column <= maxColumn; column += 1) {
          visitExterior(column, minRow);
          visitExterior(column, maxRow);
        }
        for (let row = minRow; row <= maxRow; row += 1) {
          visitExterior(minColumn, row);
          visitExterior(maxColumn, row);
        }
        for (let index = 0; index < queue.length; index += 1) {
          const { column, row } = queue[index];
          visitExterior(column - 1, row);
          visitExterior(column + 1, row);
          visitExterior(column, row - 1);
          visitExterior(column, row + 1);
        }

        const counterColumnsByRow = new Map<number, number[]>();
        for (let row = minRow; row <= maxRow; row += 1) {
          for (let column = minColumn; column <= maxColumn; column += 1) {
            const key = legoCellKey(column, row);
            if (!isFilled(column, row) && !exterior.has(key)) {
              const rowColumns = counterColumnsByRow.get(row) ?? [];
              rowColumns.push(column);
              counterColumnsByRow.set(row, rowColumns);
            }
          }
        }
        // Widen each enclosed counter by one cell total per occupied row.
        // Choosing the lower-coverage side follows the real vector contour
        // instead of arbitrarily chewing into the left or right stem.
        counterColumnsByRow.forEach((counterColumns, row) => {
          const left = Math.min(...counterColumns) - 1;
          const right = Math.max(...counterColumns) + 1;
          const candidates = [left, right].filter(
            (column) => column >= minColumn && column <= maxColumn && isFilled(column, row)
          );
          if (!candidates.length) return;
          const chosen = candidates.reduce((best, column) =>
            coverageAt(column, row) < coverageAt(best, row) ? column : best
          );
          counterCutouts.add(legoCellKey(chosen, row));
        });
      });
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
          defaultFilled:
            !separatorColumns.has(coordinates.column)
            && !counterCutouts.has(cell)
            && legoCellIsFilled(coverage, coordinates.column, coordinates.row),
          defaultTilePath: legoLetterTileAt(
            legoLetterIndexForCoverage(coverages, nearestLetter)
          ),
        });
      });
      return { key: geometryKey, cells };
    };

    const draw = async (version: number) => {
      try {
        await document.fonts?.ready;
      } catch {
        // A font loading failure still leaves a usable CSS fallback.
      }
      if (disposed || version !== drawVersion) return;
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

      const geometryKey = [text, fontFamily, fontWeight].join("|");
      let plan = gridPlanRef.current;
      if (!plan || plan.key !== geometryKey) {
        plan = buildGridPlan(geometryKey);
        if (!plan) { notifyReady(); return; }
        gridPlanRef.current = plan;
      }

      const studSize = legoStudSizeForWidth(textFrameWidth);
      const gridWidth = LEGO_CANONICAL_COLUMNS * studSize;
      const gridHeight = LEGO_CANONICAL_ROWS * studSize;
      const gridOriginX = (textFrameWidth - gridWidth) / 2;
      const gridOriginY = (textFrameHeight - gridHeight) / 2;

      canvas.width = Math.max(1, Math.round(width));
      canvas.height = Math.max(1, Math.round(height));
      context.setTransform(1, 0, 0, 1, 0, 0);
      studSizeRef.current = studSize;
      onGridChange?.(studSize, gridOriginX, gridOriginY);

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
        gridOriginX,
        gridOriginY,
        studSize,
        artSize: studSize * TILE_ART_SCALE,
        artOffset: (studSize * TILE_ART_SCALE - studSize) / 2,
        faceTilePath,
        extrusionOffsetColumns: Math.round(shadowOffsetX),
        extrusionOffsetRows: Math.round(shadowOffsetY),
        extrusionTilePath,
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
          visible.startX + studSize <= 0
          || visible.startY + studSize <= 0
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
    faceTilePath,
    extrusionTilePath,
    onGridChange,
    onReady,
    shadowOffsetX,
    shadowOffsetY,
    showDefaultText,
    text,
  ]);

  const cellFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const snapshot = canvasSnapshotRef.current;
    if (!canvas) return null;
    const canvasX = event.nativeEvent.offsetX;
    const canvasY = event.nativeEvent.offsetY;
    const root = rootRef.current;
    const canvasWidth = canvas.clientWidth || canvasArea?.width || root?.offsetWidth || 0;
    const canvasHeight = canvas.clientHeight || canvasArea?.height || root?.offsetHeight || 0;
    if (canvasX < 0 || canvasY < 0 || canvasX >= canvasWidth || canvasY >= canvasHeight) return null;
    if (!snapshot) {
      return legoCellAtRelativePoint(
        canvasX - (canvasArea ? -canvasArea.left : 0),
        canvasY - (canvasArea ? -canvasArea.top : 0),
        studSizeRef.current
      );
    }
    return legoCellAtRelativePoint(
      canvasX - snapshot.textFrameX - snapshot.gridOriginX,
      canvasY - snapshot.textFrameY - snapshot.gridOriginY,
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
