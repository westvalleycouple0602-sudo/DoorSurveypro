import express from "express";
import cookieParser from "cookie-parser";
import Negotiator from "negotiator";

const SUPPORTED = ["en-US","es-ES","fr-FR","de-DE","it-IT"];

function pickLocale(req, userProfileLang) {
  if (userProfileLang && SUPPORTED.includes(userProfileLang)) return userProfileLang;
  const q = typeof req.query.lang === "string" ? req.query.lang : undefined;
  if (q && SUPPORTED.includes(q)) return q;
  const c = req.cookies?.lang;
  if (c && SUPPORTED.includes(c)) return c;
  const neg = new Negotiator(req);
  const langs = neg.languages(SUPPORTED);
  return langs?.[0] || "en-US";
}

const app = express();
app.use(express.json());
app.use(cookieParser());
app.use((req, res, next) => { req.user = { id: "u_demo", locale: undefined }; next(); });
app.use((req, res, next) => {
  const locale = pickLocale(req, req.user?.locale);
  res.locals.locale = locale;
  res.cookie("lang", locale, { httpOnly: false, sameSite: "lax", maxAge: 1000*60*60*24*30 });
  next();
});

app.get("/api/locale", (req, res) => { res.json({ locale: res.locals.locale || "en-US" }); });

app.get("/api/tenant/:id/config", (req, res) => {
  res.json({
    theme: {"--brand":"#1E90FF"},
    flags: { voice: true, subtitles: true, heatmap: true, dualPass: true },
    thresholds: { coveragePct: 85, confidence: 0.85, minDistM: 1.5, maxDistM: 2.1, maxAngleDeg: 22 },
    permissions: { surveyor: ["scan:start","scan:hardware","scan:voice","scan:subtitles"] },
    locale: "en-US"
  });
});

app.post("/api/metrics", (req, res) => { console.log("metric", req.body); res.json({ ok: true }); });

const port = process.env.PORT || 5175;
app.listen(port, () => console.log("Server http://localhost:"+port));
