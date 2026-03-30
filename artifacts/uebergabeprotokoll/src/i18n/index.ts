import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import deCH from "./de-CH";
import deDE from "./de-DE";
import en from "./en";

export type SupportedLanguage = "de-CH" | "de-DE" | "en";

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = ["de-CH", "de-DE", "en"];

export const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  "de-CH": "Deutsch (Schweiz)",
  "de-DE": "Deutsch (Deutschland)",
  "en": "English",
};

i18n.use(initReactI18next).init({
  resources: {
    "de-CH": { translation: deCH },
    "de-DE": { translation: deDE },
    "en": { translation: en },
  },
  lng: "de-CH",
  fallbackLng: "de-CH",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;

export function setLanguage(lang: string) {
  const resolved = SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage)
    ? (lang as SupportedLanguage)
    : "de-CH";
  i18n.changeLanguage(resolved);
}

export function getTranslations(lang: SupportedLanguage = "de-CH") {
  const resources = i18n.getResourceBundle(lang, "translation");
  return resources ?? i18n.getResourceBundle("de-CH", "translation");
}
