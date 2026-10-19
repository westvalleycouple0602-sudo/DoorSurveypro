# DSP SEO working templates

## Audit inventory

Use one row per route or representative route pattern:

| URL / pattern | Audience | Public? | HTTP status | Initial/rendered content | Index directive | Canonical | Sitemap | Intent / action | Evidence |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |

Classify login, customer portal, shared-token records, exports, uploads, and app routes before optimizing anything. Distinguish publicly accessible marketing from a private link that happens to load without a normal login.

## Prioritize findings

- P0: private data exposure or production-wide accidental indexing exclusion. Preserve access protection; handle public exposure as an incident through the existing workflow.
- P1: important public routes inaccessible, wrong canonical/redirect, missing meaningful rendered content, or repeated soft 404 behavior.
- P2: weak intent alignment, duplicate titles, poor internal links, unsupported schema, or material page-experience problems.
- P3: lower-impact presentation and content experiments.

For each finding record the observed evidence, date/environment, business impact, confidence, affected paths, smallest useful change, and acceptance check. Do not assign numeric ranking gains without evidence.

## Page brief

- Audience and problem:
- Search intent and evidence source:
- Existing primary URL or proposed URL:
- Current availability of the feature being described:
- Primary topic and supporting questions:
- Suggested title, description, H1, and section outline:
- Original evidence, approved screenshots, and technical reviewers:
- Internal links and relevant authoritative sources:
- Primary conversion action and event:
- Canonical/indexing/schema decisions:
- Acceptance criteria and measurement period:

Do not impose a universal word count, keyword density, or fixed metadata length as a ranking rule. Use concise descriptive text; check actual presentation and avoid truncation that hides the meaning.

## Verification matrix

| Case | Expected evidence |
| --- | --- |
| Public home and representative feature/guide page | Successful direct request, meaningful initial/rendered content, correct unique title and intended canonical |
| Deep link and browser navigation | Same intended content/metadata with no stale tags from the previous route |
| Unknown path | Appropriate missing-page response; no accidental indexable copy of the homepage |
| Retired URL | Relevant intentional redirect or proper removal response, without a loop |
| Preview versus production | Correct environment-specific indexing policy and canonical host |
| Login and protected record | Correct access behavior; no private payload in HTML, metadata, previews, schema, sitemap, or public cache |
| Public noindex page | Crawler can read noindex; no conflicting crawl block; no weakening of private access controls |
| Sitemap | Well-formed URLs for canonical indexable public pages only; no stale redirects or tokenized links |
| Structured data | Parseable JSON-LD, current type requirements, accurate visible content, no invented fields |
| Mobile page | Usable layout and real measurements where available; separate lab from field findings |
| Lead conversion | Working action, permitted event collection, no duplicate or sensitive-data events |

Use scoped read-only HTTP checks before a broad crawl. Bound crawl rate and URL count. Never follow state-changing links or submit forms as part of a crawl. Use synthetic or approved fixtures for form tests.

## Completion report

State scope, verified domain/branch, changes, checks, unresolved items, and next owner action. Attach evidence where available. Mark external indexing and organic outcomes as pending until observed after an authorized publication.
