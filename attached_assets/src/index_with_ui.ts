// src/index_with_ui.ts
import express from "express";
import bodyParser from "body-parser";
import path from "path";
import { fileURLToPath } from "url";
import { router as bomRouter } from "./server_route";
import { router as legacyBomRouter } from "./server_route"; // alias
import { routerPro } from "./server_route_pro";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, "..");

const app = express();
app.use(bodyParser.json());
app.use("/output", express.static(path.join(projectRoot, "output")));
app.use(express.static(path.join(projectRoot, "public"))); // <-- serve the UI
app.use(bomRouter);
app.use(routerPro);

const PORT = 3000; // Port 3000 for standalone UI server (main app uses 5000)
app.listen(PORT, "0.0.0.0", () => console.log(`DoorSurvey AI server + UI on http://localhost:${PORT}`));