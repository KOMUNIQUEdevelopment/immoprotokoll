import { useState, useEffect, type FormEvent } from "react";
import { motion } from "framer-motion";
import { CheckCircle2, RefreshCw, Map, Lightbulb, ArrowRight } from "lucide-react";

interface RoadmapItem {
  id: string;
  title: string;
  description: string;
  titleEn: string | null;
  descriptionEn: string | null;
  status: "planned" | "in_progress" | "done";
  category: string | null;
}

const STATUS_META: Record<string, { label: Record<string, string>; style: string }> = {
  planned: {
    label: { de: "Geplant", en: "Planned" },
    style: "bg-[hsl(0,0%,10%)] text-white",
  },
  in_progress: {
    label: { de: "In Entwicklung", en: "In Development" },
    style: "bg-[hsl(0,0%,30%)] text-white",
  },
  done: {
    label: { de: "Fertig", en: "Done" },
    style: "bg-[hsl(0,0%,70%)] text-[hsl(0,0%,10%)]",
  },
};

const ORDER = ["in_progress", "planned", "done"];

interface Props {
  lang: string;
}

export default function RoadmapSection({ lang }: Props) {
  const isDE = lang === "de";

  const [items, setItems] = useState<RoadmapItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(true);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/roadmap")
      .then((r) => r.json())
      .then((d: { items?: RoadmapItem[] }) => {
        const sorted = (d.items ?? []).sort(
          (a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status),
        );
        setItems(sorted);
      })
      .catch(() => setItems([]))
      .finally(() => setLoadingItems(false));
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!title.trim()) {
      setError(isDE ? "Bitte gib einen Titel ein." : "Please provide a title.");
      return;
    }
    setSubmitting(true);
    try {
      const r = await fetch("/api/roadmap/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), title: title.trim(), description: description.trim() }),
      });
      if (r.ok) {
        setSent(true);
        setName(""); setEmail(""); setTitle(""); setDescription("");
      } else {
        const d = await r.json() as { error?: string };
        setError(d.error ?? (isDE ? "Fehler beim Senden." : "Error sending request."));
      }
    } catch {
      setError(isDE ? "Netzwerkfehler. Bitte erneut versuchen." : "Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
  };

  const stagger = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
  };

  return (
    <section id="roadmap" className="py-28 bg-[hsl(0,0%,97%)] px-4">
      <div className="container mx-auto max-w-4xl">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          className="text-center mb-16"
        >
          <div className="inline-flex items-center gap-2 bg-black text-white text-xs font-semibold px-3 py-1.5 rounded-full mb-6 uppercase tracking-widest">
            <Map size={12} /> Roadmap
          </div>
          <h2 className="text-4xl md:text-5xl font-black tracking-tight text-[hsl(0,0%,5%)] mb-5">
            {isDE ? "Was wir bauen." : "What we're building."}
          </h2>
          <p className="text-lg text-[hsl(0,0%,40%)] font-medium max-w-2xl mx-auto">
            {isDE
              ? "Transparenz ist uns wichtig. Hier siehst du, woran wir arbeiten – und du kannst eigene Feature-Wünsche einreichen."
              : "Transparency matters to us. See what we're working on — and submit your own feature requests."}
          </p>
        </motion.div>

        {/* Roadmap Items */}
        {loadingItems ? (
          <div className="flex justify-center py-12 text-[hsl(0,0%,50%)]">
            <RefreshCw size={20} className="animate-spin" />
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-[hsl(0,0%,55%)] py-10">
            {isDE ? "Keine Einträge vorhanden." : "No entries yet."}
          </p>
        ) : (
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-50px" }}
            variants={stagger}
            className="grid gap-4 mb-20"
          >
            {items.map((item) => {
              const meta = STATUS_META[item.status];
              return (
                <motion.div
                  key={item.id}
                  variants={fadeUp}
                  className="bg-white border border-[hsl(0,0%,88%)] rounded-xl p-5 flex items-start gap-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {item.status === "done" ? (
                      <CheckCircle2 size={20} className="text-[hsl(0,0%,50%)]" />
                    ) : item.status === "in_progress" ? (
                      <RefreshCw size={20} className="text-[hsl(0,0%,15%)]" />
                    ) : (
                      <Map size={20} className="text-[hsl(0,0%,35%)]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 flex-wrap mb-1">
                      <h3 className="font-semibold text-[hsl(0,0%,8%)] text-base">
                        {(!isDE && item.titleEn) ? item.titleEn : item.title}
                      </h3>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {item.category && (
                          <span className="text-xs text-[hsl(0,0%,50%)] bg-[hsl(0,0%,93%)] px-2 py-0.5 rounded">
                            {item.category}
                          </span>
                        )}
                        {meta && (
                          <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${meta.style}`}>
                            {meta.label[isDE ? "de" : "en"]}
                          </span>
                        )}
                      </div>
                    </div>
                    {(item.description || item.descriptionEn) && (
                      <p className="text-sm text-[hsl(0,0%,40%)] leading-relaxed">
                        {(!isDE && item.descriptionEn) ? item.descriptionEn : item.description}
                      </p>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}

        {/* Feature Request Form */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          variants={fadeUp}
          className="bg-black text-white rounded-2xl p-8 md:p-10"
        >
          <div className="flex items-center gap-3 mb-2">
            <Lightbulb size={20} className="text-white/70" />
            <h3 className="text-xl font-black tracking-tight">
              {isDE ? "Feature vorschlagen" : "Suggest a Feature"}
            </h3>
          </div>
          <p className="text-white/60 text-sm mb-7">
            {isDE
              ? "Deine Idee könnte das nächste grosse Ding sein. Schreib sie auf."
              : "Your idea could be the next big thing. Write it down."}
          </p>

          {sent ? (
            <div className="flex items-center gap-3 bg-white/10 rounded-xl px-5 py-4 text-white/90">
              <CheckCircle2 size={20} className="text-white/70 flex-shrink-0" />
              <p className="text-sm font-medium">
                {isDE
                  ? "Danke! Dein Vorschlag ist bei uns angekommen."
                  : "Thank you! Your suggestion has been received."}
              </p>
            </div>
          ) : (
            <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-white/50 uppercase tracking-wide mb-1.5">
                    {isDE ? "Name (optional)" : "Name (optional)"}
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={isDE ? "Max Muster" : "Jane Doe"}
                    className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-white/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-white/50 uppercase tracking-wide mb-1.5">
                    {isDE ? "E-Mail (optional)" : "Email (optional)"}
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="max@beispiel.ch"
                    className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-white/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 uppercase tracking-wide mb-1.5">
                  {isDE ? "Feature-Titel *" : "Feature Title *"}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  placeholder={isDE ? "z.B. Automatischer Mietvertrag-Export" : "e.g. Automatic lease export"}
                  className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-white/50"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-white/50 uppercase tracking-wide mb-1.5">
                  {isDE ? "Beschreibung (optional)" : "Description (optional)"}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                  placeholder={isDE ? "Erkläre kurz, welches Problem gelöst werden soll…" : "Briefly explain what problem this would solve…"}
                  className="w-full bg-white/10 border border-white/20 text-white placeholder-white/30 rounded-lg px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-white/50"
                />
              </div>

              {error && (
                <p className="text-xs text-white/60 bg-white/10 rounded-lg px-4 py-2">{error}</p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="flex items-center gap-2 bg-white text-black px-7 py-3 text-sm font-semibold rounded-lg tracking-wide hover:bg-white/90 transition-colors disabled:opacity-60"
              >
                {submitting
                  ? <RefreshCw size={15} className="animate-spin" />
                  : <ArrowRight size={15} />}
                {isDE ? "Vorschlag einreichen" : "Submit Suggestion"}
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </section>
  );
}
