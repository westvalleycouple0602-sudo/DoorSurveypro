# Required negative cases

| Case | Expected boundary |
| --- | --- |
| Unauthenticated caller | No tenant data or mutation |
| Same organization, insufficient role | Forbidden operation without side effects |
| Other organization, known record ID | No read/write/object/export access |
| Spoofed organization in body/query | Does not override authenticated context |
| Provider subject differs from local ID | Existing ownership remains linked |
| Expired/revoked share token | No resource or file access |
| Retried callback or duplicate mutation | No duplicate cross-tenant side effect |

Document legitimate exceptions explicitly. Test the real server-side path,
not only UI navigation or a mock that unconditionally authorizes access.
