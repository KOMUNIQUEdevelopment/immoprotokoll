import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { useProtocolsStore } from "./store";
import { Property } from "./types";
import ProtocolPage from "./pages/ProtocolPage";
import SignaturePage from "./pages/SignaturePage";
import PropertyListPage from "./pages/PropertyListPage";
import PropertyProtocolsPage from "./pages/PropertyProtocolsPage";
import PricingPage from "./pages/PricingPage";
import BillingPage from "./pages/BillingPage";
import SuperadminPage from "./pages/SuperadminPage";
import TeamPage from "./pages/TeamPage";
import TenantViewPage from "./pages/TenantViewPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import { exportToPDF, exportPhotosAsZip } from "./pdfExport";
import { useSwUpdate } from "./hooks/useSwUpdate";
import { PwaInstallBanner } from "./components/PwaInstallBanner";
import { useSync } from "./hooks/useSync";
import { useAuth } from "./hooks/useAuth";
import { useBilling } from "./hooks/useBilling";
import i18n, { LANGUAGE_LABELS, SUPPORTED_LANGUAGES, type SupportedLanguage, getTranslations } from "./i18n";
import {
  Save,
  FileDown,
  ClipboardList,
  PenLine,
  CheckCircle2,
  Wifi,
  WifiOff,
  X,
  RefreshCw,
  ArrowLeft,
  FolderArchive,
  Cloud,
  CloudOff,
  Globe,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const queryClient = new QueryClient();

function formatRelative(date: Date | null, t: (key: string, opts?: Record<string, unknown>) => string): string {
  if (!date) return "";
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 5) return t("common.savedJustNow");
  if (diff < 60) return t("common.savedSecondsAgo", { count: diff });
  if (diff < 3600) return t("common.savedMinutesAgo", { count: Math.floor(diff / 60) });
  const locale = i18n.language === "de-CH" ? "de-CH" : i18n.language === "de-DE" ? "de-DE" : "en-GB";
  return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
}

type EditorTab = "protokoll" | "unterschriften";

type AppScreen = "protocols" | "pricing" | "billing" | "billing-success" | "billing-cancel" | "superadmin" | "team";

function LanguageSelector({
  currentLang,
  onChangeLang,
}: {
  currentLang: string;
  onChangeLang: (lang: SupportedLanguage) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        title={LANGUAGE_LABELS[currentLang as SupportedLanguage] ?? currentLang}
        className="flex items-center gap-1 p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-black transition-colors"
      >
        <Globe size={15} />
        <span className="text-xs font-medium hidden sm:inline">
          {currentLang === "de-CH" ? "DE-CH" : currentLang === "de-DE" ? "DE-DE" : "EN"}
        </span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-9 z-50 bg-white border border-neutral-200 rounded-xl shadow-xl min-w-[180px] py-1 overflow-hidden">
            {SUPPORTED_LANGUAGES.map(lang => (
              <button
                key={lang}
                type="button"
                onClick={() => { onChangeLang(lang); setOpen(false); }}
                className={`w-full text-left px-4 py-2 text-sm transition-colors hover:bg-neutral-50 ${
                  currentLang === lang ? "font-semibold text-black" : "text-neutral-700"
                }`}
              >
                {LANGUAGE_LABELS[lang]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function AppContent({
  onLogout,
  accountId,
  userId,
  account,
  userRole,
  userLang,
  initialScreen = "protocols",
  onChangeLang,
  isSuperAdmin,
  isImpersonating,
  onEndImpersonation,
}: {
  onLogout: () => void;
  accountId: string;
  userId: string;
  account: { plan: "free" | "privat" | "agentur" | "custom" } | null;
  userRole?: "owner" | "administrator" | "property_manager";
  userLang: string;
  initialScreen?: AppScreen;
  onChangeLang: (lang: SupportedLanguage) => void;
  isSuperAdmin?: boolean;
  isImpersonating?: boolean;
  onEndImpersonation?: () => Promise<void>;
}) {
  const { t } = useTranslation();
  const {
    protocols,
    trashedProtocols,
    currentProtocol,
    currentId,
    isEditing,
    createNew,
    duplicateProtocol,
    switchTo,
    backToList,
    deleteProtocol,
    deleteProtocolsForProperty,
    restoreFromTrash,
    permanentlyDelete,
    emptyTrash,
    renameProtocol,
    updateProtocol,
    toggleSync,
    receiveInit,
    receiveRemote,
    receiveDelete,
    manualSave,
    isSaving,
    lastSaved,
    wsSendRef,
  } = useProtocolsStore(accountId);

  const [activeTab, setActiveTab] = useState<EditorTab>("protokoll");
  const [isExporting, setIsExporting] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [appScreen, setAppScreen] = useState<AppScreen>(initialScreen);
  const { toast } = useToast();
  const billing = useBilling();

  const { needsUpdate, applyUpdate, dismiss: dismissUpdate } = useSwUpdate();
  const { status: syncStatus } = useSync({
    onInit: receiveInit,
    onUpdate: receiveRemote,
    onDelete: receiveDelete,
    onError: (err) => {
      if (err.code === "PROTOCOL_LIMIT_EXCEEDED") {
        toast({
          title: t("protocols.protocolLimitReached"),
          description: err.message || t("protocols.protocolLimitHint"),
          variant: "destructive",
        });
      }
    },
    sendRef: wsSendRef,
  });

  const propertyLang = (selectedProperty?.language ?? "de-CH") as SupportedLanguage;
  const tr = getTranslations(propertyLang);

  const handleExport = async () => {
    if (!currentProtocol) return;
    setIsExporting(true);
    try {
      const freePlan = !account || account.plan === "free";
      await exportToPDF(currentProtocol, { watermark: freePlan, language: propertyLang });
      toast({ title: tr.protocols.pdfExported, description: tr.protocols.pdfExportSuccess });
    } catch (e) {
      console.error(e);
      toast({
        title: tr.protocols.pdfExportError,
        description: tr.protocols.pdfExportErrorHint,
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleZipExport = async () => {
    if (!currentProtocol) return;
    const totalPhotos =
      (currentProtocol.meterPhotos?.length ?? 0) +
      (currentProtocol.kitchenPhotos?.length ?? 0) +
      currentProtocol.rooms.reduce((s, r) => s + r.photos.length, 0);
    if (totalPhotos === 0) {
      toast({ title: tr.protocols.noPhotos, description: tr.protocols.noPhotosHint });
      return;
    }
    setIsZipping(true);
    try {
      const freePlan = !account || account.plan === "free";
      await exportPhotosAsZip(currentProtocol, { watermark: freePlan, language: propertyLang });
      toast({ title: tr.protocols.zipExported, description: tr.protocols.zipExportedCount.replace("{{count}}", String(totalPhotos)).replace("{{plural}}", totalPhotos !== 1 ? "s" : "") });
    } catch (e) {
      console.error(e);
      toast({ title: tr.protocols.pdfExportError, description: tr.protocols.pdfExportErrorHint, variant: "destructive" });
    } finally {
      setIsZipping(false);
    }
  };

  const handleSave = () => {
    manualSave();
    toast({ title: tr.protocols.savedMsg, description: tr.protocols.savedMsgHint });
  };

  const handleCreate = () => {
    createNew(selectedProperty?.id ?? null, {
      applianceNames: tr.editor.defaultAppliances as unknown as string[],
      meterTypes: tr.editor.defaultMeterTypes as unknown as string[],
      zusatzvereinbarungTitle: "",
    });
    setActiveTab("protokoll");
  };

  const handleOpen = (id: string) => {
    switchTo(id);
    setActiveTab("protokoll");
  };

  const handleBackToList = () => {
    backToList();
  };

  const allSigned =
    currentProtocol &&
    currentProtocol.uebergeber.length > 0 &&
    currentProtocol.uebernehmer.length > 0 &&
    [...currentProtocol.uebergeber, ...currentProtocol.uebernehmer].every(p =>
      currentProtocol.personSignatures.some(
        s => s.personId === p.id && s.signatureDataUrl !== null
      )
    );

  const globalImpersonationBanner = isImpersonating && onEndImpersonation ? (
    <div
      style={{
        background: "hsl(0 0% 8%)",
        color: "hsl(0 0% 100%)",
        padding: "6px 16px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        fontSize: "12px",
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        gap: "8px",
      }}
    >
      <span style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <span style={{ opacity: 0.6, fontSize: "10px" }}>▶</span>
        Superadmin-Modus: Ansicht als anderes Konto
      </span>
      <button
        onClick={() => { void onEndImpersonation(); }}
        style={{
          background: "hsl(0 0% 100%)",
          color: "hsl(0 0% 8%)",
          border: "none",
          borderRadius: "3px",
          padding: "3px 10px",
          cursor: "pointer",
          fontSize: "11px",
          fontWeight: 700,
          whiteSpace: "nowrap",
          flexShrink: 0,
        }}
      >
        Beenden
      </button>
    </div>
  ) : null;

  if (!isEditing) {
    if (appScreen === "billing-success") {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="max-w-md w-full mx-auto px-6 py-12 text-center space-y-6">
            <div className="w-16 h-16 rounded-full border-2 border-black flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-black" />
            </div>
            <h1 className="text-2xl font-semibold text-black">{t("billing.activatedTitle")}</h1>
            <p className="text-sm text-neutral-600">{t("billing.activatedDesc")}</p>
            <button
              className="inline-flex items-center gap-2 px-6 py-2 border border-black rounded-md text-sm font-medium hover:bg-neutral-50 transition-colors"
              onClick={() => {
                window.location.hash = "";
                setAppScreen("billing");
              }}
            >
              {t("billing.toSubscription")}
            </button>
          </div>
        </div>
      );
    }

    if (appScreen === "billing-cancel") {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="max-w-md w-full mx-auto px-6 py-12 text-center space-y-6">
            <div className="w-16 h-16 rounded-full border-2 border-neutral-300 flex items-center justify-center mx-auto">
              <X className="w-8 h-8 text-neutral-400" />
            </div>
            <h1 className="text-2xl font-semibold text-black">{t("billing.cancelledTitle")}</h1>
            <p className="text-sm text-neutral-600">{t("billing.cancelledDesc")}</p>
            <button
              className="inline-flex items-center gap-2 px-6 py-2 border border-black rounded-md text-sm font-medium hover:bg-neutral-50 transition-colors"
              onClick={() => {
                window.location.hash = "";
                setAppScreen("pricing");
              }}
            >
              {t("billing.toPricing")}
            </button>
          </div>
        </div>
      );
    }

    if (appScreen === "pricing") {
      return (
        <PricingPage
          onBack={() => setAppScreen("protocols")}
          onSelectPlan={async (plan, interval, currency) => {
            const currentPlan = account?.plan;
            const ORDER: Record<string, number> = { free: 0, privat: 1, agentur: 2, custom: 3 };
            const isUpgrade =
              plan === "agentur" &&
              (ORDER[currentPlan ?? "free"] ?? 0) > 0 &&
              (ORDER[currentPlan ?? "free"] ?? 0) < ORDER[plan];

            if (isUpgrade) {
              // Existing subscriber upgrading — update subscription in-place, no new checkout
              const result = await billing.startUpgrade(plan);
              if (result.success) {
                setAppScreen("billing-success");
              } else if (result.noSubscription) {
                // Fallback: no active subscription found, proceed with checkout
                const checkoutResult = await billing.startCheckout({ plan, interval, currency });
                if (checkoutResult.error) {
                  toast({ title: t("protocols.paymentFailed"), description: checkoutResult.error, variant: "destructive" });
                }
              } else if (result.error) {
                toast({ title: t("protocols.paymentFailed"), description: result.error, variant: "destructive" });
              }
            } else {
              // New subscriber — standard Stripe Checkout session
              const result = await billing.startCheckout({ plan, interval, currency });
              if (result.error) {
                toast({ title: t("protocols.paymentFailed"), description: result.error, variant: "destructive" });
              }
            }
          }}
          currentPlan={account?.plan}
          isLoggedIn
        />
      );
    }

    if (appScreen === "billing") {
      return (
        <BillingPage
          accountId={accountId}
          onBack={() => setAppScreen("protocols")}
          onShowPricing={() => setAppScreen("pricing")}
          userRole={userRole}
        />
      );
    }

    if (appScreen === "superadmin" && isSuperAdmin) {
      return (
        <SuperadminPage
          onBack={() => setAppScreen("protocols")}
          isImpersonating={isImpersonating ?? false}
          onEndImpersonation={onEndImpersonation ?? (async () => {})}
        />
      );
    }

    if (appScreen === "team") {
      return (
        <TeamPage
          onBack={() => setAppScreen("protocols")}
          currentUserId={userId}
          currentUserRole={userRole ?? "property_manager"}
        />
      );
    }

    if (!selectedProperty) {
      return (
        <>
          {globalImpersonationBanner}
          <PropertyListPage
            onSelectProperty={setSelectedProperty}
            onLogout={onLogout}
            protocols={protocols}
            onDeleteProperty={deleteProtocolsForProperty}
            onShowBilling={() => setAppScreen("billing")}
            onShowPricing={() => setAppScreen("pricing")}
            onShowSuperadmin={isSuperAdmin ? () => setAppScreen("superadmin") : undefined}
            onShowTeam={
              (account?.plan === "agentur" || account?.plan === "custom") &&
              (userRole === "owner" || userRole === "administrator")
                ? () => setAppScreen("team")
                : undefined
            }
            currentPlan={account?.plan ?? "free"}
            userLang={userLang}
            onChangeLang={onChangeLang}
          />
          <SwUpdatePopup needsUpdate={needsUpdate} applyUpdate={applyUpdate} dismiss={dismissUpdate} />
          <PwaInstallBanner suppressWhenUpdatePending={needsUpdate} />
        </>
      );
    }
    return (
      <>
        {globalImpersonationBanner}
        <PropertyProtocolsPage
          property={selectedProperty}
          protocols={protocols}
          trashedProtocols={trashedProtocols}
          onBack={() => setSelectedProperty(null)}
          onCreate={handleCreate}
          onOpen={handleOpen}
          onDelete={deleteProtocol}
          onRestore={restoreFromTrash}
          onPermanentlyDelete={permanentlyDelete}
          onEmptyTrash={emptyTrash}
          onDuplicate={duplicateProtocol}
          onToggleSync={toggleSync}
          onRename={renameProtocol}
        />
        <SwUpdatePopup needsUpdate={needsUpdate} applyUpdate={applyUpdate} dismiss={dismissUpdate} />
        <PwaInstallBanner suppressWhenUpdatePending={needsUpdate} />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={handleBackToList}
                className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-black transition-colors shrink-0"
                title={tr.protocols.overview}
              >
                <ArrowLeft size={16} />
              </button>
              <div className="min-w-0">
                <h1 className="font-semibold text-sm leading-tight truncate text-black">
                  {currentProtocol?.mietobjekt || tr.protocols.unnamed}
                </h1>
                <p className="text-xs text-neutral-500 truncate">
                  {currentProtocol?.adresse || ""}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {currentProtocol && (
                <button
                  type="button"
                  onClick={() => toggleSync(currentProtocol.id)}
                  title={currentProtocol.syncEnabled ? tr.protocols.syncActive : tr.protocols.syncInactive}
                  className={`flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium transition-colors ${
                    currentProtocol.syncEnabled
                      ? "border-black bg-black text-white"
                      : "border-neutral-200 text-neutral-500 hover:bg-neutral-50"
                  }`}
                >
                  {currentProtocol.syncEnabled ? (
                    <Cloud size={13} />
                  ) : (
                    <CloudOff size={13} />
                  )}
                  <span className="hidden sm:inline">{tr.protocols.syncLabel}</span>
                </button>
              )}

              <span
                title={
                  syncStatus === "connected"
                    ? tr.protocols.connected
                    : syncStatus === "connecting"
                    ? tr.protocols.connecting
                    : tr.protocols.offline
                }
                className="hidden sm:flex items-center"
              >
                {syncStatus === "connected" ? (
                  <Wifi size={13} className="text-black" />
                ) : (
                  <WifiOff size={13} className="text-neutral-400" />
                )}
              </span>

              {lastSaved && (
                <span className="text-xs text-neutral-400 hidden sm:block whitespace-nowrap">
                  {isSaving ? tr.common.saving : `${tr.common.saved} ${formatRelative(lastSaved, t)}`}
                </span>
              )}

              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="gap-1.5 border-neutral-200 hover:bg-neutral-50"
              >
                {isSaving ? (
                  <CheckCircle2 size={14} className="text-black" />
                ) : (
                  <Save size={14} />
                )}
                <span className="hidden sm:inline">{isSaving ? tr.common.ok : tr.common.save}</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleZipExport}
                disabled={isZipping}
                className="gap-1.5 border-neutral-200 hover:bg-neutral-50"
                title={tr.protocols.photos}
              >
                <FolderArchive size={14} />
                <span className="hidden sm:inline">{isZipping ? "..." : tr.protocols.photos}</span>
              </Button>

              <Button
                size="sm"
                onClick={handleExport}
                disabled={isExporting}
                className="gap-1.5 bg-black text-white hover:bg-neutral-800"
              >
                <FileDown size={14} />
                PDF
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="bg-white border-b border-neutral-200 sticky top-[57px] z-30">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex">
            <button
              type="button"
              onClick={() => setActiveTab("protokoll")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "protokoll"
                  ? "border-black text-black"
                  : "border-transparent text-neutral-500 hover:text-black"
              }`}
            >
              <ClipboardList size={15} />
              {tr.protocols.protocol}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("unterschriften")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "unterschriften"
                  ? "border-black text-black"
                  : "border-transparent text-neutral-500 hover:text-black"
              }`}
            >
              <PenLine size={15} />
              {tr.protocols.signatures}
              {allSigned && <CheckCircle2 size={13} className="text-black" />}
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-4">
        {currentProtocol && activeTab === "protokoll" && (
          <ProtocolPage protocol={currentProtocol} updateProtocol={updateProtocol} language={propertyLang} />
        )}
        {currentProtocol && activeTab === "unterschriften" && (
          <SignaturePage protocol={currentProtocol} updateProtocol={updateProtocol} language={propertyLang} />
        )}
      </main>

      {isSaving && (
        <div className="sm:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <span className="bg-black text-white text-xs px-3 py-1.5 rounded-full shadow-md">
            {tr.common.autoSaved}
          </span>
        </div>
      )}

      <SwUpdatePopup needsUpdate={needsUpdate} applyUpdate={applyUpdate} dismiss={dismissUpdate} />
      {globalImpersonationBanner}
    </div>
  );
}

function SwUpdatePopup({
  needsUpdate,
  applyUpdate,
  dismiss,
}: {
  needsUpdate: boolean;
  applyUpdate: () => void;
  dismiss: () => void;
}) {
  const { t } = useTranslation();
  if (!needsUpdate) return null;
  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 sm:left-auto sm:translate-x-0 sm:right-4">
      <div className="flex items-center gap-3 bg-white border border-neutral-200 rounded-2xl shadow-xl px-4 py-3 min-w-[280px]">
        <button
          type="button"
          onClick={dismiss}
          className="p-1 rounded-full border border-neutral-200 text-neutral-500 hover:bg-neutral-100 transition-colors shrink-0"
        >
          <X size={12} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-black">{t("common.updateAvailable")}</p>
          <p className="text-xs text-neutral-500">{t("common.updateReady")}</p>
        </div>
        <Button size="sm" variant="outline" onClick={applyUpdate} className="shrink-0 gap-1.5 font-semibold border-neutral-200">
          <RefreshCw size={13} />
          {t("common.update")}
        </Button>
      </div>
    </div>
  );
}

type AuthScreen = "login" | "register" | "forgot-password";

function hashToInitialScreen(hash: string, pathname: string): AppScreen {
  if (pathname.endsWith("/pricing") || hash === "#/pricing") return "pricing";
  if (hash === "#/billing") return "billing";
  if (hash === "#/billing/success") return "billing-success";
  if (hash === "#/billing/cancel") return "billing-cancel";
  if (hash === "#/superadmin") return "superadmin";
  return "protocols";
}

export default function App() {
  const hash = window.location.hash;
  const pathname = window.location.pathname;
  const viewMatch = hash.match(/^#\/view\/(.+)$/);
  const resetMatch = hash.match(/^#\/reset-password\/(.+)$/);
  const isPricingPage = pathname.endsWith("/pricing") || hash === "#/pricing";

  const { user, account, loading, login, register, logout, updateLanguage, isImpersonating, endImpersonation } = useAuth();
  const [authScreen, setAuthScreen] = useState<AuthScreen>("login");
  const { t } = useTranslation();

  const handleChangeLang = async (lang: SupportedLanguage) => {
    await updateLanguage(lang);
  };

  if (viewMatch) {
    return (
      <QueryClientProvider client={queryClient}>
        <TenantViewPage protocolId={viewMatch[1]} />
        <Toaster />
      </QueryClientProvider>
    );
  }

  if (resetMatch) {
    return (
      <QueryClientProvider client={queryClient}>
        <ResetPasswordPage
          token={resetMatch[1]}
          onSuccess={() => {
            window.location.hash = "";
            setAuthScreen("login");
          }}
        />
        <Toaster />
      </QueryClientProvider>
    );
  }

  if (isPricingPage && !user) {
    return (
      <QueryClientProvider client={queryClient}>
        <PricingPage
          onBack={() => {
            if (pathname.endsWith("/pricing")) {
              window.location.href = "/";
            } else {
              window.location.hash = "";
            }
          }}
          isLoggedIn={false}
        />
        <Toaster />
      </QueryClientProvider>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <img src={`${import.meta.env.BASE_URL}immoprotokoll-logo-black.png`} alt="ImmoProtokoll" className="h-10 w-10 rounded-sm" />
          <div className="w-5 h-5 border-2 border-neutral-200 border-t-black rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <QueryClientProvider client={queryClient}>
        {authScreen === "login" ? (
          <LoginPage
            onLogin={login}
            onGoToRegister={() => setAuthScreen("register")}
            onGoToForgotPassword={() => setAuthScreen("forgot-password")}
          />
        ) : authScreen === "register" ? (
          <RegisterPage
            onRegister={register}
            onGoToLogin={() => setAuthScreen("login")}
          />
        ) : (
          <ForgotPasswordPage
            onBack={() => setAuthScreen("login")}
          />
        )}
        <Toaster />
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppContent
        onLogout={logout}
        accountId={user.accountId}
        userId={user.id}
        account={account}
        userRole={user.role}
        userLang={user.preferredLanguage ?? "de-CH"}
        initialScreen={hashToInitialScreen(hash, pathname)}
        onChangeLang={handleChangeLang}
        isSuperAdmin={user.isSuperAdmin}
        isImpersonating={isImpersonating}
        onEndImpersonation={endImpersonation}
      />
      <Toaster />
    </QueryClientProvider>
  );
}
