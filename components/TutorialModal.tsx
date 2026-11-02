'use client';

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";

type TutorialModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSkip: () => void;
};

const TUTORIAL_STEPS = [
  {
    title: "Welcome to Mining Empire!",
    description: "Build your multi-facility gemstone mining and jewelry manufacturing empire from the ground up.",
    icon: "⛏️",
    highlight: "Explore the vast underground cave and bustling surface industrial world."
  },
  {
    title: "Movement & Exploration",
    description: "Use the on-screen virtual joystick or WASD / Arrow keys on your keyboard to navigate the world.",
    icon: "🕹️",
    highlight: "Walk up to the Hyper Elevator to travel between the underground cave mine and the surface base."
  },
  {
    title: "Mining & Gem Collection",
    description: "Walk up to mineral ore deposits in the cave to automatically drill and shatter rock formations.",
    icon: "💎",
    highlight: "Collect loose gemstones into your backpack. Watch out for backpack capacity limits!"
  },
  {
    title: "Factory Processing Chain",
    description: "Take your backpack to the Original Factory conveyor belt at the surface (Z: 105) and deposit your gems.",
    icon: "🏭",
    highlight: "Gems automatically flow through Drillers, Crushers, Washers, Compactors, and Jams."
  },
  {
    title: "Worker Management & HQ",
    description: "Visit the Executive Management Office at Z: 135 to hire Beginner, Experienced, and Expert workers.",
    icon: "🏢",
    highlight: "Assign workers to factory machines to automate production and boost efficiency."
  },
  {
    title: "Jewelry Manufacturing & Retail",
    description: "Processed gems are automatically routed to the Jewelry Factory to manufacture rings, necklaces, and luxury watches.",
    icon: "💍",
    highlight: "Sell finished jewelry items at the Retail District or upgrade your empire for maximum profit!"
  }
];

export default function TutorialModal({ isOpen, onClose, onSkip }: TutorialModalProps) {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const step = TUTORIAL_STEPS[currentStep];

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
      <motion.div
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border-2 border-cyan-500/60 rounded-3xl p-6 md:p-8 shadow-2xl max-w-lg w-full flex flex-col text-white relative overflow-hidden"
      >
        {/* Top Progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-800">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-300"
            style={{ width: `${((currentStep + 1) / TUTORIAL_STEPS.length) * 100}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-6 pt-2">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{step.icon}</span>
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
                Tutorial Step {currentStep + 1} of {TUTORIAL_STEPS.length}
              </div>
              <h2 className="text-lg md:text-xl font-black">{step.title}</h2>
            </div>
          </div>
          <button
            onClick={onSkip}
            className="text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl transition-all"
          >
            Skip Tutorial
          </button>
        </div>

        {/* Content Box */}
        <div className="bg-slate-950/60 border border-cyan-500/30 rounded-2xl p-5 mb-6 space-y-3 shadow-inner">
          <p className="text-sm md:text-base text-slate-200 leading-relaxed">{step.description}</p>
          <div className="text-xs md:text-sm text-cyan-300 bg-cyan-950/40 p-3 rounded-xl border border-cyan-500/20 flex items-center gap-2">
            <span>💡</span>
            <span className="font-medium">{step.highlight}</span>
          </div>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center justify-between gap-3 mt-auto">
          {currentStep > 0 ? (
            <button
              onClick={handlePrev}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition-all"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={handleNext}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm shadow-lg shadow-cyan-500/25 transition-all active:scale-95 ml-auto"
          >
            {currentStep === TUTORIAL_STEPS.length - 1 ? "Start Mining!" : "Next Step →"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
