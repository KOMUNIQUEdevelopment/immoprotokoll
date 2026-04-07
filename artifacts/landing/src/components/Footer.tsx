import { Link } from "wouter";
import { useLanguage } from "../i18n";
import { useLocation } from "wouter";

const DE_TO_EN: Record<string, string> = {
  "/": "/en",
  "/datenschutz": "/en/privacy",
  "/agb": "/en/terms",
  "/impressum": "/en/imprint",
};

const EN_TO_DE: Record<string, string> = {
  "/en": "/",
  "/en/privacy": "/datenschutz",
  "/en/terms": "/agb",
  "/en/imprint": "/impressum",
};

export default function Footer() {
  const { lang, t } = useLanguage();
  const [location, setLocation] = useLocation();

  const toggleLang = () => {
    if (lang === "de") {
      setLocation(DE_TO_EN[location] ?? "/en");
    } else {
      setLocation(EN_TO_DE[location] ?? "/");
    }
  };

  const homeRoute = lang === "de" ? "/" : "/en";

  return (
    <footer className="bg-black text-white py-12">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <Link href={homeRoute} className="flex items-center gap-2 mb-2">
              <img src={`${import.meta.env.BASE_URL}immoprotokoll-logo-black.png`} alt="ImmoProtokoll" className="h-8 rounded-lg" />
              <span className="font-bold text-lg tracking-tight text-white">ImmoProtokoll</span>
            </Link>
            <p className="text-sm mt-2 text-white/50 max-w-xs">
              {lang === "de"
                ? "Jede Mietübergabe. Sauber dokumentiert."
                : "Every rental handover. Cleanly documented."}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 sm:gap-8 text-sm font-medium text-white/70">
            <Link href={lang === "de" ? "/datenschutz" : "/en/privacy"} className="hover:text-white transition-colors">
              {t.footer.privacy}
            </Link>
            <Link href={lang === "de" ? "/agb" : "/en/terms"} className="hover:text-white transition-colors">
              {t.footer.terms}
            </Link>
            <Link href={lang === "de" ? "/impressum" : "/en/imprint"} className="hover:text-white transition-colors">
              {t.footer.imprint}
            </Link>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-white/40">
          <p>© {new Date().getFullYear()} KOMUNIQUE by Philipp Roth</p>
          <button onClick={toggleLang} className="hover:text-white transition-colors font-bold uppercase">
            {lang === "de" ? "DE / en" : "de / EN"}
          </button>
        </div>
      </div>
    </footer>
  );
}
