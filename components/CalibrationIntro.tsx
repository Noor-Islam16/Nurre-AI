"use client";

interface Props {
  onBegin: () => void;
  loading?: boolean;
}

export function CalibrationIntro({ onBegin, loading }: Props) {
  return (
    <div className="nuree-card fade-up" style={{ textAlign: "center" }}>
      {/* Waveform icon */}
      <div className="fade-up fade-up-delay-1" style={{ marginBottom: "2rem" }}>
        <WaveformIcon />
      </div>

      <p
        className="nuree-label fade-up fade-up-delay-1"
        style={{ marginBottom: "1rem" }}
      >
        Sound Calibration
      </p>

      <h1
        className="nuree-title fade-up fade-up-delay-2"
        style={{ marginBottom: "1.25rem" }}
      >
        Find your
        <br />
        focus sound
      </h1>

      <p
        className="nuree-body fade-up fade-up-delay-3"
        style={{ maxWidth: "380px", margin: "0 auto 2rem" }}
      >
        This quick calibration helps Nuree generate soundscapes tuned to your
        brain. Five short comparisons — trust your instinct, there are no right
        or wrong answers.
      </p>

      {/* Headphones recommended badge */}
      <div
        className="fade-up fade-up-delay-3"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.5rem 1rem",
          borderRadius: "100px",
          border: "1px solid var(--accent)",
          background: "var(--accent-glow)",
          fontSize: "0.8rem",
          color: "var(--accent)",
          letterSpacing: "0.04em",
          marginBottom: "1.75rem",
        }}
      >
        <HeadphonesIcon />
        Headphones recommended for best results
      </div>

      <div
        className="fade-up fade-up-delay-3"
        style={{
          display: "flex",
          gap: "0.75rem",
          justifyContent: "center",
          flexWrap: "wrap",
          marginBottom: "2.5rem",
        }}
      >
        {["5 pairs", "~3 minutes"].map((tag) => (
          <span
            key={tag}
            style={{
              padding: "0.3rem 0.8rem",
              borderRadius: "100px",
              border: "1px solid var(--border)",
              fontSize: "0.75rem",
              color: "var(--muted)",
              letterSpacing: "0.04em",
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      <div className="fade-up fade-up-delay-4">
        <button
          className="nuree-btn nuree-btn-primary"
          onClick={onBegin}
          disabled={loading}
          style={{
            opacity: loading ? 0.7 : 1,
            cursor: loading ? "wait" : "pointer",
          }}
        >
          {loading ? (
            <>
              <LoadingSpinner />
              Starting…
            </>
          ) : (
            <>
              Begin calibration
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M2 7h10M7 2l5 5-5 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function HeadphonesIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path
        d="M2 9V8a6 6 0 0112 0v1"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <rect x="1" y="9" width="3" height="4" rx="1.5" fill="currentColor" />
      <rect x="12" y="9" width="3" height="4" rx="1.5" fill="currentColor" />
    </svg>
  );
}

function WaveformIcon() {
  return (
    <svg
      width="56"
      height="40"
      viewBox="0 0 56 40"
      fill="none"
      style={{ margin: "0 auto", display: "block" }}
    >
      {[
        { x: 0, h: 12, delay: "0s" },
        { x: 8, h: 24, delay: "0.1s" },
        { x: 16, h: 36, delay: "0.2s" },
        { x: 24, h: 40, delay: "0.15s" },
        { x: 32, h: 28, delay: "0.05s" },
        { x: 40, h: 20, delay: "0.25s" },
        { x: 48, h: 10, delay: "0.1s" },
      ].map((bar, i) => (
        <rect
          key={i}
          x={bar.x}
          y={(40 - bar.h) / 2}
          width="5"
          height={bar.h}
          rx="2.5"
          fill="var(--accent)"
          opacity="0.7"
          style={{
            animation: `barPulse 1.8s ease-in-out infinite alternate`,
            animationDelay: bar.delay,
          }}
        />
      ))}
      <style>{`
        @keyframes barPulse {
          0%   { transform: scaleY(0.5); transform-origin: center; opacity: 0.4; }
          100% { transform: scaleY(1);   transform-origin: center; opacity: 0.9; }
        }
      `}</style>
    </svg>
  );
}

function LoadingSpinner() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      style={{ animation: "spin 0.8s linear infinite" }}
    >
      <circle
        cx="7"
        cy="7"
        r="5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeDasharray="20 12"
        strokeLinecap="round"
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </svg>
  );
}
