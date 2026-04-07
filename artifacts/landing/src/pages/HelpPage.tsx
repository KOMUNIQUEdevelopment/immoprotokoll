import { useEffect, useState } from "react";
import { useLanguage } from "../i18n";
import { useSEO } from "../hooks/useSEO";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  Building2, FileText, Camera, PenLine, Share2, FileDown, Globe,
  Users, ShieldCheck, CreditCard, ChevronDown, ChevronRight, Info,
} from "lucide-react";

type Plan = "free" | "privat" | "agentur";

const PLAN_BADGE: Record<Plan, { label: string; className: string }> = {
  free:    { label: "Free",    className: "border border-neutral-300 text-neutral-500 bg-white" },
  privat:  { label: "Privat",  className: "bg-neutral-700 text-white" },
  agentur: { label: "Agentur", className: "bg-black text-white" },
};

function PlanBadge({ plan }: { plan: Plan }) {
  const b = PLAN_BADGE[plan];
  return (
    <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full ${b.className}`}>
      {b.label}
    </span>
  );
}

function PlanBadges({ plans }: { plans: Plan[] }) {
  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {plans.map((p) => <PlanBadge key={p} plan={p} />)}
    </div>
  );
}

interface SectionProps {
  id: string;
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

function Section({ id, icon, title, children }: SectionProps) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="flex items-center gap-3 mb-6 pb-3 border-b border-neutral-200">
        <div className="w-9 h-9 bg-black text-white rounded-lg flex items-center justify-center flex-shrink-0">
          {icon}
        </div>
        <h2 className="text-xl font-black tracking-tight text-black">{title}</h2>
      </div>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

interface FeatureCardProps {
  title: string;
  plans: Plan[];
  children: React.ReactNode;
}

function FeatureCard({ title, plans, children }: FeatureCardProps) {
  return (
    <div className="bg-neutral-50 border border-neutral-200 rounded-xl p-5">
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <h3 className="font-semibold text-black text-base">{title}</h3>
        <div className="flex flex-wrap gap-1">
          {plans.map((p) => <PlanBadge key={p} plan={p} />)}
        </div>
      </div>
      <div className="text-sm text-neutral-600 space-y-2 leading-relaxed">{children}</div>
    </div>
  );
}

function StepList({ steps }: { steps: string[] }) {
  return (
    <ol className="space-y-2">
      {steps.map((step, i) => (
        <li key={i} className="flex items-start gap-3">
          <span className="flex-shrink-0 w-6 h-6 bg-black text-white text-xs font-bold rounded-full flex items-center justify-center mt-0.5">
            {i + 1}
          </span>
          <span dangerouslySetInnerHTML={{ __html: step }} />
        </li>
      ))}
    </ol>
  );
}

function Callout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 bg-neutral-100 border border-neutral-200 rounded-lg px-4 py-3 text-sm text-neutral-700">
      <Info size={15} className="flex-shrink-0 mt-0.5 text-neutral-500" />
      <span>{children}</span>
    </div>
  );
}

const NAV_SECTIONS = {
  de: [
    { id: "schnellstart",   label: "Schnellstart",           icon: <ChevronRight size={14} /> },
    { id: "liegenschaften", label: "Liegenschaften",         icon: <ChevronRight size={14} /> },
    { id: "protokolle",     label: "Protokolle",             icon: <ChevronRight size={14} /> },
    { id: "mieteransicht",  label: "Mieteransicht",          icon: <ChevronRight size={14} /> },
    { id: "pdf",            label: "PDF-Export",             icon: <ChevronRight size={14} /> },
    { id: "sprache",        label: "Spracheinstellungen",    icon: <ChevronRight size={14} /> },
    { id: "team",           label: "Team & Benutzer",        icon: <ChevronRight size={14} /> },
    { id: "sicherheit",     label: "Sicherheit & 2FA",       icon: <ChevronRight size={14} /> },
    { id: "abonnement",     label: "Abonnement & Pläne",     icon: <ChevronRight size={14} /> },
  ],
  en: [
    { id: "schnellstart",   label: "Quick Start",            icon: <ChevronRight size={14} /> },
    { id: "liegenschaften", label: "Properties",             icon: <ChevronRight size={14} /> },
    { id: "protokolle",     label: "Protocols",              icon: <ChevronRight size={14} /> },
    { id: "mieteransicht",  label: "Tenant View",            icon: <ChevronRight size={14} /> },
    { id: "pdf",            label: "PDF Export",             icon: <ChevronRight size={14} /> },
    { id: "sprache",        label: "Language Settings",      icon: <ChevronRight size={14} /> },
    { id: "team",           label: "Team & Users",           icon: <ChevronRight size={14} /> },
    { id: "sicherheit",     label: "Security & 2FA",         icon: <ChevronRight size={14} /> },
    { id: "abonnement",     label: "Subscription & Plans",   icon: <ChevronRight size={14} /> },
  ],
};

function DEContent() {
  return (
    <div className="space-y-14">

      {/* Schnellstart */}
      <Section id="schnellstart" icon={<ChevronRight size={18} />} title="Schnellstart">
        <FeatureCard title="In 5 Schritten zum ersten Protokoll" plans={["free", "privat", "agentur"]}>
          <StepList steps={[
            "<strong>Konto erstellen</strong> – Registrieren Sie sich unter <a href='https://app.immoprotokoll.com' class='underline font-medium'>app.immoprotokoll.com</a> mit Ihrer E-Mail-Adresse.",
            "<strong>Liegenschaft anlegen</strong> – Klicken Sie auf «+ Liegenschaft» und geben Sie Name, Adresse und Sprache des Protokolls an.",
            "<strong>Protokoll starten</strong> – Wählen Sie die Liegenschaft, klicken Sie auf «Neues Protokoll» und wählen Sie den Typ (Einzug oder Auszug).",
            "<strong>Räume durchgehen</strong> – Fügen Sie für jeden Raum den Zustand hinzu, laden Sie Fotos hoch und notieren Sie Mängel.",
            "<strong>Unterschreiben & abschliessen</strong> – Veranlassen Sie die digitale Signatur aller Parteien und generieren Sie das fertige PDF.",
          ]} />
        </FeatureCard>
        <Callout>
          Alle Protokolle werden in Echtzeit gespeichert. Sie können jederzeit unterbrechen und auf einem anderen Gerät weitermachen.
        </Callout>
      </Section>

      {/* Liegenschaften */}
      <Section id="liegenschaften" icon={<Building2 size={18} />} title="Liegenschaften">
        <FeatureCard title="Liegenschaft anlegen" plans={["free", "privat", "agentur"]}>
          <p>Klicken Sie auf der Startseite auf den Button <strong>«+ Neue Liegenschaft»</strong>. Füllen Sie folgende Felder aus:</p>
          <ul className="list-disc pl-4 space-y-1 mt-2">
            <li><strong>Name</strong> – z.B. «Musterstrasse 5, 3. OG links»</li>
            <li><strong>Adresse</strong> – vollständige Postadresse</li>
            <li><strong>Protokollsprache</strong> – Deutsch (CH), Deutsch (DE) oder Englisch. Diese Einstellung bestimmt die Sprache des generierten PDFs.</li>
          </ul>
          <div className="mt-3">
            <PlanBadges plans={["free", "privat"]} />
            <p className="mt-1 text-neutral-500 text-xs">Max. 1 Liegenschaft</p>
            <PlanBadges plans={["agentur"]} />
            <p className="mt-1 text-neutral-500 text-xs">Bis zu 50 Liegenschaften</p>
          </div>
        </FeatureCard>

        <FeatureCard title="Liegenschaft bearbeiten & löschen" plans={["free", "privat", "agentur"]}>
          <p>Klicken Sie auf das <strong>Stift-Symbol</strong> neben einer Liegenschaft um Name, Adresse oder Protokollsprache zu ändern. Mit dem <strong>Papierkorb-Symbol</strong> löschen Sie die Liegenschaft inkl. aller zugehörigen Protokolle.</p>
        </FeatureCard>

        <FeatureCard title="Liegenschaftsfoto" plans={["free", "privat", "agentur"]}>
          <p>Über das <strong>Kamera-Symbol</strong> auf einer Liegenschaftskarte können Sie ein Titelbild hochladen, das im Protokoll und in der Übersicht erscheint.</p>
        </FeatureCard>
      </Section>

      {/* Protokolle */}
      <Section id="protokolle" icon={<FileText size={18} />} title="Protokolle erstellen & verwalten">
        <FeatureCard title="Neues Protokoll erstellen" plans={["free", "privat", "agentur"]}>
          <StepList steps={[
            "Wählen Sie auf der Startseite die gewünschte Liegenschaft.",
            "Klicken Sie auf <strong>«Neues Protokoll»</strong>.",
            "Wählen Sie den <strong>Typ</strong>: <em>Einzug</em> (Mietbeginn) oder <em>Auszug</em> (Mietende).",
            "Das Protokoll wird sofort angelegt und gespeichert.",
          ]} />
          <div className="mt-3">
            <PlanBadges plans={["free"]} />
            <p className="mt-1 text-neutral-500 text-xs">Max. 1 Protokoll pro Liegenschaft</p>
            <PlanBadges plans={["privat", "agentur"]} />
            <p className="mt-1 text-neutral-500 text-xs">Bis zu 30 Protokolle pro Liegenschaft</p>
          </div>
        </FeatureCard>

        <FeatureCard title="Räume & Zustände dokumentieren" plans={["free", "privat", "agentur"]}>
          <p>Im Protokoll-Editor können Sie beliebig viele Räume anlegen:</p>
          <ul className="list-disc pl-4 space-y-1 mt-2">
            <li>Klicken Sie auf <strong>«+ Raum hinzufügen»</strong> und vergeben Sie einen Namen (z.B. «Wohnzimmer», «Bad OG»).</li>
            <li>Erfassen Sie für jeden Raum den <strong>Zustand</strong> (Gut, Mängel, etc.) mit einer optionalen Bemerkung.</li>
            <li>Nutzen Sie die <strong>Zähler</strong> für Schlüssel, Fernbedienungen und andere Übergabeobjekte.</li>
            <li>Alle Änderungen werden automatisch in Echtzeit gespeichert und mit dem Symbol <strong>↻</strong> manuell erzwungen.</li>
          </ul>
        </FeatureCard>

        <FeatureCard title="Fotodokumentation" plans={["free", "privat", "agentur"]}>
          <p>Zu jedem Raum können Sie beliebig viele Fotos direkt von der Kamera oder aus der Galerie hochladen. Fotos werden direkt im Protokoll gespeichert und erscheinen im PDF.</p>
          <StepList steps={[
            "Öffnen Sie einen Raum im Protokoll-Editor.",
            "Klicken Sie auf das <strong>Kamera-Symbol</strong> im Raum.",
            "Wählen Sie eine Datei oder machen Sie direkt ein Foto.",
            "Das Foto erscheint sofort im Raum und im geteilten Mieter-Link.",
          ]} />
        </FeatureCard>

        <FeatureCard title="Protokolldaten & Mietparteien" plans={["free", "privat", "agentur"]}>
          <p>Im Abschnitt <strong>«Protokolldaten»</strong> erfassen Sie:</p>
          <ul className="list-disc pl-4 space-y-1 mt-2">
            <li>Datum und Uhrzeit der Übergabe</li>
            <li>Name und Kontaktdaten des Vermieters / der Verwaltung</li>
            <li>Name, E-Mail und Kontaktdaten des Mieters</li>
            <li>Allfällige Vertreter oder Zeugen</li>
          </ul>
        </FeatureCard>

        <FeatureCard title="Protokoll archivieren & löschen" plans={["free", "privat", "agentur"]}>
          <p>Abgeschlossene Protokolle bleiben im Archiv der Liegenschaft. Über das Kontextmenü können Sie ein Protokoll <strong>duplizieren</strong> (z.B. als Basis für den nächsten Einzug) oder <strong>löschen</strong>.</p>
        </FeatureCard>
      </Section>

      {/* Mieteransicht */}
      <Section id="mieteransicht" icon={<Share2 size={18} />} title="Mieteransicht & digitale Signaturen">
        <FeatureCard title="Geteilter Mieter-Link" plans={["free", "privat", "agentur"]}>
          <p>Jedes Protokoll hat einen <strong>öffentlichen Link</strong>, den Sie dem Mieter per E-Mail oder SMS schicken können. Über diesen Link kann der Mieter:</p>
          <ul className="list-disc pl-4 space-y-1 mt-2">
            <li>Alle Räume und Fotos einsehen</li>
            <li>Das Protokoll digital unterzeichnen</li>
            <li>Den Status in Echtzeit verfolgen</li>
          </ul>
          <p className="mt-2">Den Link finden Sie im Protokoll-Editor oben rechts unter dem <strong>Teilen-Symbol</strong>.</p>
          <p className="text-neutral-500 text-xs mt-1">Format: <code>immoprotokoll.com/app/#/view/[ID]</code></p>
        </FeatureCard>

        <FeatureCard title="Digitale Signaturen" plans={["free", "privat", "agentur"]}>
          <StepList steps={[
            "Schliessen Sie die Dokumentation aller Räume ab.",
            "Klicken Sie auf <strong>«Unterschriften»</strong> im Protokoll-Editor.",
            "Vermieter und Mieter unterschreiben direkt per <strong>Touchscreen oder Maus</strong> im Browser.",
            "Alternativ: Mieter erhält den geteilten Link und unterzeichnet auf seinem eigenen Gerät.",
            "Nach allen Signaturen kann das Protokoll als PDF exportiert werden.",
          ]} />
        </FeatureCard>

        <FeatureCard title="Mieter per E-Mail einladen" plans={["free", "privat", "agentur"]}>
          <p>Über den Button <strong>«Mieter einladen»</strong> im Protokoll versenden Sie direkt aus der App eine E-Mail mit dem Ansichtslink an den Mieter. Die E-Mail enthält eine Zusammenfassung und den direkten Link zum Protokoll.</p>
        </FeatureCard>
      </Section>

      {/* PDF */}
      <Section id="pdf" icon={<FileDown size={18} />} title="PDF-Export">
        <FeatureCard title="PDF generieren & herunterladen" plans={["free", "privat", "agentur"]}>
          <p>Sobald das Protokoll vollständig ausgefüllt ist, können Sie es als PDF exportieren:</p>
          <StepList steps={[
            "Öffnen Sie das Protokoll im Editor.",
            "Klicken Sie auf <strong>«PDF exportieren»</strong>.",
            "Das PDF wird serverseitig generiert und steht sofort zum Download bereit.",
            "Das PDF enthält: Deckblatt, alle Räume mit Zuständen und Fotos, Unterschriften.",
          ]} />
        </FeatureCard>
        <FeatureCard title="Wasserzeichen" plans={["free"]}>
          <p>Im <strong>Free-Plan</strong> enthalten alle generierten PDFs ein «ImmoProtokoll»-Wasserzeichen. Dieses entfällt bei den Plänen <strong>Privat</strong> und <strong>Agentur</strong>.</p>
        </FeatureCard>
        <FeatureCard title="PDF ohne Wasserzeichen" plans={["privat", "agentur"]}>
          <p>Mit einem kostenpflichtigen Plan erhalten Sie ein <strong>sauberes, professionelles PDF</strong> ohne Wasserzeichen, das Sie direkt an Mieter und Behörden weitergeben können.</p>
        </FeatureCard>
      </Section>

      {/* Sprache */}
      <Section id="sprache" icon={<Globe size={18} />} title="Spracheinstellungen">
        <FeatureCard title="Sprache der Liegenschaft" plans={["free", "privat", "agentur"]}>
          <p>Beim Anlegen oder Bearbeiten einer Liegenschaft können Sie die <strong>Protokollsprache</strong> festlegen. Diese bestimmt:</p>
          <ul className="list-disc pl-4 space-y-1 mt-2">
            <li>Die Sprache des generierten PDFs</li>
            <li>Die Sprache der automatischen E-Mails an den Mieter</li>
            <li>Vorausgefüllte Raumbezeichnungen im Editor</li>
          </ul>
          <p className="mt-2">Verfügbare Sprachen:</p>
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li><strong>Deutsch (Schweiz)</strong> – DE-CH, inkl. «ss» → «ss», CHF-Schreibweise</li>
            <li><strong>Deutsch (Deutschland)</strong> – DE-DE</li>
            <li><strong>Englisch</strong> – EN</li>
          </ul>
        </FeatureCard>

        <FeatureCard title="App-Sprache" plans={["free", "privat", "agentur"]}>
          <p>Die <strong>Benutzeroberfläche</strong> der App (Menüs, Buttons, Systemtexte) wird auf Basis Ihrer Browser-Sprache angezeigt. Sie können die Sprache in den Kontoeinstellungen jederzeit ändern. Die App-Sprache ist unabhängig von der Protokollsprache.</p>
        </FeatureCard>

        <FeatureCard title="Sprache pro Protokoll" plans={["free", "privat", "agentur"]}>
          <p>Die Sprache wird von der Liegenschaft auf alle zugehörigen Protokolle übernommen. Wenn Sie ein Protokoll für eine deutschsprachige und ein anderes für eine englischsprachige Mieterschaft haben, legen Sie einfach zwei separate Liegenschaften mit unterschiedlichen Spracheinstellungen an.</p>
        </FeatureCard>
      </Section>

      {/* Team */}
      <Section id="team" icon={<Users size={18} />} title="Team & Benutzerverwaltung">
        <FeatureCard title="Teammitglieder einladen" plans={["agentur"]}>
          <StepList steps={[
            "Klicken Sie in der App-Übersicht oben rechts auf das <strong>Personen-Symbol</strong> (Team).",
            "Klicken Sie auf <strong>«Mitglied einladen»</strong>.",
            "Geben Sie die E-Mail-Adresse des neuen Teammitglieds ein.",
            "Das Mitglied erhält eine Einladungs-E-Mail und kann sich registrieren.",
            "Nach der Registrierung hat das Mitglied Zugriff auf alle Liegenschaften des gemeinsamen Kontos.",
          ]} />
          <Callout>
            Die Benutzerverwaltung ist ausschliesslich im <strong>Agentur-Plan</strong> verfügbar. Im Free- und Privat-Plan ist nur ein Benutzer pro Konto möglich.
          </Callout>
        </FeatureCard>

        <FeatureCard title="Mitglieder verwalten & entfernen" plans={["agentur"]}>
          <p>In der Team-Übersicht sehen Sie alle aktiven Mitglieder mit ihrem Status. Sie können Mitglieder jederzeit <strong>entfernen</strong> – ihr Zugriff wird sofort gesperrt. Protokolle, die von entfernten Mitgliedern erstellt wurden, bleiben erhalten.</p>
        </FeatureCard>

        <FeatureCard title="Shared Account" plans={["agentur"]}>
          <p>Alle Teammitglieder teilen <strong>denselben Account</strong> (dieselben Liegenschaften und Protokolle). Es gibt keine rollenbasierte Zugriffskontrolle – alle Mitglieder haben vollen Zugriff auf alle Daten des Accounts.</p>
        </FeatureCard>
      </Section>

      {/* Sicherheit */}
      <Section id="sicherheit" icon={<ShieldCheck size={18} />} title="Sicherheit & Zwei-Faktor-Authentifizierung">
        <FeatureCard title="Zwei-Faktor-Authentifizierung (2FA)" plans={["free", "privat", "agentur"]}>
          <StepList steps={[
            "Klicken Sie in der App-Übersicht oben rechts auf das <strong>Schloss-Symbol</strong> (Sicherheit).",
            "Aktivieren Sie die <strong>Zwei-Faktor-Authentifizierung</strong> mit dem Toggle-Schalter.",
            "Sie erhalten sofort einen 6-stelligen Code per E-Mail zur Bestätigung.",
            "Ab sofort müssen Sie bei jedem Login zusätzlich zum Passwort einen Code eingeben, der an Ihre E-Mail gesendet wird.",
          ]} />
          <p className="mt-2">Der Code ist <strong>10 Minuten</strong> gültig. Sie können 2FA jederzeit wieder deaktivieren – ein Bestätigungscode ist auch dafür erforderlich.</p>
        </FeatureCard>
        <FeatureCard title="Passwort ändern" plans={["free", "privat", "agentur"]}>
          <p>Passwortänderungen sind über die <strong>«Passwort vergessen»</strong>-Funktion auf der Login-Seite möglich. Sie erhalten einen Reset-Link per E-Mail.</p>
        </FeatureCard>
      </Section>

      {/* Abonnement */}
      <Section id="abonnement" icon={<CreditCard size={18} />} title="Abonnement & Pläne">
        <FeatureCard title="Planvergleich" plans={["free", "privat", "agentur"]}>
          <div className="overflow-x-auto mt-1">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-2 pr-4 font-semibold">Funktion</th>
                  <th className="text-center py-2 px-2 font-semibold">Free</th>
                  <th className="text-center py-2 px-2 font-semibold">Privat</th>
                  <th className="text-center py-2 px-2 font-semibold">Agentur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                <tr><td className="py-1.5 pr-4">Liegenschaften</td><td className="text-center px-2">1</td><td className="text-center px-2">1</td><td className="text-center px-2">50</td></tr>
                <tr><td className="py-1.5 pr-4">Protokolle / Liegenschaft</td><td className="text-center px-2">1</td><td className="text-center px-2">30</td><td className="text-center px-2">30</td></tr>
                <tr><td className="py-1.5 pr-4">Fotodokumentation</td><td className="text-center px-2">✓</td><td className="text-center px-2">✓</td><td className="text-center px-2">✓</td></tr>
                <tr><td className="py-1.5 pr-4">Digitale Signaturen</td><td className="text-center px-2">✓</td><td className="text-center px-2">✓</td><td className="text-center px-2">✓</td></tr>
                <tr><td className="py-1.5 pr-4">Mieter-Link</td><td className="text-center px-2">✓</td><td className="text-center px-2">✓</td><td className="text-center px-2">✓</td></tr>
                <tr><td className="py-1.5 pr-4">PDF-Export</td><td className="text-center px-2">✓</td><td className="text-center px-2">✓</td><td className="text-center px-2">✓</td></tr>
                <tr><td className="py-1.5 pr-4">Wasserzeichen im PDF</td><td className="text-center px-2">✓</td><td className="text-center px-2">–</td><td className="text-center px-2">–</td></tr>
                <tr><td className="py-1.5 pr-4">2FA</td><td className="text-center px-2">✓</td><td className="text-center px-2">✓</td><td className="text-center px-2">✓</td></tr>
                <tr><td className="py-1.5 pr-4">Teammitglieder</td><td className="text-center px-2">–</td><td className="text-center px-2">–</td><td className="text-center px-2">✓</td></tr>
              </tbody>
            </table>
          </div>
        </FeatureCard>

        <FeatureCard title="Abonnement verwalten" plans={["privat", "agentur"]}>
          <p>Klicken Sie in der App-Übersicht oben rechts auf den Plan-Badge (z.B. «Privat»). Im Bereich <strong>Billing</strong> können Sie:</p>
          <ul className="list-disc pl-4 space-y-1 mt-2">
            <li>Ihren aktuellen Plan und nächstes Abrechnungsdatum einsehen</li>
            <li>Zwischen Monats- und Jahresabo wechseln</li>
            <li>Auf einen höheren Plan upgraden</li>
            <li>Das Abonnement kündigen</li>
          </ul>
        </FeatureCard>

        <FeatureCard title="Upgrade & Downgrade" plans={["free", "privat", "agentur"]}>
          <p>Sie können jederzeit upgraden. Das Upgrade wird sofort wirksam, die Differenz wird anteilig berechnet. Ein Downgrade wird zum Ende des aktuellen Abrechnungszeitraums wirksam.</p>
        </FeatureCard>
      </Section>

    </div>
  );
}

function ENContent() {
  return (
    <div className="space-y-14">

      {/* Quick Start */}
      <Section id="schnellstart" icon={<ChevronRight size={18} />} title="Quick Start">
        <FeatureCard title="Your first protocol in 5 steps" plans={["free", "privat", "agentur"]}>
          <StepList steps={[
            "<strong>Create an account</strong> – Sign up at <a href='https://app.immoprotokoll.com' class='underline font-medium'>app.immoprotokoll.com</a> with your email address.",
            "<strong>Add a property</strong> – Click «+ New Property» and enter the name, address, and protocol language.",
            "<strong>Start a protocol</strong> – Select the property, click «New Protocol» and choose the type (move-in or move-out).",
            "<strong>Walk through rooms</strong> – Add the condition for each room, upload photos, and note any defects.",
            "<strong>Sign & complete</strong> – Collect digital signatures from all parties and generate the final PDF.",
          ]} />
        </FeatureCard>
        <Callout>
          All protocols are saved in real time. You can pause at any time and continue on another device.
        </Callout>
      </Section>

      {/* Properties */}
      <Section id="liegenschaften" icon={<Building2 size={18} />} title="Properties">
        <FeatureCard title="Adding a property" plans={["free", "privat", "agentur"]}>
          <p>Click <strong>«+ New Property»</strong> on the home screen and fill in the following fields:</p>
          <ul className="list-disc pl-4 space-y-1 mt-2">
            <li><strong>Name</strong> – e.g. "123 Main Street, Apt. 3B"</li>
            <li><strong>Address</strong> – full postal address</li>
            <li><strong>Protocol language</strong> – German (CH), German (DE), or English. This determines the language of the generated PDF.</li>
          </ul>
          <div className="mt-3">
            <PlanBadges plans={["free", "privat"]} />
            <p className="mt-1 text-neutral-500 text-xs">Max. 1 property</p>
            <PlanBadges plans={["agentur"]} />
            <p className="mt-1 text-neutral-500 text-xs">Up to 50 properties</p>
          </div>
        </FeatureCard>

        <FeatureCard title="Editing & deleting a property" plans={["free", "privat", "agentur"]}>
          <p>Click the <strong>pencil icon</strong> next to a property to change its name, address, or protocol language. Use the <strong>trash icon</strong> to delete the property including all associated protocols.</p>
        </FeatureCard>

        <FeatureCard title="Property photo" plans={["free", "privat", "agentur"]}>
          <p>Use the <strong>camera icon</strong> on a property card to upload a cover photo that appears in the protocol and the overview.</p>
        </FeatureCard>
      </Section>

      {/* Protocols */}
      <Section id="protokolle" icon={<FileText size={18} />} title="Creating & Managing Protocols">
        <FeatureCard title="Creating a new protocol" plans={["free", "privat", "agentur"]}>
          <StepList steps={[
            "Select the desired property on the home screen.",
            "Click <strong>«New Protocol»</strong>.",
            "Select the <strong>type</strong>: <em>Move-In</em> or <em>Move-Out</em>.",
            "The protocol is immediately created and saved.",
          ]} />
          <div className="mt-3">
            <PlanBadges plans={["free"]} />
            <p className="mt-1 text-neutral-500 text-xs">Max. 1 protocol per property</p>
            <PlanBadges plans={["privat", "agentur"]} />
            <p className="mt-1 text-neutral-500 text-xs">Up to 30 protocols per property</p>
          </div>
        </FeatureCard>

        <FeatureCard title="Documenting rooms & conditions" plans={["free", "privat", "agentur"]}>
          <p>In the protocol editor you can add any number of rooms:</p>
          <ul className="list-disc pl-4 space-y-1 mt-2">
            <li>Click <strong>«+ Add Room»</strong> and give it a name (e.g. «Living Room», «Upstairs Bathroom»).</li>
            <li>Record the <strong>condition</strong> (Good, Defects, etc.) with an optional note for each room.</li>
            <li>Use the <strong>counters</strong> for keys, remote controls, and other handover items.</li>
            <li>All changes are saved automatically in real time and can be force-synced with the <strong>↻</strong> icon.</li>
          </ul>
        </FeatureCard>

        <FeatureCard title="Photo documentation" plans={["free", "privat", "agentur"]}>
          <p>You can upload any number of photos per room directly from the camera or gallery. Photos are stored in the protocol and appear in the PDF.</p>
          <StepList steps={[
            "Open a room in the protocol editor.",
            "Click the <strong>camera icon</strong> in the room.",
            "Select a file or take a photo directly.",
            "The photo appears instantly in the room and in the shared tenant link.",
          ]} />
        </FeatureCard>

        <FeatureCard title="Protocol data & tenants" plans={["free", "privat", "agentur"]}>
          <p>In the <strong>«Protocol Data»</strong> section you record:</p>
          <ul className="list-disc pl-4 space-y-1 mt-2">
            <li>Date and time of handover</li>
            <li>Name and contact details of the landlord / property manager</li>
            <li>Name, email, and contact details of the tenant</li>
            <li>Any witnesses or representatives</li>
          </ul>
        </FeatureCard>

        <FeatureCard title="Archiving & deleting protocols" plans={["free", "privat", "agentur"]}>
          <p>Completed protocols remain in the property archive. Via the context menu you can <strong>duplicate</strong> a protocol (e.g. as a basis for the next move-in) or <strong>delete</strong> it.</p>
        </FeatureCard>
      </Section>

      {/* Tenant View */}
      <Section id="mieteransicht" icon={<Share2 size={18} />} title="Tenant View & Digital Signatures">
        <FeatureCard title="Shared tenant link" plans={["free", "privat", "agentur"]}>
          <p>Every protocol has a <strong>public link</strong> that you can send to the tenant via email or SMS. Through this link, the tenant can:</p>
          <ul className="list-disc pl-4 space-y-1 mt-2">
            <li>View all rooms and photos</li>
            <li>Digitally sign the protocol</li>
            <li>Track the status in real time</li>
          </ul>
          <p className="mt-2">Find the link in the protocol editor at the top right under the <strong>share icon</strong>.</p>
          <p className="text-neutral-500 text-xs mt-1">Format: <code>immoprotokoll.com/app/#/view/[ID]</code></p>
        </FeatureCard>

        <FeatureCard title="Digital signatures" plans={["free", "privat", "agentur"]}>
          <StepList steps={[
            "Complete the documentation for all rooms.",
            "Click <strong>«Signatures»</strong> in the protocol editor.",
            "Landlord and tenant sign directly via <strong>touchscreen or mouse</strong> in the browser.",
            "Alternatively: the tenant receives the shared link and signs on their own device.",
            "After all signatures, the protocol can be exported as a PDF.",
          ]} />
        </FeatureCard>

        <FeatureCard title="Invite tenant by email" plans={["free", "privat", "agentur"]}>
          <p>Use the <strong>«Invite Tenant»</strong> button in the protocol to send an email with the view link directly from the app. The email contains a summary and the direct link to the protocol.</p>
        </FeatureCard>
      </Section>

      {/* PDF */}
      <Section id="pdf" icon={<FileDown size={18} />} title="PDF Export">
        <FeatureCard title="Generate & download PDF" plans={["free", "privat", "agentur"]}>
          <StepList steps={[
            "Open the protocol in the editor.",
            "Click <strong>«Export PDF»</strong>.",
            "The PDF is generated server-side and is immediately ready for download.",
            "The PDF includes: cover page, all rooms with conditions and photos, signatures.",
          ]} />
        </FeatureCard>
        <FeatureCard title="Watermark" plans={["free"]}>
          <p>In the <strong>Free plan</strong>, all generated PDFs include an «ImmoProtokoll» watermark. This is removed in the <strong>Privat</strong> and <strong>Agentur</strong> plans.</p>
        </FeatureCard>
        <FeatureCard title="PDF without watermark" plans={["privat", "agentur"]}>
          <p>With a paid plan you receive a <strong>clean, professional PDF</strong> without watermarks that you can share directly with tenants and authorities.</p>
        </FeatureCard>
      </Section>

      {/* Language */}
      <Section id="sprache" icon={<Globe size={18} />} title="Language Settings">
        <FeatureCard title="Property language" plans={["free", "privat", "agentur"]}>
          <p>When creating or editing a property, you can set the <strong>protocol language</strong>. This determines:</p>
          <ul className="list-disc pl-4 space-y-1 mt-2">
            <li>The language of the generated PDF</li>
            <li>The language of automated emails to the tenant</li>
            <li>Pre-filled room labels in the editor</li>
          </ul>
          <p className="mt-2">Available languages:</p>
          <ul className="list-disc pl-4 space-y-1 mt-1">
            <li><strong>German (Switzerland)</strong> – DE-CH</li>
            <li><strong>German (Germany)</strong> – DE-DE</li>
            <li><strong>English</strong> – EN</li>
          </ul>
        </FeatureCard>

        <FeatureCard title="App interface language" plans={["free", "privat", "agentur"]}>
          <p>The <strong>user interface</strong> language (menus, buttons, system texts) is displayed based on your browser language. You can change it in the account settings at any time. The app language is independent of the protocol language.</p>
        </FeatureCard>

        <FeatureCard title="Language per protocol" plans={["free", "privat", "agentur"]}>
          <p>The language is inherited from the property for all associated protocols. If you need protocols in different languages, create separate properties with different language settings.</p>
        </FeatureCard>
      </Section>

      {/* Team */}
      <Section id="team" icon={<Users size={18} />} title="Team & User Management">
        <FeatureCard title="Inviting team members" plans={["agentur"]}>
          <StepList steps={[
            "Click the <strong>people icon</strong> (Team) in the top right of the app overview.",
            "Click <strong>«Invite Member»</strong>.",
            "Enter the email address of the new team member.",
            "They receive an invitation email and can register.",
            "After registration they have access to all properties of the shared account.",
          ]} />
          <Callout>
            User management is exclusively available in the <strong>Agentur plan</strong>. The Free and Privat plans support only one user per account.
          </Callout>
        </FeatureCard>

        <FeatureCard title="Managing & removing members" plans={["agentur"]}>
          <p>In the team overview you can see all active members with their status. You can <strong>remove</strong> members at any time – their access is immediately revoked. Protocols created by removed members are retained.</p>
        </FeatureCard>

        <FeatureCard title="Shared account" plans={["agentur"]}>
          <p>All team members share <strong>the same account</strong> (same properties and protocols). There is no role-based access control – all members have full access to all account data.</p>
        </FeatureCard>
      </Section>

      {/* Security */}
      <Section id="sicherheit" icon={<ShieldCheck size={18} />} title="Security & Two-Factor Authentication">
        <FeatureCard title="Two-factor authentication (2FA)" plans={["free", "privat", "agentur"]}>
          <StepList steps={[
            "Click the <strong>lock icon</strong> (Security) in the top right of the app overview.",
            "Enable <strong>two-factor authentication</strong> using the toggle switch.",
            "You immediately receive a 6-digit confirmation code by email.",
            "From now on, you will need to enter a code sent to your email in addition to your password at each login.",
          ]} />
          <p className="mt-2">The code is valid for <strong>10 minutes</strong>. You can disable 2FA at any time – a confirmation code is required for this as well.</p>
        </FeatureCard>
        <FeatureCard title="Changing your password" plans={["free", "privat", "agentur"]}>
          <p>Password changes are possible via the <strong>«Forgot Password»</strong> function on the login page. You will receive a reset link by email.</p>
        </FeatureCard>
      </Section>

      {/* Subscription */}
      <Section id="abonnement" icon={<CreditCard size={18} />} title="Subscription & Plans">
        <FeatureCard title="Plan comparison" plans={["free", "privat", "agentur"]}>
          <div className="overflow-x-auto mt-1">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="text-left py-2 pr-4 font-semibold">Feature</th>
                  <th className="text-center py-2 px-2 font-semibold">Free</th>
                  <th className="text-center py-2 px-2 font-semibold">Privat</th>
                  <th className="text-center py-2 px-2 font-semibold">Agentur</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                <tr><td className="py-1.5 pr-4">Properties</td><td className="text-center px-2">1</td><td className="text-center px-2">1</td><td className="text-center px-2">50</td></tr>
                <tr><td className="py-1.5 pr-4">Protocols / property</td><td className="text-center px-2">1</td><td className="text-center px-2">30</td><td className="text-center px-2">30</td></tr>
                <tr><td className="py-1.5 pr-4">Photo documentation</td><td className="text-center px-2">✓</td><td className="text-center px-2">✓</td><td className="text-center px-2">✓</td></tr>
                <tr><td className="py-1.5 pr-4">Digital signatures</td><td className="text-center px-2">✓</td><td className="text-center px-2">✓</td><td className="text-center px-2">✓</td></tr>
                <tr><td className="py-1.5 pr-4">Tenant link</td><td className="text-center px-2">✓</td><td className="text-center px-2">✓</td><td className="text-center px-2">✓</td></tr>
                <tr><td className="py-1.5 pr-4">PDF export</td><td className="text-center px-2">✓</td><td className="text-center px-2">✓</td><td className="text-center px-2">✓</td></tr>
                <tr><td className="py-1.5 pr-4">PDF watermark</td><td className="text-center px-2">✓</td><td className="text-center px-2">–</td><td className="text-center px-2">–</td></tr>
                <tr><td className="py-1.5 pr-4">2FA</td><td className="text-center px-2">✓</td><td className="text-center px-2">✓</td><td className="text-center px-2">✓</td></tr>
                <tr><td className="py-1.5 pr-4">Team members</td><td className="text-center px-2">–</td><td className="text-center px-2">–</td><td className="text-center px-2">✓</td></tr>
              </tbody>
            </table>
          </div>
        </FeatureCard>

        <FeatureCard title="Managing your subscription" plans={["privat", "agentur"]}>
          <p>Click the plan badge (e.g. «Privat») in the top right of the app overview. In the <strong>Billing</strong> section you can:</p>
          <ul className="list-disc pl-4 space-y-1 mt-2">
            <li>View your current plan and next billing date</li>
            <li>Switch between monthly and annual billing</li>
            <li>Upgrade to a higher plan</li>
            <li>Cancel your subscription</li>
          </ul>
        </FeatureCard>

        <FeatureCard title="Upgrading & downgrading" plans={["free", "privat", "agentur"]}>
          <p>You can upgrade at any time. Upgrades take effect immediately and the difference is calculated on a pro-rata basis. Downgrades take effect at the end of the current billing period.</p>
        </FeatureCard>
      </Section>

    </div>
  );
}

export default function HelpPage() {
  const { lang } = useLanguage();
  const [activeSection, setActiveSection] = useState("schnellstart");

  const isDE = lang === "de";

  useSEO({
    title: isDE
      ? "Hilfe & Anleitung – ImmoProtokoll"
      : "Help & Documentation – ImmoProtokoll",
    description: isDE
      ? "Vollständige Anleitung zu allen Funktionen von ImmoProtokoll – Liegenschaften, Protokolle, Signaturen, PDF-Export, Team und Sicherheit."
      : "Complete guide to all ImmoProtokoll features – properties, protocols, signatures, PDF export, team management, and security.",
    lang,
    path: isDE ? "/hilfe" : "/en/help",
  });

  const navSections = isDE ? NAV_SECTIONS.de : NAV_SECTIONS.en;

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      { rootMargin: "-20% 0px -70% 0px" }
    );
    const sections = document.querySelectorAll("section[id]");
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, []);

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-white text-black font-sans flex flex-col">
      <Navbar />

      {/* Hero */}
      <div className="bg-black text-white py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-white/10 text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-4">
            {isDE ? "Dokumentation" : "Documentation"}
          </div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight mb-3">
            {isDE ? "Hilfe & Anleitung" : "Help & Documentation"}
          </h1>
          <p className="text-white/60 text-base max-w-xl">
            {isDE
              ? "Alles was Sie wissen müssen, um ImmoProtokoll optimal zu nutzen."
              : "Everything you need to know to get the most out of ImmoProtokoll."}
          </p>
          <div className="flex flex-wrap gap-2 mt-5 text-xs">
            <span className="text-white/40 self-center">{isDE ? "Plan-Legende:" : "Plan legend:"}</span>
            {(["free", "privat", "agentur"] as Plan[]).map((p) => (
              <PlanBadge key={p} plan={p} />
            ))}
          </div>
        </div>
      </div>

      {/* Main layout */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-10 flex gap-10">
        {/* Sidebar nav — desktop */}
        <aside className="hidden md:block w-52 flex-shrink-0">
          <nav className="sticky top-24 space-y-0.5">
            {navSections.map((s) => (
              <button
                key={s.id}
                onClick={() => scrollTo(s.id)}
                className={`w-full text-left text-sm px-3 py-2 rounded-lg transition-colors ${
                  activeSection === s.id
                    ? "bg-black text-white font-medium"
                    : "text-neutral-500 hover:bg-neutral-100 hover:text-black"
                }`}
              >
                {s.label}
              </button>
            ))}
            <div className="pt-4 mt-4 border-t border-neutral-200">
              <a
                href="https://app.immoprotokoll.com/"
                className="block text-center bg-black text-white text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-black/80 transition-colors"
              >
                {isDE ? "App öffnen →" : "Open App →"}
              </a>
            </div>
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          {isDE ? <DEContent /> : <ENContent />}

          {/* Support CTA */}
          <div className="mt-16 bg-neutral-50 border border-neutral-200 rounded-2xl p-7 text-center">
            <h3 className="font-black text-lg mb-2">
              {isDE ? "Noch Fragen?" : "Still have questions?"}
            </h3>
            <p className="text-neutral-500 text-sm mb-4">
              {isDE
                ? "Unser Support-Team hilft gerne weiter."
                : "Our support team is happy to help."}
            </p>
            <a
              href="mailto:support@immoprotokoll.com"
              className="inline-block bg-black text-white text-sm font-bold px-6 py-2.5 rounded-lg hover:bg-black/80 transition-colors"
            >
              support@immoprotokoll.com
            </a>
          </div>
        </main>
      </div>

      <Footer />
    </div>
  );
}
