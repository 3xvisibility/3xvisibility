/**
 * Compact brand marks used in the pricing comparison table.
 * Simplified, dependency-free SVG glyphs (no external logo assets).
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

export const OpenAIMark = (props: IconProps) => (
  <svg {...base(props)} fill="none">
    <path
      d="M12 3.2c-1.6 0-3 .9-3.7 2.3a4.3 4.3 0 0 0-3 6.3 4.3 4.3 0 0 0 3 6.3 4.3 4.3 0 0 0 7.4 0 4.3 4.3 0 0 0 3-6.3 4.3 4.3 0 0 0-3-6.3A4.2 4.2 0 0 0 12 3.2Z"
      stroke="currentColor"
      strokeWidth="1.4"
    />
    <path d="M12 8.2v7.6M8.6 10.1l6.8 3.8M15.4 10.1l-6.8 3.8" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" />
  </svg>
);

export const GeminiMark = (props: IconProps) => (
  <svg {...base(props)} fill="none">
    <path
      d="M12 2c.4 4.9 5.1 9.6 10 10-4.9.4-9.6 5.1-10 10-.4-4.9-5.1-9.6-10-10C6.9 11.6 11.6 6.9 12 2Z"
      fill="#3B82F6"
    />
  </svg>
);

export const ClaudeMark = (props: IconProps) => (
  <svg {...base(props)} fill="none">
    <g stroke="#D97757" strokeWidth="1.8" strokeLinecap="round">
      <path d="M12 3.5v17M4.5 7.8l15 8.4M19.5 7.8l-15 8.4" />
    </g>
  </svg>
);

export const PerplexityMark = (props: IconProps) => (
  <svg {...base(props)} fill="none">
    <path d="M12 4.2 4.8 9v6L12 19.8 19.2 15V9L12 4.2Z" stroke="#20808D" strokeWidth="1.4" />
    <path d="M12 4.2v15.6M4.8 9 12 12l7.2-3" stroke="#20808D" strokeWidth="1.2" />
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

export const GrokMark = (props: IconProps) => (
  <svg {...base(props)} fill="none">
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.4" />
    <path d="M8 16 16.5 7.5M13 16h3.5v-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export const DeepSeekMark = (props: IconProps) => (
  <svg {...base(props)} fill="none">
    <path
      d="M4 14.5c3.2 2.4 6.2 3.2 9 2.4 2.8-.8 4.6-2.9 5.4-6.3-2 1.7-3.9 2.2-5.6 1.6-1.7-.7-2.5-2.2-2.3-4.6-2.8 1.4-4.6 3.4-5.4 6.1"
      fill="#4D6BFE"
    />
    <circle cx="15.4" cy="8.4" r="1" fill="#fff" />
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

export const MetaMark = (props: IconProps) => (
  <svg {...base(props)} fill="none">
    <path
      d="M3.2 14.6c0-3.6 1.9-7 4.3-7 1.7 0 2.8 1.3 4.5 4.2 1.7 2.9 2.6 4.2 4 4.2 1.3 0 2.1-1.2 2.1-3 0-2.4-1.4-5.4-3.2-5.4-1.4 0-2.6 1.1-3.9 3.2"
      stroke="#0866FF"
      strokeWidth="1.6"
      strokeLinecap="round"
    />
    <path d="M7.5 7.6c-2.4 0-4.3 3.4-4.3 7 0 1.8.8 2.9 2.1 2.9 1.4 0 2.4-1.2 4-4.1" stroke="#0866FF" strokeWidth="1.6" strokeLinecap="round" />
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
  openai: { id: "openai", name: "OpenAI", detail: "GPT-5.x family (Luna, Mini, 5.5, Sol) + GPT-Image", icon: OpenAIMark },
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
