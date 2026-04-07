import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { LanguageProvider, useLanguage } from "./i18n";
import { useEffect } from "react";

const SEO_META: Record<"de" | "en", { title: string; description: string; ogTitle: string; ogDescription: string; lang: string; ogLocale: string }> = {
  de: {
    lang: "de",
    ogLocale: "de_CH",
    title: "ImmoProtokoll – Digitales Übergabeprotokoll für Vermieter",
    description: "Ersetzen Sie Klemmbrett und Papier durch einen makellosen digitalen Workflow. Übergabeprotokolle erstellen, unterschreiben und archivieren – für private Vermieter und Immobilienagenturen.",
    ogTitle: "ImmoProtokoll – Digitales Übergabeprotokoll für Vermieter",
    ogDescription: "Ersetzen Sie Klemmbrett und Papier durch einen makellosen digitalen Workflow. Übergabeprotokolle erstellen, unterschreiben und archivieren – für private Vermieter und Immobilienagenturen.",
  },
  en: {
    lang: "en",
    ogLocale: "en_US",
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

function useDocumentSeo(lang: "de" | "en") {
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
}

import LandingPage from "./pages/LandingPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import ImprintPage from "./pages/ImprintPage";
import HelpPage from "./pages/HelpPage";

const queryClient = new QueryClient();

function SeoUpdater({ lang }: { lang: "de" | "en" }) {
  useDocumentSeo(lang);
  return null;
}

function RouteWrapper({ component: Component, lang }: { component: any, lang: "de" | "en" }) {
  return (
    <LanguageProvider initialLang={lang}>
      <SeoUpdater lang={lang} />
      <Component />
    </LanguageProvider>
  );
}

function RedirectTo({ to }: { to: string }) {
  const [, setLocation] = useLocation();
  useEffect(() => { setLocation(to, { replace: true }); }, [to, setLocation]);
  return null;
}

function Router() {
  return (
    <Switch>
      {/* Root = German (no redirect, no /de/ prefix) */}
      <Route path="/">
        {() => <RouteWrapper component={LandingPage} lang="de" />}
      </Route>

      {/* English */}
      <Route path="/en">
        {() => <RouteWrapper component={LandingPage} lang="en" />}
      </Route>

      {/* DE sub-pages — no /de/ prefix */}
      <Route path="/datenschutz">
        {() => <RouteWrapper component={PrivacyPage} lang="de" />}
      </Route>
      <Route path="/agb">
        {() => <RouteWrapper component={TermsPage} lang="de" />}
      </Route>
      <Route path="/impressum">
        {() => <RouteWrapper component={ImprintPage} lang="de" />}
      </Route>

      {/* Help pages */}
      <Route path="/hilfe">
        {() => <RouteWrapper component={HelpPage} lang="de" />}
      </Route>
      <Route path="/en/help">
        {() => <RouteWrapper component={HelpPage} lang="en" />}
      </Route>

      {/* EN sub-pages */}
      <Route path="/en/privacy">
        {() => <RouteWrapper component={PrivacyPage} lang="en" />}
      </Route>
      <Route path="/en/terms">
        {() => <RouteWrapper component={TermsPage} lang="en" />}
      </Route>
      <Route path="/en/imprint">
        {() => <RouteWrapper component={ImprintPage} lang="en" />}
      </Route>

      {/* Legacy /de/* → redirect to root equivalents */}
      <Route path="/de">
        {() => <RedirectTo to="/" />}
      </Route>
      <Route path="/de/datenschutz">
        {() => <RedirectTo to="/datenschutz" />}
      </Route>
      <Route path="/de/agb">
        {() => <RedirectTo to="/agb" />}
      </Route>
      <Route path="/de/impressum">
        {() => <RedirectTo to="/impressum" />}
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
