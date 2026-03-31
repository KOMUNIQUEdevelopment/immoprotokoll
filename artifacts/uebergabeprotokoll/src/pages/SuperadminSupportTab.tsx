import React, { useState, useEffect, useCallback } from "react";
import {
  Search, RefreshCw, X, Check, ChevronDown,
  Mail, MessageSquare, UserPlus, Trash2, User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const API = "/api";

async function apiFetch(path: string, options?: RequestInit) {
  return fetch(`${API}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
    ...options,
  });
}

interface SupportTicket {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: "open" | "in_progress" | "closed";
  accountId: string | null;
  assignedToAgentId: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SupportAgent {
  id: string;
  name: string;
  email: string;
  isActive: boolean;
  createdAt: string;
}

const STATUS_LABEL: Record<string, string> = {
  open: "Offen",
  in_progress: "In Bearbeitung",
  closed: "Abgeschlossen",
};

const STATUS_STYLE: Record<string, string> = {
  open: "bg-[hsl(0,0%,93%)] text-[hsl(0,0%,30%)]",
  in_progress: "bg-[hsl(0,0%,15%)] text-white",
  closed: "bg-[hsl(0,0%,70%)] text-white",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLE[status] ?? STATUS_STYLE.open}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

interface TicketDetailProps {
  ticket: SupportTicket;
  agents: SupportAgent[];
  onClose: () => void;
  onUpdated: () => void;
}

function TicketDetail({ ticket, agents, onClose, onUpdated }: TicketDetailProps) {
  const [status, setStatus] = useState(ticket.status);
  const [assignedToAgentId, setAssignedToAgentId] = useState(ticket.assignedToAgentId ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const r = await apiFetch(`/superadmin/support/tickets/${ticket.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          status,
          assignedToAgentId: assignedToAgentId || null,
        }),
      });
      if (!r.ok) {
        const d = await r.json() as { error: string };
        throw new Error(d.error ?? "Failed to update");
      }
      onUpdated();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler beim Speichern");
    } finally {
      setSaving(false);
    }
  };

  const assignedAgent = agents.find((a) => a.id === (assignedToAgentId || ticket.assignedToAgentId));

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white border-l border-[hsl(0,0%,88%)]">
      <div className="flex items-start justify-between p-5 border-b border-[hsl(0,0%,90%)]">
        <div className="flex-1 min-w-0 pr-3">
          <h2 className="text-sm font-semibold text-[hsl(0,0%,8%)] truncate">{ticket.subject}</h2>
          <p className="text-xs text-[hsl(0,0%,50%)] mt-0.5">
            #{ticket.id.slice(0, 8).toUpperCase()} · {new Date(ticket.createdAt).toLocaleDateString("de-CH", { day: "2-digit", month: "2-digit", year: "numeric" })}
          </p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[hsl(0,0%,93%)] flex-shrink-0">
          <X size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        <div className="flex items-center gap-3 bg-[hsl(0,0%,97%)] rounded-lg p-4 border border-[hsl(0,0%,90%)]">
          <div className="w-9 h-9 rounded-full bg-[hsl(0,0%,88%)] flex items-center justify-center flex-shrink-0">
            <User size={16} className="text-[hsl(0,0%,40%)]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[hsl(0,0%,10%)]">{ticket.name}</p>
            <a href={`mailto:${ticket.email}`} className="text-xs text-[hsl(0,0%,45%)] hover:underline">{ticket.email}</a>
          </div>
          <a
            href={`mailto:${ticket.email}?subject=Re: ${encodeURIComponent(ticket.subject)} [#${ticket.id.slice(0, 8).toUpperCase()}]`}
            className="ml-auto flex items-center gap-1.5 text-xs font-medium border border-[hsl(0,0%,80%)] rounded-md px-3 py-1.5 hover:bg-[hsl(0,0%,93%)] transition-colors"
          >
            <Mail size={13} /> Antworten
          </a>
        </div>

        <div>
          <p className="text-xs font-semibold text-[hsl(0,0%,35%)] uppercase tracking-wide mb-2">Nachricht</p>
          <div className="bg-[hsl(0,0%,97%)] rounded-lg p-4 border border-[hsl(0,0%,90%)]">
            <p className="text-sm text-[hsl(0,0%,15%)] leading-relaxed whitespace-pre-wrap">{ticket.message}</p>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-[hsl(0,0%,35%)] uppercase tracking-wide">Bearbeitung</p>

          <div>
            <label className="block text-xs font-medium text-[hsl(0,0%,45%)] mb-1.5">Status</label>
            <div className="relative">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as SupportTicket["status"])}
                className="w-full rounded-md border border-[hsl(0,0%,80%)] text-sm px-3 py-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-1 focus:ring-[hsl(0,0%,40%)]"
              >
                <option value="open">Offen</option>
                <option value="in_progress">In Bearbeitung</option>
                <option value="closed">Abgeschlossen</option>
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[hsl(0,0%,50%)] pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[hsl(0,0%,45%)] mb-1.5">Zugewiesen an</label>
            <div className="relative">
              <select
                value={assignedToAgentId}
                onChange={(e) => setAssignedToAgentId(e.target.value)}
                className="w-full rounded-md border border-[hsl(0,0%,80%)] text-sm px-3 py-2 pr-8 appearance-none bg-white focus:outline-none focus:ring-1 focus:ring-[hsl(0,0%,40%)]"
              >
                <option value="">— Niemand —</option>
                {agents.map((a) => (
                  <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[hsl(0,0%,50%)] pointer-events-none" />
            </div>
            {assignedAgent && (
              <p className="mt-1 text-xs text-[hsl(0,0%,50%)]">Aktuell zugewiesen: {assignedAgent.name}</p>
            )}
          </div>
        </div>

        {error && (
          <p className="text-xs text-[hsl(0,0%,30%)] bg-[hsl(0,0%,93%)] rounded px-3 py-2">{error}</p>
        )}
      </div>

      <div className="flex justify-end gap-2 p-4 border-t border-[hsl(0,0%,90%)]">
        <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Abbrechen</Button>
        <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
          {saving ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
          Speichern
        </Button>
      </div>
    </div>
  );
}

interface AddAgentFormProps {
  onSaved: () => void;
  onCancel: () => void;
}

function AddAgentForm({ onSaved, onCancel }: AddAgentFormProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    if (!name.trim() || !email.trim()) {
      setError("Name und E-Mail sind erforderlich");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const r = await apiFetch("/superadmin/support/agents", {
        method: "POST",
        body: JSON.stringify({ name: name.trim(), email: email.trim() }),
      });
      if (!r.ok) {
        const d = await r.json() as { error: string };
        throw new Error(d.error ?? "Failed to add agent");
      }
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Fehler beim Hinzufügen");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-4 border border-[hsl(0,0%,85%)] rounded-lg bg-[hsl(0,0%,98%)] space-y-3">
      <p className="text-xs font-semibold text-[hsl(0,0%,30%)] uppercase tracking-wide">Neuer Support-Agent</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-[hsl(0,0%,45%)] mb-1">Name</label>
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Max Mustermann" className="h-8 text-sm" />
        </div>
        <div>
          <label className="block text-xs font-medium text-[hsl(0,0%,45%)] mb-1">E-Mail</label>
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="max@example.com" className="h-8 text-sm" type="email" />
        </div>
      </div>
      {error && <p className="text-xs text-[hsl(0,0%,30%)] bg-[hsl(0,0%,93%)] rounded px-3 py-2">{error}</p>}
      <div className="flex gap-2 justify-end">
        <Button variant="outline" size="sm" onClick={onCancel} disabled={saving}>Abbrechen</Button>
        <Button size="sm" onClick={handleSave} disabled={saving} className="gap-1.5">
          {saving ? <RefreshCw size={13} className="animate-spin" /> : <Check size={13} />}
          Hinzufügen
        </Button>
      </div>
    </div>
  );
}

export default function SuperadminSupportTab() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [agents, setAgents] = useState<SupportAgent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showAddAgent, setShowAddAgent] = useState(false);
  const [deletingAgentId, setDeletingAgentId] = useState<string | null>(null);

  const limit = 25;
  const totalPages = Math.max(1, Math.ceil(total / limit));

  const loadTickets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set("search", search);
      if (statusFilter) params.set("status", statusFilter);
      const r = await apiFetch(`/superadmin/support/tickets?${params}`);
      if (r.ok) {
        const d = await r.json() as { tickets: SupportTicket[]; total: number };
        setTickets(d.tickets);
        setTotal(d.total);
      }
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [page, search, statusFilter]);

  const loadAgents = useCallback(async () => {
    try {
      const r = await apiFetch("/superadmin/support/agents");
      if (r.ok) {
        const d = await r.json() as { agents: SupportAgent[] };
        setAgents(d.agents);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { void loadTickets(); }, [loadTickets]);
  useEffect(() => { void loadAgents(); }, [loadAgents]);

  const handleSearch = () => {
    setSearch(searchInput);
    setPage(1);
    setSelectedTicket(null);
  };

  const handleDeleteAgent = async (id: string) => {
    if (!confirm("Support-Agent wirklich entfernen?")) return;
    setDeletingAgentId(id);
    try {
      await apiFetch(`/superadmin/support/agents/${id}`, { method: "DELETE" });
      await loadAgents();
    } finally {
      setDeletingAgentId(null);
    }
  };

  const agentName = (agentId: string | null) => {
    if (!agentId) return null;
    return agents.find((a) => a.id === agentId)?.name ?? null;
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      <div className={`flex flex-col ${selectedTicket ? "w-1/2 border-r border-[hsl(0,0%,88%)]" : "w-full"}`}>
        <div className="p-4 border-b border-[hsl(0,0%,90%)] space-y-3">
          <div className="flex gap-2">
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Name, E-Mail oder Betreff…"
              className="flex-1 text-sm h-9"
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            />
            <Button size="sm" onClick={handleSearch} className="gap-1.5 h-9">
              <Search size={14} /> Suchen
            </Button>
          </div>

          <div className="flex gap-1.5">
            {["", "open", "in_progress", "closed"].map((s) => (
              <button
                key={s}
                onClick={() => { setStatusFilter(s); setPage(1); setSelectedTicket(null); }}
                className={`px-3 py-1 rounded-md text-xs font-medium border transition-colors ${
                  statusFilter === s
                    ? "bg-[hsl(0,0%,8%)] text-white border-[hsl(0,0%,8%)]"
                    : "bg-white text-[hsl(0,0%,40%)] border-[hsl(0,0%,80%)] hover:border-[hsl(0,0%,50%)]"
                }`}
              >
                {s === "" ? "Alle" : STATUS_LABEL[s]}
              </button>
            ))}
            <span className="ml-auto text-xs text-[hsl(0,0%,50%)] self-center">{total} Anfragen</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 text-[hsl(0,0%,50%)] text-sm gap-2">
              <RefreshCw size={14} className="animate-spin" /> Wird geladen…
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-[hsl(0,0%,55%)]">
              <MessageSquare size={32} className="mb-3 opacity-30" />
              <p className="text-sm">Keine Supportanfragen gefunden</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[hsl(0,0%,90%)] bg-[hsl(0,0%,97%)]">
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-[hsl(0,0%,45%)] uppercase tracking-wide">Absender</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-[hsl(0,0%,45%)] uppercase tracking-wide">Betreff</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-[hsl(0,0%,45%)] uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-2.5 text-xs font-medium text-[hsl(0,0%,45%)] uppercase tracking-wide">Datum</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => setSelectedTicket(t.id === selectedTicket?.id ? null : t)}
                    className={`border-b border-[hsl(0,0%,92%)] cursor-pointer transition-colors ${
                      t.id === selectedTicket?.id
                        ? "bg-[hsl(0,0%,92%)]"
                        : "hover:bg-[hsl(0,0%,95%)]"
                    }`}
                  >
                    <td className="px-4 py-3">
                      <p className="font-medium text-[hsl(0,0%,10%)]">{t.name}</p>
                      <p className="text-xs text-[hsl(0,0%,55%)]">{t.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-[hsl(0,0%,15%)] truncate max-w-[200px]">{t.subject}</p>
                      {agentName(t.assignedToAgentId) && (
                        <p className="text-xs text-[hsl(0,0%,50%)]">→ {agentName(t.assignedToAgentId)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                    <td className="px-4 py-3 text-xs text-[hsl(0,0%,50%)]">
                      {new Date(t.createdAt).toLocaleDateString("de-CH")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[hsl(0,0%,90%)] bg-white text-xs text-[hsl(0,0%,50%)]">
            <span>Seite {page} von {totalPages}</span>
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1} className="h-7 px-2 text-xs">Zurück</Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages} className="h-7 px-2 text-xs">Weiter</Button>
            </div>
          </div>
        )}

        <div className="p-4 border-t border-[hsl(0,0%,90%)] bg-white space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-[hsl(0,0%,30%)] uppercase tracking-wide flex items-center gap-1.5">
              <UserPlus size={13} /> Support-Agents
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowAddAgent((v) => !v)}
              className="h-7 px-2.5 text-xs gap-1"
            >
              <UserPlus size={12} /> Hinzufügen
            </Button>
          </div>

          {showAddAgent && (
            <AddAgentForm
              onSaved={async () => { await loadAgents(); setShowAddAgent(false); }}
              onCancel={() => setShowAddAgent(false)}
            />
          )}

          {agents.length === 0 && !showAddAgent && (
            <p className="text-xs text-[hsl(0,0%,55%)]">Noch keine Support-Agents hinzugefügt.</p>
          )}

          {agents.map((agent) => (
            <div key={agent.id} className="flex items-center justify-between bg-[hsl(0,0%,97%)] border border-[hsl(0,0%,90%)] rounded-lg px-3 py-2">
              <div>
                <p className="text-sm font-medium text-[hsl(0,0%,10%)]">{agent.name}</p>
                <a href={`mailto:${agent.email}`} className="text-xs text-[hsl(0,0%,50%)] hover:underline">{agent.email}</a>
              </div>
              <button
                onClick={() => handleDeleteAgent(agent.id)}
                disabled={deletingAgentId === agent.id}
                className="p-1.5 rounded-md hover:bg-[hsl(0,0%,88%)] text-[hsl(0,0%,50%)] hover:text-[hsl(0,0%,20%)] transition-colors"
              >
                {deletingAgentId === agent.id
                  ? <RefreshCw size={14} className="animate-spin" />
                  : <Trash2 size={14} />}
              </button>
            </div>
          ))}
        </div>
      </div>

      {selectedTicket && (
        <div className="w-1/2 flex flex-col overflow-hidden bg-white">
          <TicketDetail
            ticket={selectedTicket}
            agents={agents}
            onClose={() => setSelectedTicket(null)}
            onUpdated={() => { void loadTickets(); setSelectedTicket(null); }}
          />
        </div>
      )}
    </div>
  );
}
