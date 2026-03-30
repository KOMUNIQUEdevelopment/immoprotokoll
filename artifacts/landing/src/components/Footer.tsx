import { Link } from "wouter";
import { useLanguage } from "../i18n";
import { useLocation } from "wouter";

export default function Footer() {
  const { lang, t } = useLanguage();
  const [, setLocation] = useLocation();

  const toggleLang = () => {
    const newLang = lang === "de" ? "en" : "de";
    // basic toggle logic
    setLocation(`/${newLang}`);
  };

  return (
    <footer className="border-t border-black/10 bg-white py-12">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <Link href={`/${lang}`} className="flex items-center mb-2">
              <img src="/immoprotokoll-logo.png" alt="ImmoProtokoll" className="h-8" />
            </Link>
            <p className="text-sm mt-2 text-black/60 max-w-xs">
              {lang === "de" 
                ? "Jede Mietübergabe. Sauber dokumentiert." 
                : "Every rental handover. Cleanly documented."}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 text-sm font-medium">
            <Link href={lang === "de" ? "/de/datenschutz" : "/en/privacy"} className="hover:underline">
              {t.footer.privacy}
            </Link>
            <Link href={lang === "de" ? "/de/agb" : "/en/terms"} className="hover:underline">
              {t.footer.terms}
            </Link>
            <Link href={lang === "de" ? "/de/impressum" : "/en/imprint"} className="hover:underline">
              {t.footer.imprint}
            </Link>
          </div>
        </div>
        
        <div className="mt-12 pt-6 border-t border-black/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-black/60">
          <p>{t.footer.copyright}</p>
          <button onClick={toggleLang} className="hover:text-black transition-colors font-bold uppercase">
            {lang === "de" ? "DE / en" : "de / EN"}
          </button>
        </div>
      </div>
    </footer>
  );
}
