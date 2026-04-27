import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { C, FONT_DISPLAY, FONT_BODY } from "../MainVideo";

const Stat: React.FC<{ value: string; label: string; delay: number; color?: string }> = ({ value, label, delay, color = C.primaryGlow }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 140 } });
  const op = interpolate(s, [0, 1], [0, 1]);
  const y = interpolate(s, [0, 1], [30, 0]);
  return (
    <div
      style={{
        opacity: op,
        transform: `translateY(${y}px)`,
        padding: "32px 40px",
        borderRadius: 18,
        border: `1px solid ${C.border}`,
        background: "rgba(12,19,34,0.7)",
        textAlign: "center",
        minWidth: 220,
      }}
    >
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 56, fontWeight: 700, letterSpacing: "-0.04em", color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 14, color: C.muted, marginTop: 12, letterSpacing: "0.16em", textTransform: "uppercase", fontWeight: 500 }}>
        {label}
      </div>
    </div>
  );
};

export const ScenePublish: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerS = spring({ frame, fps, config: { damping: 20, stiffness: 120 } });
  const headerOp = interpolate(headerS, [0, 1], [0, 1]);

  // Pulse "Live" indicator
  const livePulse = Math.sin(frame / 6) * 0.3 + 0.7;

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
            04
          </div>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>Publish & Rank</span>
        </div>
        <p style={{ fontFamily: FONT_BODY, fontSize: 22, color: C.muted, textAlign: "center", maxWidth: 800, margin: 0 }}>
          One-click publish. Sitemaps, schema, and Google indexing — handled.
        </p>
      </div>

      {/* Live deployment card */}
      <div
        style={{
          padding: "24px 36px",
          borderRadius: 999,
          border: `1px solid ${C.success}`,
          background: "rgba(52,211,153,0.10)",
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginBottom: 50,
          opacity: headerOp,
        }}
      >
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: "50%",
            background: C.success,
            boxShadow: `0 0 ${10 + livePulse * 14}px ${C.success}`,
            opacity: livePulse,
          }}
        />
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: 600, color: C.success, letterSpacing: "-0.01em" }}>
          Published to yoursite.com — Live now
        </span>
      </div>

      {/* Stats grid */}
      <div style={{ display: "flex", gap: 24, flexWrap: "wrap", justifyContent: "center" }}>
        <Stat value="2,847" label="Pages live" delay={20} />
        <Stat value="98" label="Avg SEO score" delay={32} color={C.success} />
        <Stat value="+340%" label="Traffic boost" delay={44} color={C.accent} />
        <Stat value="< 2 min" label="Setup time" delay={56} />
      </div>
    </AbsoluteFill>
  );
};
