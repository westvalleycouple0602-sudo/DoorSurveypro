import { useEffect } from 'react';

export interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string[];
  canonical?: string;
  ogType?: 'website' | 'article' | 'product';
  ogImage?: string;
  ogImageAlt?: string;
  twitterCard?: 'summary' | 'summary_large_image' | 'app' | 'player';
  noindex?: boolean;
  nofollow?: boolean;
  structuredData?: Record<string, any>;
}

const DEFAULT_SEO = {
  title: 'DoorSurvey Pro - Commercial Door Survey & Installation Management Software',
  description: 'Built exclusively for door and access control professionals. Survey and service any kind of door or opening with AI-powered tools, comprehensive databases, and enterprise-grade project management. Division 8 & 28 specialists.',
  keywords: [
    'door survey software',
    'commercial door survey',
    'door installation software',
    'access control survey',
    'Division 8 software',
    'Division 28 software',
    'door hardware survey',
    'hollow metal door survey',
    'fire door compliance',
    'door frame survey',
    'electrified hardware',
    'door access control',
    'commercial door estimating',
    'door quoting software',
    'construction door management',
    'door survey app',
    'field survey software',
    'door compliance checking',
    'ADA door compliance',
    'fire door survey',
    'door installation coordination',
    'door project management',
    'commercial locksmith software',
    'door and frame survey'
  ],
  ogImage: '/og-image.png',
  ogImageAlt: 'DoorSurvey Pro - Professional Door Survey Software',
};

// Get site origin for building absolute URLs
function getSiteOrigin(): string {
  if (typeof window === 'undefined') return '';
  return window.location.origin;
}

// Get current page URL for canonical (includes pathname)
function getCurrentURL(): string {
  if (typeof window === 'undefined') return '';
  return window.location.href;
}

export default function SEOHead({
  title,
  description,
  keywords,
  canonical,
  ogType = 'website',
  ogImage,
  ogImageAlt,
  twitterCard = 'summary_large_image',
  noindex = false,
  nofollow = false,
  structuredData,
}: SEOProps) {
  const finalTitle = title || DEFAULT_SEO.title;
  const finalDescription = description || DEFAULT_SEO.description;
  const finalKeywords = [...DEFAULT_SEO.keywords, ...(keywords || [])];
  // Use current page URL (including pathname) as default canonical
  const finalCanonical = canonical || getCurrentURL();
  const finalOgImage = ogImage || DEFAULT_SEO.ogImage;
  const finalOgImageAlt = ogImageAlt || DEFAULT_SEO.ogImageAlt;
  
  // Build absolute image URLs using site origin (not canonical URL)
  const siteOrigin = getSiteOrigin();
  const absoluteOgImage = finalOgImage.startsWith('http') 
    ? finalOgImage 
    : `${siteOrigin}${finalOgImage.startsWith('/') ? '' : '/'}${finalOgImage}`;

  useEffect(() => {
    // Update document title
    document.title = finalTitle;

    // Update or create meta tags
    const updateMeta = (name: string, content: string, useProperty = false) => {
      const attribute = useProperty ? 'property' : 'name';
      let element = document.querySelector(`meta[${attribute}="${name}"]`);
      
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, name);
        document.head.appendChild(element);
      }
      
      element.setAttribute('content', content);
    };

    // Standard meta tags
    updateMeta('description', finalDescription);
    updateMeta('keywords', finalKeywords.join(', '));
    
    // Robots meta
    const robotsValue = [
      noindex ? 'noindex' : 'index',
      nofollow ? 'nofollow' : 'follow'
    ].join(', ');
    updateMeta('robots', robotsValue);

    // Open Graph tags
    updateMeta('og:title', finalTitle, true);
    updateMeta('og:description', finalDescription, true);
    updateMeta('og:type', ogType, true);
    updateMeta('og:url', finalCanonical, true);
    updateMeta('og:image', absoluteOgImage, true);
    updateMeta('og:image:alt', finalOgImageAlt, true);
    updateMeta('og:site_name', 'DoorSurvey Pro', true);
    updateMeta('og:locale', 'en_US', true);

    // Twitter Card tags
    updateMeta('twitter:card', twitterCard);
    updateMeta('twitter:title', finalTitle);
    updateMeta('twitter:description', finalDescription);
    updateMeta('twitter:image', absoluteOgImage);
    updateMeta('twitter:image:alt', finalOgImageAlt);

    // Canonical URL
    let canonicalLink = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.rel = 'canonical';
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.href = finalCanonical;

    // Structured Data (JSON-LD)
    if (structuredData) {
      let scriptTag = document.querySelector('script[type="application/ld+json"]') as HTMLScriptElement;
      if (!scriptTag) {
        scriptTag = document.createElement('script');
        scriptTag.type = 'application/ld+json';
        document.head.appendChild(scriptTag);
      }
      scriptTag.textContent = JSON.stringify(structuredData);
    }
  }, [
    finalTitle,
    finalDescription,
    finalKeywords,
    finalCanonical,
    ogType,
    absoluteOgImage,
    finalOgImageAlt,
    twitterCard,
    noindex,
    nofollow,
    structuredData,
  ]);

  return null; // This component doesn't render anything
}
