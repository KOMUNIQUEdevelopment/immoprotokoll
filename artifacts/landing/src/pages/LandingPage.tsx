import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PricingSection from "../components/PricingSection";
import { useLanguage } from "../i18n";
import { useSEO } from "../hooks/useSEO";
import { motion } from "framer-motion";
import { ArrowRight, ChevronDown, Camera, PenLine, FileDown, Share2, Monitor, Users } from "lucide-react";
import { useState, useEffect, useMemo, type ReactNode } from "react";

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
  const slides = useMemo(() => {
    const all = [
      { src: `${base}slides/slide-1.jpg`, alt: lang === "de" ? "Vermieter mit Hausmodell" : "Landlord with house model", bg: "#41C5BD" },
      { src: `${base}slides/slide-2.jpg`, alt: lang === "de" ? "Nachdenklicher Vermieter" : "Thoughtful property owner", bg: "#F0F0F0" },
      { src: `${base}slides/slide-3.jpg`, alt: lang === "de" ? "Lächelnder Mann mit Hausmodell" : "Smiling man with house model", bg: "#41C5BD" },
      { src: `${base}slides/slide-4.jpg`, alt: lang === "de" ? "Frau mit Hausmodell" : "Woman with house model", bg: "#4A8EC9" },
      { src: `${base}slides/slide-5.jpg`, alt: lang === "de" ? "Junge Frau mit Hausmodell" : "Young woman with house model", bg: "#4A8EC9" },
      { src: `${base}slides/slide-6.jpg`, alt: lang === "de" ? "Elegant gekleidete Frau mit Hausmodell" : "Elegantly dressed woman with house model", bg: "#4A8EC9" },
    ];
    for (let i = all.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [all[i], all[j]] = [all[j], all[i]];
    }
    return all;
  }, []);

  const [activeSlide, setActiveSlide] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveSlide(i => (i + 1) % slides.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [slides.length]);

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
                href="https://app.immoprotokoll.com" 
                className="bg-black text-white px-8 py-4 text-lg font-bold w-full sm:w-auto rounded-lg hover:bg-black/80 transition-colors flex items-center justify-center gap-2 shadow-md"
              >
                {t.hero.cta_primary}
                <ArrowRight size={20} />
              </a>
              <a 
                href="#features" 
                className="bg-white text-black border-2 border-black px-8 py-4 text-lg font-bold w-full sm:w-auto rounded-lg hover:bg-black/5 transition-colors shadow-sm"
              >
                {t.hero.cta_secondary}
              </a>
            </motion.div>
          </div>
        </section>

        {/* PHOTO SLIDER */}
        <section className="px-4 pb-24 overflow-hidden">
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="container mx-auto max-w-6xl"
          >
            <div className="relative w-full aspect-[16/7] rounded-lg overflow-hidden shadow-xl bg-black">
              {slides.map((slide, i) => (
                <img
                  key={i}
                  src={slide.src}
                  alt={slide.alt}
                  className="absolute inset-0 w-full h-full object-cover transition-opacity duration-[1200ms] ease-in-out"
                  style={{ opacity: i === activeSlide ? 1 : 0 }}
                />
              ))}
              {/* dot indicators */}
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 z-10">
                {slides.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveSlide(i)}
                    aria-label={`Slide ${i + 1}`}
                    className={`w-2 h-2 rounded-full transition-all duration-300 ${i === activeSlide ? "bg-white scale-125" : "bg-white/40 hover:bg-white/70"}`}
                  />
                ))}
              </div>
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
            
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className="grid grid-cols-2 md:grid-cols-5 gap-6"
            >
              {t.walkthrough.steps.map((step, i) => (
                <motion.div
                  key={i}
                  variants={fadeUp}
                  className="flex flex-col items-center text-center gap-4"
                >
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-black text-white font-bold text-lg shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">{step.title}</h3>
                    <p className="text-black/60 text-sm leading-relaxed">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
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

        {/* BOTTOM CTA */}
        <section
          className="py-32 text-black text-center px-4"
          style={{
            backgroundColor: slides[activeSlide].bg,
            transition: "background-color 1200ms ease-in-out",
          }}
        >
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
              href="https://app.immoprotokoll.com" 
              className="inline-block bg-black text-white px-10 py-5 text-xl font-bold rounded-lg hover:bg-black/80 transition-colors shadow-lg"
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
