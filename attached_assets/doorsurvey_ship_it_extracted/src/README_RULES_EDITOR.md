# Rules Utilities Pack

## Files
- `apply_amendments.ts` — merges **local/AHJ amendments** into the master rules file.
- `server_rules.ts` — Express router:
  - `GET /rules?country=US&state=CA` → returns merged rules for that jurisdiction.
  - `POST /rules/validate` → quick JSON sanity checks.
  - Serves the **Rule Editor UI** at `/rules-editor` (expects `editor/` folder in project root).

## How to wire into your Replit server

```ts
// src/index_with_ui.ts (or src/index.ts)
import express from "express";
import bodyParser from "body-parser";
import { rulesRouter } from "./server_rules";
import { router as bomRouter } from "./server_route";
import { routerPro } from "./server_route_pro";

const app = express();
app.use(bodyParser.json());

// Serve editor + rules endpoints
app.use(rulesRouter);

// Existing endpoints
app.use("/output", express.static("output"));
app.use(bomRouter);
app.use(routerPro);

app.listen(process.env.PORT || 3000, () => console.log("Ready"));
```

### Example: fetch merged rules for California
```
GET /rules?country=US&state=CA
```

### Example: validate edited rules JSON
```
POST /rules/validate
Content-Type: application/json

{ "rules": [ /* ... */ ] }
```