import { Link } from "wouter";
import { useLanguage } from "../i18n";
import { useLocation } from "wouter";
import { useState } from "react";
import { Menu, X } from "lucide-react";

export default function Navbar() {
  const { lang, t } = useLanguage();
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const switchLang = (newLang: "de" | "en") => {
    if (newLang === lang) return;
    const newPath = location.replace(`/${lang}`, `/${newLang}`);
    setLocation(newPath);
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    if (location !== `/${lang}`) {
      setLocation(`/${lang}`);
      setTimeout(() => {
        const el = document.getElementById(id);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      return;
    }
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-black/10 bg-white">
      <div className="container mx-auto px-4 md:px-6 h-16 flex items-center justify-between">
        <Link href={`/${lang}`} className="flex items-center gap-2">
          <img src={`${import.meta.env.BASE_URL}immoprotokoll-logo-black.png`} alt="ImmoProtokoll" className="h-8 rounded-lg" />
          <span className="font-bold text-lg tracking-tight">ImmoProtokoll</span>
        </Link>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium">
          <button onClick={() => scrollToSection('features')} className="hover:opacity-60 transition-opacity">
            {t.nav.features}
          </button>
          <button onClick={() => scrollToSection('pricing')} className="hover:opacity-60 transition-opacity">
            {t.nav.pricing}
          </button>
          <button onClick={() => scrollToSection('faq')} className="hover:opacity-60 transition-opacity">
            {t.nav.faq}
          </button>
          <button onClick={() => scrollToSection('roadmap')} className="hover:opacity-60 transition-opacity">
            {t.nav.roadmap}
          </button>
          <button onClick={() => scrollToSection('contact')} className="hover:opacity-60 transition-opacity">
            {t.nav.contact}
          </button>
        </nav>

        <div className="hidden md:flex items-center gap-4">
          <div className="flex items-center rounded-lg border border-neutral-200 overflow-hidden text-xs font-semibold">
            {(["de", "en"] as const).map((l) => (
              <button
                key={l}
                onClick={() => switchLang(l)}
                className={`px-3 py-1.5 transition-colors uppercase ${
                  lang === l ? "bg-black text-white" : "text-neutral-500 hover:bg-neutral-50"
                }`}
              >
                {l}
              </button>
            ))}
          </div>
          <a href="https://app.immoprotokoll.com/" className="text-sm font-medium hover:underline">
            {t.nav.login}
          </a>
          <a 
            href="https://app.immoprotokoll.com/" 
            className="bg-black text-white px-5 py-2 text-sm font-bold rounded-lg hover:bg-black/80 transition-colors"
          >
            {t.nav.start_free}
          </a>
        </div>

        {/* Mobile Toggle */}
        <button className="md:hidden" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-16 left-0 w-full bg-white border-b border-black/10 p-4 flex flex-col gap-4 shadow-xl">
          <button onClick={() => scrollToSection('features')} className="text-left font-medium text-lg py-2 border-b border-black/5">
            {t.nav.features}
          </button>
          <button onClick={() => scrollToSection('pricing')} className="text-left font-medium text-lg py-2 border-b border-black/5">
            {t.nav.pricing}
          </button>
          <button onClick={() => scrollToSection('faq')} className="text-left font-medium text-lg py-2 border-b border-black/5">
            {t.nav.faq}
          </button>
          <button onClick={() => scrollToSection('roadmap')} className="text-left font-medium text-lg py-2 border-b border-black/5">
            {t.nav.roadmap}
          </button>
          <button onClick={() => scrollToSection('contact')} className="text-left font-medium text-lg py-2 border-b border-black/5">
            {t.nav.contact}
          </button>
          
          <div className="flex items-center justify-between pt-4">
            <div className="flex items-center rounded-lg border border-neutral-200 overflow-hidden text-sm font-semibold">
              {(["de", "en"] as const).map((l) => (
                <button
                  key={l}
                  onClick={() => switchLang(l)}
                  className={`px-4 py-2 transition-colors uppercase ${
                    lang === l ? "bg-black text-white" : "text-neutral-500 hover:bg-neutral-50"
                  }`}
                >
                  {l}
                </button>
              ))}
            </div>
            <a href="https://app.immoprotokoll.com/" className="font-medium">
              {t.nav.login}
            </a>
          </div>
          
          <a 
            href="https://app.immoprotokoll.com/" 
            className="bg-black text-white text-center py-3 mt-2 font-bold w-full rounded-lg"
          >
            {t.nav.start_free}
          </a>
        </div>
      )}
    </header>
  );
}
