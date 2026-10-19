/**
 * SEO Utilities and Structured Data Generators
 */

/**
 * Generate Organization Schema (JSON-LD)
 */
export function getOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'DoorSurvey Pro',
    description: 'Professional commercial door survey, quoting, and installation coordination software for Division 8 & 28 professionals.',
    url: typeof window !== 'undefined' ? window.location.origin : '',
    logo: typeof window !== 'undefined' ? `${window.location.origin}/logo.png` : '',
    foundingDate: '2024',
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'Sales',
      email: 'sales@doorsurvey.pro',
      availableLanguage: 'English'
    },
    sameAs: [
      // Add social media profiles when available
    ]
  };
}

/**
 * Generate SoftwareApplication Schema (JSON-LD)
 */
export function getSoftwareApplicationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'DoorSurvey Pro',
    applicationCategory: 'BusinessApplication',
    applicationSubCategory: 'Construction Management Software',
    operatingSystem: 'Web Browser',
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
      description: '14-day free trial, no credit card required'
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5.0',
      ratingCount: '1',
      bestRating: '5',
      worstRating: '1'
    },
    description: 'Built exclusively for door and access control professionals to survey and service any kind of door or opening. Features AI-powered tools, comprehensive databases, and enterprise-grade project management for Division 8 & 28 specialists.',
    screenshot: typeof window !== 'undefined' ? `${window.location.origin}/screenshot.png` : '',
    featureList: [
      'AI-Powered Photo Analysis',
      'LiDAR Scanning Integration',
      'Comprehensive Door & Hardware Databases',
      'Automated Compliance Checking',
      'Professional Quote Generation',
      'Installation Coordination',
      'Multi-Tenant Architecture',
      'Real-time Collaboration',
      'Mobile Field Survey',
      'Barcode Recognition'
    ],
    audience: {
      '@type': 'Audience',
      audienceType: 'Door and Access Control Professionals, Division 8 Contractors, Division 28 Contractors, Commercial Locksmiths, General Contractors'
    }
  };
}

/**
 * Generate BreadcrumbList Schema (JSON-LD)
 */
export function getBreadcrumbSchema(items: Array<{ name: string; url: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url
    }))
  };
}

/**
 * Generate FAQ Schema (JSON-LD)
 */
export function getFAQSchema(faqs: Array<{ question: string; answer: string }>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer
      }
    }))
  };
}

/**
 * Generate Product Schema for landing page features
 */
export function getProductSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: 'DoorSurvey Pro',
    description: 'Professional commercial door survey and installation management software built for Division 8 & 28 professionals.',
    brand: {
      '@type': 'Brand',
      name: 'DoorSurvey Pro'
    },
    offers: {
      '@type': 'Offer',
      url: typeof window !== 'undefined' ? window.location.origin : '',
      priceCurrency: 'USD',
      price: '0',
      priceValidUntil: '2025-12-31',
      availability: 'https://schema.org/InStock',
      description: '14-day free trial'
    },
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '5.0',
      reviewCount: '1'
    }
  };
}

/**
 * SEO-optimized page metadata
 */
export const SEO_PAGES = {
  landing: {
    title: 'DoorSurvey Pro - Commercial Door Survey & Installation Management Software',
    description: 'Built exclusively for door and access control professionals. Survey and service any kind of door or opening with AI-powered tools, comprehensive databases, and enterprise-grade project management. Division 8 & 28 specialists.',
    keywords: [
      'door survey software',
      'commercial door survey',
      'door installation software',
      'access control survey',
      'Division 8 software',
      'Division 28 software',
    ]
  },
  login: {
    title: 'Sign In - DoorSurvey Pro',
    description: 'Sign in to DoorSurvey Pro to access your commercial door survey projects, quotes, and installation coordination tools.',
    keywords: ['door survey login', 'DoorSurvey Pro sign in']
  },
  dashboard: {
    title: 'Dashboard - DoorSurvey Pro',
    description: 'Manage your commercial door survey projects, view active quotes, and coordinate installations from your DoorSurvey Pro dashboard.',
    keywords: ['door survey dashboard', 'project management']
  },
  projects: {
    title: 'Projects - DoorSurvey Pro',
    description: 'View and manage all your commercial door survey projects, from field surveys to installation coordination.',
    keywords: ['door projects', 'survey projects', 'installation projects']
  }
};
