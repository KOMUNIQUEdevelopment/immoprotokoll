import React, { useState } from "react";
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
import TenantViewPage from "./pages/TenantViewPage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import { exportToPDF, exportPhotosAsZip } from "./pdfExport";
import { useSwUpdate } from "./hooks/useSwUpdate";
import { useSync } from "./hooks/useSync";
import { useAuth } from "./hooks/useAuth";
import { useBilling } from "./hooks/useBilling";
import { InstallButton } from "./components/InstallButton";
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
  LogOut,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const queryClient = new QueryClient();

function formatRelative(date: Date | null): string {
  if (!date) return "";
  const now = new Date();
  const diff = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (diff < 5) return "gerade eben";
  if (diff < 60) return `vor ${diff} Sek.`;
  if (diff < 3600) return `vor ${Math.floor(diff / 60)} Min.`;
  return date.toLocaleTimeString("de-CH", { hour: "2-digit", minute: "2-digit" });
}

type EditorTab = "protokoll" | "unterschriften";

type AppScreen = "protocols" | "pricing" | "billing" | "billing-success" | "billing-cancel";

function AppContent({
  onLogout,
  accountId,
  account,
  userRole,
  initialScreen = "protocols",
}: {
  onLogout: () => void;
  accountId: string;
  account: { plan: "free" | "privat" | "agentur" | "custom" } | null;
  userRole?: "owner" | "administrator" | "property_manager";
  initialScreen?: AppScreen;
}) {
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
          title: "Protokoll-Limit erreicht",
          description: err.message || "Ihr Plan erlaubt keine weiteren Protokolle in dieser Liegenschaft.",
          variant: "destructive",
        });
      }
    },
    sendRef: wsSendRef,
  });

  const handleExport = async () => {
    if (!currentProtocol) return;
    setIsExporting(true);
    try {
      const freePlan = !account || account.plan === "free";
      await exportToPDF(currentProtocol, { watermark: freePlan });
      toast({ title: "PDF erstellt", description: "Das Protokoll wurde erfolgreich exportiert." });
    } catch (e) {
      console.error(e);
      toast({
        title: "Export fehlgeschlagen",
        description: "Bitte erneut versuchen.",
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
      toast({ title: "Keine Fotos", description: "Es sind noch keine Fotos vorhanden." });
      return;
    }
    setIsZipping(true);
    try {
      const freePlan = !account || account.plan === "free";
      await exportPhotosAsZip(currentProtocol, { watermark: freePlan });
      toast({ title: "ZIP erstellt", description: `${totalPhotos} Foto${totalPhotos !== 1 ? "s" : ""} exportiert.` });
    } catch (e) {
      console.error(e);
      toast({ title: "Export fehlgeschlagen", description: "Bitte erneut versuchen.", variant: "destructive" });
    } finally {
      setIsZipping(false);
    }
  };

  const handleSave = () => {
    manualSave();
    toast({ title: "Gespeichert", description: "Das Protokoll wurde gespeichert." });
  };

  const handleCreate = () => {
    createNew(selectedProperty?.id ?? null);
    setActiveTab("protokoll");
  };

  const handleOpen = (id: string) => {
    switchTo(id);
    setActiveTab("protokoll");
  };

  const handleBackToList = () => {
    backToList();
    // stay on PropertyProtocolsPage if we came from one
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

  if (!isEditing) {
    if (appScreen === "billing-success") {
      return (
        <div className="min-h-screen bg-white flex items-center justify-center">
          <div className="max-w-md w-full mx-auto px-6 py-12 text-center space-y-6">
            <div className="w-16 h-16 rounded-full border-2 border-black flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-8 h-8 text-black" />
            </div>
            <h1 className="text-2xl font-semibold text-black">Abonnement aktiviert</h1>
            <p className="text-sm text-neutral-600">
              Ihr Abonnement wurde erfolgreich aktiviert. Die Änderungen sind sofort wirksam.
            </p>
            <button
              className="inline-flex items-center gap-2 px-6 py-2 border border-black rounded-md text-sm font-medium hover:bg-neutral-50 transition-colors"
              onClick={() => {
                window.location.hash = "";
                setAppScreen("billing");
              }}
            >
              Zum Abonnement
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
            <h1 className="text-2xl font-semibold text-black">Zahlung abgebrochen</h1>
            <p className="text-sm text-neutral-600">
              Der Zahlungsvorgang wurde abgebrochen. Ihr aktueller Plan bleibt unverändert.
            </p>
            <button
              className="inline-flex items-center gap-2 px-6 py-2 border border-black rounded-md text-sm font-medium hover:bg-neutral-50 transition-colors"
              onClick={() => {
                window.location.hash = "";
                setAppScreen("pricing");
              }}
            >
              Zur Preisübersicht
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
            const result = await billing.startCheckout({ plan, interval, currency });
            if (result.error) {
              toast({ title: "Zahlung fehlgeschlagen", description: result.error, variant: "destructive" });
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

    if (!selectedProperty) {
      return (
        <>
          <PropertyListPage
            onSelectProperty={setSelectedProperty}
            onLogout={onLogout}
            protocols={protocols}
            onDeleteProperty={deleteProtocolsForProperty}
            onShowBilling={() => setAppScreen("billing")}
            onShowPricing={() => setAppScreen("pricing")}
            currentPlan={account?.plan ?? "free"}
          />
          <SwUpdatePopup needsUpdate={needsUpdate} applyUpdate={applyUpdate} dismiss={dismissUpdate} />
        </>
      );
    }
    return (
      <>
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
                title="Zur Übersicht"
              >
                <ArrowLeft size={16} />
              </button>
              <div className="min-w-0">
                <h1 className="font-semibold text-sm leading-tight truncate text-black">
                  {currentProtocol?.mietobjekt || "Protokoll"}
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
                  title={currentProtocol.syncEnabled ? "Sync aktiv – auf allen Geräten sichtbar. Klicken zum Deaktivieren." : "Sync deaktiviert – nur lokal. Klicken zum Aktivieren."}
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
                  <span className="hidden sm:inline">Sync</span>
                </button>
              )}

              <span
                title={
                  syncStatus === "connected"
                    ? "Verbunden"
                    : syncStatus === "connecting"
                    ? "Verbinde..."
                    : "Offline"
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
                  {isSaving ? "Speichert..." : `Gespeichert ${formatRelative(lastSaved)}`}
                </span>
              )}

              <InstallButton />

              <button
                type="button"
                onClick={onLogout}
                title="Abmelden"
                className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-black transition-colors hidden sm:flex"
              >
                <LogOut size={15} />
              </button>

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
                <span className="hidden sm:inline">{isSaving ? "OK" : "Speichern"}</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleZipExport}
                disabled={isZipping}
                className="gap-1.5 border-neutral-200 hover:bg-neutral-50"
                title="Alle Fotos als ZIP exportieren"
              >
                <FolderArchive size={14} />
                <span className="hidden sm:inline">{isZipping ? "..." : "Fotos"}</span>
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
              Protokoll
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
              Unterschriften
              {allSigned && <CheckCircle2 size={13} className="text-black" />}
            </button>
          </div>
        </div>
      </div>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-4">
        {currentProtocol && activeTab === "protokoll" && (
          <ProtocolPage protocol={currentProtocol} updateProtocol={updateProtocol} />
        )}
        {currentProtocol && activeTab === "unterschriften" && (
          <SignaturePage protocol={currentProtocol} updateProtocol={updateProtocol} />
        )}
      </main>

      {isSaving && (
        <div className="sm:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <span className="bg-black text-white text-xs px-3 py-1.5 rounded-full shadow-md">
            Automatisch gespeichert
          </span>
        </div>
      )}

      <SwUpdatePopup needsUpdate={needsUpdate} applyUpdate={applyUpdate} dismiss={dismissUpdate} />
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
          <p className="text-sm font-semibold text-black">Update verfügbar</p>
          <p className="text-xs text-neutral-500">Eine neue Version ist bereit.</p>
        </div>
        <Button size="sm" variant="outline" onClick={applyUpdate} className="shrink-0 gap-1.5 font-semibold border-neutral-200">
          <RefreshCw size={13} />
          Aktualisieren
        </Button>
      </div>
    </div>
  );
}

type AuthScreen = "login" | "register";

function hashToInitialScreen(hash: string, pathname: string): AppScreen {
  // Support both /pricing (clean path) and #/pricing (hash)
  if (pathname.endsWith("/pricing") || hash === "#/pricing") return "pricing";
  if (hash === "#/billing") return "billing";
  if (hash === "#/billing/success") return "billing-success";
  if (hash === "#/billing/cancel") return "billing-cancel";
  return "protocols";
}

export default function App() {
  const hash = window.location.hash;
  const pathname = window.location.pathname;
  const viewMatch = hash.match(/^#\/view\/(.+)$/);
  const isPricingPage = pathname.endsWith("/pricing") || hash === "#/pricing";

  const { user, account, loading, login, register, logout } = useAuth();
  const [authScreen, setAuthScreen] = useState<AuthScreen>("login");

  if (viewMatch) {
    return (
      <QueryClientProvider client={queryClient}>
        <TenantViewPage protocolId={viewMatch[1]} />
        <Toaster />
      </QueryClientProvider>
    );
  }

  // Pricing page is public (accessible without login) — supports both /pricing and #/pricing
  if (isPricingPage && !user) {
    return (
      <QueryClientProvider client={queryClient}>
        <PricingPage
          onBack={() => {
            // Navigate back correctly for both /pricing path and #/pricing hash
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
          <img src="/immoprotokoll-logo.png" alt="ImmoProtokoll" className="h-10" />
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
          />
        ) : (
          <RegisterPage
            onRegister={register}
            onGoToLogin={() => setAuthScreen("login")}
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
        account={account}
        userRole={user.role}
        initialScreen={hashToInitialScreen(hash, pathname)}
      />
      <Toaster />
    </QueryClientProvider>
  );
}
