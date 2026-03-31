import { useLanguage } from "../i18n";
import { motion } from "framer-motion";
import { useState } from "react";
import { Check } from "lucide-react";

export default function PricingSection() {
  const { t } = useLanguage();
  const [isAnnual, setIsAnnual] = useState(true);
  const [currency, setCurrency] = useState<"CHF" | "EUR" | "USD">("CHF");

  return (
    <section id="pricing" className="py-24 bg-white">
      <div className="container mx-auto px-4 md:px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-100px" }}
          className="text-center max-w-3xl mx-auto mb-16"
        >
          <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-10">
            {t.pricing.title}
          </h2>

          {/* Billing period toggle */}
          <div className="flex items-center justify-center mb-5">
            <div className="inline-flex bg-[hsl(0,0%,93%)] p-1.5 rounded-2xl gap-1.5">
              <button
                onClick={() => setIsAnnual(false)}
                className={`px-8 py-3 rounded-xl text-base font-bold transition-all duration-200 ${
                  !isAnnual
                    ? 'bg-white text-black shadow-md'
                    : 'text-[hsl(0,0%,50%)] hover:text-black'
                }`}
              >
                {t.pricing.monthly}
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`px-8 py-3 rounded-xl text-base font-bold transition-all duration-200 flex items-center gap-2.5 ${
                  isAnnual
                    ? 'bg-white text-black shadow-md'
                    : 'text-[hsl(0,0%,50%)] hover:text-black'
                }`}
              >
                {t.pricing.annual}
                <span className="text-[11px] font-black bg-black text-white px-2 py-0.5 rounded-full tracking-wider">
                  −20%
                </span>
              </button>
            </div>
          </div>

          {/* Currency switcher */}
          <div className="flex items-center justify-center gap-2">
            {(["CHF", "EUR", "USD"] as const).map(c => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`px-5 py-2.5 rounded-xl text-sm font-black tracking-wide border-2 transition-all duration-200 ${
                  currency === c
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-[hsl(0,0%,55%)] border-[hsl(0,0%,88%)] hover:border-[hsl(0,0%,50%)] hover:text-black'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {/* Free */}
          <PricingCard 
            name={t.pricing.free.name}
            price="0"
            currency={currency}
            period=""
            limits={t.pricing.free.limits.split(", ")}
            cta={t.pricing.free.cta}
            href="/app/"
            delay={0}
          />

          {/* Privat */}
          <PricingCard 
            name={t.pricing.privat.name}
            price={isAnnual ? t.pricing.privat.price_yr : t.pricing.privat.price_mo}
            currency={currency}
            period={isAnnual ? "/yr" : "/mo"}
            limits={t.pricing.privat.limits.split(", ")}
            cta={t.pricing.privat.cta}
            href="/app/#/register"
            highlight
            delay={0.1}
          />

          {/* Agentur */}
          <PricingCard 
            name={t.pricing.agentur.name}
            price={isAnnual ? t.pricing.agentur.price_yr : t.pricing.agentur.price_mo}
            currency={currency}
            period={isAnnual ? "/yr" : "/mo"}
            limits={t.pricing.agentur.limits.split(", ")}
            cta={t.pricing.agentur.cta}
            href="/app/#/register"
            delay={0.2}
          />

          {/* Custom */}
          <PricingCard 
            name={t.pricing.custom.name}
            price={t.pricing.custom.price}
            currency=""
            period=""
            limits={t.pricing.custom.limits.split(", ")}
            cta={t.pricing.custom.cta}
            href="mailto:support@immoprotokoll.com"
            delay={0.3}
          />
        </div>
      </div>
    </section>
  );
}

function PricingCard({ name, price, currency, period, limits, cta, href, highlight = false, delay = 0 }: any) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ delay }}
      whileHover={{ y: -5 }}
      className={`border ${highlight ? 'border-black border-2' : 'border-black/20'} rounded-lg p-8 flex flex-col bg-white h-full`}
    >
      <h3 className="text-xl font-bold mb-4">{name}</h3>
      <div className="mb-6">
        <span className={currency ? "text-4xl font-black tracking-tight" : "text-2xl font-bold tracking-tight"}>
          {currency && <span className="text-xl mr-1">{currency}</span>}
          {price}
        </span>
        <span className="text-black/60 font-medium ml-1">{period}</span>
      </div>
      
      <ul className="flex-1 flex flex-col gap-4 mb-8">
        {limits.map((limit: string, i: number) => (
          <li key={i} className="flex items-start gap-3 text-sm">
            <Check className="shrink-0 mt-0.5" size={18} />
            <span className="font-medium leading-tight">{limit}</span>
          </li>
        ))}
      </ul>

      <a 
        href={href}
        className={`w-full py-3 text-sm font-semibold text-center tracking-wide rounded-lg transition-colors mt-auto ${
          highlight 
            ? 'bg-black text-white hover:bg-black/80' 
            : 'bg-black/5 text-black hover:bg-black/10'
        }`}
      >
        {cta}
      </a>
    </motion.div>
  );
}
