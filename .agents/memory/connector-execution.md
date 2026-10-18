---
name: Connector execution boundaries
description: Safe cross-call execution and progress persistence for connector uploads
---

Do not depend on persisting an impure function in the CodeExecution notebook and calling it from a later block.

**Why:** A function defined and successfully called in one block failed in the next with `executeJs is not defined`. A fresh inline impure boundary and an imported helper receiving the initialized SDK worked.

**How to apply:** Keep cross-call state as serializable data or files. Recreate the impure boundary each call; obtain the connection and initialized client there, then pass them to ordinary helper code. Never save or inspect raw credentials. Persist long-upload progress and checksums to ignored workspace files rather than `/tmp` or notebook closures.
