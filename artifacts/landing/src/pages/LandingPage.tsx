import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PricingSection from "../components/PricingSection";
import RoadmapSection from "../components/RoadmapSection";
import { useLanguage } from "../i18n";
import { useSEO } from "../hooks/useSEO";
import { motion } from "framer-motion";
import { ArrowRight, ChevronDown, Camera, PenLine, FileDown, Share2, Monitor, Users } from "lucide-react";
import { useState, type ReactNode, type FormEvent } from "react";

export default function LandingPage() {
  const { t, lang } = useLanguage();

  const title = lang === 'de' 
    ? "ImmoProtokoll – Jede Mietübergabe. Sauber dokumentiert." 
    : "ImmoProtokoll – Every rental handover. Cleanly documented.";
  const description = lang === 'de'
    ? "Ersetzen Sie Klemmbrett und Papier durch einen makellosen digitalen Workflow für Immobilienübergaben."
    : "Replace clipboards and paper with a flawless digital workflow for property handovers.";

  const schema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "ImmoProtokoll",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web, iOS, Android",
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "CHF"
    },
    "publisher": {
      "@type": "Organization",
      "name": "KOMUNIQUE by Philipp Roth"
    }
  };

  useSEO({
    title,
    description,
    lang,
    path: `/${lang}`,
    schema
  });

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const base = import.meta.env.BASE_URL;

  return (
    <div className="min-h-screen bg-white text-black font-sans selection:bg-black selection:text-white flex flex-col">
      <Navbar />

      <main className="flex-grow">
        {/* HERO */}
        <section className="pt-32 pb-24 md:pt-40 md:pb-32 px-4">
          <div className="container mx-auto max-w-5xl text-center">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[1.05] mb-8 [overflow-wrap:anywhere] [hyphens:auto]"
              lang={lang}
            >
              {t.hero.title}
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="text-xl md:text-2xl font-medium text-black/70 max-w-3xl mx-auto mb-12"
            >
              {t.hero.subtitle}
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-4"
            >
              <a 
                href="https://app.immoprotokoll.com/" 
                className="bg-black text-white px-7 py-3 text-sm font-semibold w-full sm:w-auto rounded-lg hover:bg-black/80 transition-colors flex items-center justify-center gap-2 tracking-wide"
              >
                {t.hero.cta_primary}
                <ArrowRight size={15} />
              </a>
              <a 
                href="#features" 
                className="bg-white text-black border border-black px-7 py-3 text-sm font-semibold w-full sm:w-auto rounded-lg hover:bg-black/5 transition-colors tracking-wide"
              >
                {t.hero.cta_secondary}
              </a>
            </motion.div>
          </div>
        </section>

        {/* APP ILLUSTRATION */}
        <section className="px-4 pb-24 overflow-hidden">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="container mx-auto max-w-6xl"
          >
            <div className="w-full rounded-lg overflow-hidden bg-white">
              <img
                src={`${base}app-illustration.png`}
                alt={lang === "de" ? "ImmoProtokoll App – Checkliste, Fotos, Unterschrift" : "ImmoProtokoll App – checklist, photos, signature"}
                className="w-full h-auto object-contain"
              />
            </div>
          </motion.div>
        </section>

        {/* FEATURES */}
        <section id="features" className="py-24 bg-black text-white">
          <div className="container mx-auto px-4 md:px-6">
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeUp}
              className="mb-16"
            >
              <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
                {t.features.title}
              </h2>
              <p className="text-xl text-white/70 max-w-2xl">
                {t.features.subtitle}
              </p>
            </motion.div>

            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
            >
              {[Camera, PenLine, FileDown, Share2, Monitor, Users].map((Icon, i) => (
                <motion.div key={i} variants={fadeUp} className="bg-white/5 rounded-lg p-6 border border-white/10 hover:bg-white/10 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center mb-5">
                    <Icon size={20} className="text-white" />
                  </div>
                  <h3 className="text-lg font-bold mb-2">{t.features.items[i].title}</h3>
                  <p className="text-white/60 leading-relaxed text-sm">{t.features.items[i].desc}</p>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* WALKTHROUGH */}
        <section className="py-24 bg-white">
          <div className="container mx-auto px-4 md:px-6 max-w-4xl">
            <motion.h2 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeUp}
              className="text-4xl md:text-5xl font-bold tracking-tight mb-16 text-center"
            >
              {t.walkthrough.title}
            </motion.h2>
            
            <div className="relative">
              {/* Centre line */}
              <div className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0 w-px bg-black/10 hidden md:block" />

              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-100px" }}
                variants={staggerContainer}
                className="flex flex-col gap-12"
              >
                {t.walkthrough.steps.map((step, i) => {
                  const isLeft = i % 2 === 0;
                  return (
                    <motion.div
                      key={i}
                      variants={fadeUp}
                      className="relative grid grid-cols-[auto_1fr] md:grid-cols-[1fr_auto_1fr] items-center gap-4 md:gap-8"
                    >
                      {/* Left slot — desktop only */}
                      {isLeft ? (
                        <div className="hidden md:block border border-black/10 rounded-lg p-6 bg-white shadow-sm text-right">
                          <h3 className="font-bold text-lg mb-1">{step.title}</h3>
                          <p className="text-black/60 text-sm leading-relaxed">{step.desc}</p>
                        </div>
                      ) : (
                        <div className="hidden md:block" />
                      )}

                      {/* Number bubble */}
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-black text-white font-bold text-lg shrink-0 z-10">
                        {i + 1}
                      </div>

                      {/* Right slot — desktop only */}
                      {!isLeft ? (
                        <div className="hidden md:block border border-black/10 rounded-lg p-6 bg-white shadow-sm">
                          <h3 className="font-bold text-lg mb-1">{step.title}</h3>
                          <p className="text-black/60 text-sm leading-relaxed">{step.desc}</p>
                        </div>
                      ) : (
                        <div className="hidden md:block" />
                      )}

                      {/* Mobile: card inline next to bubble */}
                      <div className="md:hidden border border-black/10 rounded-lg p-4 bg-white shadow-sm">
                        <h3 className="font-bold text-base mb-1">{step.title}</h3>
                        <p className="text-black/60 text-sm leading-relaxed">{step.desc}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            </div>
          </div>
        </section>

        <PricingSection />

        {/* FAQ */}
        <section id="faq" className="py-24 bg-black/5">
          <div className="container mx-auto px-4 md:px-6 max-w-3xl">
            <motion.h2 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={fadeUp}
              className="text-4xl md:text-5xl font-bold tracking-tight mb-12 text-center"
            >
              {t.faq.title}
            </motion.h2>
            <motion.div 
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="flex flex-col gap-4"
            >
              {t.faq.questions.map((q, i) => {
                const privacyHref = lang === "de" ? `/${lang}/datenschutz` : `/${lang}/privacy`;
                const privacyLinkText = lang === "de" ? "Datenschutzerklärung" : "Privacy Policy";
                const answer = i === 1 ? (
                  <span>
                    {q.a}{" "}
                    <a href={privacyHref} className="underline font-semibold hover:opacity-70 transition-opacity">
                      → {privacyLinkText}
                    </a>
                  </span>
                ) : q.a;
                return (
                  <motion.div key={i} variants={fadeUp}>
                    <FaqItem question={q.q} answer={answer} />
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        </section>

        {/* ROADMAP */}
        <RoadmapSection lang={lang} />

        {/* SUPPORT / CONTACT */}
        <ContactSection lang={lang} />

        {/* BOTTOM CTA */}
        <section className="py-32 bg-white text-black text-center px-4">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="container mx-auto max-w-3xl"
          >
            <h2 className="text-5xl md:text-6xl font-black tracking-tight mb-8">
              {lang === "de" ? "Bereit für den Wechsel?" : "Ready to switch?"}
            </h2>
            <p className="text-xl text-black/60 mb-12 font-medium">
              {lang === "de" 
                ? "Digitalisieren Sie Ihre Übergabeprotokolle noch heute." 
                : "Digitize your handover protocols today."}
            </p>
            <a 
              href="https://app.immoprotokoll.com/" 
              className="inline-block bg-black text-white px-7 py-3 text-sm font-semibold rounded-lg hover:bg-black/80 transition-colors tracking-wide"
            >
              {t.hero.cta_primary}
            </a>
          </motion.div>
        </section>

      </main>

      <Footer />
    </div>
  );
}

function ContactSection({ lang }: { lang: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isDE = lang === "de";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !subject.trim() || !message.trim()) {
      setError(isDE ? "Bitte füllen Sie alle Felder aus." : "Please fill in all fields.");
      return;
    }
    setSending(true);
    setError(null);
    try {
      const r = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email: email.trim(), subject: subject.trim(), message: message.trim() }),
      });
      const d = await r.json() as { ok?: boolean; error?: string };
      if (!r.ok || !d.ok) throw new Error(d.error ?? "Failed");
      setSent(true);
    } catch {
      setError(isDE ? "Fehler beim Senden. Bitte versuchen Sie es erneut." : "Failed to send. Please try again.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section id="contact" className="py-24 bg-black text-white px-4">
      <div className="container mx-auto max-w-2xl">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-black tracking-tight mb-4">
            {isDE ? "Kontakt & Support" : "Contact & Support"}
          </h2>
          <p className="text-white/60 text-lg font-medium">
            {isDE
              ? "Haben Sie Fragen? Wir helfen Ihnen gerne weiter."
              : "Have questions? We're happy to help."}
          </p>
        </div>

        {sent ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 rounded-full border-2 border-white/20 flex items-center justify-center mx-auto mb-6">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-3">{isDE ? "Anfrage gesendet" : "Request sent"}</h3>
            <p className="text-white/60">
              {isDE
                ? "Wir haben Ihre Anfrage erhalten und melden uns in Kürze bei Ihnen."
                : "We've received your request and will get back to you shortly."}
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">{isDE ? "Name" : "Name"}</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={isDE ? "Ihr vollständiger Name" : "Your full name"}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-1.5">{isDE ? "E-Mail" : "Email"}</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={isDE ? "ihre@email.com" : "your@email.com"}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">{isDE ? "Betreff" : "Subject"}</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={isDE ? "Womit können wir helfen?" : "How can we help?"}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-white/70 mb-1.5">{isDE ? "Nachricht" : "Message"}</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder={isDE ? "Beschreiben Sie Ihr Anliegen…" : "Describe your issue…"}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-white/50 resize-none"
              />
            </div>

            {error && (
              <p className="text-sm text-white/60 bg-white/10 rounded-lg px-4 py-3">{error}</p>
            )}

            <button
              type="submit"
              disabled={sending}
              className="w-full bg-white text-black px-7 py-3 text-sm font-semibold rounded-lg hover:bg-white/90 transition-colors tracking-wide disabled:opacity-50"
            >
              {sending
                ? (isDE ? "Wird gesendet…" : "Sending…")
                : (isDE ? "Anfrage senden" : "Send request")}
            </button>

            <p className="text-center text-sm text-white/40">
              {isDE ? "Oder schreiben Sie uns direkt: " : "Or write to us directly: "}
              <a href="mailto:support@immoprotokoll.com" className="text-white/70 hover:text-white underline underline-offset-2">
                support@immoprotokoll.com
              </a>
            </p>
          </form>
        )}
      </div>
    </section>
  );
}

function FaqItem({ question, answer }: { question: string, answer: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-black/10 bg-white rounded-lg overflow-hidden shadow-xs">
      <button 
        className="w-full px-6 py-5 flex items-center justify-between text-left font-bold text-lg hover:bg-black/5 transition-colors"
        onClick={() => setOpen(!open)}
      >
        {question}
        <ChevronDown className={`transform transition-transform ${open ? 'rotate-180' : ''} shrink-0 ml-4`} />
      </button>
      {open && (
        <div className="px-6 pb-6 text-black/70 font-medium leading-relaxed">
          {answer}
        </div>
      )}
    </div>
  );
}
