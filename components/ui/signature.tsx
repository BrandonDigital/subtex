"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

type SignatureProps = {
  className?: string;
  /** Fixed height in CSS pixels. Width is responsive (fills parent width). */
  height?: number;
  /** Stroke color used when drawing */
  penColor?: string;
  /** Background color used when clearing canvas (kept transparent if undefined) */
  backgroundColor?: string;
  /** Line width (CSS px before devicePixelRatio scaling) */
  lineWidth?: number;
  /** Callback that receives a PNG data URL whenever drawing ends or is cleared */
  onChange?: (dataUrl: string | null) => void;
  /** Optional initial signature image (data URL) rendered onto the canvas */
  initialImage?: string | null;
  /** Show built-in toolbar (Clear button) */
  showToolbar?: boolean;
  /** Label shown above the signature pad */
  label?: string;
};

export default function Signature({
  className,
  height = 160,
  penColor = "#111111",
  backgroundColor,
  lineWidth = 2,
  onChange,
  initialImage = null,
  showToolbar = true,
  label = "Signature",
}: SignatureProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const isDrawingRef = useRef(false);
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const [hasSignature, setHasSignature] = useState(false);

  const getCanvasScale = () => ({ scaleX: 1, scaleY: 1 });

  const drawLineTo = (x: number, y: number) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    const last = lastPointRef.current;
    if (!last) return;

    ctx.beginPath();
    ctx.moveTo(last.x, last.y);
    ctx.lineTo(x, y);
    ctx.stroke();

    lastPointRef.current = { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    canvas.setPointerCapture(e.pointerId);
    isDrawingRef.current = true;
    const rect = canvas.getBoundingClientRect();
    const { scaleX, scaleY } = getCanvasScale();
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    lastPointRef.current = { x, y };
    setHasSignature(true);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const { scaleX, scaleY } = getCanvasScale();
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    drawLineTo(x, y);
  };

  const endStroke = useCallback(() => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPointRef.current = null;
    const canvas = canvasRef.current;
    if (canvas && onChange) {
      const dataUrl = hasSignature ? canvas.toDataURL("image/png") : null;
      onChange(dataUrl);
    }
  }, [hasSignature, onChange]);

  const handlePointerUp = () => {
    endStroke();
  };

  const handlePointerLeave = () => {
    endStroke();
  };

  const clear = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    if (backgroundColor) {
      ctx.save();
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasSignature(false);
    onChange?.(null);
  }, [backgroundColor, onChange]);

  const resizeToContainer = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const rect = container.getBoundingClientRect();
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${height}px`;
    canvas.width = Math.max(1, Math.floor(rect.width * dpr));
    canvas.height = Math.max(1, Math.floor(height * dpr));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctxRef.current = ctx;
    ctx.scale(dpr, dpr);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = penColor;
    ctx.lineWidth = lineWidth;
    if (!hasSignature) {
      if (backgroundColor) {
        ctx.save();
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, rect.width, height);
        ctx.restore();
      } else {
        ctx.clearRect(0, 0, rect.width, height);
      }
    }
  }, [backgroundColor, height, lineWidth, penColor, hasSignature]);

  useEffect(() => {
    resizeToContainer();
    const container = containerRef.current;
    if (!container) return;
    const ro = new ResizeObserver(() => {
      resizeToContainer();
    });
    ro.observe(container);
    return () => ro.disconnect();
  }, [resizeToContainer]);

  useEffect(() => {
    if (!initialImage) return;
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    if (!canvas || !ctx) return;
    const img = new Image();
    img.onload = () => {
      const rect = canvas.getBoundingClientRect();
      ctx.drawImage(img, 0, 0, rect.width, height);
      setHasSignature(true);
      onChange?.(canvas.toDataURL("image/png"));
    };
    img.src = initialImage;
  }, [height, initialImage, onChange]);

  useEffect(() => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.strokeStyle = penColor;
    ctx.lineWidth = lineWidth;
  }, [penColor, lineWidth]);

  return (
    <div className={cn("w-full select-none", className)}>
      {showToolbar && (
        <div className='flex items-center justify-between mb-2'>
          <span className='text-sm text-muted-foreground select-none'>
            {label}
          </span>
          <Button type='button' size='sm' variant='outline' onClick={clear}>
            Clear
          </Button>
        </div>
      )}
      <div
        ref={containerRef}
        className={cn(
          "w-full rounded-md border bg-white overflow-hidden touch-none select-none"
        )}
      >
        <canvas
          ref={canvasRef}
          style={{ display: "block", cursor: "crosshair" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
        />
      </div>
    </div>
  );
}
