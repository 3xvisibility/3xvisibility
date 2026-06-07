import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Img, staticFile } from "remotion";
import { C, FONT_DISPLAY, FONT_BODY } from "../MainVideo";

export const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleS = spring({ frame: frame - 8, fps, config: { damping: 22, stiffness: 110 } });
  const titleOp = interpolate(titleS, [0, 1], [0, 1]);
  const titleY = interpolate(titleS, [0, 1], [30, 0]);

  const urlS = spring({ frame: frame - 36, fps, config: { damping: 20, stiffness: 130 } });
  const urlOp = interpolate(urlS, [0, 1], [0, 1]);

  const logoS = spring({ frame, fps, config: { damping: 18, stiffness: 120 } });
  const logoScale = interpolate(logoS, [0, 1], [0.6, 1]);

  return (
    <AbsoluteFill style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 80 }}>
      {/* Big logo mark */}
      <div
        style={{
          width: 140,
          height: 140,
          borderRadius: 32,
          background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 50,
          transform: `scale(${logoScale})`,
          boxShadow: `0 20px 60px rgba(94,218,12,0.45)`,
        }}
      >
        <div style={{ width: 56, height: 56, borderRadius: 14, background: C.bg }} />
      </div>

      <h2
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: 140,
          fontWeight: 700,
          letterSpacing: "-0.045em",
          margin: 0,
          textAlign: "center",
          lineHeight: 0.95,
          opacity: titleOp,
          transform: `translateY(${titleY}px)`,
          background: `linear-gradient(180deg, ${C.text} 0%, ${C.primaryGlow} 100%)`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
        }}
      >
        Build smarter.
        <br />
        Rank faster.
      </h2>

      <div
        style={{
          marginTop: 50,
          padding: "16px 32px",
          borderRadius: 999,
          border: `1px solid ${C.border}`,
          background: "rgba(94,218,12,0.06)",
          fontFamily: FONT_DISPLAY,
          fontSize: 28,
          color: C.primaryGlow,
          fontWeight: 500,
          letterSpacing: "-0.01em",
          opacity: urlOp,
        }}
      >
        3xvisibility.com
      </div>
    </AbsoluteFill>
  );
};
