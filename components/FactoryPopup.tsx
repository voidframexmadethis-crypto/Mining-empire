'use client';

import React, { useEffect, useState } from "react";

type FactoryPopupProps = {
  onStartFactory?: () => void;
};

export default function FactoryPopup({
  onStartFactory
}: FactoryPopupProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [command, setCommand] = useState("");
  const [factoryStarted, setFactoryStarted] = useState(false);

  function closePopup() {
    setIsOpen(false);
    setCommand("");
  }

  const startFactory = React.useCallback(() => {
    setFactoryStarted(true);
    closePopup();
    onStartFactory?.();
  }, [onStartFactory]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        closePopup();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    function handleCommand(event: KeyboardEvent) {
      if (event.key !== "Enter") return;

      const active = document.activeElement;
      if (active instanceof HTMLInputElement ||
          active instanceof HTMLTextAreaElement) {
        if (active === document.getElementById("factory-command")) {
          if (command.trim().toUpperCase() === "START FACTORY") {
            startFactory();
          }
        }
        return;
      }

      const typed = command.trim().toUpperCase();
      if (typed === "START FACTORY") {
        startFactory();
      }
    }

    window.addEventListener("keydown", handleCommand);
    return () => window.removeEventListener("keydown", handleCommand);
  }, [command, startFactory]);

  return (
    <>
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={openButton}
        >
          FACTORY TERMINAL
        </button>
      )}

      {isOpen && (
        <div style={overlay}>
          <div style={popup}>
            <button
              aria-label="Close factory window"
              onClick={closePopup}
              style={closeButton}
            >
              ×
            </button>

            <h2 style={{ marginTop: 8, color: "#4ade80" }}>SURFACE GEM FACTORY</h2>
            <p style={{ color: "#aebbc2", fontSize: 14 }}>
              Your surface processing machines are ready for initialization.
            </p>

            <div style={machineList}>
              <div style={machineItem}>• Gem Driller</div>
              <div style={machineItem}>• Gem Crusher</div>
              <div style={machineItem}>• Gem Washer</div>
              <div style={machineItem}>• Gem Compactor</div>
              <div style={machineItem}>• Gem Jam</div>
            </div>

            <label htmlFor="factory-command" style={{ fontSize: 13, color: "#889" }}>
              Type <strong style={{ color: "white" }}>START FACTORY</strong> to initialize systems:
            </label>

            <input
              id="factory-command"
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  command.trim().toUpperCase() === "START FACTORY"
                ) {
                  startFactory();
                }
              }}
              placeholder="START FACTORY"
              style={commandInput}
              autoFocus
            />

            <button
              onClick={startFactory}
              disabled={command.trim().toUpperCase() !== "START FACTORY"}
              style={{
                ...startButton,
                opacity: command.trim().toUpperCase() === "START FACTORY" ? 1 : 0.5,
                cursor: command.trim().toUpperCase() === "START FACTORY" ? "pointer" : "not-allowed"
              }}
            >
              INITIALIZE SYSTEMS
            </button>

            <button
              onClick={closePopup}
              style={secondaryButton}
            >
              CANCEL
            </button>
          </div>
        </div>
      )}

      {factoryStarted && (
        <div style={status}>
          FACTORY ONLINE
        </div>
      )}
    </>
  );
}

const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 10000,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  background: "rgba(0,0,0,0.85)",
  backdropFilter: "blur(4px)",
  padding: 16
};

const popup: React.CSSProperties = {
  position: "relative",
  width: "min(400px, 100%)",
  maxHeight: "85vh",
  overflowY: "auto",
  padding: 32,
  borderRadius: 20,
  background: "#1a1f25",
  color: "white",
  fontFamily: "system-ui, -apple-system, sans-serif",
  boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
  border: "1px solid #303c42"
};

const closeButton: React.CSSProperties = {
  position: "absolute",
  top: 16,
  right: 16,
  width: 32,
  height: 32,
  border: "none",
  borderRadius: "50%",
  background: "#303c42",
  color: "white",
  fontSize: 20,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  cursor: "pointer"
};

const machineList: React.CSSProperties = {
  display: "grid",
  gap: 8,
  margin: "20px 0",
  padding: 16,
  background: "#111820",
  borderRadius: 12,
  border: "1px solid #2b343a"
};

const machineItem: React.CSSProperties = {
  fontSize: 14,
  color: "#94a3b8"
};

const commandInput: React.CSSProperties = {
  display: "block",
  boxSizing: "border-box",
  width: "100%",
  padding: 14,
  marginTop: 10,
  borderRadius: 10,
  border: "2px solid #303c42",
  background: "#0f172a",
  color: "#4ade80",
  fontSize: 16,
  fontWeight: "bold",
  textAlign: "center",
  outline: "none"
};

const startButton: React.CSSProperties = {
  width: "100%",
  padding: 16,
  marginTop: 16,
  border: "none",
  borderRadius: 10,
  background: "#22c55e",
  color: "white",
  fontWeight: "bold",
  fontSize: 15,
  transition: "all 0.2s"
};

const secondaryButton: React.CSSProperties = {
  width: "100%",
  padding: 12,
  marginTop: 10,
  border: "1px solid #303c42",
  borderRadius: 10,
  background: "transparent",
  color: "#94a3b8",
  fontSize: 14,
  cursor: "pointer"
};

const openButton: React.CSSProperties = {
  position: "fixed",
  bottom: 25,
  left: 160, // Shifted to not overlap joystick but still accessible
  zIndex: 1000,
  padding: "12px 20px",
  border: "1px solid #4ade80",
  borderRadius: 10,
  background: "rgba(32, 37, 43, 0.8)",
  color: "#4ade80",
  fontWeight: "bold",
  fontSize: 12,
  cursor: "pointer",
  backdropFilter: "blur(8px)",
  boxShadow: "0 4px 15px rgba(0,0,0,0.3)"
};

const status: React.CSSProperties = {
  position: "fixed",
  bottom: 85, // Above the open button
  left: 160,
  zIndex: 500,
  padding: "8px 16px",
  borderRadius: 8,
  background: "#064e3b",
  color: "#4ade80",
  fontSize: 11,
  fontWeight: "bold",
  pointerEvents: "none",
  border: "1px solid #065f46"
};
