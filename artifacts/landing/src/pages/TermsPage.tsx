import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../i18n";
import { useSEO } from "../hooks/useSEO";

export default function TermsPage() {
  const { lang } = useLanguage();

  const title = lang === 'de' ? "AGB - ImmoProtokoll" : "Terms of Service - ImmoProtokoll";
  const description = lang === 'de' 
    ? "Allgemeine Geschäftsbedingungen für die Nutzung von ImmoProtokoll."
    : "Terms of Service for the use of ImmoProtokoll.";

  useSEO({
    title,
    description,
    lang,
    path: lang === 'de' ? '/de/agb' : '/en/terms'
  });

  return (
    <div className="min-h-screen bg-white text-black font-sans flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 md:px-6 py-24 max-w-3xl prose prose-neutral prose-p:font-medium prose-headings:font-bold">
        {lang === "de" ? (
          <>
            <h1>Allgemeine Geschäftsbedingungen (AGB)</h1>
            
            <h2>1. Geltungsbereich</h2>
            <p>Diese AGB regeln die Nutzung der SaaS-Anwendung ImmoProtokoll. Mit der Registrierung akzeptiert der Nutzer diese Bedingungen.</p>

            <h2>2. Leistungen</h2>
            <p>ImmoProtokoll bietet eine digitale Lösung zur Erstellung von Übergabeprotokollen. Wir bemühen uns um eine hohe Verfügbarkeit, garantieren jedoch keine 100%ige Uptime. Wartungsarbeiten können temporäre Ausfälle verursachen.</p>

            <h2>3. Nutzerpflichten und Inhalte</h2>
            <p>Der Nutzer ist vollumfänglich für die von ihm hochgeladenen Inhalte (Texte, Fotos, Mieterdaten) verantwortlich. Der Nutzer versichert, dass er die Rechte an den hochgeladenen Daten besitzt und diese keine Rechte Dritter verletzen.</p>

            <h2>4. Preise und Zahlung</h2>
            <p>Der Free-Plan ist dauerhaft kostenlos, es ist keine Kreditkarte erforderlich. Kostenpflichtige Pläne werden monatlich oder jährlich im Voraus abgerechnet. Abonnements verlängern sich automatisch, sofern sie nicht vor Ablauf gekündigt werden.</p>

            <h2>5. Kündigung</h2>
            <p>Abonnements können jederzeit gekündigt werden. Der Zugang zu den Premium-Funktionen bleibt bis zum Ende der bereits bezahlten Periode bestehen. Bei Verstössen gegen diese AGB behalten wir uns das Recht vor, Accounts fristlos zu sperren.</p>

            <h2>6. Änderungen der AGB</h2>
            <p>Änderungen dieser AGB werden den Nutzern 30 Tage vor Inkrafttreten per E-Mail mitgeteilt.</p>

            <h2>7. Anwendbares Recht</h2>
            <p>Es gilt ausschliesslich Schweizer Recht. Gerichtsstand ist Appenzell, Schweiz.</p>
          </>
        ) : (
          <>
            <h1>Terms of Service</h1>

            <h2>1. Scope</h2>
            <p>These Terms of Service govern the use of the SaaS application ImmoProtokoll. By registering, the user accepts these conditions.</p>

            <h2>2. Services</h2>
            <p>ImmoProtokoll provides a digital solution for creating property handover protocols. We strive for high availability but do not guarantee 100% uptime. Maintenance work may cause temporary outages.</p>

            <h2>3. User Responsibilities and Content</h2>
            <p>The user is fully responsible for the content they upload (texts, photos, tenant data). The user warrants that they possess the rights to the uploaded data and that it does not infringe on the rights of third parties.</p>

            <h2>4. Pricing and Payment</h2>
            <p>The Free plan is permanently free; no credit card is required. Paid plans are billed monthly or annually in advance. Subscriptions renew automatically unless canceled before the renewal date.</p>

            <h2>5. Cancellation</h2>
            <p>Subscriptions can be canceled at any time. Access to premium features will remain available until the end of the current billing period. We reserve the right to terminate accounts immediately for violations of these Terms.</p>

            <h2>6. Changes to Terms</h2>
            <p>Changes to these Terms will be communicated to users via email 30 days before they take effect.</p>

            <h2>7. Applicable Law</h2>
            <p>Swiss law applies exclusively. The place of jurisdiction is Appenzell, Switzerland.</p>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
