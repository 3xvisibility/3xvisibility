import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { C, FONT_DISPLAY, FONT_BODY } from "../MainVideo";

export const SceneIntro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const titleSpring = spring({ frame: frame - 12, fps, config: { damping: 20, stiffness: 120 } });
  const titleY = interpolate(titleSpring, [0, 1], [40, 0]);
  const titleOp = interpolate(titleSpring, [0, 1], [0, 1]);

  const subSpring = spring({ frame: frame - 28, fps, config: { damping: 20, stiffness: 120 } });
  const subOp = interpolate(subSpring, [0, 1], [0, 1]);

  const eyebrowOp = interpolate(frame, [0, 18], [0, 1], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center", maxWidth: 1400, padding: 40 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "8px 18px",
            borderRadius: 999,
            border: `1px solid ${C.border}`,
            background: "rgba(94,218,12,0.06)",
            fontSize: 16,
            color: C.primaryGlow,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            fontWeight: 500,
            opacity: eyebrowOp,
            marginBottom: 36,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: C.success, boxShadow: `0 0 12px ${C.success}` }} />
          How 3XVISIBILITY Works
        </div>
        <h1
          style={{
            fontFamily: FONT_DISPLAY,
            fontSize: 168,
            fontWeight: 700,
            letterSpacing: "-0.045em",
            lineHeight: 0.95,
            margin: 0,
            transform: `translateY(${titleY}px)`,
            opacity: titleOp,
            background: `linear-gradient(180deg, ${C.text} 0%, ${C.primaryGlow} 100%)`,
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          From CSV
          <br />
          to thousands of pages.
        </h1>
        <p
          style={{
            fontFamily: FONT_BODY,
            fontSize: 30,
            color: C.muted,
            marginTop: 36,
            opacity: subOp,
            fontWeight: 400,
          }}
        >
          AI-powered SEO page generation in four simple steps.
        </p>
      </div>
    </AbsoluteFill>
  );
};
