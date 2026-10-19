# Recovery evidence

| Failure | Check |
| --- | --- |
| Process restart on same host | Metadata and still-present files resume |
| New host / lost local disk | Durable objects remain accessible; lost fallbacks are reported honestly |
| Metadata write fails after upload | Retry does not duplicate or leak objects |
| Upload fails before metadata commit | No completed state points to missing bytes |
| Two clients save old/new state | Stale save cannot overwrite newer progress |
| Duplicate processing request | Existing result or explicit conflict, not duplicate side effects |
| Wrong tenant requests a known session | Neither metadata nor file content is disclosed |

Keep capture protocol conversion and object-retention policy changes separate
from a session persistence fix.
