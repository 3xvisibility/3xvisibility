import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Facebook, Linkedin, Twitter } from "lucide-react";

interface SocialShareButtonsProps {
  url: string;
  title: string;
  description?: string;
  size?: "sm" | "default";
  variant?: "ghost" | "outline";
}

const platforms = [
  {
    name: "Facebook",
    icon: Facebook,
    getUrl: (url: string) =>
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
  },
  {
    name: "LinkedIn",
    icon: Linkedin,
    getUrl: (url: string) =>
      `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
  },
  {
    name: "X (Twitter)",
    icon: Twitter,
    getUrl: (url: string, title: string, description?: string) => {
      const text = description ? `${title} — ${description}` : title;
      return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
    },
  },
] as const;

export default function SocialShareButtons({
  url,
  title,
  description,
  size = "sm",
  variant = "ghost",
}: SocialShareButtonsProps) {
  const openShare = (shareUrl: string) => {
    window.open(shareUrl, "_blank", "width=600,height=400,noopener,noreferrer");
  };

  return (
    <div className="flex gap-1">
      {platforms.map((p) => (
        <Tooltip key={p.name}>
          <TooltipTrigger asChild>
            <Button
              size={size}
              variant={variant}
              className="text-muted-foreground hover:text-foreground"
              onClick={() => openShare(p.getUrl(url, title, description))}
            >
              <p.icon className="h-3 w-3" />
            </Button>
          </TooltipTrigger>
          <TooltipContent className="text-xs">Share on {p.name}</TooltipContent>
        </Tooltip>
      ))}
    </div>
  );
}
