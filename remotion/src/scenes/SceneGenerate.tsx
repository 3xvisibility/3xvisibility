import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { C, FONT_DISPLAY, FONT_BODY } from "../MainVideo";

export const SceneGenerate: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerS = spring({ frame, fps, config: { damping: 20, stiffness: 120 } });
  const headerOp = interpolate(headerS, [0, 1], [0, 1]);

  // Counter animates from 0 to 2,847
  const counterProgress = interpolate(frame, [30, 140], [0, 1], { extrapolateRight: "clamp" });
  const counter = Math.floor(counterProgress * 2847);
  const counterStr = counter.toLocaleString();

  // Progress bar
  const barProgress = interpolate(frame, [30, 140], [0, 100], { extrapolateRight: "clamp" });

  // CSV rows flying into stack
  const rows = Array.from({ length: 8 });

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 80 }}>
      <div style={{ opacity: headerOp, marginBottom: 50, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 14,
              background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: FONT_DISPLAY,
              fontWeight: 700,
              fontSize: 22,
              color: C.bg,
            }}
          >
            03
          </div>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>Generate at Scale</span>
        </div>
        <p style={{ fontFamily: FONT_BODY, fontSize: 22, color: C.muted, textAlign: "center", maxWidth: 800, margin: 0 }}>
          Upload your CSV. Watch unique, SEO-optimized pages appear in real time.
        </p>
      </div>

      {/* Main visualization */}
      <div style={{ display: "flex", gap: 60, alignItems: "center" }}>
        {/* CSV source */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div
            style={{
              width: 180,
              height: 220,
              borderRadius: 14,
              border: `1px solid ${C.border}`,
              background: "rgba(12,19,34,0.85)",
              padding: 18,
              position: "relative",
            }}
          >
            <div style={{ fontFamily: FONT_DISPLAY, fontSize: 14, color: C.accent, fontWeight: 600, marginBottom: 10, letterSpacing: "0.1em" }}>data.csv</div>
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                style={{
                  height: 12,
                  background: i === 0 ? "rgba(59,130,246,0.4)" : "rgba(122,138,166,0.18)",
                  borderRadius: 3,
                  marginBottom: 8,
                  width: `${85 - i * 4}%`,
                }}
              />
            ))}
          </div>
          <span style={{ fontFamily: FONT_BODY, fontSize: 16, color: C.muted }}>2,847 rows</span>
        </div>

        {/* Arrow + processing */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            {Array.from({ length: 5 }).map((_, i) => {
              const pulse = Math.sin((frame - i * 6) / 4) * 0.5 + 0.5;
              return (
                <div
                  key={i}
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    background: C.primary,
                    opacity: 0.3 + pulse * 0.7,
                    boxShadow: `0 0 ${pulse * 14}px ${C.primary}`,
                  }}
                />
              );
            })}
          </div>
          <div
            style={{
              padding: "10px 18px",
              borderRadius: 999,
              border: `1px solid ${C.accent}`,
              background: "rgba(34,211,238,0.08)",
              fontFamily: FONT_DISPLAY,
              fontSize: 16,
              fontWeight: 600,
              color: C.accent,
              letterSpacing: "0.05em",
            }}
          >
            AI Engine
          </div>
        </div>

        {/* Output: stacked pages */}
        <div style={{ position: "relative", width: 280, height: 360 }}>
          {rows.map((_, i) => {
            const delay = 30 + i * 8;
            const s = spring({ frame: frame - delay, fps, config: { damping: 22, stiffness: 130 } });
            const op = interpolate(s, [0, 1], [0, 1]);
            const x = interpolate(s, [0, 1], [-200, i * 6]);
            const y = i * 6;
            return (
              <div
                key={i}
                style={{
                  position: "absolute",
                  top: y,
                  left: 0,
                  width: 240,
                  height: 320,
                  borderRadius: 12,
                  border: `1px solid ${C.border}`,
                  background: "rgba(17,27,48,0.95)",
                  padding: 20,
                  opacity: op,
                  transform: `translateX(${x}px)`,
                  boxShadow: i === rows.length - 1 ? `0 20px 60px rgba(59,130,246,0.25)` : "none",
                  zIndex: i,
                }}
              >
                <div style={{ height: 8, background: C.primary, borderRadius: 2, width: "65%", marginBottom: 12 }} />
                <div style={{ height: 5, background: "rgba(122,138,166,0.3)", borderRadius: 2, width: "90%", marginBottom: 6 }} />
                <div style={{ height: 5, background: "rgba(122,138,166,0.3)", borderRadius: 2, width: "75%", marginBottom: 6 }} />
                <div style={{ height: 5, background: "rgba(122,138,166,0.3)", borderRadius: 2, width: "85%", marginBottom: 18 }} />
                <div style={{ height: 80, background: "rgba(59,130,246,0.10)", borderRadius: 6, marginBottom: 12 }} />
                <div style={{ height: 5, background: "rgba(122,138,166,0.3)", borderRadius: 2, width: "70%", marginBottom: 6 }} />
                <div style={{ height: 5, background: "rgba(122,138,166,0.3)", borderRadius: 2, width: "55%" }} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Live counter */}
      <div style={{ marginTop: 60, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, opacity: headerOp }}>
        <div
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 84,
            fontWeight: 700,
            letterSpacing: "-0.04em",
            background: `linear-gradient(180deg, ${C.text}, ${C.primaryGlow})`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontVariantNumeric: "tabular-nums",
          }}
        >
          {counterStr}
        </div>
        <div style={{ width: 480, height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 999, overflow: "hidden" }}>
          <div
            style={{
              width: `${barProgress}%`,
              height: "100%",
              background: `linear-gradient(90deg, ${C.primary}, ${C.accent})`,
              boxShadow: `0 0 14px ${C.primary}`,
            }}
          />
        </div>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 16, color: C.muted, letterSpacing: "0.18em", textTransform: "uppercase", fontWeight: 500 }}>
          Pages generated
        </span>
      </div>
    </AbsoluteFill>
  );
};
