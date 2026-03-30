import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { LanguageProvider, useLanguage } from "./i18n";
import { useEffect } from "react";

import LandingPage from "./pages/LandingPage";
import PrivacyPage from "./pages/PrivacyPage";
import TermsPage from "./pages/TermsPage";
import ImprintPage from "./pages/ImprintPage";

const queryClient = new QueryClient();

// A wrapper to handle the language prefix
function RouteWrapper({ component: Component, lang }: { component: any, lang: "de" | "en" }) {
  return (
    <LanguageProvider initialLang={lang}>
      <Component />
    </LanguageProvider>
  );
}

function AutoRedirect() {
  const [, setLocation] = useLocation();
  
  useEffect(() => {
    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith("de")) {
      setLocation("/de", { replace: true });
    } else {
      setLocation("/en", { replace: true });
    }
  }, [setLocation]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={AutoRedirect} />
      
      <Route path="/de">
        {() => <RouteWrapper component={LandingPage} lang="de" />}
      </Route>
      <Route path="/en">
        {() => <RouteWrapper component={LandingPage} lang="en" />}
      </Route>

      <Route path="/de/datenschutz">
        {() => <RouteWrapper component={PrivacyPage} lang="de" />}
      </Route>
      <Route path="/en/privacy">
        {() => <RouteWrapper component={PrivacyPage} lang="en" />}
      </Route>

      <Route path="/de/agb">
        {() => <RouteWrapper component={TermsPage} lang="de" />}
      </Route>
      <Route path="/en/terms">
        {() => <RouteWrapper component={TermsPage} lang="en" />}
      </Route>

      <Route path="/de/impressum">
        {() => <RouteWrapper component={ImprintPage} lang="de" />}
      </Route>
      <Route path="/en/imprint">
        {() => <RouteWrapper component={ImprintPage} lang="en" />}
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
