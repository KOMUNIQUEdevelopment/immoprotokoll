import React, { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { useToast } from "@/hooks/use-toast";
import { useProtocolStore } from "./store";
import ProtocolPage from "./pages/ProtocolPage";
import SignaturePage from "./pages/SignaturePage";
import { exportToPDF } from "./pdfExport";
import { Save, FileDown, ClipboardList, PenLine, CheckCircle2 } from "lucide-react";
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

type Tab = "protokoll" | "unterschriften";

function AppContent() {
  const { protocol, updateProtocol, manualSave, isSaving, lastSaved } = useProtocolStore();
  const [activeTab, setActiveTab] = useState<Tab>("protokoll");
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportToPDF(protocol);
      toast({ title: "PDF erstellt", description: "Das Protokoll wurde erfolgreich exportiert." });
    } catch (e) {
      console.error(e);
      toast({ title: "Export fehlgeschlagen", description: "Bitte erneut versuchen.", variant: "destructive" });
    } finally {
      setIsExporting(false);
    }
  };

  const handleSave = () => {
    manualSave();
    toast({ title: "Gespeichert", description: "Das Protokoll wurde gespeichert." });
  };

  const allSigned = protocol.signatures.length > 0 && protocol.signatures.every(s => s.signatureDataUrl !== null);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-40 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-bold text-base leading-tight">Übergabeprotokoll</h1>
              <p className="text-xs text-muted-foreground truncate max-w-[180px]">{protocol.adresse || "Villa Albstadt"}</p>
            </div>
            <div className="flex items-center gap-2">
              {lastSaved && (
                <span className="text-xs text-muted-foreground hidden sm:block">
                  {isSaving ? "Speichert..." : `Gespeichert ${formatRelative(lastSaved)}`}
                </span>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="gap-1.5"
              >
                {isSaving ? <CheckCircle2 size={14} className="text-green-500" /> : <Save size={14} />}
                {isSaving ? "OK" : "Speichern"}
              </Button>
              <Button
                size="sm"
                onClick={handleExport}
                disabled={isExporting}
                className="gap-1.5"
              >
                <FileDown size={14} />
                {isExporting ? "..." : "PDF"}
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
        {activeTab === "protokoll" && (
          <ProtocolPage protocol={protocol} updateProtocol={updateProtocol} />
        )}
        {activeTab === "unterschriften" && (
          <SignaturePage protocol={protocol} updateProtocol={updateProtocol} />
        )}
      </main>

      {/* Auto-save indicator on mobile */}
      {lastSaved && (
        <div className="sm:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
          {isSaving && (
            <span className="bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded-full shadow-md">
              Automatisch gespeichert...
            </span>
          )}
        </div>
      )}
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
