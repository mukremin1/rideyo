export const SUPPORTED_LANGUAGES = [
  { code: "tr", label: "Türkçe", nativeLabel: "Türkçe", dir: "ltr" as const },
  { code: "en", label: "English", nativeLabel: "English", dir: "ltr" as const },
  { code: "de", label: "German", nativeLabel: "Deutsch", dir: "ltr" as const },
  { code: "fr", label: "French", nativeLabel: "Français", dir: "ltr" as const },
  { code: "ar", label: "Arabic", nativeLabel: "العربية", dir: "rtl" as const },
] as const;

export type AppLanguage = (typeof SUPPORTED_LANGUAGES)[number]["code"];

export const DEFAULT_LANGUAGE: AppLanguage = "tr";
export const FALLBACK_LANGUAGE: AppLanguage = "en";

export function getLanguageMeta(code: string) {
  return SUPPORTED_LANGUAGES.find((l) => l.code === code) ?? SUPPORTED_LANGUAGES[0];
}
