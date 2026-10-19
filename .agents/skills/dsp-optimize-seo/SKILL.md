---
name: dsp-optimize-seo
description: Audit and improve Door Survey Pro search visibility, public landing pages, technical SEO, content strategy, structured data, and organic conversion measurement. Use for SEO optimization, indexing issues, search rankings, metadata, sitemaps, crawlability, Core Web Vitals, or AI-search discoverability.
---

# Optimize Door Survey Pro for search

## Establish scope and baseline
Read repository-root AGENTS.md, replit.md, docs/architecture-overview.md, docs/PROJECT_ROADMAP.md, and relevant .agents/memory topics. Follow docs/GIT_WORKFLOW.md: work on a task branch from develop and submit a PR into develop; publishing remains a separate action. Use dsp-apply-brand-ux for brand changes and dsp-ground-reference-ai for technical claims when available.

Verify the production domain and current public routes from deployment configuration and observed responses; do not assume every Replit preview or historical domain is canonical. Inspect React/Wouter routing, Express fallbacks, head-tag generation, redirects, static assets, robots directives, and sitemap generation before editing. Preserve existing auth, tenant boundaries, billing, and app navigation; discuss shared/schema.ts changes with Terry before editing.

Read references/seo-workflow.md for the audit table, page brief, and verification cases. Consult references/official-sources.md and current official guidance when platform behavior, search features, or eligibility matter. Record date, environment, evidence, and unverified items. With no Search Console or analytics access, state the limitation and continue with source/public-page checks; do not invent traffic or rankings.

## Select useful public content
Map search intent to one primary page and a real conversion action. Start with DSP's audiences: door/frame/hardware contractors, surveyors, facility teams, technicians, and project managers. Treat topics such as door survey software, opening inventories, hardware schedules, field measurement workflows, and warranty history as candidate themes requiring evidence, not validated keyword demand.

Check actual feature availability before describing scanning, LiDAR, offline capture, code checks, or integrations. Mark planned/prototype functions clearly. Keep DSP software positioning distinct from Lanmor's local installation business. Do not create city pages or LocalBusiness claims without a genuine relevant local service offering.

Write useful original explanations, workflow examples, verified screenshots, and clearly attributed technical resources. Preserve navy/orange and approved Octo assets without hiding useful page text inside images. Avoid duplicated keyword pages, invented reviews, bulk low-value AI content, paid-link schemes, keyword stuffing, and guaranteed-ranking claims.

## Implement focused improvements
1. Give indexable public pages descriptive, distinct titles, summaries, headings, meaningful copy, and crawlable internal links. Write image alternatives for their actual purpose. Treat social-share metadata as a separate presentation concern, not a ranking guarantee.
2. Verify the initial HTTP response and rendered DOM for each important route, including direct deep links. Ensure crawlers can receive the principal content and links. If client rendering is insufficient, assess targeted prerendering or server rendering for marketing routes before proposing an app-wide framework change.
3. Use correct response status and intentional redirect behavior. Prevent unknown SPA paths from becoming indexable blank or duplicate 200 pages. Set canonical URLs deliberately; do not canonicalize all marketing pages to the homepage.
4. Include only intended, public, canonical, successful URLs in sitemaps. Exclude login, dashboard, customer portals, tokenized shares, tenant records, staging, and private files. Keep last-modified dates honest.
5. Distinguish crawl directives from index directives. Do not put noindex in robots.txt or block crawling of a public page whose noindex must be read. Keep authentication protecting private resources; never expose them so a bot can read a tag. Avoid carrying preview-wide noindex into production.
6. Add structured data only when the type and required fields fit visible, verified content. Consider Organization, SoftwareApplication, or BreadcrumbList where appropriate after checking current eligibility. Do not fabricate prices, ratings, reviews, awards, or FAQ rich-result eligibility.
7. Measure page experience on representative public mobile routes. Address oversized hero assets, unreserved image space, unnecessary scripts, fonts, and blocking work. Distinguish lab measurements from real-user LCP, INP, and CLS; verify current thresholds and report the evidence.
8. Preserve durable URLs and redirect genuinely moved pages to relevant replacements. Add reciprocal language annotations only for real equivalent localized pages.
9. Apply ordinary crawlability and useful-content principles to AI-search discovery. Do not present special AI schema, llms.txt, or paid tools as prerequisites or promise inclusion in AI answers.

## Verify and measure
Test the affected pages using the matrix in references/seo-workflow.md. Validate any JSON-LD against current rules. Run the applicable repository checks and report skipped checks explicitly. Do not treat a source edit, sitemap, Lighthouse score, or successful build as proof of indexing or ranking.

Define privacy-conscious outcomes: qualified organic visits, demo/trial starts, and completed conversions. Use available Search Console clicks/impressions/CTR and page/query coverage with an explicit date range; segment branded versus nonbranded where practical. Do not log customer records, access tokens, or sensitive query values. Compare equivalent periods after publication without claiming causation from a single before/after movement.

Return prioritized findings with evidence, affected URLs/files, suggested or completed fixes, verification results, and a small next-step backlog. Keep review-only requests read-only; implement changes when requested. Do not publish, change DNS, purchase services, create accounts, or send outreach merely to perform an SEO audit.
