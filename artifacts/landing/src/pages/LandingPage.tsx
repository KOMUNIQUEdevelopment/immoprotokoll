import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import PricingSection from "../components/PricingSection";
import { useLanguage } from "../i18n";
import { useSEO } from "../hooks/useSEO";
import { motion } from "framer-motion";
import { ArrowRight, ChevronDown } from "lucide-react";
import { useState } from "react";

export default function LandingPage() {
  const { t, lang } = useLanguage();

  const title = lang === 'de' 
    ? "ImmoProtokoll - Das präzise digitale Übergabeprotokoll" 
    : "ImmoProtokoll - The digital handover protocol";
  const description = lang === 'de'
    ? "Ersetzen Sie Klemmbrett und Papier durch einen makellosen digitalen Workflow für Immobilienübergaben in der Schweiz."
    : "Replace clipboards and paper with a flawless digital workflow for property handovers in Switzerland.";

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
              className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[1.05] mb-8"
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
                className="bg-black text-white px-8 py-4 text-lg font-bold w-full sm:w-auto hover:bg-black/80 transition-colors flex items-center justify-center gap-2"
              >
                {t.hero.cta_primary}
                <ArrowRight size={20} />
              </a>
              <a 
                href="#features" 
                className="bg-white text-black border-2 border-black px-8 py-4 text-lg font-bold w-full sm:w-auto hover:bg-black/5 transition-colors"
              >
                {t.hero.cta_secondary}
              </a>
            </motion.div>
          </div>
        </section>

        {/* IMAGE BREAK */}
        <section className="px-4 pb-24 overflow-hidden">
          <motion.div 
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-100px" }}
            variants={fadeUp}
            className="container mx-auto max-w-6xl"
          >
            <div className="aspect-[16/9] w-full bg-black/5 border border-black/10 overflow-hidden relative">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3/4 h-3/4 bg-white shadow-2xl border border-black/10 flex flex-col">
                  <div className="h-12 border-b border-black/10 flex items-center px-4">
                    <div className="w-32 h-4 bg-black/10"></div>
                  </div>
                  <div className="flex-1 flex p-6 gap-6">
                    <div className="w-1/3 flex flex-col gap-4">
                      <div className="h-24 bg-black/5"></div>
                      <div className="h-24 bg-black/5"></div>
                      <div className="h-24 bg-black/5"></div>
                    </div>
                    <div className="w-2/3 border border-black/10 p-6 flex flex-col gap-6">
                      <div className="w-1/2 h-8 bg-black/10"></div>
                      <div className="w-full h-32 bg-black/5"></div>
                      <div className="w-full h-4 bg-black/5"></div>
                      <div className="w-3/4 h-4 bg-black/5"></div>
                    </div>
                  </div>
                </div>
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
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-12"
            >
              {t.features.items.map((item, i) => (
                <motion.div key={i} variants={fadeUp} className="border-t border-white/20 pt-6">
                  <div className="text-2xl font-bold mb-4 opacity-50">0{i + 1}</div>
                  <h3 className="text-xl font-bold mb-3">{item.title}</h3>
                  <p className="text-white/70 font-medium leading-relaxed">{item.desc}</p>
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
            
            <div className="space-y-12 relative before:absolute before:inset-0 before:ml-[27px] md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-black/10">
              {t.walkthrough.steps.map((step, i) => (
                <motion.div 
                  key={i}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-100px" }}
                  variants={fadeUp}
                  className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"
                >
                  <div className="flex items-center justify-center w-14 h-14 rounded-full bg-black text-white font-bold text-xl border-4 border-white z-10 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm">
                    {i + 1}
                  </div>
                  <div className="w-[calc(100%-4rem)] md:w-[calc(50%-3rem)] p-6 border border-black/10 bg-white">
                    <h3 className="font-bold text-xl mb-2">{step.title}</h3>
                    <p className="text-black/60 font-medium">{step.desc}</p>
                  </div>
                </motion.div>
              ))}
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
              {t.faq.questions.map((q, i) => (
                <motion.div key={i} variants={fadeUp}>
                  <FaqItem question={q.q} answer={q.a} />
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* BOTTOM CTA */}
        <section className="py-32 bg-black text-white text-center px-4">
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
            <p className="text-xl text-white/70 mb-12 font-medium">
              {lang === "de" 
                ? "Digitalisieren Sie Ihre Übergabeprotokolle noch heute." 
                : "Digitize your handover protocols today."}
            </p>
            <a 
              href="https://app.immoprotokoll.com" 
              className="inline-block bg-white text-black px-10 py-5 text-xl font-bold hover:bg-white/90 transition-colors"
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

function FaqItem({ question, answer }: { question: string, answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-black/10 bg-white">
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
