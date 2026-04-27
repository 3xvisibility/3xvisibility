import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { C, FONT_DISPLAY, FONT_BODY } from "../MainVideo";

const StepBadge: React.FC<{ num: string; label: string; opacity: number }> = ({ num, label, opacity }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, opacity }}>
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
      {num}
    </div>
    <span style={{ fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>{label}</span>
  </div>
);

const PlatformCard: React.FC<{ name: string; icon: string; color: string; delay: number; selected?: boolean }> = ({ name, icon, color, delay, selected }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 140 } });
  const y = interpolate(s, [0, 1], [30, 0]);
  const op = interpolate(s, [0, 1], [0, 1]);
  const selectGlow = selected ? interpolate(frame, [80, 110], [0, 1], { extrapolateRight: "clamp" }) : 0;

  return (
    <div
      style={{
        padding: 28,
        borderRadius: 18,
        border: `1px solid ${selected ? C.primary : C.border}`,
        background: selected ? "rgba(59,130,246,0.10)" : "rgba(17,27,48,0.6)",
        backdropFilter: "blur(0px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
        transform: `translateY(${y}px)`,
        opacity: op,
        boxShadow: selected ? `0 0 ${30 + selectGlow * 30}px rgba(59,130,246,${0.2 + selectGlow * 0.3})` : "none",
        transition: "none",
        minWidth: 200,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          background: color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 32,
          fontWeight: 700,
          color: "#fff",
          fontFamily: FONT_DISPLAY,
        }}
      >
        {icon}
      </div>
      <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 600, fontSize: 22 }}>{name}</span>
    </div>
  );
};

export const SceneConnect: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerS = spring({ frame, fps, config: { damping: 20, stiffness: 120 } });
  const headerOp = interpolate(headerS, [0, 1], [0, 1]);
  const headerY = interpolate(headerS, [0, 1], [-20, 0]);

  const checkS = spring({ frame: frame - 95, fps, config: { damping: 14, stiffness: 200 } });
  const checkScale = interpolate(checkS, [0, 1], [0, 1]);

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 80 }}>
      <div style={{ transform: `translateY(${headerY}px)`, opacity: headerOp, marginBottom: 60, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <StepBadge num="01" label="Connect Your Website" opacity={1} />
        <p style={{ fontFamily: FONT_BODY, fontSize: 22, color: C.muted, textAlign: "center", maxWidth: 700, margin: 0 }}>
          WordPress, Shopify, WooCommerce, PrestaShop — link in seconds.
        </p>
      </div>
      <div style={{ display: "flex", gap: 28 }}>
        <PlatformCard name="WordPress" icon="W" color="#21759B" delay={20} selected />
        <PlatformCard name="Shopify" icon="S" color="#95BF47" delay={32} />
        <PlatformCard name="WooCommerce" icon="W" color="#7F54B3" delay={44} />
        <PlatformCard name="PrestaShop" icon="P" color="#DF0067" delay={56} />
      </div>
      {/* Connection check */}
      <div style={{ marginTop: 50, display: "flex", alignItems: "center", gap: 14, transform: `scale(${checkScale})`, opacity: checkScale }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: "50%",
            background: C.success,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 20px ${C.success}`,
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={C.bg} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <span style={{ fontFamily: FONT_DISPLAY, fontSize: 24, color: C.success, fontWeight: 600 }}>Connection successful</span>
      </div>
    </AbsoluteFill>
  );
};
