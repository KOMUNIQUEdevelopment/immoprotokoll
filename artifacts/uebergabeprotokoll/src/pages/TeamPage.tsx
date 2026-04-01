import React, { useState, useEffect } from "react";
import {
  ArrowLeft, UserPlus, Trash2, Shield, User, Crown,
  AlertTriangle, Loader2, RefreshCw, Eye, EyeOff
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface TeamMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "owner" | "administrator" | "property_manager";
  createdAt: string;
}

interface TeamPageProps {
  onBack: () => void;
  currentUserId: string;
  currentUserRole: "owner" | "administrator" | "property_manager";
}

const ROLE_LABEL: Record<string, string> = {
  owner: "Inhaber",
  administrator: "Administrator",
  property_manager: "Verwalter",
};

const ROLE_ICON: Record<string, React.ReactNode> = {
  owner: <Crown size={12} />,
  administrator: <Shield size={12} />,
  property_manager: <User size={12} />,
};

export default function TeamPage({ onBack, currentUserId, currentUserRole }: TeamPageProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showInvite, setShowInvite] = useState(false);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    role: "property_manager" as "owner" | "administrator" | "property_manager",
  });

  const [removingId, setRemovingId] = useState<string | null>(null);

  const isOwner = currentUserRole === "owner";

  const loadMembers = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/users", { credentials: "include" });
      if (res.ok) {
        const data = await res.json() as { users: TeamMember[] };
        setMembers(data.users);
      } else {
        setError("Mitglieder konnten nicht geladen werden.");
      }
    } catch {
      setError("Verbindungsfehler.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadMembers(); }, []);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setInviteError("E-Mail und Passwort sind erforderlich.");
      return;
    }
    if (form.password.length < 8) {
      setInviteError("Passwort muss mindestens 8 Zeichen lang sein.");
      return;
    }
    setInviteLoading(true);
    setInviteError("");
    try {
      const res = await fetch("/api/users/invite", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm({ firstName: "", lastName: "", email: "", password: "", role: "property_manager" });
        setShowInvite(false);
        await loadMembers();
      } else {
        const err = await res.json() as { error: string };
        setInviteError(err.error ?? "Einladung fehlgeschlagen.");
      }
    } catch {
      setInviteError("Verbindungsfehler.");
    } finally {
      setInviteLoading(false);
    }
  };

  const handleRemove = async (userId: string) => {
    if (!window.confirm("Mitglied wirklich entfernen?")) return;
    setRemovingId(userId);
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setMembers(prev => prev.filter(m => m.id !== userId));
      } else {
        const err = await res.json() as { error: string };
        setError(err.error ?? "Entfernen fehlgeschlagen.");
      }
    } catch {
      setError("Verbindungsfehler.");
    } finally {
      setRemovingId(null);
    }
  };

  const availableRoles: Array<"owner" | "administrator" | "property_manager"> = isOwner
    ? ["administrator", "property_manager"]
    : ["administrator", "property_manager"];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="border-b border-neutral-200 sticky top-0 z-40 bg-white">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="p-1.5 rounded-lg text-neutral-500 hover:bg-neutral-100 hover:text-black transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1">
            <h1 className="font-semibold text-sm text-black">Benutzerverwaltung</h1>
          </div>
          {(isOwner || currentUserRole === "administrator") && (
            <Button
              size="sm"
              className="bg-black text-white hover:bg-neutral-800 gap-1.5 h-8 text-xs"
              onClick={() => { setShowInvite(v => !v); setInviteError(""); }}
            >
              <UserPlus size={13} />
              Einladen
            </Button>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-6 space-y-4">

        {/* Invite form */}
        {showInvite && (
          <form
            onSubmit={handleInvite}
            className="rounded-2xl border border-neutral-200 p-5 space-y-3"
          >
            <p className="text-sm font-semibold text-black mb-1">Neues Mitglied einladen</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Vorname</label>
                <input
                  type="text"
                  value={form.firstName}
                  onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  placeholder="Anna"
                />
              </div>
              <div>
                <label className="block text-xs text-neutral-500 mb-1">Nachname</label>
                <input
                  type="text"
                  value={form.lastName}
                  onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  placeholder="Müller"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-neutral-500 mb-1">E-Mail *</label>
              <input
                type="email"
                required
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border border-neutral-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                placeholder="anna@beispiel.ch"
              />
            </div>

            <div>
              <label className="block text-xs text-neutral-500 mb-1">Temporäres Passwort *</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  minLength={8}
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  className="w-full border border-neutral-200 rounded-lg px-3 py-2 pr-9 text-sm focus:outline-none focus:ring-1 focus:ring-black"
                  placeholder="Min. 8 Zeichen"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(v => !v)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-black"
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                Das Mitglied erhält eine E-Mail mit den Zugangsdaten.
              </p>
            </div>

            <div>
              <label className="block text-xs text-neutral-500 mb-1">Rolle</label>
              <div className="flex gap-2">
                {availableRoles.map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, role: r }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                      form.role === r
                        ? "bg-black text-white border-black"
                        : "border-neutral-200 text-neutral-600 hover:bg-neutral-50"
                    }`}
                  >
                    {ROLE_ICON[r]}
                    {ROLE_LABEL[r]}
                  </button>
                ))}
              </div>
              <p className="text-xs text-neutral-400 mt-1.5">
                {form.role === "administrator"
                  ? "Kann Mitglieder einladen und alle Objekte verwalten."
                  : "Kann zugewiesene Objekte und Protokolle verwalten."}
              </p>
            </div>

            {inviteError && (
              <p className="flex items-center gap-2 text-xs text-black bg-neutral-100 rounded-lg px-3 py-2">
                <AlertTriangle size={12} className="shrink-0" />
                {inviteError}
              </p>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                type="submit"
                className="bg-black text-white hover:bg-neutral-800 gap-1.5 text-xs h-8"
                disabled={inviteLoading}
              >
                {inviteLoading ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
                {inviteLoading ? "Wird eingeladen…" : "Einladung senden"}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-neutral-200 text-xs h-8"
                onClick={() => { setShowInvite(false); setInviteError(""); }}
              >
                Abbrechen
              </Button>
            </div>
          </form>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 bg-neutral-50 border border-neutral-200 rounded-xl p-4">
            <AlertTriangle size={15} className="text-black shrink-0" />
            <p className="text-sm text-black flex-1">{error}</p>
            <button
              type="button"
              onClick={() => { setError(""); loadMembers(); }}
              className="text-xs text-neutral-500 hover:text-black flex items-center gap-1"
            >
              <RefreshCw size={12} /> Neu laden
            </button>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <div className="w-5 h-5 border-2 border-neutral-200 border-t-black rounded-full animate-spin" />
          </div>
        )}

        {/* Members list */}
        {!loading && members.length > 0 && (
          <div className="rounded-2xl border border-neutral-200 overflow-hidden">
            <div className="px-5 py-3 border-b border-neutral-100">
              <p className="text-xs text-neutral-400 font-medium uppercase tracking-wide">
                {members.length} {members.length === 1 ? "Mitglied" : "Mitglieder"}
              </p>
            </div>
            <ul className="divide-y divide-neutral-100">
              {members.map(member => (
                <li key={member.id} className="flex items-center gap-3 px-5 py-3.5">
                  <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-semibold text-neutral-600 shrink-0">
                    {(member.firstName?.[0] ?? member.email[0]).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-black truncate">
                      {member.firstName || member.lastName
                        ? `${member.firstName} ${member.lastName}`.trim()
                        : member.email}
                    </p>
                    <p className="text-xs text-neutral-400 truncate">{member.email}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                      member.role === "owner"
                        ? "bg-black text-white"
                        : member.role === "administrator"
                          ? "bg-neutral-100 text-black"
                          : "bg-neutral-100 text-neutral-600"
                    }`}>
                      {ROLE_ICON[member.role]}
                      {ROLE_LABEL[member.role]}
                    </span>
                    {isOwner && member.id !== currentUserId && member.role !== "owner" && (
                      <button
                        type="button"
                        onClick={() => handleRemove(member.id)}
                        disabled={removingId === member.id}
                        className="p-1.5 rounded-lg text-neutral-300 hover:text-black hover:bg-neutral-100 transition-colors"
                        title="Mitglied entfernen"
                      >
                        {removingId === member.id
                          ? <Loader2 size={14} className="animate-spin" />
                          : <Trash2 size={14} />}
                      </button>
                    )}
                    {member.id === currentUserId && (
                      <span className="text-xs text-neutral-400">(Du)</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {!loading && members.length === 0 && !error && (
          <div className="text-center py-16 text-neutral-400 text-sm">
            Noch keine Mitglieder vorhanden.
          </div>
        )}

        <div className="rounded-xl border border-neutral-100 bg-neutral-50 px-4 py-3">
          <p className="text-xs text-neutral-500 leading-relaxed">
            <strong className="text-black">Rollen:</strong>{" "}
            <strong>Inhaber</strong> hat vollen Zugriff. <strong>Administrator</strong> kann Mitglieder einladen und alle Objekte verwalten. <strong>Verwalter</strong> kann zugewiesene Objekte und Protokolle bearbeiten.
          </p>
        </div>
      </main>
    </div>
  );
}
