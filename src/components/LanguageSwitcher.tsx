import { useLanguage } from "@/i18n/LanguageContext";
import { useEnabledLocales } from "@/i18n/localeConfig";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

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
        <Button
          variant={variant}
          size={size === "icon" ? "sm" : size}
          className={className}
          aria-label={current?.label}
        >
          <span className="flex items-center gap-1.5">
            <span>{current?.flag}</span>
            <span className="text-xs font-medium">{current?.code.toUpperCase()}</span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" data-no-translate className="min-w-[160px] max-h-[320px] overflow-y-auto">
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
