/**
 * Brand marks for the AI providers shown in the pricing comparison table.
 * Dependency-free SVG glyphs drawn to match each vendor's official mark/colors.
 */
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = (props: IconProps) => ({
  width: 16,
  height: 16,
  viewBox: "0 0 24 24",
  xmlns: "http://www.w3.org/2000/svg",
  ...props,
});

/** ChatGPT / OpenAI knot */
export const OpenAIMark = (props: IconProps) => (
  <svg {...base(props)} fill="none">
    <path
      d="M21.18 9.83a5.4 5.4 0 0 0-.47-4.44 5.48 5.48 0 0 0-5.9-2.62A5.44 5.44 0 0 0 10.7 1a5.47 5.47 0 0 0-5.22 3.78 5.42 5.42 0 0 0-3.63 2.62 5.47 5.47 0 0 0 .68 6.42 5.4 5.4 0 0 0 .46 4.44 5.48 5.48 0 0 0 5.9 2.62A5.43 5.43 0 0 0 13 23a5.47 5.47 0 0 0 5.22-3.79 5.42 5.42 0 0 0 3.63-2.62 5.47 5.47 0 0 0-.68-6.42Zm-8.17 11.4a4.06 4.06 0 0 1-2.6-.94l.13-.07 4.32-2.49a.7.7 0 0 0 .35-.61v-6.1l1.83 1.06a.07.07 0 0 1 .03.05v5.04a4.08 4.08 0 0 1-4.06 4.06ZM4.28 17.5a4.05 4.05 0 0 1-.49-2.72l.13.08 4.32 2.49a.7.7 0 0 0 .7 0l5.28-3.05v2.11a.07.07 0 0 1-.03.06L9.83 19a4.08 4.08 0 0 1-5.55-1.49ZM3.14 8.1a4.05 4.05 0 0 1 2.12-1.78v5.13a.7.7 0 0 0 .35.6l5.27 3.05-1.83 1.05a.07.07 0 0 1-.06.01L4.62 13.6A4.08 4.08 0 0 1 3.14 8.1Zm15.01 3.49-5.28-3.06 1.83-1.05a.07.07 0 0 1 .07-.01l4.37 2.52a4.06 4.06 0 0 1-.63 7.33v-5.13a.7.7 0 0 0-.36-.6Zm1.82-2.74-.13-.08-4.31-2.5a.7.7 0 0 0-.71 0L9.55 9.32V7.21a.07.07 0 0 1 .03-.06l4.37-2.52a4.06 4.06 0 0 1 6.02 4.22ZM8.55 12.6l-1.83-1.05a.07.07 0 0 1-.04-.05V6.46a4.06 4.06 0 0 1 6.66-3.12l-.13.08-4.32 2.49a.7.7 0 0 0-.35.6l-.01 6.09Zm1-2.14L11.93 9l2.38 1.37v2.75l-2.38 1.37-2.38-1.37v-2.75Z"
      fill="currentColor"
    />
  </svg>
);

/** Google Gemini spark */
export const GeminiMark = (props: IconProps) => (
  <svg {...base(props)} fill="none">
    <defs>
      <linearGradient id="gemini-g" x1="2" y1="22" x2="22" y2="2" gradientUnits="userSpaceOnUse">
        <stop stopColor="#1C7DFF" />
        <stop offset="0.52" stopColor="#1C69FF" />
        <stop offset="1" stopColor="#F0DCD6" />
      </linearGradient>
    </defs>
    <path
      d="M12 2c.4 4.9 5.1 9.6 10 10-4.9.4-9.6 5.1-10 10-.4-4.9-5.1-9.6-10-10C6.9 11.6 11.6 6.9 12 2Z"
      fill="url(#gemini-g)"
    />
  </svg>
);

/** Anthropic Claude asterisk */
export const ClaudeMark = (props: IconProps) => (
  <svg {...base(props)} fill="none">
    <g stroke="#D97757" strokeWidth="2.1" strokeLinecap="round">
      <path d="M12 4v16M5.1 8l13.8 8M18.9 8 5.1 16" />
    </g>
  </svg>
);

/** Perplexity mark */
export const PerplexityMark = (props: IconProps) => (
  <svg {...base(props)} fill="none">
    <g stroke="#20808D" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.2 5.6 8.1v3.3M12 3.2l6.4 4.9v3.3" />
      <path d="M4.2 8.1h15.6M12 8.1v12.7" />
      <path d="M8.6 8.1v4.6c0 1.4 1.1 2.5 2.5 2.5h1.8c1.4 0 2.5-1.1 2.5-2.5V8.1" />
    </g>
  </svg>
);

export const GoogleMark = (props: IconProps) => (
  <svg {...base(props)} fill="none">
    <path d="M21 12.2c0-.7-.1-1.3-.2-1.9H12v3.7h5.1a4.4 4.4 0 0 1-1.9 2.9v2.4h3.1c1.8-1.7 2.7-4.2 2.7-7.1Z" fill="#4285F4" />
    <path d="M12 21.5c2.5 0 4.6-.8 6.2-2.2l-3.1-2.4c-.8.6-1.9.9-3.1.9-2.4 0-4.5-1.6-5.2-3.8H3.6v2.4A9.5 9.5 0 0 0 12 21.5Z" fill="#34A853" />
    <path d="M6.8 14a5.7 5.7 0 0 1 0-3.6V8H3.6a9.5 9.5 0 0 0 0 8.4L6.8 14Z" fill="#FBBC05" />
    <path d="M12 6.4c1.4 0 2.6.5 3.5 1.4l2.6-2.6A9.2 9.2 0 0 0 12 2.5 9.5 9.5 0 0 0 3.6 8l3.2 2.4C7.5 8.1 9.6 6.4 12 6.4Z" fill="#EA4335" />
  </svg>
);

/** xAI Grok */
export const GrokMark = (props: IconProps) => (
  <svg {...base(props)} fill="none">
    <path d="M6 19 17 5M9.8 19 20 5.4M4 14.6 12.4 3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

/** DeepSeek whale */
export const DeepSeekMark = (props: IconProps) => (
  <svg {...base(props)} fill="none">
    <path
      d="M21.4 5.6c-.4-.2-.6.1-.8.3-.1.1-.2.2-.3.4-.5.6-1.2.9-2 .9-1.1-.1-2.1.3-3 1.2-.2-1.1-.8-1.8-1.7-2.4-.5-.3-1-.6-1.4-1-.2-.2-.5-.5-.2-.9.1-.1.1-.3 0-.4-.3-.4-.7-.2-1 0-.6.4-.8 1-.7 1.7.1 1.6 1.3 2.5 2.6 3.4.1.1.3.2.3.4-.1.4-.3.8-.4 1.2-.1.3-.2.2-.4.1-.7-.4-1.3-.9-1.8-1.6-.9-1.2-1.7-2.5-2.7-3.6-.2-.3-.5-.5-.8-.7-.6-.6-1.3-.2-1.4.6-.1.9.3 1.7.7 2.4 1.1 1.9 2.5 3.6 4 5.1.2.2.3.4.2.7-.4 1-.5 2.1-.4 3.2 0 .5.1.9.3 1.3.2.4.5.5.9.4.7-.2 1.3-.6 1.6-1.3.4-.8.4-1.6.2-2.4-.1-.3 0-.4.3-.5 1.4-.4 2.6-1.2 3.4-2.4.6-.9.9-1.9.9-3 0-.7.2-1.2.7-1.6.4-.3.7-.7 1-1.1.2-.3.2-.5-.1-.4Z"
      fill="#4D6BFE"
    />
    <circle cx="16.2" cy="9.4" r=".8" fill="#fff" />
  </svg>
);

export const MistralMark = (props: IconProps) => (
  <svg {...base(props)} fill="none">
    <rect x="3" y="5" width="3.6" height="14" fill="#FFD800" />
    <rect x="8.2" y="5" width="3.6" height="7" fill="#FF8205" />
    <rect x="13.4" y="5" width="3.6" height="14" fill="#FA500F" />
    <rect x="18" y="5" width="3" height="7" fill="#E10500" />
  </svg>
);

export const CopilotMark = (props: IconProps) => (
  <svg {...base(props)} fill="none">
    <path
      d="M5 13.5c0-3.6 2.6-6.3 6.2-6.3h1.6c3.6 0 6.2 2.7 6.2 6.3 0 2.2-1.4 3.6-3.6 3.6H8.6C6.4 17.1 5 15.7 5 13.5Z"
      stroke="#0EA5E9"
      strokeWidth="1.5"
    />
    <path d="M9.5 12.5v1.4M14.5 12.5v1.4" stroke="#0EA5E9" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

/** Meta infinity mark */
export const MetaMark = (props: IconProps) => (
  <svg {...base(props)} fill="none">
    <path
      d="M3 14.4c0-3.3 1.7-6.6 4-6.6 1.4 0 2.4.9 4 3.5l1 1.6c1.6 2.6 2.5 3.5 3.9 3.5 1.7 0 2.6-1.5 2.6-3.7 0-2.9-1.3-6-3.4-6-1.7 0-3.1 1.2-4.7 3.8"
      stroke="#0866FF"
      strokeWidth="1.9"
      strokeLinecap="round"
    />
    <path
      d="M7 7.8c-2.3 0-4 3.3-4 6.6 0 2 .9 3.2 2.3 3.2 1.5 0 2.6-1.1 4.4-4"
      stroke="#0081FB"
      strokeWidth="1.9"
      strokeLinecap="round"
    />
  </svg>
);

export interface BrandModel {
  id: string;
  name: string;
  /** Full tooltip description */
  detail: string;
  icon: (props: IconProps) => JSX.Element;
}

export const BRANDS = {
  openai: { id: "openai", name: "ChatGPT (OpenAI)", detail: "GPT-5.x family (Luna, Mini, 5.5, Sol) + GPT-Image", icon: OpenAIMark },
  gemini: { id: "gemini", name: "Gemini", detail: "Gemini 3.x Flash / Flash Lite / Pro", icon: GeminiMark },
  google: { id: "google", name: "Google AI", detail: "Nano Banana 2 & Gemini 3 Pro Image generation", icon: GoogleMark },
  claude: { id: "claude", name: "Claude", detail: "Anthropic Claude via your own API key", icon: ClaudeMark },
  perplexity: { id: "perplexity", name: "Perplexity", detail: "Perplexity research models via your own API key", icon: PerplexityMark },
  grok: { id: "grok", name: "Grok", detail: "xAI Grok via your own API key", icon: GrokMark },
  deepseek: { id: "deepseek", name: "DeepSeek", detail: "DeepSeek chat & reasoning via your own API key", icon: DeepSeekMark },
  mistral: { id: "mistral", name: "Mistral", detail: "Mistral models via your own API key", icon: MistralMark },
  copilot: { id: "copilot", name: "Copilot", detail: "Microsoft/Azure OpenAI endpoints via your own API key", icon: CopilotMark },
  meta: { id: "meta", name: "Meta Llama", detail: "Llama models via your own API key", icon: MetaMark },
} satisfies Record<string, BrandModel>;
