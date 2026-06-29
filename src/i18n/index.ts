import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { tr as trTranslation, en as enTranslation, de as deTranslation, fr as frTranslation, ar as arTranslation } from "./loadLocale";
import { DEFAULT_LANGUAGE, FALLBACK_LANGUAGE, getLanguageMeta } from "./languages";

function applyDocumentLanguage(lng: string) {
  const meta = getLanguageMeta(lng);
  document.documentElement.lang = lng;
  document.documentElement.dir = meta.dir;
}

void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      tr: { translation: trTranslation },
      en: { translation: enTranslation },
      de: { translation: deTranslation },
      fr: { translation: frTranslation },
      ar: { translation: arTranslation },
    },
    fallbackLng: FALLBACK_LANGUAGE,
    supportedLngs: ["tr", "en", "de", "fr", "ar"],
    defaultNS: "translation",
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "rideyo_language",
    },
  })
  .then(() => {
    applyDocumentLanguage(i18n.language || DEFAULT_LANGUAGE);
  });

i18n.on("languageChanged", applyDocumentLanguage);

export default i18n;
