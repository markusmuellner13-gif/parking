"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { euro, fmtDuration } from "./types";

const MIN_MINUTES = 15;
const MINUTES_PER_REV = 120; // one full spin = 2 h
const DEG_PER_MINUTE = 360 / MINUTES_PER_REV;
const SIZE = 264;
const STROKE = 16;
const R = (SIZE - STROKE) / 2 - 14;
const CX = SIZE / 2;
const CY = SIZE / 2;

type Props = {
  minutes: number;
  maxMinutes: number;
  priceHourCents: number | null;
  onChange: (minutes: number) => void;
};

/** Angle (deg, 0 = 12 o'clock, clockwise) of a pointer event relative to the wheel center. */
function pointerAngle(el: HTMLElement, clientX: number, clientY: number): number {
  const rect = el.getBoundingClientRect();
  const dx = clientX - (rect.left + rect.width / 2);
  const dy = clientY - (rect.top + rect.height / 2);
  return (Math.atan2(dx, -dy) * 180) / Math.PI;
}

export default function TimeWheel({ minutes, maxMinutes, priceHourCents, onChange }: Props) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const totalAngleRef = useRef(minutes * DEG_PER_MINUTE);
  const lastPointerRef = useRef(0);
  const draggingRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  // keep internal angle in sync when minutes change from outside (presets)
  useEffect(() => {
    if (!draggingRef.current) totalAngleRef.current = minutes * DEG_PER_MINUTE;
  }, [minutes]);

  const applyAngle = useCallback(() => {
    const maxAngle = maxMinutes * DEG_PER_MINUTE;
    const minAngle = MIN_MINUTES * DEG_PER_MINUTE;
    totalAngleRef.current = Math.min(maxAngle, Math.max(minAngle, totalAngleRef.current));
    const raw = totalAngleRef.current / DEG_PER_MINUTE;
    const snapped = Math.min(maxMinutes, Math.max(MIN_MINUTES, Math.round(raw / 15) * 15));
    if (snapped !== minutes) {
      if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate?.(8);
      onChange(snapped);
    }
  }, [maxMinutes, minutes, onChange]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = containerRef.current;
    if (!el) return;
    el.setPointerCapture(e.pointerId);
    draggingRef.current = true;
    setDragging(true);
    lastPointerRef.current = pointerAngle(el, e.clientX, e.clientY);
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const el = containerRef.current;
      if (!el || !draggingRef.current) return;
      const a = pointerAngle(el, e.clientX, e.clientY);
      let delta = a - lastPointerRef.current;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      lastPointerRef.current = a;
      totalAngleRef.current += delta;
      applyAngle();
    },
    [applyAngle]
  );

  const endDrag = useCallback(() => {
    draggingRef.current = false;
    setDragging(false);
    totalAngleRef.current = minutes * DEG_PER_MINUTE;
  }, [minutes]);

  // ----- geometry -----
  const knobDeg = (minutes * DEG_PER_MINUTE) % 360;
  const knobRad = ((knobDeg - 90) * Math.PI) / 180;
  const knobX = CX + R * Math.cos(knobRad);
  const knobY = CY + R * Math.sin(knobRad);

  const lapMinutes = minutes % MINUTES_PER_REV === 0 ? MINUTES_PER_REV : minutes % MINUTES_PER_REV;
  const lapFraction = lapMinutes / MINUTES_PER_REV;
  const fullLaps = Math.floor((minutes - 1) / MINUTES_PER_REV);
  const circumference = 2 * Math.PI * R;

  const priceCents = Math.round(((priceHourCents ?? 0) * minutes) / 60);
  const endTime = new Date(Date.now() + minutes * 60_000).toLocaleTimeString("de-AT", {
    hour: "2-digit",
    minute: "2-digit",
  });

  const ticks = Array.from({ length: 8 }, (_, i) => {
    const rad = ((i * 45 - 90) * Math.PI) / 180;
    return {
      x1: CX + (R + 12) * Math.cos(rad),
      y1: CY + (R + 12) * Math.sin(rad),
      x2: CX + (R + 6) * Math.cos(rad),
      y2: CY + (R + 6) * Math.sin(rad),
    };
  });

  return (
    <div className="flex flex-col items-center">
      <div
        ref={containerRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="relative select-none"
        style={{ width: SIZE, height: SIZE, touchAction: "none", cursor: dragging ? "grabbing" : "grab" }}
        role="slider"
        aria-label="Parkdauer"
        aria-valuemin={MIN_MINUTES}
        aria-valuemax={maxMinutes}
        aria-valuenow={minutes}
        aria-valuetext={fmtDuration(minutes)}
      >
        <svg width={SIZE} height={SIZE} className="block">
          <defs>
            <linearGradient id="wheelArc" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#3b82f6" />
              <stop offset="1" stopColor="#1d4ed8" />
            </linearGradient>
          </defs>

          {/* tick marks (15-min steps) */}
          {ticks.map((t, i) => (
            <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="#cbd5e1" strokeWidth={2} strokeLinecap="round" />
          ))}

          {/* completed 2h laps as inner rings */}
          {Array.from({ length: Math.min(fullLaps, 5) }, (_, i) => (
            <circle key={i} cx={CX} cy={CY} r={R - STROKE / 2 - 5 - i * 5} fill="none" stroke="#93c5fd" strokeWidth={2.5} opacity={0.9} />
          ))}

          {/* track */}
          <circle cx={CX} cy={CY} r={R} fill="none" stroke="#e2e8f0" strokeWidth={STROKE} />

          {/* progress arc of the current lap */}
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="url(#wheelArc)"
            strokeWidth={STROKE}
            strokeLinecap="round"
            strokeDasharray={`${circumference * lapFraction} ${circumference}`}
            transform={`rotate(-90 ${CX} ${CY})`}
            style={{ transition: dragging ? "none" : "stroke-dasharray 0.2s ease" }}
          />

          {/* knob */}
          <g style={{ transition: dragging ? "none" : "all 0.2s ease" }}>
            <circle cx={knobX} cy={knobY} r={17} fill="#ffffff" stroke="#1d4ed8" strokeWidth={3} filter="drop-shadow(0 2px 4px rgba(0,0,0,0.35))" />
            <circle cx={knobX} cy={knobY} r={5.5} fill="#1d4ed8" />
          </g>
        </svg>

        {/* center readout */}
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <div className={`text-4xl font-black tabular-nums tracking-tight ${dragging ? "text-blue-700" : "text-slate-900"}`}>
            {fmtDuration(minutes)}
          </div>
          <div className="mt-0.5 text-xs font-medium text-slate-500">bis {endTime} Uhr</div>
          <div className="mt-1.5 rounded-full bg-blue-50 px-3 py-0.5 text-sm font-bold text-blue-700 ring-1 ring-blue-200">
            {priceHourCents == null || priceHourCents === 0 ? "gratis" : euro(priceCents)}
          </div>
        </div>
      </div>
      <p className="mx-auto mt-1 max-w-[190px] text-center text-[11px] leading-tight text-slate-400">
        🎡 Am Rad drehen · 1 Umdrehung = 2 h{maxMinutes < 1440 ? ` · max. ${fmtDuration(maxMinutes)}` : ""}
      </p>
    </div>
  );
}
