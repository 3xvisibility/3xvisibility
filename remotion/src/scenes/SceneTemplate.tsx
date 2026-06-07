import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { C, FONT_DISPLAY, FONT_BODY } from "../MainVideo";

const Token: React.FC<{ text: string; isVar?: boolean; delay: number }> = ({ text, isVar, delay }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 200 } });
  const op = interpolate(s, [0, 1], [0, 1]);
  const y = interpolate(s, [0, 1], [10, 0]);
  return (
    <span
      style={{
        opacity: op,
        transform: `translateY(${y}px)`,
        display: "inline-block",
        color: isVar ? C.primaryGlow : C.text,
        background: isVar ? "rgba(94,218,12,0.15)" : "transparent",
        padding: isVar ? "2px 10px" : "0",
        borderRadius: isVar ? 6 : 0,
        marginRight: 8,
        fontWeight: isVar ? 600 : 400,
      }}
    >
      {text}
    </span>
  );
};

export const SceneTemplate: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerS = spring({ frame, fps, config: { damping: 20, stiffness: 120 } });
  const headerOp = interpolate(headerS, [0, 1], [0, 1]);

  const cardS = spring({ frame: frame - 18, fps, config: { damping: 22, stiffness: 130 } });
  const cardOp = interpolate(cardS, [0, 1], [0, 1]);
  const cardY = interpolate(cardS, [0, 1], [40, 0]);

  // Variables panel
  const variables = ["{city}", "{service}", "{price}", "{phone}"];

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
            02
          </div>
          <span style={{ fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>Design Your Template</span>
        </div>
        <p style={{ fontFamily: FONT_BODY, fontSize: 22, color: C.muted, textAlign: "center", maxWidth: 700, margin: 0 }}>
          Use AI or import any page — variables are detected automatically.
        </p>
      </div>

      <div style={{ display: "flex", gap: 32, opacity: cardOp, transform: `translateY(${cardY}px)`, alignItems: "stretch" }}>
        {/* Template editor card */}
        <div
          style={{
            width: 720,
            borderRadius: 18,
            border: `1px solid ${C.border}`,
            background: "rgba(12,19,34,0.85)",
            overflow: "hidden",
          }}
        >
          <div style={{ padding: "16px 22px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FF5F57" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#FEBC2E" }} />
            <div style={{ width: 12, height: 12, borderRadius: "50%", background: "#28C840" }} />
            <span style={{ marginLeft: 12, fontFamily: FONT_BODY, fontSize: 14, color: C.muted }}>template-editor.html</span>
          </div>
          <div style={{ padding: 36, fontFamily: FONT_BODY, fontSize: 26, lineHeight: 1.7 }}>
            <div>
              <Token text="Best" delay={28} />
              <Token text="{service}" isVar delay={36} />
              <Token text="in" delay={44} />
              <Token text="{city}" isVar delay={52} />
            </div>
            <div style={{ marginTop: 18, fontSize: 18, color: C.muted }}>
              <Token text="Get a free quote starting at" delay={62} />
              <Token text="{price}" isVar delay={74} />
            </div>
            <div style={{ marginTop: 18, fontSize: 18, color: C.muted }}>
              <Token text="Call" delay={84} />
              <Token text="{phone}" isVar delay={92} />
              <Token text="today." delay={100} />
            </div>
          </div>
        </div>

        {/* Variables panel */}
        <div
          style={{
            width: 320,
            borderRadius: 18,
            border: `1px solid ${C.border}`,
            background: "rgba(12,19,34,0.85)",
            padding: 24,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20 }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.accent, boxShadow: `0 0 10px ${C.accent}` }} />
            <span style={{ fontFamily: FONT_DISPLAY, fontSize: 16, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: C.accent }}>
              Detected
            </span>
          </div>
          {variables.map((v, i) => {
            const s = spring({ frame: frame - (35 + i * 14), fps, config: { damping: 16, stiffness: 180 } });
            const op = interpolate(s, [0, 1], [0, 1]);
            const x = interpolate(s, [0, 1], [-20, 0]);
            return (
              <div
                key={v}
                style={{
                  padding: "14px 16px",
                  borderRadius: 10,
                  background: "rgba(94,218,12,0.10)",
                  border: `1px solid rgba(94,218,12,0.2)`,
                  marginBottom: 10,
                  fontFamily: "monospace",
                  fontSize: 18,
                  color: C.primaryGlow,
                  opacity: op,
                  transform: `translateX(${x}px)`,
                  fontWeight: 600,
                }}
              >
                {v}
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
