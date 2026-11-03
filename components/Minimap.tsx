'use client';

import React from 'react';
import { motion } from 'motion/react';
import { MapPin, Factory, User, Navigation, Monitor } from 'lucide-react';

interface MinimapProps {
  playerPos: { x: number; z: number };
  elevatorPos: { x: number; z: number };
  factoryPos: { x: number; z: number };
  officePos?: { x: number; z: number }; // Management Office / The TV
  worldState: 'mine' | 'surface';
  playerYaw: number;
}

export default function Minimap({ playerPos, elevatorPos, factoryPos, officePos = { x: 0, z: 135 }, worldState, playerYaw }: MinimapProps) {
  // Scaling factors: map world units to minimap pixels
  // Minimap is 160x160. Scale 1 world unit = 2 pixels? (80m range)
  const scale = 2.0; 
  const size = 150;
  const center = size / 2;

  const getRelativePos = (pos: { x: number; z: number }) => {
    const dx = (pos.x - playerPos.x) * scale;
    const dz = (pos.z - playerPos.z) * scale;
    return {
      x: center + dx,
      y: center + dz,
    };
  };

  const elevatorRel = getRelativePos(elevatorPos);
  const factoryRel = getRelativePos(factoryPos);
  const officeRel = getRelativePos(officePos);

  // In the surface, interest points are far (factory at z=105, player at z=100-200)
  // In the cave, it's more local.
  // Maybe we should dynamic scale or just a fixed large scale.

  return (
    <div className="fixed top-20 right-6 z-50">
      <div 
        className="relative w-[150px] h-[150px] bg-black/60 border-2 border-stone-700 rounded-lg overflow-hidden backdrop-blur-md shadow-2xl"
        style={{
          boxShadow: 'inset 0 0 20px rgba(0,0,0,0.8)'
        }}
      >
        {/* Background Grid */}
        <div className="absolute inset-0 grid grid-cols-4 grid-rows-4 opacity-20 pointer-events-none">
          {[...Array(16)].map((_, i) => (
            <div key={i} className="border-[0.5px] border-stone-500" />
          ))}
        </div>

        {/* Factory Marker */}
        {worldState === 'surface' && (
          <motion.div 
            className="absolute"
            style={{ 
              left: factoryRel.x, 
              top: factoryRel.y,
              transform: 'translate(-50%, -50%)' 
            }}
          >
            <Factory className="w-5 h-5 text-orange-500 fill-orange-500/20 drop-shadow-lg" />
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-bold text-orange-400 uppercase">Factory</div>
          </motion.div>
        )}

        {/* Management Office / The TV Marker */}
        {worldState === 'surface' && (
          <motion.div 
            className="absolute"
            style={{ 
              left: officeRel.x, 
              top: officeRel.y,
              transform: 'translate(-50%, -50%)' 
            }}
          >
            <div className="p-1 bg-cyan-600/20 border border-cyan-500 rounded-sm">
              <Monitor className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-bold text-cyan-400 uppercase">The TV</div>
          </motion.div>
        )}

        {/* Elevator Marker */}
        <motion.div 
          className="absolute"
          style={{ 
            left: elevatorRel.x, 
            top: elevatorRel.y,
            transform: 'translate(-50%, -50%)' 
          }}
        >
          <div className="p-1 bg-blue-600/20 border border-blue-500 rounded-sm">
            <Navigation className="w-4 h-4 text-blue-400 rotate-180" />
          </div>
          <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[8px] font-bold text-blue-400 uppercase">Elevator</div>
        </motion.div>

        {/* Player Marker (Center) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <motion.div 
            style={{ rotate: -playerYaw * (180 / Math.PI) }}
            className="flex items-center justify-center"
          >
             <div className="w-3 h-3 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.8)] border border-stone-800" />
             <div className="absolute -top-3 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[8px] border-b-white" />
          </motion.div>
        </div>

        {/* Location Label */}
        <div className="absolute bottom-1 left-0 right-0 text-[10px] text-center font-mono text-stone-400 uppercase tracking-tighter">
          {worldState === 'surface' ? 'Sector: Surface' : 'Sector: Deep Mine'}
        </div>
      </div>
    </div>
  );
}
