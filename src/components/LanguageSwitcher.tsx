import { Globe } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SUPPORTED_LANGUAGES, type AppLanguage } from "@/i18n/languages";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type LanguageSwitcherProps = {
  variant?: "icon" | "full";
  className?: string;
};

const LanguageSwitcher = ({ variant = "icon", className }: LanguageSwitcherProps) => {
  const { t, i18n } = useTranslation();
  const current = SUPPORTED_LANGUAGES.find((l) => l.code === i18n.language) ?? SUPPORTED_LANGUAGES[0];

  const changeLanguage = async (code: AppLanguage) => {
    await i18n.changeLanguage(code);
    toast.success(t("language.changed"));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={variant === "icon" ? "icon" : "sm"}
          className={cn("shrink-0", className)}
          aria-label={t("language.select")}
        >
          <Globe className="h-5 w-5" />
          {variant === "full" && (
            <span className="ml-2 hidden sm:inline">{current.nativeLabel}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{t("language.label")}</DropdownMenuLabel>
        {SUPPORTED_LANGUAGES.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            onClick={() => void changeLanguage(lang.code)}
            className={cn(i18n.language === lang.code && "bg-muted font-medium")}
          >
            {lang.nativeLabel}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default LanguageSwitcher;
