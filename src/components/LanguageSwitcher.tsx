import { useLanguage } from "@/i18n/LanguageContext";
import { languages } from "@/i18n/translations";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Globe } from "lucide-react";

interface LanguageSwitcherProps {
  variant?: "ghost" | "outline";
  size?: "sm" | "icon";
  className?: string;
}

export function LanguageSwitcher({ variant = "ghost", size = "icon", className }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();
  const current = languages.find((l) => l.code === language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant={variant} size={size} className={className}>
          {size === "icon" ? (
            <Globe className="h-3.5 w-3.5" />
          ) : (
            <span className="flex items-center gap-1.5">
              <span>{current?.flag}</span>
              <span className="text-xs">{current?.code.toUpperCase()}</span>
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[160px] max-h-[320px] overflow-y-auto">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            className={`flex items-center gap-2 text-sm ${
              language === lang.code ? "bg-accent font-medium" : ""
            }`}
          >
            <span>{lang.flag}</span>
            <span>{lang.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
