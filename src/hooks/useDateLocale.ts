import { useTranslation } from "react-i18next";
import { ar, de, enUS, fr, tr } from "date-fns/locale";
import type { Locale } from "date-fns";
import type { AppLanguage } from "@/i18n/languages";

const DATE_LOCALES: Record<AppLanguage, Locale> = {
  tr,
  en: enUS,
  de,
  fr,
  ar,
};

export function useDateLocale(): Locale {
  const { i18n } = useTranslation();
  const code = (i18n.language?.split("-")[0] ?? "tr") as AppLanguage;
  return DATE_LOCALES[code] ?? enUS;
}
