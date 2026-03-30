import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../i18n";
import { useSEO } from "../hooks/useSEO";

export default function ImprintPage() {
  const { lang } = useLanguage();

  const title = lang === 'de' ? "Impressum - ImmoProtokoll" : "Imprint - ImmoProtokoll";
  const description = lang === 'de' 
    ? "Impressum und rechtliche Hinweise von ImmoProtokoll."
    : "Imprint and legal notices of ImmoProtokoll.";

  useSEO({
    title,
    description,
    lang,
    path: lang === 'de' ? '/de/impressum' : '/en/imprint'
  });

  return (
    <div className="min-h-screen bg-white text-black font-sans flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 md:px-6 py-24 max-w-3xl prose prose-neutral prose-p:font-medium prose-headings:font-bold prose-a:text-black hover:prose-a:text-black/70">
        <h1>{lang === "de" ? "Impressum" : "Imprint"}</h1>
        
        <p>
          <strong>ImmoProtokoll</strong> ist ein Produkt von:
        </p>

        <p>
          KOMUNIQUE by Philipp Roth<br />
          Blumenrainstrasse 29<br />
          9050 Appenzell<br />
          {lang === "de" ? "Schweiz" : "Switzerland"}
        </p>

        <p>
          E-Mail: <a href="mailto:support@immoprotokoll.com">support@immoprotokoll.com</a>
        </p>

        <h2>{lang === "de" ? "Haftungsausschluss" : "Disclaimer"}</h2>
        <p>
          {lang === "de" 
            ? "Der Autor übernimmt keinerlei Gewähr hinsichtlich der inhaltlichen Richtigkeit, Genauigkeit, Aktualität, Zuverlässigkeit und Vollständigkeit der Informationen. Haftungsansprüche gegen den Autor wegen Schäden materieller oder immaterieller Art, welche aus dem Zugriff oder der Nutzung bzw. Nichtnutzung der veröffentlichten Informationen, durch Missbrauch der Verbindung oder durch technische Störungen entstanden sind, werden ausgeschlossen."
            : "The author assumes no liability whatsoever with regard to the correctness, accuracy, up-to-dateness, reliability and completeness of the information provided. Liability claims regarding damage caused by the use of any information provided, including any kind of information which is incomplete or incorrect, will therefore be rejected."}
        </p>
      </main>
      <Footer />
    </div>
  );
}
