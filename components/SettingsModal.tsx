'use client';

import React, { useState } from "react";
import { motion } from "motion/react";
import { soundManager } from "@/lib/audio";

type SettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onRestartTutorial: () => void;
  onResetProgress: () => void;
  onTeleportToElevator: () => void;
  graphicsQuality?: "ultra" | "high" | "balanced" | "performance";
  onGraphicsQualityChange?: (quality: "ultra" | "high" | "balanced" | "performance") => void;
  cameraSensitivity?: number;
  onCameraSensitivityChange?: (sens: number) => void;
};

export default function SettingsModal({
  isOpen,
  onClose,
  onRestartTutorial,
  onResetProgress,
  onTeleportToElevator,
  graphicsQuality = "high",
  onGraphicsQualityChange,
  cameraSensitivity = 1.0,
  onCameraSensitivityChange
}: SettingsModalProps) {
  const [localQuality, setLocalQuality] = useState<"ultra" | "high" | "balanced" | "performance">(graphicsQuality);
  const [localSensitivity, setLocalSensitivity] = useState(cameraSensitivity);
  const [musicVol, setMusicVol] = useState(soundManager.volumes.music);
  const [machineryVol, setMachineryVol] = useState(soundManager.volumes.machinery);
  const [effectsVol, setEffectsVol] = useState(soundManager.volumes.effects);
  const [showConfirmReset, setShowConfirmReset] = useState(false);
  const [showConfirmTeleport, setShowConfirmTeleport] = useState(false);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-2 border-slate-700 rounded-3xl p-6 md:p-8 shadow-2xl max-w-xl w-full flex flex-col text-white relative overflow-hidden max-h-[85vh] overflow-y-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-xl shadow-inner">
              ⚙️
            </div>
            <div>
              <h2 className="text-lg md:text-xl font-black">Game Settings & Preferences</h2>
              <p className="text-xs text-slate-400">Customize audio, graphics quality, and gameplay controls.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center justify-center font-bold transition-all"
          >
            ✕
          </button>
        </div>

        <div className="space-y-6">
          {/* Audio Settings */}
          <div className="space-y-4 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
            <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
              <span>🔊 Audio & Sound Volumes</span>
            </h3>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Soundtrack & Music Volume</span>
                <span className="font-mono text-cyan-400">{Math.round(musicVol * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={musicVol}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setMusicVol(val);
                  soundManager.setVolume("music", val);
                }}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Factory Machinery & Drill Volume</span>
                <span className="font-mono text-cyan-400">{Math.round(machineryVol * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={machineryVol}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setMachineryVol(val);
                  soundManager.setVolume("machinery", val);
                }}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Sound Effects (Chimes, Cash, Cracking)</span>
                <span className="font-mono text-cyan-400">{Math.round(effectsVol * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={effectsVol}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setEffectsVol(val);
                  soundManager.setVolume("effects", val);
                }}
                className="w-full accent-cyan-400 cursor-pointer"
              />
            </div>
          </div>

          {/* Graphics & Performance */}
          <div className="space-y-3 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                <span>🖥️ Graphics Quality & Performance</span>
              </h3>
              <span className="text-[11px] font-mono text-emerald-300 uppercase bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/80">
                {localQuality}
              </span>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {(["ultra", "high", "balanced", "performance"] as const).map(qual => (
                <button
                  key={qual}
                  onClick={() => {
                    setLocalQuality(qual);
                    onGraphicsQualityChange?.(qual);
                  }}
                  className={`py-2 px-3 rounded-xl text-xs font-bold capitalize transition-all border ${
                    localQuality === qual
                      ? "bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg font-black"
                      : "bg-slate-900 text-slate-300 hover:bg-slate-800 border-slate-800"
                  }`}
                >
                  {qual === "performance" ? "⚡ Performance" : qual === "balanced" ? "⚖️ Balanced" : qual === "high" ? "✨ High" : "🌟 Ultra Glossy"}
                </button>
              ))}
            </div>
            <div className="text-[11px] text-slate-400 pt-1">
              {localQuality === "ultra" && "Ultra: Full 2.0x Retina scaling, PCF soft shadows, 600m view, luxury reflections."}
              {localQuality === "high" && "High (Recommended): 1.5x resolution, PCF shadows, 450m view distance, 60 FPS."}
              {localQuality === "balanced" && "Balanced: 1.25x resolution, basic shadows, optimized for laptops and mobile."}
              {localQuality === "performance" && "Performance: Maximum FPS, shadows disabled, 1.0x native resolution for low-end hardware."}
            </div>
          </div>

          {/* 3rd-Person Camera & View Controls */}
          <div className="space-y-3 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
            <h3 className="text-sm font-bold text-sky-400 uppercase tracking-wider flex items-center gap-2">
              <span>🎥 3rd-Person Camera & Orbit</span>
            </h3>

            <div className="space-y-2">
              <div className="flex justify-between text-xs text-slate-300">
                <span>Orbit Sensitivity</span>
                <span className="font-mono text-sky-400">{Math.round(localSensitivity * 100)}%</span>
              </div>
              <input
                type="range"
                min="0.4"
                max="2.5"
                step="0.1"
                value={localSensitivity}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setLocalSensitivity(val);
                  onCameraSensitivityChange?.(val);
                }}
                className="w-full accent-sky-400 cursor-pointer"
              />
            </div>

            <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 text-xs space-y-1.5 text-slate-300">
              <div className="font-bold text-white flex items-center gap-1.5">
                <span>🕹️ Camera Controls:</span>
              </div>
              <div>• <b>Mouse:</b> Click & drag (or right-click drag) to orbit around player. Scroll wheel zooms in/out.</div>
              <div>• <b>Keys:</b> Press <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-cyan-300">Q</kbd> / <kbd className="px-1 py-0.5 bg-slate-800 rounded border border-slate-700 text-cyan-300">E</kbd> to rotate camera view left/right.</div>
              <div>• <b>Touch / Mobile:</b> Swipe on the right side of the screen to orbit yaw & pitch. Pinch to zoom distance.</div>
              <div>• <b>Camera-Relative Movement:</b> Pressing forward moves where the camera is currently facing!</div>
            </div>
          </div>

          {/* Teleport to Elevator Feature */}
          <div className="space-y-3 bg-slate-950/50 p-4 rounded-2xl border border-cyan-500/30">
            <h3 className="text-sm font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
              <span>🚀 Teleportation Services</span>
            </h3>

            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-white">Teleport to Elevator</div>
                <div className="text-xs text-slate-400">Instantly transport safely to the elevator arrival point.</div>
              </div>
              {!showConfirmTeleport ? (
                <button
                  onClick={() => setShowConfirmTeleport(true)}
                  className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow transition-all active:scale-95"
                >
                  🚀 Teleport
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onTeleportToElevator();
                      setShowConfirmTeleport(false);
                      onClose();
                    }}
                    className="px-3 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs rounded-xl shadow transition-all"
                  >
                    Confirm Teleport
                  </button>
                  <button
                    onClick={() => setShowConfirmTeleport(false)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3 bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
            <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
              <span>🎮 Gameplay Options</span>
            </h3>

            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-white">First-Time Tutorial</div>
                <div className="text-xs text-slate-400">Replay the introductory walkthrough guide.</div>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onRestartTutorial();
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold text-xs rounded-xl border border-slate-700 transition-all"
              >
                Replay Tutorial
              </button>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-bold text-red-400">Reset Game Progress</div>
                <div className="text-xs text-slate-400">Clear all saves, cash, workers, and restart fresh.</div>
              </div>
              {!showConfirmReset ? (
                <button
                  onClick={() => setShowConfirmReset(true)}
                  className="px-4 py-2 bg-red-950/60 hover:bg-red-900/80 text-red-300 font-bold text-xs rounded-xl border border-red-800 transition-all"
                >
                  Reset Progress
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      onResetProgress();
                      setShowConfirmReset(false);
                      onClose();
                    }}
                    className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow transition-all"
                  >
                    Confirm Reset
                  </button>
                  <button
                    onClick={() => setShowConfirmReset(false)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl transition-all"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-sm transition-all"
          >
            Save & Close
          </button>
        </div>
      </motion.div>
    </div>
  );
}
