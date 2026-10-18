// src/index_with_ui.ts
import express from "express";
import bodyParser from "body-parser";
import path from "path";

// Routers (these must exist in src/ from previous packs)
import { router as bomRouter } from "./server_route";
import { router as routerPro } from "./server_route_pro";
import { rulesRouter } from "./server_rules";

const app = express();
app.use(bodyParser.json());

// Static sites
app.use("/output", express.static("output"));
app.use(express.static("public"));        // Mini UI (public/)
app.use(rulesRouter);                     // /rules, /rules/validate, /rules-editor

// APIs
app.use(bomRouter);
app.use(routerPro);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`DoorSurvey AI running at http://localhost:${PORT}`));