"use client";

import { useState, useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { Scissors } from "lucide-react";

export type CutType = "horizontal" | "vertical" | "both";

export interface CuttingSpec {
  cutType: CutType;
  xCutMm: number; // Horizontal cut position (mm from top edge)
  yCutMm: number; // Vertical cut position (mm from left edge)
}

// Sheet dimensions by ACM size
export const SHEET_DIMENSIONS: Record<string, { width: number; height: number }> = {
  standard: { width: 2440, height: 1220 },
  xl: { width: 3050, height: 1500 },
};

interface CutPlanConfiguratorProps {
  sheetWidthMm: number;
  sheetHeightMm: number;
  onCuttingSpecChange: (spec: CuttingSpec | null) => void;
  onEnabledChange?: (enabled: boolean) => void;
  cuttingSpec: CuttingSpec | null;
  className?: string;
}

/** Calculate the resulting pieces from a cut plan */
export function getCutPieces(
  sheetWidthMm: number,
  sheetHeightMm: number,
  xCutMm?: number,
  yCutMm?: number
): { label: string; width: number; height: number; isExcess: boolean }[] {
  const hasX = xCutMm && xCutMm > 0 && xCutMm < sheetHeightMm;
  const hasY = yCutMm && yCutMm > 0 && yCutMm < sheetWidthMm;

  if (hasX && hasY) {
    return [
      { label: "A", width: yCutMm, height: xCutMm, isExcess: false },
      { label: "B", width: sheetWidthMm - yCutMm, height: xCutMm, isExcess: true },
      { label: "C", width: yCutMm, height: sheetHeightMm - xCutMm, isExcess: true },
      { label: "D", width: sheetWidthMm - yCutMm, height: sheetHeightMm - xCutMm, isExcess: true },
    ];
  }
  if (hasX) {
    return [
      { label: "A", width: sheetWidthMm, height: xCutMm, isExcess: false },
      { label: "B", width: sheetWidthMm, height: sheetHeightMm - xCutMm, isExcess: true },
    ];
  }
  if (hasY) {
    return [
      { label: "A", width: yCutMm, height: sheetHeightMm, isExcess: false },
      { label: "B", width: sheetWidthMm - yCutMm, height: sheetHeightMm, isExcess: true },
    ];
  }
  return [];
}

function PieceLabel({
  x,
  y,
  w,
  h,
  label,
  widthMm,
  heightMm,
  isExcess,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  label: string;
  widthMm: number;
  heightMm: number;
  isExcess: boolean;
}) {
  const cx = x + w / 2;
  const cy = y + h / 2;
  const minDim = Math.min(w, h);
  // Only show full labels if the piece is large enough
  const showDims = minDim > 30;
  const fontSize = Math.min(11, Math.max(8, minDim / 5));

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill='transparent'
      />
      {showDims ? (
        <>
          <text
            x={cx}
            y={cy - fontSize * 0.6}
            textAnchor='middle'
            fontSize={fontSize + 1}
            fontWeight='bold'
            fill='#334155'
          >
            {label}
          </text>
          <text
            x={cx}
            y={cy + fontSize * 0.7}
            textAnchor='middle'
            fontSize={fontSize - 1}
            fill='#64748b'
          >
            {widthMm}×{heightMm}
          </text>
        </>
      ) : (
        <text
          x={cx}
          y={cy + fontSize * 0.35}
          textAnchor='middle'
          fontSize={fontSize}
          fontWeight='bold'
          fill='#334155'
        >
          {label}
        </text>
      )}
    </g>
  );
}

function CutPlanVisualization({
  sheetWidthMm,
  sheetHeightMm,
  xCutMm,
  yCutMm,
}: {
  sheetWidthMm: number;
  sheetHeightMm: number;
  xCutMm?: number;
  yCutMm?: number;
}) {
  const padding = { top: 50, right: 90, bottom: 50, left: 70 };
  const svgWidth = 600;
  const scale = (svgWidth - padding.left - padding.right) / sheetWidthMm;
  const sheetW = sheetWidthMm * scale;
  const sheetH = sheetHeightMm * scale;
  const svgHeight = sheetH + padding.top + padding.bottom;

  const hasX = !!(xCutMm && xCutMm > 0 && xCutMm < sheetHeightMm);
  const hasY = !!(yCutMm && yCutMm > 0 && yCutMm < sheetWidthMm);
  const xCutScaled = hasX ? xCutMm! * scale : null;
  const yCutScaled = hasY ? yCutMm! * scale : null;

  const sx = padding.left;
  const sy = padding.top;

  // Build piece regions for the SVG
  const pieces = getCutPieces(sheetWidthMm, sheetHeightMm, xCutMm, yCutMm);

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className='w-full h-auto'
      xmlns='http://www.w3.org/2000/svg'
    >
      <defs>
        <marker
          id='arrow-red-end'
          markerWidth='8'
          markerHeight='6'
          refX='7'
          refY='3'
          orient='auto'
        >
          <polygon points='0 0, 8 3, 0 6' fill='#dc2626' />
        </marker>
        <marker
          id='arrow-red-start'
          markerWidth='8'
          markerHeight='6'
          refX='1'
          refY='3'
          orient='auto'
        >
          <polygon points='8 0, 0 3, 8 6' fill='#dc2626' />
        </marker>
        <marker
          id='arrow-blue-end'
          markerWidth='8'
          markerHeight='6'
          refX='7'
          refY='3'
          orient='auto'
        >
          <polygon points='0 0, 8 3, 0 6' fill='#2563eb' />
        </marker>
        <marker
          id='arrow-blue-start'
          markerWidth='8'
          markerHeight='6'
          refX='1'
          refY='3'
          orient='auto'
        >
          <polygon points='8 0, 0 3, 8 6' fill='#2563eb' />
        </marker>
      </defs>

      {/* Sheet rectangle */}
      <rect
        x={sx}
        y={sy}
        width={sheetW}
        height={sheetH}
        fill='#f8fafc'
        stroke='#1e293b'
        strokeWidth={2}
      />

      {/* Piece region fills and labels */}
      {hasX && hasY && xCutScaled && yCutScaled && (
        <>
          <PieceLabel x={sx} y={sy} w={yCutScaled} h={xCutScaled}
            label="A" widthMm={yCutMm!} heightMm={xCutMm!} isExcess={false} />
          <PieceLabel x={sx + yCutScaled} y={sy} w={sheetW - yCutScaled} h={xCutScaled}
            label="B" widthMm={sheetWidthMm - yCutMm!} heightMm={xCutMm!} isExcess={true} />
          <PieceLabel x={sx} y={sy + xCutScaled} w={yCutScaled} h={sheetH - xCutScaled}
            label="C" widthMm={yCutMm!} heightMm={sheetHeightMm - xCutMm!} isExcess={true} />
          <PieceLabel x={sx + yCutScaled} y={sy + xCutScaled} w={sheetW - yCutScaled} h={sheetH - xCutScaled}
            label="D" widthMm={sheetWidthMm - yCutMm!} heightMm={sheetHeightMm - xCutMm!} isExcess={true} />
        </>
      )}
      {hasX && !hasY && xCutScaled && (
        <>
          <PieceLabel x={sx} y={sy} w={sheetW} h={xCutScaled}
            label="A" widthMm={sheetWidthMm} heightMm={xCutMm!} isExcess={false} />
          <PieceLabel x={sx} y={sy + xCutScaled} w={sheetW} h={sheetH - xCutScaled}
            label="B" widthMm={sheetWidthMm} heightMm={sheetHeightMm - xCutMm!} isExcess={true} />
        </>
      )}
      {!hasX && hasY && yCutScaled && (
        <>
          <PieceLabel x={sx} y={sy} w={yCutScaled} h={sheetH}
            label="A" widthMm={yCutMm!} heightMm={sheetHeightMm} isExcess={false} />
          <PieceLabel x={sx + yCutScaled} y={sy} w={sheetW - yCutScaled} h={sheetH}
            label="B" widthMm={sheetWidthMm - yCutMm!} heightMm={sheetHeightMm} isExcess={true} />
        </>
      )}

      {/* X Axis label and arrow (top) */}
      <text
        x={sx + sheetW / 2}
        y={sy - 28}
        textAnchor='middle'
        fontSize={13}
        fontWeight='bold'
        fill='#1e293b'
      >
        X Axis
      </text>
      <line
        x1={sx}
        y1={sy - 12}
        x2={sx + sheetW}
        y2={sy - 12}
        stroke='#dc2626'
        strokeWidth={1.5}
        markerEnd='url(#arrow-red-end)'
        markerStart='url(#arrow-red-start)'
      />

      {/* Y Axis label and arrow (left) */}
      <text
        x={sx - 40}
        y={sy + sheetH / 2}
        textAnchor='middle'
        fontSize={13}
        fontWeight='bold'
        fill='#1e293b'
        transform={`rotate(-90, ${sx - 40}, ${sy + sheetH / 2})`}
      >
        Y Axis
      </text>
      <line
        x1={sx - 18}
        y1={sy}
        x2={sx - 18}
        y2={sy + sheetH}
        stroke='#2563eb'
        strokeWidth={1.5}
        markerEnd='url(#arrow-blue-end)'
        markerStart='url(#arrow-blue-start)'
      />

      {/* Horizontal cut line (X) - red dashed */}
      {xCutScaled && (
        <>
          <line
            x1={sx}
            y1={sy + xCutScaled}
            x2={sx + sheetW}
            y2={sy + xCutScaled}
            stroke='#dc2626'
            strokeWidth={2}
            strokeDasharray='10 5'
          />
          {/* Dimension line: top edge to cut */}
          <line
            x1={sx + sheetW + 12}
            y1={sy}
            x2={sx + sheetW + 12}
            y2={sy + xCutScaled}
            stroke='#dc2626'
            strokeWidth={1}
            strokeDasharray='4 3'
          />
          {/* Tick marks */}
          <line
            x1={sx + sheetW + 8}
            y1={sy}
            x2={sx + sheetW + 16}
            y2={sy}
            stroke='#dc2626'
            strokeWidth={1}
          />
          <line
            x1={sx + sheetW + 8}
            y1={sy + xCutScaled}
            x2={sx + sheetW + 16}
            y2={sy + xCutScaled}
            stroke='#dc2626'
            strokeWidth={1}
          />
          {/* Dimension label */}
          <text
            x={sx + sheetW + 24}
            y={sy + xCutScaled / 2 + 4}
            fontSize={12}
            fontWeight='bold'
            fill='#dc2626'
          >
            {xCutMm}mm
          </text>
        </>
      )}

      {/* Vertical cut line (Y) - blue dashed */}
      {yCutScaled && (
        <>
          <line
            x1={sx + yCutScaled}
            y1={sy}
            x2={sx + yCutScaled}
            y2={sy + sheetH}
            stroke='#2563eb'
            strokeWidth={2}
            strokeDasharray='10 5'
          />
          {/* Dimension line: left edge to cut */}
          <line
            x1={sx}
            y1={sy + sheetH + 12}
            x2={sx + yCutScaled}
            y2={sy + sheetH + 12}
            stroke='#2563eb'
            strokeWidth={1}
            strokeDasharray='4 3'
          />
          {/* Tick marks */}
          <line
            x1={sx}
            y1={sy + sheetH + 8}
            x2={sx}
            y2={sy + sheetH + 16}
            stroke='#2563eb'
            strokeWidth={1}
          />
          <line
            x1={sx + yCutScaled}
            y1={sy + sheetH + 8}
            x2={sx + yCutScaled}
            y2={sy + sheetH + 16}
            stroke='#2563eb'
            strokeWidth={1}
          />
          {/* Dimension label */}
          <text
            x={sx + yCutScaled / 2}
            y={sy + sheetH + 30}
            textAnchor='middle'
            fontSize={12}
            fontWeight='bold'
            fill='#2563eb'
          >
            {yCutMm}mm
          </text>
        </>
      )}

      {/* Sheet outline (on top of fills) */}
      <rect
        x={sx}
        y={sy}
        width={sheetW}
        height={sheetH}
        fill='none'
        stroke='#1e293b'
        strokeWidth={2}
      />

      {/* Sheet dimension labels (subtle) */}
      <text
        x={sx + sheetW / 2}
        y={sy + sheetH + 45}
        textAnchor='middle'
        fontSize={10}
        fill='#94a3b8'
      >
        {sheetWidthMm}mm
      </text>
      <text
        x={sx + sheetW + 70}
        y={sy + sheetH / 2}
        textAnchor='middle'
        fontSize={10}
        fill='#94a3b8'
        transform={`rotate(90, ${sx + sheetW + 70}, ${sy + sheetH / 2})`}
      >
        {sheetHeightMm}mm
      </text>
    </svg>
  );
}

export function CutPlanConfigurator({
  sheetWidthMm,
  sheetHeightMm,
  onCuttingSpecChange,
  onEnabledChange,
  cuttingSpec,
  className,
}: CutPlanConfiguratorProps) {
  const [enabled, setEnabled] = useState(!!cuttingSpec);
  const [cutType, setCutType] = useState<CutType>(cuttingSpec?.cutType || "horizontal");
  const [xCut, setXCut] = useState<string>(cuttingSpec?.xCutMm?.toString() || "");
  const [yCut, setYCut] = useState<string>(cuttingSpec?.yCutMm?.toString() || "");
  const [termsAccepted, setTermsAccepted] = useState(!!cuttingSpec);

  const xCutNum = parseInt(xCut) || 0;
  const yCutNum = parseInt(yCut) || 0;

  const showXInput = cutType === "horizontal" || cutType === "both";
  const showYInput = cutType === "vertical" || cutType === "both";

  // Validation
  const xValid = !showXInput || (xCutNum > 0 && xCutNum < sheetHeightMm);
  const yValid = !showYInput || (yCutNum > 0 && yCutNum < sheetWidthMm);
  const isValid = enabled && termsAccepted && xValid && yValid;

  const updateSpec = useCallback(
    (
      newCutType: CutType,
      newXCut: string,
      newYCut: string,
      newTerms: boolean,
      newEnabled: boolean
    ) => {
      if (!newEnabled) {
        onCuttingSpecChange(null);
        return;
      }

      const xNum = parseInt(newXCut) || 0;
      const yNum = parseInt(newYCut) || 0;
      const showX = newCutType === "horizontal" || newCutType === "both";
      const showY = newCutType === "vertical" || newCutType === "both";
      const xOk = !showX || (xNum > 0 && xNum < sheetHeightMm);
      const yOk = !showY || (yNum > 0 && yNum < sheetWidthMm);

      if (newTerms && xOk && yOk) {
        onCuttingSpecChange({
          cutType: newCutType,
          xCutMm: showX ? xNum : 0,
          yCutMm: showY ? yNum : 0,
        });
      } else {
        onCuttingSpecChange(null);
      }
    },
    [onCuttingSpecChange, sheetWidthMm, sheetHeightMm]
  );

  const handleToggle = (checked: boolean) => {
    setEnabled(checked);
    onEnabledChange?.(checked);
    if (!checked) {
      onCuttingSpecChange(null);
    } else {
      updateSpec(cutType, xCut, yCut, termsAccepted, true);
    }
  };

  const handleCutTypeChange = (type: CutType) => {
    setCutType(type);
    updateSpec(type, xCut, yCut, termsAccepted, enabled);
  };

  const handleXChange = (value: string) => {
    setXCut(value);
    updateSpec(cutType, value, yCut, termsAccepted, enabled);
  };

  const handleYChange = (value: string) => {
    setYCut(value);
    updateSpec(cutType, xCut, value, termsAccepted, enabled);
  };

  const handleTermsChange = (checked: boolean) => {
    setTermsAccepted(checked);
    updateSpec(cutType, xCut, yCut, checked, enabled);
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* Toggle cutting service */}
      <div className='flex items-center space-x-3'>
        <Checkbox
          id='enable-cutting'
          checked={enabled}
          onCheckedChange={(checked) => handleToggle(checked === true)}
        />
        <Label
          htmlFor='enable-cutting'
          className='text-sm font-medium cursor-pointer flex items-center gap-2'
        >
          <Scissors className='h-4 w-4' />
          Add CNC Cutting Service
        </Label>
      </div>

      {enabled && (
        <div className='border p-5 space-y-5'>
          {/* Cut type selection */}
          <div className='space-y-3'>
            <div className='space-y-2'>
              {(
                [
                  { value: "horizontal" as CutType, label: "Horizontal Cut (X)" },
                  { value: "vertical" as CutType, label: "Vertical Cut (Y)" },
                  { value: "both" as CutType, label: "Both" },
                ] as const
              ).map((option) => (
                <label
                  key={option.value}
                  className={cn(
                    "flex items-center gap-3 p-3 border cursor-pointer transition-colors",
                    cutType === option.value
                      ? "border-black bg-black text-white"
                      : "border-black/10 hover:border-black"
                  )}
                >
                  <input
                    type='radio'
                    name='cutType'
                    value={option.value}
                    checked={cutType === option.value}
                    onChange={() => handleCutTypeChange(option.value)}
                    className='accent-white'
                    hidden
                  />
                  <span className='text-sm font-medium'>{option.label}</span>
                </label>
              ))}
            </div>
            <p className='text-xs text-muted-foreground'>
              Select the type of cut. Maximum 2 cuts (one horizontal, one
              vertical).
            </p>
          </div>

          {/* Dimension inputs */}
          <div className='space-y-3'>
            {showXInput && (
              <div className='space-y-1.5'>
                <Label htmlFor='x-cut' className='text-sm'>
                  X:{" "}
                  <span className='text-muted-foreground font-normal'>
                    Horizontal cut position (mm from top)
                  </span>
                </Label>
                <div className='flex items-center gap-2'>
                  <Input
                    id='x-cut'
                    type='number'
                    min={1}
                    max={sheetHeightMm - 1}
                    placeholder={`1 - ${sheetHeightMm - 1}`}
                    value={xCut}
                    onChange={(e) => handleXChange(e.target.value)}
                    className='w-40'
                  />
                  <span className='text-sm text-muted-foreground'>mm</span>
                </div>
                {xCut && !xValid && (
                  <p className='text-xs text-destructive'>
                    Must be between 1 and {sheetHeightMm - 1}mm
                  </p>
                )}
              </div>
            )}

            {showYInput && (
              <div className='space-y-1.5'>
                <Label htmlFor='y-cut' className='text-sm'>
                  Y:{" "}
                  <span className='text-muted-foreground font-normal'>
                    Vertical cut position (mm from left)
                  </span>
                </Label>
                <div className='flex items-center gap-2'>
                  <Input
                    id='y-cut'
                    type='number'
                    min={1}
                    max={sheetWidthMm - 1}
                    placeholder={`1 - ${sheetWidthMm - 1}`}
                    value={yCut}
                    onChange={(e) => handleYChange(e.target.value)}
                    className='w-40'
                  />
                  <span className='text-sm text-muted-foreground'>mm</span>
                </div>
                {yCut && !yValid && (
                  <p className='text-xs text-destructive'>
                    Must be between 1 and {sheetWidthMm - 1}mm
                  </p>
                )}
              </div>
            )}
          </div>

          {/* SVG Visualization */}
          <div className='border p-3'>
            <CutPlanVisualization
              sheetWidthMm={sheetWidthMm}
              sheetHeightMm={sheetHeightMm}
              xCutMm={showXInput ? xCutNum : undefined}
              yCutMm={showYInput ? yCutNum : undefined}
            />
          </div>

          {/* Terms confirmation */}
          <div className='flex items-start space-x-3 pt-2'>
            <Checkbox
              id='cutting-terms'
              checked={termsAccepted}
              onCheckedChange={(checked) => handleTermsChange(checked === true)}
            />
            <Label
              htmlFor='cutting-terms'
              className='text-xs text-muted-foreground cursor-pointer leading-relaxed'
            >
              I confirm that my cut dimensions are correct. Cut panels cannot be
              returned or refunded. Subtex is not responsible for incorrect
              dimensions provided by the customer.
            </Label>
          </div>

          {/* Validation summary */}
          {enabled && !isValid && (
            <p className='text-xs text-destructive font-medium'>
              * {!termsAccepted
                ? "Please accept the cutting terms to continue."
                : "Please enter valid cut dimensions."}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Compact display of cutting spec for cart/checkout views
 */
export function CuttingSpecBadge({ spec }: { spec: CuttingSpec }) {
  const parts: string[] = [];
  if (spec.cutType === "horizontal" || spec.cutType === "both") {
    parts.push(`X: ${spec.xCutMm}mm`);
  }
  if (spec.cutType === "vertical" || spec.cutType === "both") {
    parts.push(`Y: ${spec.yCutMm}mm`);
  }

  return (
    <span className='inline-flex items-center gap-1 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full'>
      <Scissors className='h-3 w-3' />
      Cut: {parts.join(", ")}
    </span>
  );
}
