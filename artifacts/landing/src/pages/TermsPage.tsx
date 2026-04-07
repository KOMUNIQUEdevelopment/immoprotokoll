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
    path: lang === 'de' ? '/agb' : '/en/terms'
  });

  return (
    <div className="min-h-screen bg-white text-black font-sans flex flex-col">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 md:px-6 py-24 max-w-3xl prose prose-neutral prose-p:font-medium prose-headings:font-bold">
        {lang === "de" ? (
          <>
            <h1>Allgemeine Geschäftsbedingungen (AGB)</h1>
            <p>Stand: 7. April 2026</p>

            <h2>1. Geltungsbereich</h2>
            <p>Diese AGB regeln die Nutzung der SaaS-Anwendung ImmoProtokoll. Mit der Registrierung akzeptiert der Nutzer diese Bedingungen.</p>

            <h2>2. Leistungen</h2>
            <p>ImmoProtokoll bietet eine digitale Lösung zur Erstellung von Übergabeprotokollen. Wir bemühen uns um eine hohe Verfügbarkeit, garantieren jedoch keine 100%ige Uptime. Wartungsarbeiten können temporäre Ausfälle verursachen.</p>

            <h2>3. Nutzerpflichten und Inhalte</h2>
            <p>Der Nutzer ist vollumfänglich für die von ihm hochgeladenen Inhalte (Texte, Fotos, Mieterdaten) verantwortlich. Der Nutzer versichert, dass er die Rechte an den hochgeladenen Daten besitzt und diese keine Rechte Dritter verletzen.</p>

            <h2>4. Zweck der Anwendung und Nutzungshinweis</h2>
            <p>
              ImmoProtokoll ist ein Werkzeug zur <strong>Erstellung und Unterzeichnung</strong> von Übergabeprotokollen. Die Anwendung ist <strong>ausdrücklich nicht als dauerhaftes Archiv</strong> für Protokolle, Fotos oder sonstige Dokumente konzipiert und darf nicht als solches verwendet werden.
            </p>
            <p>
              <strong>Empfehlung:</strong> Unmittelbar nach der Unterzeichnung eines Protokolls durch alle Parteien wird dringend empfohlen:
            </p>
            <ul>
              <li>Das fertige Protokoll als <strong>PDF herunterzuladen</strong> und lokal sowie an einem sicheren Ort zu speichern.</li>
              <li>Das <strong>Foto-ZIP-Archiv</strong> herunterzuladen und ebenfalls gesichert aufzubewahren.</li>
              <li>Kopien an alle beteiligten Parteien zu übermitteln.</li>
            </ul>
            <p>
              Der Nutzer trägt die alleinige Verantwortung dafür, rechtzeitig Sicherungskopien seiner Daten zu erstellen. Wir weisen ausdrücklich darauf hin, dass in der Anwendung gespeicherte Daten nicht unbegrenzt und nicht garantiert verfügbar sind.
            </p>

            <h2>5. Haftungsausschluss</h2>

            <h3>5.1 Haftung für Datenverlust</h3>
            <p>
              ImmoProtokoll (KOMUNIQUE by Philipp Roth) übernimmt <strong>keinerlei Haftung</strong> für den Verlust, die Beschädigung, die unbeabsichtigte Löschung oder die Nichtverfügbarkeit von Daten jeglicher Art, insbesondere von:
            </p>
            <ul>
              <li>Protokollen und Protokollinhalten (Texte, Raumbeschreibungen, Zustandsberichte)</li>
              <li>Fotos und Bilddateien</li>
              <li>Unterschriften</li>
              <li>Mieterdaten und Kontaktinformationen</li>
              <li>Liegenschaftsdaten</li>
            </ul>
            <p>
              Datenverlust kann unter anderem durch technische Störungen, Systemausfälle, Fehler Dritter (z.B. Cloud-Infrastruktur), menschliches Versagen, Cyberangriffe, Migration oder Löschung von Account-Daten entstehen. In all diesen Fällen besteht kein Anspruch auf Schadenersatz oder Wiederherstellung der Daten.
            </p>

            <h3>5.2 Haftung für Systemausfälle und Nichtverfügbarkeit</h3>
            <p>
              ImmoProtokoll übernimmt keine Garantie für die ununterbrochene Verfügbarkeit der Anwendung. Ausfälle, Wartungsarbeiten oder technische Störungen — auch wenn diese zu einem Datenverlust führen — begründen keinen Anspruch auf Schadenersatz, Rückerstattung oder sonstige Entschädigung.
            </p>

            <h3>5.3 Haftung für rechtliche Wirksamkeit</h3>
            <p>
              ImmoProtokoll übernimmt keine Haftung dafür, dass die mit der Anwendung erstellten Protokolle oder Unterschriften in jedem Rechtskontext, vor Gericht oder gegenüber Behörden als rechtsgültig anerkannt werden. Der Nutzer ist selbst dafür verantwortlich, die rechtlichen Anforderungen an Übergabeprotokolle in seinem jeweiligen Zuständigkeitsbereich zu prüfen und einzuhalten.
            </p>

            <h3>5.4 Haftungsbeschränkung</h3>
            <p>
              Die Haftung von ImmoProtokoll (KOMUNIQUE by Philipp Roth) ist in jedem Fall auf den vom Nutzer im betreffenden Kalendermonat tatsächlich bezahlten Abonnementbetrag beschränkt, höchstens jedoch auf CHF 100.–. Eine weitergehende Haftung — insbesondere für indirekte Schäden, Folgeschäden, entgangenen Gewinn, Betriebsunterbrechungen oder den Verlust von Daten — ist ausgeschlossen, soweit dies gesetzlich zulässig ist.
            </p>
            <p>
              Dieser Haftungsausschluss gilt gegenüber Unternehmern im Sinne des Handelsrechts uneingeschränkt. Gegenüber Verbrauchern gilt er soweit gesetzlich zulässig.
            </p>

            <h2>6. Preise und Zahlung</h2>
            <p>Der Free-Plan ist dauerhaft kostenlos, es ist keine Kreditkarte erforderlich. Kostenpflichtige Pläne werden monatlich oder jährlich im Voraus abgerechnet. Abonnements verlängern sich automatisch, sofern sie nicht vor Ablauf gekündigt werden.</p>

            <h2>7. Kündigung und Datenlöschung</h2>
            <p>
              Abonnements können jederzeit gekündigt werden. Der Zugang zu den Premium-Funktionen bleibt bis zum Ende der bereits bezahlten Periode bestehen. Bei Verstössen gegen diese AGB behalten wir uns das Recht vor, Accounts fristlos zu sperren.
            </p>
            <p>
              Nach Kündigung oder Löschung eines Accounts werden alle zugehörigen Daten (Protokolle, Fotos, Liegenschaften) innerhalb von 30 Tagen unwiderruflich gelöscht. Eine Wiederherstellung ist danach nicht möglich. Der Nutzer wird ausdrücklich darauf hingewiesen, alle gewünschten Daten <strong>vor</strong> der Kündigung zu exportieren.
            </p>

            <h2>8. Änderungen der AGB</h2>
            <p>Änderungen dieser AGB werden den Nutzern 30 Tage vor Inkrafttreten per E-Mail mitgeteilt.</p>

            <h2>9. Anwendbares Recht</h2>
            <p>Es gilt ausschliesslich Schweizer Recht. Gerichtsstand ist Appenzell, Schweiz.</p>
          </>
        ) : (
          <>
            <h1>Terms of Service</h1>
            <p>Last updated: April 7, 2026</p>

            <h2>1. Scope</h2>
            <p>These Terms of Service govern the use of the SaaS application ImmoProtokoll. By registering, the user accepts these conditions.</p>

            <h2>2. Services</h2>
            <p>ImmoProtokoll provides a digital solution for creating property handover protocols. We strive for high availability but do not guarantee 100% uptime. Maintenance work may cause temporary outages.</p>

            <h2>3. User Responsibilities and Content</h2>
            <p>The user is fully responsible for the content they upload (texts, photos, tenant data). The user warrants that they possess the rights to the uploaded data and that it does not infringe on the rights of third parties.</p>

            <h2>4. Purpose of the Application and Usage Notice</h2>
            <p>
              ImmoProtokoll is a tool for <strong>creating and signing</strong> property handover protocols. The application is <strong>expressly not designed as a permanent archive</strong> for protocols, photos, or other documents and must not be used as such.
            </p>
            <p>
              <strong>Recommendation:</strong> Immediately after all parties have signed a protocol, we strongly recommend:
            </p>
            <ul>
              <li>Downloading the completed protocol as a <strong>PDF</strong> and saving it locally in a secure location.</li>
              <li>Downloading the <strong>photo ZIP archive</strong> and keeping it in a safe place.</li>
              <li>Sending copies to all parties involved.</li>
            </ul>
            <p>
              The user is solely responsible for creating backup copies of their data in a timely manner. We expressly point out that data stored in the application is not guaranteed to be available indefinitely.
            </p>

            <h2>5. Disclaimer of Liability</h2>

            <h3>5.1 Liability for Data Loss</h3>
            <p>
              ImmoProtokoll (KOMUNIQUE by Philipp Roth) accepts <strong>no liability whatsoever</strong> for the loss, corruption, accidental deletion, or unavailability of data of any kind, including but not limited to:
            </p>
            <ul>
              <li>Protocols and protocol contents (texts, room descriptions, condition reports)</li>
              <li>Photos and image files</li>
              <li>Signatures</li>
              <li>Tenant data and contact information</li>
              <li>Property data</li>
            </ul>
            <p>
              Data loss may occur due to technical failures, system outages, errors by third parties (e.g. cloud infrastructure providers), human error, cyberattacks, migration, or deletion of account data. In all such cases, there is no right to compensation or data recovery.
            </p>

            <h3>5.2 Liability for Outages and Unavailability</h3>
            <p>
              ImmoProtokoll does not guarantee uninterrupted availability of the application. Outages, maintenance, or technical disruptions — even if they result in data loss — do not give rise to any claim for damages, refunds, or other compensation.
            </p>

            <h3>5.3 Liability for Legal Validity</h3>
            <p>
              ImmoProtokoll accepts no liability for the protocols or signatures created with the application being recognized as legally valid in every legal context, before courts, or by authorities. The user is solely responsible for verifying and complying with the legal requirements for handover protocols in their respective jurisdiction.
            </p>

            <h3>5.4 Limitation of Liability</h3>
            <p>
              The liability of ImmoProtokoll (KOMUNIQUE by Philipp Roth) is in any case limited to the subscription amount actually paid by the user in the relevant calendar month, but in no event more than CHF 100.–. Any further liability — in particular for indirect damages, consequential damages, loss of profit, business interruption, or loss of data — is excluded to the extent permitted by law.
            </p>
            <p>
              This disclaimer applies without restriction to commercial users. It applies to consumers to the extent permitted by applicable law.
            </p>

            <h2>6. Pricing and Payment</h2>
            <p>The Free plan is permanently free; no credit card is required. Paid plans are billed monthly or annually in advance. Subscriptions renew automatically unless canceled before the renewal date.</p>

            <h2>7. Cancellation and Data Deletion</h2>
            <p>
              Subscriptions can be canceled at any time. Access to premium features will remain available until the end of the current billing period. We reserve the right to terminate accounts immediately for violations of these Terms.
            </p>
            <p>
              Upon cancellation or deletion of an account, all associated data (protocols, photos, properties) will be permanently and irreversibly deleted within 30 days. Recovery will not be possible thereafter. Users are expressly advised to export all desired data <strong>before</strong> canceling.
            </p>

            <h2>8. Changes to Terms</h2>
            <p>Changes to these Terms will be communicated to users via email 30 days before they take effect.</p>

            <h2>9. Applicable Law</h2>
            <p>Swiss law applies exclusively. The place of jurisdiction is Appenzell, Switzerland.</p>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
