"use client";

import { ReactNode } from "react";

export function CalibrationShell({ children }: { children: ReactNode }) {
  return (
    <div className="nuree-shell">
      {/* Ambient orbs */}
      <div className="orb orb-1" />
      <div className="orb orb-2" />
      <div className="orb orb-3" />
      {/* Grain overlay */}
      <div className="grain" />
      <main className="nuree-main">{children}</main>

      <style>{`
        :root {
          --bg:         #f7f9fa;
          --surface:    #ffffff;
          --border:     rgba(0,0,0,0.08);
          --text:       #111827;
          --muted:      #6b7280;
          --accent:     #059669;
          --accent-glow:rgba(5,150,105,0.10);
          --green:      #059669;
          --blue:       #3b82f6;
          --purple:     #8b5cf6;
        }

        * { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: var(--bg);
          color: var(--text);
          font-family: 'DM Sans', 'Helvetica Neue', sans-serif;
          -webkit-font-smoothing: antialiased;
        }

        .nuree-shell {
          position: relative;
          min-height: 100vh;
          overflow: hidden;
          background: var(--bg);
        }

        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(120px);
          pointer-events: none;
          opacity: 0.18;
          animation: drift 18s ease-in-out infinite alternate;
        }
        .orb-1 {
          width: 600px; height: 600px;
          background: radial-gradient(circle, #a7f3d0 0%, transparent 70%);
          top: -200px; left: -150px;
          animation-delay: 0s;
        }
        .orb-2 {
          width: 500px; height: 500px;
          background: radial-gradient(circle, #d1fae5 0%, transparent 70%);
          bottom: -100px; right: -100px;
          animation-delay: -6s;
        }
        .orb-3 {
          width: 350px; height: 350px;
          background: radial-gradient(circle, #bbf7d0 0%, transparent 70%);
          top: 40%; left: 60%;
          animation-delay: -12s;
        }

        @keyframes drift {
          0%   { transform: translate(0, 0) scale(1); }
          50%  { transform: translate(30px, -20px) scale(1.05); }
          100% { transform: translate(-20px, 30px) scale(0.97); }
        }

        .grain {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 1;
          opacity: 0.015;
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
          background-size: 200px;
        }

        .nuree-main {
          position: relative;
          z-index: 2;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
        }

        /* ── Shared component styles ── */

        .nuree-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 3rem;
          max-width: 580px;
          width: 100%;
          position: relative;
          backdrop-filter: blur(20px);
          box-shadow: 0 1px 4px rgba(0,0,0,0.06);
        }

        .nuree-label {
          font-size: 0.7rem;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          color: var(--muted);
          font-weight: 500;
        }

        .nuree-title {
          font-family: 'Playfair Display', 'Georgia', serif;
          font-size: clamp(2rem, 5vw, 3rem);
          font-weight: 400;
          line-height: 1.15;
          color: var(--text);
          letter-spacing: -0.02em;
        }

        .nuree-body {
          font-size: 0.95rem;
          line-height: 1.75;
          color: var(--muted);
        }

        .nuree-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.85rem 2rem;
          border-radius: 100px;
          font-size: 0.875rem;
          font-weight: 500;
          letter-spacing: 0.04em;
          cursor: pointer;
          transition: all 0.2s ease;
          border: none;
          outline: none;
        }

        .nuree-btn-primary {
          background: #059669;
          color: #ffffff;
        }
        .nuree-btn-primary:hover {
          background: #047857;
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(5,150,105,0.20);
        }

        .nuree-btn-ghost {
          background: transparent;
          color: var(--muted);
          border: 1px solid var(--border);
        }
        .nuree-btn-ghost:hover {
          border-color: rgba(0,0,0,0.18);
          color: var(--text);
        }

        .nuree-progress-bar {
          height: 2px;
          background: var(--border);
          border-radius: 2px;
          overflow: hidden;
        }
        .nuree-progress-fill {
          height: 100%;
          background: var(--accent);
          border-radius: 2px;
          transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-up {
          animation: fadeUp 0.5s ease forwards;
        }
        .fade-up-delay-1 { animation-delay: 0.1s; opacity: 0; }
        .fade-up-delay-2 { animation-delay: 0.2s; opacity: 0; }
        .fade-up-delay-3 { animation-delay: 0.35s; opacity: 0; }
        .fade-up-delay-4 { animation-delay: 0.5s; opacity: 0; }

        @keyframes pulse-ring {
          0%   { transform: scale(0.95); opacity: 0.6; }
          70%  { transform: scale(1.1);  opacity: 0; }
          100% { transform: scale(0.95); opacity: 0; }
        }
      `}</style>
    </div>
  );
}
