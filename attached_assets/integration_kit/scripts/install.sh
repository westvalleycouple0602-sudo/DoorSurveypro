#!/usr/bin/env bash
set -e
echo "==> Replit Integration Kit installer"

if ! command -v node >/dev/null 2>&1; then echo "Node.js required"; exit 1; fi
if ! command -v npm >/dev/null 2>&1; then echo "npm required"; exit 1; fi

# Initialize package.json if missing
[ -f package.json ] || npm init -y >/dev/null 2>&1

echo "==> Installing server deps (Express, Auth, Docs, Jobs, Utils)"
npm i express cors morgan zod dotenv axios jsonwebtoken cookie-parser helmet express-async-errors     swagger-ui-express yaml bullmq ioredis     nodemailer form-data

echo "==> Installing types"
npm i -D typescript ts-node @types/node @types/express @types/cors @types/morgan @types/jsonwebtoken @types/cookie-parser

# Create tsconfig if missing
if [ ! -f tsconfig.json ]; then
  cat > tsconfig.json <<'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "dist",
    "rootDir": "."
  },
  "include": ["src/**/*.ts", "server.ts", "app.ts"]
}
EOF
fi

# Add basic dev scripts if missing
if ! grep -q ""dev":" package.json; then
  node - <<'EOF'
const fs = require('fs'); const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
pkg.scripts = Object.assign({},
  { dev: "ts-node server.ts || ts-node app.ts", build: "tsc", start: "node dist/server.js || node dist/app.js" },
  pkg.scripts || {}
);
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log("==> Added npm scripts: dev/build/start");
EOF
fi

# Ensure src directories exist
mkdir -p src/routes src/webhooks src/integrations src/jobs openapi docs

# Add Swagger bootstrap if not present
if [ ! -f "server.ts" ]; then
cat > server.ts <<'EOF'
import express from "express";
import cors from "cors";
import morgan from "morgan";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import swaggerUi from "swagger-ui-express";
import yaml from "yaml";
import integrationsRouter from "./src/routes/integrations";
import webhookRouter from "./src/webhooks/router";
dotenv.config();

const app = express();
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

// Swagger
const specPath = path.join(process.cwd(), "openapi", "openapi.yaml");
if (fs.existsSync(specPath)) {
  const spec = yaml.parse(fs.readFileSync(specPath, "utf8"));
  app.use("/docs", swaggerUi.serve, swaggerUi.setup(spec));
  console.log("Swagger docs at /docs");
}

// Routes
app.use("/api/integrations", integrationsRouter);
app.use("/api/webhooks", webhookRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server listening on ${port}`));
EOF
fi

echo "==> Done. Run: npm run dev"
