import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { translations, Language } from "./translations";

interface LanguageContextType {
  lang: Language;
  setLang: (lang: Language) => void;
  t: typeof translations.en;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children, initialLang }: { children: ReactNode, initialLang?: Language }) {
  const [lang, setLang] = useState<Language>(initialLang || "en");

  useEffect(() => {
    if (!initialLang) {
      const browserLang = navigator.language.toLowerCase();
      if (browserLang.startsWith("de")) {
        setLang("de");
      }
    }
  }, [initialLang]);

  const value = {
    lang,
    setLang,
    t: translations[lang]
  };

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
