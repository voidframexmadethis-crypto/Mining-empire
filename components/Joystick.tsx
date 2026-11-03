'use client';

import React, { useRef, useState, useEffect } from "react";
import { motion } from "motion/react";

interface JoystickProps {
  onMove: (x: number, y: number) => void;
  size?: number;
  knobSize?: number;
}

export default function Joystick({ onMove, size = 130, knobSize = 64 }: JoystickProps) {
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = (clientX: number, clientY: number) => {
    if (!isActive || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const dx = clientX - centerX;
    const dy = clientY - centerY;
    
    const maxDist = (size / 2) - 20;
    const dist = Math.min(maxDist, Math.hypot(dx, dy));
    const angle = Math.atan2(dy, dx);
    
    const x = Math.cos(angle) * dist;
    const y = Math.sin(angle) * dist;
    
    setKnobPos({ x, y });
    onMove(x / maxDist, y / maxDist);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    setIsActive(true);
    // Explicitly cast to Element to use setPointerCapture
    (e.target as Element).setPointerCapture(e.pointerId);
    handleMove(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isActive) {
      handleMove(e.clientX, e.clientY);
    }
  };

  const handlePointerUp = () => {
    setIsActive(false);
    setKnobPos({ x: 0, y: 0 });
    onMove(0, 0);
  };

  return (
    <div
      ref={containerRef}
      className="relative rounded-full bg-slate-900/90 border-2 border-slate-700 shadow-2xl touch-none flex items-center justify-center"
      style={{ width: size, height: size }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
      {/* Outer base texture */}
      <div className="absolute inset-2 rounded-full bg-slate-800 shadow-inner flex items-center justify-center">
        {/* Knob */}
        <motion.div
          animate={{ x: knobPos.x, y: knobPos.y }}
          transition={{ type: "spring", damping: 20, stiffness: 300, mass: 0.5 }}
          className="relative rounded-full bg-gradient-to-b from-slate-600 to-slate-900 border border-slate-500 shadow-xl"
          style={{ width: knobSize, height: knobSize }}
        >
          {/* Grip detail */}
          <div className="absolute inset-3 rounded-full border border-slate-700/50" />
          <div className="absolute inset-5 rounded-full border border-slate-700/50" />
        </motion.div>
      </div>
    </div>
  );
}
