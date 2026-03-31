import React, { useState } from "react";
import { X, Send, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";

interface Props {
  onClose: () => void;
  prefillEmail?: string;
  prefillName?: string;
  accountId?: string;
}

export default function SupportModal({ onClose, prefillEmail = "", prefillName = "", accountId }: Props) {
  const { t } = useTranslation();
  const [name, setName] = useState(prefillName);
  const [email, setEmail] = useState(prefillEmail);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setError(t("support.allFieldsRequired"));
      return;
    }
    setSending(true);
    setError(null);
    try {
      const r = await fetch("/api/support", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), subject: subject.trim(), message: message.trim(), accountId }),
      });
      const d = await r.json() as { ok?: boolean; error?: string };
      if (!r.ok || !d.ok) throw new Error(d.error ?? "Failed to send");
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("support.sendError"));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg border border-[hsl(0,0%,88%)]">
        <div className="flex items-center justify-between p-5 border-b border-[hsl(0,0%,90%)]">
          <div>
            <h2 className="text-base font-semibold text-[hsl(0,0%,8%)]">{t("support.title")}</h2>
            <p className="text-xs text-[hsl(0,0%,50%)] mt-0.5">{t("support.subtitle")}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-md hover:bg-[hsl(0,0%,93%)]">
            <X size={16} />
          </button>
        </div>

        {sent ? (
          <div className="p-8 flex flex-col items-center text-center gap-3">
            <CheckCircle size={40} className="text-[hsl(0,0%,20%)]" />
            <h3 className="text-base font-semibold text-[hsl(0,0%,8%)]">{t("support.sentTitle")}</h3>
            <p className="text-sm text-[hsl(0,0%,45%)] max-w-xs">{t("support.sentBody")}</p>
            <Button onClick={onClose} className="mt-2">{t("support.close")}</Button>
          </div>
        ) : (
          <>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-[hsl(0,0%,40%)] mb-1.5">{t("support.nameLabel")}</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t("support.namePlaceholder")}
                    className="text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[hsl(0,0%,40%)] mb-1.5">{t("support.emailLabel")}</label>
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={t("support.emailPlaceholder")}
                    className="text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[hsl(0,0%,40%)] mb-1.5">{t("support.subjectLabel")}</label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder={t("support.subjectPlaceholder")}
                  className="text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[hsl(0,0%,40%)] mb-1.5">{t("support.messageLabel")}</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  placeholder={t("support.messagePlaceholder")}
                  className="w-full rounded-md border border-[hsl(0,0%,80%)] text-sm px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-[hsl(0,0%,40%)]"
                />
              </div>

              {error && (
                <p className="text-xs text-[hsl(0,0%,30%)] bg-[hsl(0,0%,93%)] rounded px-3 py-2">{error}</p>
              )}
            </div>

            <div className="flex justify-end gap-2 p-5 border-t border-[hsl(0,0%,90%)]">
              <Button variant="outline" size="sm" onClick={onClose} disabled={sending}>
                {t("support.cancel")}
              </Button>
              <Button size="sm" onClick={handleSubmit} disabled={sending} className="gap-1.5">
                <Send size={13} />
                {sending ? t("support.sending") : t("support.send")}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
