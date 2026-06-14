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

// Map our locale codes to ISO 3166-1 alpha-2 country codes for flag images.
// Flag emoji render inconsistently across OSes (Windows shows them as plain
// letters like "PT"), so we use real flag images instead — they always render
// correctly and stay in sync with the selected language.
const COUNTRY_BY_LANG: Record<string, string> = {
  en: "gb",
  fr: "fr",
  de: "de",
  es: "es",
  it: "it",
  pt: "pt",
  nl: "nl",
  pl: "pl",
};

function Flag({ code, label }: { code: string; label?: string }) {
  const country = COUNTRY_BY_LANG[code] ?? code;
  return (
    <img
      src={`https://flagcdn.com/${country}.svg`}
      alt={label ? `${label} flag` : `${code} flag`}
      width={20}
      height={15}
      loading="lazy"
      className="h-[15px] w-[20px] rounded-[2px] object-cover shrink-0 ring-1 ring-black/10"
    />
  );
}

export function LanguageSwitcher({ variant = "ghost", size = "icon", className }: LanguageSwitcherProps) {
  const { language, setLanguage } = useLanguage();
  const languages = useEnabledLocales();
  const current = languages.find((l) => l.code === language);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant}
          size={size === "icon" ? "sm" : size}
          className={className}
          aria-label={current?.label}
          data-no-translate
          translate="no"
        >
          <span className="flex items-center gap-1.5" data-no-translate translate="no">
            {current && <Flag code={current.code} label={current.label} />}
            <span className="text-xs font-medium">{current?.code.toUpperCase()}</span>
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" data-no-translate className="min-w-[180px] max-h-[320px] overflow-y-auto">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => setLanguage(lang.code)}
            data-no-translate
            translate="no"
            className={`flex items-center gap-2 text-sm ${
              language === lang.code ? "bg-accent font-medium" : ""
            }`}
          >
            <Flag code={lang.code} label={lang.label} />
            <span>{lang.label}</span>
            <span className="ml-auto text-[10px] font-semibold opacity-60">{lang.code.toUpperCase()}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
