import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { LanguageProvider } from "./i18n";
import { useEffect } from "react";
import type { Language } from "./translations";

import LandingPage from "./pages/LandingPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import ImprintPage from "./pages/ImprintPage";
import HelpPage from "./pages/HelpPage";

const queryClient = new QueryClient();

const SEO_META: Record<Language, {
  title: string; description: string;
  ogTitle: string; ogDescription: string;
  lang: string; ogLocale: string;
}> = {
  de: {
    lang: "de", ogLocale: "de_CH",
    title: "ImmoProtokoll – Digitales Übergabeprotokoll für Vermieter",
    description: "Ersetzen Sie Klemmbrett und Papier durch einen makellosen digitalen Workflow. Übergabeprotokolle erstellen, unterschreiben und archivieren – für private Vermieter und Immobilienagenturen.",
    ogTitle: "ImmoProtokoll – Digitales Übergabeprotokoll für Vermieter",
    ogDescription: "Ersetzen Sie Klemmbrett und Papier durch einen makellosen digitalen Workflow. Übergabeprotokolle erstellen, unterschreiben und archivieren – für private Vermieter und Immobilienagenturen.",
  },
  en: {
    lang: "en", ogLocale: "en_US",
    title: "ImmoProtokoll – Digital Property Handover Protocol",
    description: "Replace clipboards and paper with a flawless digital workflow. Create, sign and archive property handover protocols – for landlords and real estate agencies.",
    ogTitle: "ImmoProtokoll – Digital Property Handover Protocol",
    ogDescription: "Replace clipboards and paper with a flawless digital workflow. Create, sign and archive property handover protocols – for landlords and real estate agencies.",
  },
};

function setMeta(name: string, content: string, attr: "name" | "property" = "name") {
  let el = document.querySelector(`meta[${attr}="${name}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, name);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function RedirectTo({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation(to, { replace: true }); }, [to, setLocation]);
  return null;
}

function Routes() {
  return (
    <Switch>
      <Route path="/" component={LandingPage} />
      <Route path="/en" component={LandingPage} />

      <Route path="/datenschutz" component={PrivacyPage} />
      <Route path="/agb" component={TermsPage} />
      <Route path="/impressum" component={ImprintPage} />
      <Route path="/hilfe" component={HelpPage} />

      <Route path="/en/privacy" component={PrivacyPage} />
      <Route path="/en/terms" component={TermsPage} />
      <Route path="/en/imprint" component={ImprintPage} />
      <Route path="/en/help" component={HelpPage} />

      <Route path="/de">{() => <RedirectTo to="/" />}</Route>
      <Route path="/de/datenschutz">{() => <RedirectTo to="/datenschutz" />}</Route>
      <Route path="/de/agb">{() => <RedirectTo to="/agb" />}</Route>
      <Route path="/de/impressum">{() => <RedirectTo to="/impressum" />}</Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function AppWithLang() {
  const [location] = useLocation();

  const lang: Language = (location === "/en" || location.startsWith("/en/"))
    ? "en"
    : "de";

  useEffect(() => {
    const m = SEO_META[lang];
    document.documentElement.lang = m.lang;
    document.title = m.title;
    setMeta("title", m.title);
    setMeta("description", m.description);
    setMeta("og:title", m.ogTitle, "property");
    setMeta("og:description", m.ogDescription, "property");
    setMeta("og:locale", m.ogLocale, "property");
    setMeta("twitter:title", m.ogTitle);
    setMeta("twitter:description", m.ogDescription);
  }, [lang]);

  return (
    <LanguageProvider initialLang={lang}>
      <Routes />
    </LanguageProvider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppWithLang />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
