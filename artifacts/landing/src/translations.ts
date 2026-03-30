export type Language = "de" | "en";

export const translations = {
  de: {
    nav: {
      features: "Funktionen",
      pricing: "Preise",
      faq: "FAQ",
      start_free: "Kostenlos starten",
      login: "Anmelden"
    },
    hero: {
      title: "Jede Mietübergabe. Sauber dokumentiert.",
      subtitle: "Ersetzen Sie Klemmbrett und Papier durch einen makellosen digitalen Workflow. Für private Vermieter und Immobilienagenturen.",
      cta_primary: "Jetzt kostenlos starten",
      cta_secondary: "Mehr erfahren"
    },
    features: {
      title: "Kompromisslos professionell.",
      subtitle: "Entwickelt für Effizienz bei jedem Mieterwechsel.",
      items: [
        { title: "Digitale Fotodokumentation", desc: "Zustand lückenlos mit hochauflösenden Fotos festhalten." },
        { title: "Digitale Signaturen", desc: "Rechtsgültige Unterschriften direkt auf dem Gerät erfassen." },
        { title: "Automatischer PDF-Export", desc: "Professionelles, sauberes PDF sofort nach Abschluss generieren." },
        { title: "Teilbarer Link", desc: "Mieter können das Protokoll jederzeit online einsehen und unterzeichnen." },
        { title: "Geräteübergreifend", desc: "Beginnen Sie auf dem Tablet, schliessen Sie auf dem Desktop ab." },
        { title: "Team-Kollaboration", desc: "Verwalten Sie grosse Portfolios mit mehreren Mitarbeitern." }
      ]
    },
    walkthrough: {
      title: "In 5 Schritten zur Übergabe",
      steps: [
        { title: "Immobilie anlegen", desc: "Erfassen Sie die Grunddaten der Wohnung oder des Hauses." },
        { title: "Protokoll starten", desc: "Wählen Sie zwischen Einzug und Auszug." },
        { title: "Räume durchgehen", desc: "Dokumentieren Sie Zustand und Mängel pro Raum inklusive Fotos." },
        { title: "Digital signieren", desc: "Alle Parteien unterschreiben direkt auf dem Tablet oder Smartphone." },
        { title: "PDF archivieren", desc: "Das fertige Protokoll wird als PDF gespeichert und automatisch versendet." }
      ]
    },
    pricing: {
      title: "Transparente Preise.",
      monthly: "Monatlich",
      annual: "Jährlich",
      free: {
        name: "Free",
        price: "0",
        limits: "1 Immobilie, 1 Protokoll, Wasserzeichen",
        cta: "Jetzt kostenlos starten"
      },
      privat: {
        name: "Privat",
        price_mo: "9",
        price_yr: "86",
        limits: "1 Immobilie, 30 Protokolle, werbefrei",
        cta: "Kostenlos testen"
      },
      agentur: {
        name: "Agentur",
        price_mo: "49",
        price_yr: "470",
        limits: "50 Immobilien, 30 Protokolle/Imm., 20 Nutzer",
        cta: "Kostenlos testen"
      },
      custom: {
        name: "Custom",
        price: "Auf Anfrage",
        limits: "Individuelle Limits und Volumen",
        cta: "Auf Anfrage"
      }
    },
    faq: {
      title: "Häufig gestellte Fragen",
      questions: [
        { q: "Was ist ein Übergabeprotokoll?", a: "Ein Dokument, das den Zustand einer Immobilie bei Ein- oder Auszug festhält, um spätere Streitigkeiten zu vermeiden." },
        { q: "Sind meine Daten sicher?", a: "Ja. Wir verwenden modernste Sicherheitsstandards, verschlüsselte Datenübertragung und haben mit unserem Hostinganbieter ein Data Processing Agreement (DPA) abgeschlossen." },
        { q: "Kann ich die App auf dem Smartphone nutzen?", a: "Absolut. ImmoProtokoll ist vollständig für mobile Geräte optimiert." },
        { q: "Wie funktioniert der kostenlose Plan?", a: "Sie können 1 Immobilie anlegen und 1 Protokoll erstellen. Die PDFs enthalten ein Wasserzeichen." },
        { q: "Kann ich jederzeit wechseln?", a: "Ja, Up- und Downgrades sind jederzeit möglich." },
        { q: "Sind die Exporte rechtsgültig?", a: "Ja, die digitalen Signaturen und das unveränderliche PDF sind rechtlich bindend." },
        { q: "Benötigt der Mieter einen Account?", a: "Nein, Mieter können das Protokoll über einen sicheren Link einsehen und direkt auf Ihrem Gerät unterschreiben." },
        { q: "Wie viele Fotos kann ich anhängen?", a: "Im Privat- und Agentur-Plan unbegrenzt, im Rahmen fairer Nutzung." }
      ]
    },
    footer: {
      privacy: "Datenschutz",
      terms: "AGB",
      imprint: "Impressum",
      copyright: "© 2025 KOMUNIQUE by Philipp Roth"
    }
  },
  en: {
    nav: {
      features: "Features",
      pricing: "Pricing",
      faq: "FAQ",
      start_free: "Start free",
      login: "Log in"
    },
    hero: {
      title: "Every rental handover. Cleanly documented.",
      subtitle: "Replace clipboards and paper with a flawless digital workflow. For private landlords and real estate agencies.",
      cta_primary: "Start for free",
      cta_secondary: "Learn more"
    },
    features: {
      title: "Uncompromisingly professional.",
      subtitle: "Engineered for efficiency at every tenant change.",
      items: [
        { title: "Digital photo documentation", desc: "Capture conditions seamlessly with high-resolution photos." },
        { title: "Digital signatures", desc: "Collect legally binding signatures directly on the device." },
        { title: "Automatic PDF export", desc: "Generate a professional, clean PDF immediately upon completion." },
        { title: "Shareable link", desc: "Tenants can view and sign the protocol online at any time." },
        { title: "Cross-device", desc: "Start on a tablet, finish on your desktop." },
        { title: "Team collaboration", desc: "Manage large portfolios with multiple team members." }
      ]
    },
    walkthrough: {
      title: "5 steps to handover",
      steps: [
        { title: "Add property", desc: "Enter the basic details of the apartment or house." },
        { title: "Start protocol", desc: "Choose between move-in and move-out." },
        { title: "Walk through rooms", desc: "Document conditions and defects per room including photos." },
        { title: "Sign digitally", desc: "All parties sign directly on the tablet or smartphone." },
        { title: "Archive PDF", desc: "The finished protocol is saved as a PDF and sent automatically." }
      ]
    },
    pricing: {
      title: "Transparent pricing.",
      monthly: "Monthly",
      annual: "Annually",
      free: {
        name: "Free",
        price: "0",
        limits: "1 property, 1 protocol, watermarked",
        cta: "Start for free"
      },
      privat: {
        name: "Private",
        price_mo: "9",
        price_yr: "86",
        limits: "1 property, 30 protocols, unbranded",
        cta: "Try free"
      },
      agentur: {
        name: "Agency",
        price_mo: "49",
        price_yr: "470",
        limits: "50 properties, 30 protocols/prop, 20 users",
        cta: "Try free"
      },
      custom: {
        name: "Custom",
        price: "On request",
        limits: "Custom limits and volume",
        cta: "On request"
      }
    },
    faq: {
      title: "Frequently asked questions",
      questions: [
        { q: "What is a handover protocol?", a: "A document that records the condition of a property upon move-in or move-out to avoid later disputes." },
        { q: "Is my data secure?", a: "Yes. We use state-of-the-art security standards, encrypted data transfer, and have a Data Processing Agreement (DPA) in place with our hosting provider." },
        { q: "Can I use the app on my smartphone?", a: "Absolutely. ImmoProtokoll is fully optimized for mobile devices." },
        { q: "How does the free plan work?", a: "You can add 1 property and create 1 protocol. The exported PDFs include a watermark." },
        { q: "Can I switch plans at any time?", a: "Yes, upgrades and downgrades are possible at any time." },
        { q: "Are the exports legally valid?", a: "Yes, the digital signatures and the immutable PDF are legally binding." },
        { q: "Does the tenant need an account?", a: "No, tenants can view the protocol via a secure link and sign directly on your device." },
        { q: "How many photos can I attach?", a: "Unlimited in the Private and Agency plans, subject to fair use." }
      ]
    },
    footer: {
      privacy: "Privacy Policy",
      terms: "Terms of Service",
      imprint: "Imprint",
      copyright: "© 2025 KOMUNIQUE by Philipp Roth"
    }
  }
};
