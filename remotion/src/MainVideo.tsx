import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadSpace } from "@remotion/google-fonts/SpaceGrotesk";

import { SceneIntro } from "./scenes/SceneIntro";
import { SceneConnect } from "./scenes/SceneConnect";
import { SceneTemplate } from "./scenes/SceneTemplate";
import { SceneGenerate } from "./scenes/SceneGenerate";
import { ScenePublish } from "./scenes/ScenePublish";
import { SceneOutro } from "./scenes/SceneOutro";

const inter = loadInter("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });
const space = loadSpace("normal", { weights: ["400", "500", "600", "700"], subsets: ["latin"] });

export const FONT_BODY = inter.fontFamily;
export const FONT_DISPLAY = space.fontFamily;

// Palette
export const C = {
  bg: "#070B14",
  bgSoft: "#0C1322",
  card: "#111B30",
  border: "rgba(140,247,69,0.20)",
  primary: "#5EDA0C",
  primaryGlow: "#8CF745",
  accent: "#9EF54A",
  text: "#E6EDF7",
  muted: "#7A8AA6",
  success: "#34D399",
};

const PersistentBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const drift = Math.sin(frame / 80) * 30;
  const drift2 = Math.cos(frame / 110) * 40;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      {/* Radial gradients */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: `radial-gradient(circle at ${30 + drift}% ${20 + drift2}%, rgba(59,130,246,0.18), transparent 50%), radial-gradient(circle at ${70 - drift}% ${80 - drift2}%, rgba(34,211,238,0.10), transparent 55%)`,
        }}
      />
      {/* Subtle grid */}
      <svg width={width} height={height} style={{ position: "absolute", inset: 0, opacity: 0.06 }}>
        <defs>
          <pattern id="grid" width="80" height="80" patternUnits="userSpaceOnUse">
            <path d="M 80 0 L 0 0 0 80" fill="none" stroke="#60A5FA" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>
      {/* Drifting orbs */}
      <div
        style={{
          position: "absolute",
          width: 400,
          height: 400,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(59,130,246,0.15), transparent 70%)",
          top: 100 + drift,
          right: 200 + drift2,
          filter: "blur(40px)",
        }}
      />
    </AbsoluteFill>
  );
};

const PersistentChrome: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const opacity = interpolate(frame, [10, 30, durationInFrames - 60, durationInFrames - 30], [0, 1, 1, 0], { extrapolateRight: "clamp" });
  const progress = interpolate(frame, [30, durationInFrames - 30], [0, 1], { extrapolateRight: "clamp" });
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity }}>
      {/* Top bar with logo */}
      <div style={{ position: "absolute", top: 40, left: 60, display: "flex", alignItems: "center", gap: 14, fontFamily: FONT_DISPLAY }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: `linear-gradient(135deg, ${C.primary}, ${C.accent})`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            boxShadow: `0 0 20px ${C.primary}88`,
          }}
        >
          <div style={{ width: 16, height: 16, borderRadius: 4, background: C.bg }} />
        </div>
        <span style={{ color: C.text, fontWeight: 700, letterSpacing: "-0.02em", fontSize: 20 }}>3XVISIBILITY</span>
      </div>
      {/* Bottom progress bar */}
      <div style={{ position: "absolute", bottom: 30, left: 60, right: 60, height: 2, background: "rgba(255,255,255,0.06)", borderRadius: 999 }}>
        <div
          style={{
            width: `${progress * 100}%`,
            height: "100%",
            background: `linear-gradient(90deg, ${C.primary}, ${C.accent})`,
            borderRadius: 999,
            boxShadow: `0 0 12px ${C.primary}`,
          }}
        />
      </div>
    </AbsoluteFill>
  );
};

export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ fontFamily: FONT_BODY, color: C.text }}>
      <PersistentBackground />
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={110}>
          <SceneIntro />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 18 })} />

        <TransitionSeries.Sequence durationInFrames={140}>
          <SceneConnect />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: 24 })} />

        <TransitionSeries.Sequence durationInFrames={150}>
          <SceneTemplate />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: 24 })} />

        <TransitionSeries.Sequence durationInFrames={160}>
          <SceneGenerate />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={slide({ direction: "from-right" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: 24 })} />

        <TransitionSeries.Sequence durationInFrames={140}>
          <ScenePublish />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: 18 })} />

        <TransitionSeries.Sequence durationInFrames={130}>
          <SceneOutro />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      <PersistentChrome />
    </AbsoluteFill>
  );
};
