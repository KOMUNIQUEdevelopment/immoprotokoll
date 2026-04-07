import { useEffect } from 'react';

interface SEOProps {
  title: string;
  description: string;
  lang: 'de' | 'en';
  path: string;
  schema?: any;
}

export function useSEO({ title, description, lang, path, schema }: SEOProps) {
  useEffect(() => {
    document.title = title;
    
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', description);
    
    let ogTitle = document.querySelector('meta[property="og:title"]');
    if (!ogTitle) {
      ogTitle = document.createElement('meta');
      ogTitle.setAttribute('property', 'og:title');
      document.head.appendChild(ogTitle);
    }
    ogTitle.setAttribute('content', title);
    
    let ogDesc = document.querySelector('meta[property="og:description"]');
    if (!ogDesc) {
      ogDesc = document.createElement('meta');
      ogDesc.setAttribute('property', 'og:description');
      document.head.appendChild(ogDesc);
    }
    ogDesc.setAttribute('content', description);

    let ogUrl = document.querySelector('meta[property="og:url"]');
    if (!ogUrl) {
      ogUrl = document.createElement('meta');
      ogUrl.setAttribute('property', 'og:url');
      document.head.appendChild(ogUrl);
    }
    ogUrl.setAttribute('content', `https://immoprotokoll.com${path}`);

    document.documentElement.lang = lang;

    const otherLang = lang === 'de' ? 'en' : 'de';
    // Naive path switch for standard routes
    const DE_TO_EN: Record<string, string> = {
      '/': '/en',
      '/datenschutz': '/en/privacy',
      '/agb': '/en/terms',
      '/impressum': '/en/imprint',
      '/hilfe': '/en/help',
    };
    const EN_TO_DE: Record<string, string> = {
      '/en': '/',
      '/en/privacy': '/datenschutz',
      '/en/terms': '/agb',
      '/en/imprint': '/impressum',
      '/en/help': '/hilfe',
    };
    let otherPath: string;
    if (lang === 'de') {
      otherPath = DE_TO_EN[path] ?? path.replace(/^\//, '/en/');
    } else {
      otherPath = EN_TO_DE[path] ?? (path.replace(/^\/en/, '') || '/');
    }

    let linkDe = document.querySelector('link[hreflang="de"]');
    if (!linkDe) {
      linkDe = document.createElement('link');
      linkDe.setAttribute('rel', 'alternate');
      linkDe.setAttribute('hreflang', 'de');
      document.head.appendChild(linkDe);
    }
    linkDe.setAttribute('href', `https://immoprotokoll.com${lang === 'de' ? path : otherPath}`);

    let linkEn = document.querySelector('link[hreflang="en"]');
    if (!linkEn) {
      linkEn = document.createElement('link');
      linkEn.setAttribute('rel', 'alternate');
      linkEn.setAttribute('hreflang', 'en');
      document.head.appendChild(linkEn);
    }
    linkEn.setAttribute('href', `https://immoprotokoll.com${lang === 'en' ? path : otherPath}`);

    if (schema) {
      let scriptSchema = document.querySelector('#schema-org');
      if (!scriptSchema) {
        scriptSchema = document.createElement('script');
        scriptSchema.setAttribute('type', 'application/ld+json');
        scriptSchema.setAttribute('id', 'schema-org');
        document.head.appendChild(scriptSchema);
      }
      scriptSchema.textContent = JSON.stringify(schema);
    }

    return () => {
      const scriptSchema = document.querySelector('#schema-org');
      if (scriptSchema) {
        scriptSchema.textContent = '';
      }
    };
  }, [title, description, lang, path, schema]);
}
