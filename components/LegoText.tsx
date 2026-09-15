"use client";

import { memo, useEffect, useRef, useState } from "react";
import {
  DEFAULT_LEGO_SHADOW_OFFSET_X,
  DEFAULT_LEGO_SHADOW_OFFSET_Y,
  legoCellAtRelativePoint,
  legoCellIsFilled,
  legoCellIsVisible,
  legoCellKey,
  legoLetterTileAt,
  legoLetterIndexForCoverage,
  legoStudSizeForWidth,
  LEGO_TEXT_SHADOW_OPACITY,
  LEGO_TEXT_TILE_PATHS,
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
  onToggleCell?: (cell: string) => void;
  onPaintCell?: (cell: string) => void;
  onReady?: () => void;
  onEditingChange?: (
    editing: boolean,
    point: { x: number; y: number }
  ) => void;
  shadowOffsetX?: number;
  shadowOffsetY?: number;
  canvasArea?: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
};

const TILE_ART_SCALE = 1;
const EMPTY_TOGGLED_CELLS: ReadonlySet<string> = new Set<string>();
const tileImagePromises = new Map<string, Promise<HTMLImageElement>>();

type GlyphGeometry = {
  key: string;
  letterPixels: Uint8ClampedArray[];
  letterCenters: number[];
  studSize: number;
};

type VisibleCell = {
  tilePath: string;
  startX: number;
  startY: number;
};

type CanvasSnapshot = {
  context: CanvasRenderingContext2D;
  tileSources: Map<string, HTMLImageElement>;
  visibleCells: Map<string, VisibleCell>;
  tilePathByCell: Map<string, string>;
  width: number;
  height: number;
  textFrameX: number;
  textFrameY: number;
  studSize: number;
  artSize: number;
  artOffset: number;
};

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

function parseCellKey(cell: string): { column: number; row: number } | null {
  const match = /^(-?\d+):(-?\d+)$/.exec(cell);
  if (!match) return null;
  return { column: Number(match[1]), row: Number(match[2]) };
}

function loadTileImage(src: string): Promise<HTMLImageElement> {
  const existing = tileImagePromises.get(src);
  if (existing) return existing;
  const promise = new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load LEGO tile artwork."));
    image.src = src;
  });
  tileImagePromises.set(src, promise);
  return promise;
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
  onToggleCell,
  onPaintCell,
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
  const glyphGeometryRef = useRef<GlyphGeometry | null>(null);
  const canvasSnapshotRef = useRef<CanvasSnapshot | null>(null);
  const editingRef = useRef(false);
  const visitedCellsRef = useRef<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;

    let disposed = false;
    const notifyReady = () => {
      if (!disposed) onReady?.();
    };
    const finishDrawing = () => {
      if (disposed) return;
      setReady(true);
      onReady?.();
    };

    const draw = async () => {
      const textFrameWidth = root.offsetWidth;
      const textFrameHeight = root.offsetHeight;
      if (!textFrameWidth || !textFrameHeight) {
        // Keep the fallback/intro usable in non-layout environments and in
        // the rare case a hidden frame has not received dimensions yet.
        notifyReady();
        return;
      }
      const width = canvasArea?.width ?? textFrameWidth;
      const height = canvasArea?.height ?? textFrameHeight;
      const textFrameX = -(canvasArea?.left ?? 0);
      const textFrameY = -(canvasArea?.top ?? 0);
      if (!width || !height) {
        notifyReady();
        return;
      }
      textFrameOriginRef.current = { x: textFrameX, y: textFrameY };

      let context: CanvasRenderingContext2D | null = null;
      try {
        context = canvas.getContext("2d");
      } catch {
        notifyReady();
        return;
      }
      if (!context) {
        notifyReady();
        return;
      }

      let tileSources: Map<string, HTMLImageElement>;
      try {
        const customTilePaths = Array.from(cellTiles?.values() ?? []).filter(
          (path): path is string => typeof path === "string"
        );
        const tilePaths = Array.from(new Set([...LEGO_TEXT_TILE_PATHS, ...customTilePaths]));
        tileSources = new Map(
          await Promise.all(
            tilePaths.map(async (path) => [path, await loadTileImage(path)] as const)
          )
        );
      } catch {
        notifyReady();
        return;
      }
      if (disposed) return;

      // The supplied brick PNGs already contain their highlight and shadow.
      // A 2x Retina backing store quadruples this oversized canvas's memory
      // without making the small grid cells meaningfully sharper.
      const dpr = 1;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, width, height);

      const geometryKey = [text, textFrameWidth, textFrameHeight, fontFamily, fontSize, fontWeight].join("|");
      let geometry = glyphGeometryRef.current;
      if (!geometry || geometry.key !== geometryKey) {
        // Keep the glyph masks at the word-frame resolution and retain them
        // between edits. Drag-painting now changes only the brick composition,
        // rather than rasterizing six font masks again for every crossed cell.
        const mask = document.createElement("canvas");
        mask.width = textFrameWidth;
        mask.height = textFrameHeight;
        const maskContext = mask.getContext("2d");
        if (!maskContext) return;

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

        const setMaskFont = () => {
          maskContext.font = `${resolvedWeight} ${resolvedSize}px ${resolvedFamily}`;
        };
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
        const localLayout = centeredRunLayout(characterMetrics, 0, textFrameWidth, textFrameHeight);
        geometry = {
          key: geometryKey,
          letterPixels: Array.from(text).map((character, index) => {
            maskContext.clearRect(0, 0, textFrameWidth, textFrameHeight);
            maskContext.fillText(character, localLayout.charX[index], localLayout.baselineY);
            return maskContext.getImageData(0, 0, textFrameWidth, textFrameHeight).data;
          }),
          letterCenters: characterMetrics.map(
            (metrics, index) => localLayout.charX[index]
              + (metrics.boundingBoxRight - metrics.boundingBoxLeft) / 2
          ),
          studSize: legoStudSizeForWidth(textFrameWidth),
        };
        glyphGeometryRef.current = geometry;
      }

      const { letterPixels, studSize } = geometry;
      const letterCenters = geometry.letterCenters.map((center) => center + textFrameX);
      studSizeRef.current = studSize;
      onGridChange?.(studSize);
      const visibleCells = new Map<string, VisibleCell>();
      const tilePathByCell = new Map<string, string>();
      const candidateCells = new Set<string>();
      if (showDefaultText) {
        const wordColumns = Math.ceil(textFrameWidth / studSize);
        const wordRows = Math.ceil(textFrameHeight / studSize);
        for (let row = 0; row < wordRows; row += 1) {
          for (let column = 0; column < wordColumns; column += 1) {
            candidateCells.add(legoCellKey(column, row));
          }
        }
      }
      cellTiles?.forEach((_tile, cell) => candidateCells.add(cell));
      toggledCells.forEach((cell) => candidateCells.add(cell));

      candidateCells.forEach((cell) => {
          const coordinates = parseCellKey(cell);
          if (!coordinates) return;
          const { column, row } = coordinates;
          const startX = textFrameX + column * studSize;
          const startY = textFrameY + row * studSize;
          if (startX + studSize <= 0 || startY + studSize <= 0 || startX >= width || startY >= height) {
            return;
          }
          const letterAlpha = letterPixels.map(() => 0);
          let samples = 0;
          for (let sampleY = 0; sampleY < 3; sampleY += 1) {
            for (let sampleX = 0; sampleX < 3; sampleX += 1) {
              const x = Math.floor(
                startX + studSize * ((sampleX + 0.5) / 3) - textFrameX
              );
              const y = Math.floor(
                startY + studSize * ((sampleY + 0.5) / 3) - textFrameY
              );
              if (x < 0 || y < 0 || x >= textFrameWidth || y >= textFrameHeight) {
                samples += 1;
                continue;
              }
              letterPixels.forEach((pixels, index) => {
                letterAlpha[index] += pixels[(y * textFrameWidth + x) * 4 + 3] / 255;
              });
              samples += 1;
            }
          }
          const letterCoverages = letterAlpha.map((alpha) => alpha / samples);
          const coverage = Math.max(0, ...letterCoverages);
          const defaultFilled = showDefaultText && legoCellIsFilled(coverage, column, row);
          const hasCustomTile = cellTiles?.has(cell) ?? false;
          const customTile = cellTiles?.get(cell);
          // Builder entries are explicit: a PNG path paints that exact block,
          // null erases it, and an absent entry falls through to the generated
          // blue word. Homepage toggles still flip whichever authored state is
          // underneath, so builder saves do not break the original interaction.
          const authoredFilled = hasCustomTile ? customTile !== null : defaultFilled;
          const cellCenterX = startX + studSize / 2;
          const nearestLetterIndex = letterCenters.reduce(
            (closest, center, index) =>
              Math.abs(center - cellCenterX) < Math.abs(letterCenters[closest] - cellCenterX)
                ? index
                : closest,
            0
          );
          const letterIndex = legoLetterIndexForCoverage(
            letterCoverages,
            nearestLetterIndex
          );
          const tilePath = typeof customTile === "string"
              ? customTile
              : legoLetterTileAt(letterIndex);
          tilePathByCell.set(cell, tilePath);
          if (!legoCellIsVisible(authoredFilled, toggledCells.has(cell))) return;
          visibleCells.set(cell, {
            tilePath,
            startX,
            startY,
          });
      });

      const artSize = studSize * TILE_ART_SCALE;
      const artOffset = (artSize - studSize) / 2;
      canvasSnapshotRef.current = {
        context,
        tileSources,
        visibleCells,
        tilePathByCell,
        width,
        height,
        textFrameX,
        textFrameY,
        studSize,
        artSize,
        artOffset,
      };
      if (visibleCells.size === 0) {
        finishDrawing();
        return;
      }
      // Paint black silhouettes first, offset by the configured three pixels,
      // then place every colored brick over them. Keeping the passes separate
      // restores depth to individually drawn tiles without running an
      // expensive canvas shadow filter hundreds of times.
      context.save();
      context.filter = "brightness(0)";
      context.globalAlpha = LEGO_TEXT_SHADOW_OPACITY;
      visibleCells.forEach(({ tilePath, startX, startY }) => {
        const tile = tileSources.get(tilePath);
        if (!tile) return;
        context.drawImage(
          tile,
          startX - artOffset + shadowOffsetX,
          startY - artOffset + shadowOffsetY,
          artSize,
          artSize
        );
      });
      context.restore();
      visibleCells.forEach(({ tilePath, startX, startY }) => {
        const tile = tileSources.get(tilePath);
        if (!tile) return;
        context.drawImage(
          tile,
          startX - artOffset,
          startY - artOffset,
          artSize,
          artSize
        );
      });
      finishDrawing();
    };

    void draw();
    const observer = typeof ResizeObserver === "undefined"
      ? null
      : new ResizeObserver(() => void draw());
    observer?.observe(root);
    void document.fonts?.ready.then(() => void draw());
    const onResize = () => void draw();
    window.addEventListener("resize", onResize);
    return () => {
      disposed = true;
      observer?.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [
    fontFamily,
    fontSize,
    fontWeight,
    onGridChange,
    onReady,
    shadowOffsetX,
    shadowOffsetY,
    showDefaultText,
    text,
    cellTiles,
    toggledCells,
    canvasArea?.height,
    canvasArea?.left,
    canvasArea?.top,
    canvasArea?.width,
  ]);

  // Canvas recomposition is intentionally asynchronous and can involve
  // hundreds of bricks. Patch just the pressed grid square synchronously so
  // the interaction responds in the same pointer event, then let the normal
  // React update rebuild the authoritative bitmap afterward.
  const patchToggledCellImmediately = (cell: string) => {
    const snapshot = canvasSnapshotRef.current;
    const coordinates = parseCellKey(cell);
    if (!snapshot || !coordinates) return;

    const {
      context,
      tileSources,
      visibleCells,
      tilePathByCell,
      textFrameX,
      textFrameY,
      studSize,
      artSize,
      artOffset,
      width,
      height,
    } = snapshot;
    const startX = textFrameX + coordinates.column * studSize;
    const startY = textFrameY + coordinates.row * studSize;
    const wasVisible = visibleCells.has(cell);
    if (wasVisible) {
      visibleCells.delete(cell);
    } else {
      visibleCells.set(cell, {
        tilePath: tilePathByCell.get(cell) ?? LEGO_TEXT_TILE_PATHS[0],
        startX,
        startY,
      });
    }

    const faceX = startX - artOffset;
    const faceY = startY - artOffset;
    const dirtyX = Math.max(0, faceX + Math.min(0, shadowOffsetX) - 1);
    const dirtyY = Math.max(0, faceY + Math.min(0, shadowOffsetY) - 1);
    const dirtyRight = Math.min(
      width,
      faceX + artSize + Math.max(0, shadowOffsetX) + 1
    );
    const dirtyBottom = Math.min(
      height,
      faceY + artSize + Math.max(0, shadowOffsetY) + 1
    );
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
    visibleCells.forEach(({ tilePath, startX: cellX, startY: cellY }) => {
      const drawX = cellX - artOffset + shadowOffsetX;
      const drawY = cellY - artOffset + shadowOffsetY;
      if (!rectanglesIntersect(drawX, drawY, artSize, artSize, dirtyX, dirtyY, dirtyWidth, dirtyHeight)) {
        return;
      }
      const tile = tileSources.get(tilePath);
      if (tile) context.drawImage(tile, drawX, drawY, artSize, artSize);
    });
    context.restore();

    context.save();
    context.beginPath();
    context.rect(dirtyX, dirtyY, dirtyWidth, dirtyHeight);
    context.clip();
    visibleCells.forEach(({ tilePath, startX: cellX, startY: cellY }) => {
      const drawX = cellX - artOffset;
      const drawY = cellY - artOffset;
      if (!rectanglesIntersect(drawX, drawY, artSize, artSize, dirtyX, dirtyY, dirtyWidth, dirtyHeight)) {
        return;
      }
      const tile = tileSources.get(tilePath);
      if (tile) context.drawImage(tile, drawX, drawY, artSize, artSize);
    });
    context.restore();
  };

  const cellFromEvent = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    // offsetX/offsetY are already expressed in the canvas's own CSS-pixel
    // coordinate space. Deriving the point from getBoundingClientRect instead
    // breaks as soon as PaperSheet rotates: its screen-space bounding box is
    // larger than the untransformed LEGO grid and a visible brick maps to a
    // different cell. Native local coordinates remain correct through that
    // rotation and while the sheet fans in or out.
    const canvasX = event.nativeEvent.offsetX;
    const canvasY = event.nativeEvent.offsetY;
    const root = rootRef.current;
    const canvasWidth = canvas.clientWidth || canvasArea?.width || root?.offsetWidth || 0;
    const canvasHeight = canvas.clientHeight || canvasArea?.height || root?.offsetHeight || 0;
    if (canvasX < 0 || canvasY < 0 || canvasX >= canvasWidth || canvasY >= canvasHeight) {
      return null;
    }
    return legoCellAtRelativePoint(
      canvasX - (canvasArea ? -canvasArea.left : textFrameOriginRef.current.x),
      canvasY - (canvasArea ? -canvasArea.top : textFrameOriginRef.current.y),
      studSizeRef.current
    );
  };

  const toggleTileAtPointer = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const editCell = onPaintCell ?? onToggleCell;
    if (!editCell) return;
    const cell = cellFromEvent(event);
    if (!cell || visitedCellsRef.current.has(cell)) return;
    visitedCellsRef.current.add(cell);
    event.preventDefault();
    event.stopPropagation();
    if (onToggleCell && !onPaintCell) patchToggledCellImmediately(cell);
    editCell(cell);
  };

  const startEditing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if ((!onPaintCell && !onToggleCell) || event.button > 0) return;
    editingRef.current = true;
    onEditingChange?.(true, { x: event.clientX, y: event.clientY });
    visitedCellsRef.current.clear();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    toggleTileAtPointer(event);
  };

  const continueEditing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!editingRef.current) return;
    toggleTileAtPointer(event);
  };

  const stopEditing = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!editingRef.current) return;
    editingRef.current = false;
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
