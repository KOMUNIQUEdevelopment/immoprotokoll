import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import { useLanguage } from "../i18n";
import { useSEO } from "../hooks/useSEO";

export default function PrivacyPage() {
  const { lang } = useLanguage();

  const title = lang === 'de' ? "Datenschutzerklärung - ImmoProtokoll" : "Privacy Policy - ImmoProtokoll";
  const description = lang === 'de' 
    ? "Datenschutzerklärung für die Nutzung der ImmoProtokoll Software."
    : "Privacy policy for the use of the ImmoProtokoll software.";

  useSEO({
    title,
    description,
    lang,
    path: lang === 'de' ? '/de/datenschutz' : '/en/privacy'
  });

  return (
    <div className="min-h-screen bg-white text-black font-sans flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 md:px-6 py-24 max-w-3xl prose prose-neutral prose-p:font-medium prose-headings:font-bold prose-a:text-black hover:prose-a:text-black/70">
        {lang === "de" ? (
          <>
            <h1>Datenschutzerklärung</h1>
            <p>Letzte Aktualisierung: 7. April 2026</p>

            <h2>1. Verantwortlicher</h2>
            <p>
              ImmoProtokoll, ein Produkt von KOMUNIQUE by Philipp Roth<br />
              Blumenrainstrasse 29<br />
              9050 Appenzell<br />
              Schweiz<br />
              E-Mail: <a href="mailto:support@immoprotokoll.com">support@immoprotokoll.com</a>
            </p>

            <h2>2. Erhobene Daten</h2>
            <p>Wir erheben und verarbeiten folgende Kategorien von Daten:</p>
            <ul>
              <li><strong>Account-Daten:</strong> Name, E-Mail-Adresse, Passwort (verschlüsselt).</li>
              <li><strong>Protokoll-Daten:</strong> Informationen zu Immobilien, Mieter-Daten (die vom Nutzer eingegeben werden), Zustandsbeschreibungen, Unterschriften und Fotos.</li>
              <li><strong>Nutzungsdaten:</strong> IP-Adresse, Gerätetyp, Browser-Informationen, Logfiles.</li>
            </ul>

            <h2>3. Zweck der Datenverarbeitung und Rechtsgrundlage</h2>
            <p>Die Verarbeitung erfolgt zur Vertragserfüllung (Bereitstellung des ImmoProtokoll-Dienstes) sowie aufgrund unseres berechtigten Interesses an der Verbesserung und Absicherung der Anwendung.</p>

            <h2>4. Hosting und Datenverarbeitung</h2>
            <p>
              Die Anwendung wird auf der Google Cloud Platform (GCP) in der Region <strong>europe-west6 (Zürich, Schweiz)</strong> gehostet. Alle Nutzer- und Protokolldaten werden ausschliesslich in der Schweiz gespeichert und verarbeitet. Mit Google besteht ein Data Processing Agreement (DPA), das den Schutz Ihrer Daten vertraglich sichert.
            </p>

            <h2>5. E-Mail-Versand</h2>
            <p>
              Für den transaktionalen E-Mail-Versand (z.B. Einladungen, Passwort-Reset, Protokoll-Links) nutzen wir <strong>Resend</strong> als Dienstleister. Resend verarbeitet E-Mail-Daten auf Servern in der Europäischen Union (Irland). Mit Resend besteht ein entsprechendes DPA.
            </p>

            <h2>6. Zahlungsabwicklung</h2>
            <p>Für kostenpflichtige Pläne nutzen wir Stripe als Zahlungsdienstleister. Zahlungsdaten werden direkt an Stripe übermittelt und dort verarbeitet. Mit Stripe besteht ein entsprechendes DPA.</p>

            <h2>7. Analytik und Tag-Management</h2>
            <p>
              Wir setzen <strong>Google Tag Manager</strong> ein, um Tracking-Skripte zentral zu verwalten. Über den Google Tag Manager ist <strong>Google Analytics</strong> in der EU-Region eingebunden. Google Analytics erfasst anonymisierte Nutzungsstatistiken (z.B. Seitenaufrufe, Verweildauer). IP-Adressen werden vor der Verarbeitung anonymisiert. Die Daten werden in der EU verarbeitet. Mit Google besteht ein entsprechendes DPA.
            </p>
            <p>
              Sie können der Erhebung durch Google Analytics widersprechen, indem Sie das <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">Browser-Add-on zur Deaktivierung von Google Analytics</a> installieren.
            </p>

            <h2>8. Datenlöschung und Aufbewahrungsfristen</h2>
            <p>Ihre Daten werden so lange gespeichert, wie Ihr Account besteht. Nach Löschung Ihres Accounts werden alle zugehörigen Daten innerhalb von 30 Tagen vollständig aus unseren Systemen entfernt auf Anfrage.</p>

            <h2>9. Ihre Rechte</h2>
            <p>Sie haben das Recht auf Auskunft, Berichtigung, Löschung und Einschränkung der Verarbeitung Ihrer Daten. Anfragen richten Sie bitte an <a href="mailto:support@immoprotokoll.com">support@immoprotokoll.com</a>.</p>
          </>
        ) : (
          <>
            <h1>Privacy Policy</h1>
            <p>Last updated: April 7, 2026</p>

            <h2>1. Data Controller</h2>
            <p>
              ImmoProtokoll, a product of KOMUNIQUE by Philipp Roth<br />
              Blumenrainstrasse 29<br />
              9050 Appenzell<br />
              Switzerland<br />
              Email: <a href="mailto:support@immoprotokoll.com">support@immoprotokoll.com</a>
            </p>

            <h2>2. Data Collected</h2>
            <p>We collect and process the following categories of data:</p>
            <ul>
              <li><strong>Account Data:</strong> Name, email address, password (encrypted).</li>
              <li><strong>Protocol Data:</strong> Property information, tenant data (entered by the user), condition descriptions, signatures, and photos.</li>
              <li><strong>Usage Data:</strong> IP address, device type, browser information, log files.</li>
            </ul>

            <h2>3. Purpose and Legal Basis</h2>
            <p>Data is processed to fulfill our contract with you (providing the ImmoProtokoll service) and based on our legitimate interest in improving and securing the application.</p>

            <h2>4. Hosting and Data Processing</h2>
            <p>
              The application is hosted on <strong>Google Cloud Platform (GCP)</strong> in the <strong>europe-west6 (Zürich, Switzerland)</strong> region. All user and protocol data is stored and processed exclusively in Switzerland. A Data Processing Agreement (DPA) is in place with Google to contractually ensure the protection of your data.
            </p>

            <h2>5. Email Delivery</h2>
            <p>
              For transactional email delivery (e.g. invitations, password resets, protocol links) we use <strong>Resend</strong> as our email service provider. Resend processes email data on servers located in the European Union (Ireland). A DPA is in place with Resend.
            </p>

            <h2>6. Payment Processing</h2>
            <p>For paid plans, we use Stripe as our payment processor. Payment details are transmitted directly to and processed by Stripe. A DPA is in place with Stripe.</p>

            <h2>7. Analytics and Tag Management</h2>
            <p>
              We use <strong>Google Tag Manager</strong> to centrally manage tracking scripts. Through Google Tag Manager, <strong>Google Analytics</strong> is integrated with EU-region data processing. Google Analytics collects anonymized usage statistics (e.g. page views, session duration). IP addresses are anonymized prior to processing. Data is processed within the EU. A DPA is in place with Google.
            </p>
            <p>
              You may opt out of Google Analytics data collection by installing the <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">Google Analytics opt-out browser add-on</a>.
            </p>

            <h2>8. Data Retention and Deletion</h2>
            <p>Your data is stored as long as your account exists. Upon account deletion, all associated data will be completely removed from our systems within 30 days upon request.</p>

            <h2>9. Your Rights</h2>
            <p>You have the right to access, correct, delete, and restrict the processing of your data. Please direct requests to <a href="mailto:support@immoprotokoll.com">support@immoprotokoll.com</a>.</p>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
