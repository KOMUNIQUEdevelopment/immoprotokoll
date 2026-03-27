import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { useProtocolsStore } from "./store";
import ProtocolPage from "./pages/ProtocolPage";
import SignaturePage from "./pages/SignaturePage";
import ProtocolListPage from "./pages/ProtocolListPage";
import { exportToPDF, exportPhotosAsZip } from "./pdfExport";
import { useSwUpdate } from "./hooks/useSwUpdate";
import { useSync } from "./hooks/useSync";
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
  return date.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
}

type EditorTab = "protokoll" | "unterschriften";

function AppContent() {
  const {
    protocols,
    currentProtocol,
    currentId,
    isEditing,
    createNew,
    switchTo,
    backToList,
    deleteProtocol,
    updateProtocol,
    receiveRemote,
    manualSave,
    isSaving,
    lastSaved,
    wsSendRef,
  } = useProtocolsStore();

  const [activeTab, setActiveTab] = useState<EditorTab>("protokoll");
  const [isExporting, setIsExporting] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const { toast } = useToast();

  const { needsUpdate, applyUpdate, dismiss: dismissUpdate } = useSwUpdate();
  const { status: syncStatus } = useSync({ onReceive: receiveRemote, sendRef: wsSendRef });

  const headerTitle = currentProtocol
    ? [currentProtocol.mietobjekt, currentProtocol.adresse].filter(Boolean).join(", ") ||
      "Übergabeprotokoll"
    : null;

  const handleExport = async () => {
    if (!currentProtocol) return;
    setIsExporting(true);
    try {
      await exportToPDF(currentProtocol);
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
      (currentProtocol.kitchenPhotos?.length ?? 0) +
      currentProtocol.rooms.reduce((s, r) => s + r.photos.length, 0);
    if (totalPhotos === 0) {
      toast({ title: "Keine Fotos", description: "Es sind noch keine Fotos vorhanden." });
      return;
    }
    setIsZipping(true);
    try {
      await exportPhotosAsZip(currentProtocol);
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
    createNew();
    setActiveTab("protokoll");
  };

  const handleOpen = (id: string) => {
    switchTo(id);
    setActiveTab("protokoll");
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

  // ── List view ────────────────────────────────────────────────────────────────
  if (!isEditing) {
    return (
      <>
        <ProtocolListPage
          protocols={protocols}
          onOpen={handleOpen}
          onCreate={handleCreate}
          onDelete={deleteProtocol}
        />
        <SwUpdatePopup needsUpdate={needsUpdate} applyUpdate={applyUpdate} dismiss={dismissUpdate} />
      </>
    );
  }

  // ── Editor view ──────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={backToList}
                className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors shrink-0"
                title="Zur Übersicht"
              >
                <ArrowLeft size={16} />
              </button>
              <div className="min-w-0">
                <h1 className="font-bold text-sm leading-tight truncate">
                  {currentProtocol?.mietobjekt || "Übergabeprotokoll"}
                </h1>
                <p className="text-xs text-muted-foreground truncate">
                  {currentProtocol?.adresse || ""}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {/* Sync status */}
              <span
                title={
                  syncStatus === "connected"
                    ? "Echtzeit-Sync aktiv"
                    : syncStatus === "connecting"
                    ? "Verbinde..."
                    : "Offline"
                }
                className="hidden sm:flex items-center"
              >
                {syncStatus === "connected" ? (
                  <Wifi size={13} className="text-green-500" />
                ) : (
                  <WifiOff size={13} className="text-muted-foreground" />
                )}
              </span>

              {lastSaved && (
                <span className="text-xs text-muted-foreground hidden sm:block whitespace-nowrap">
                  {isSaving ? "Speichert..." : `Gespeichert ${formatRelative(lastSaved)}`}
                </span>
              )}

              <InstallButton />

              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="gap-1.5"
              >
                {isSaving ? (
                  <CheckCircle2 size={14} className="text-green-500" />
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
                className="gap-1.5"
                title="Alle Fotos als ZIP exportieren"
              >
                <FolderArchive size={14} />
                <span className="hidden sm:inline">{isZipping ? "..." : "Fotos"}</span>
              </Button>

              <Button
                size="sm"
                onClick={handleExport}
                disabled={isExporting}
                className="gap-1.5"
              >
                <FileDown size={14} />
                PDF
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-card border-b border-border sticky top-[57px] z-30">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex">
            <button
              type="button"
              onClick={() => setActiveTab("protokoll")}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === "protokoll"
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
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
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <PenLine size={15} />
              Unterschriften
              {allSigned && <CheckCircle2 size={13} className="text-green-500" />}
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-4">
        {currentProtocol && activeTab === "protokoll" && (
          <ProtocolPage protocol={currentProtocol} updateProtocol={updateProtocol} />
        )}
        {currentProtocol && activeTab === "unterschriften" && (
          <SignaturePage protocol={currentProtocol} updateProtocol={updateProtocol} />
        )}
      </main>

      {/* Auto-save mobile toast */}
      {isSaving && (
        <div className="sm:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          <span className="bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded-full shadow-md">
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
      <div className="flex items-center gap-3 bg-card border border-border rounded-2xl shadow-xl px-4 py-3 min-w-[280px]">
        <button
          type="button"
          onClick={dismiss}
          className="p-1 rounded-full border border-border text-muted-foreground hover:bg-muted transition-colors shrink-0"
        >
          <X size={12} />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">Update verfügbar</p>
          <p className="text-xs text-muted-foreground">Eine neue Version ist bereit.</p>
        </div>
        <Button size="sm" variant="outline" onClick={applyUpdate} className="shrink-0 gap-1.5 font-semibold">
          <RefreshCw size={13} />
          Aktualisieren
        </Button>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <Toaster />
    </QueryClientProvider>
  );
}
