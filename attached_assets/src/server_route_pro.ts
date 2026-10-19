// server_route_pro.ts - Quote generation endpoint
import { Router } from "express";
import fs from "fs";
import path from "path";

export const routerPro = Router();

routerPro.post("/quote", (req, res) => {
  const { targetMarginPct = 40, taxRatePct = 8.6, shippingFlat = 75 } = req.body;

  const bomPath = path.join(process.cwd(), "attached_assets", "output", "bom.json");
  let items: any[] = [];
  
  if (fs.existsSync(bomPath)) {
    try {
      const bomData = JSON.parse(fs.readFileSync(bomPath, "utf-8"));
      items = bomData.items || [];
    } catch (e) {
      console.warn("Could not read bom.json, using empty items");
    }
  }

  const msrp = items.reduce((sum, item) => sum + (item.msrp || 0) * (item.qty || 1), 0);
  const costEstimate = msrp * 0.6;
  const targetSell = costEstimate / (1 - targetMarginPct / 100);
  const actualMargin = msrp > 0 ? ((targetSell - costEstimate) / targetSell) * 100 : 0;
  const tax = (targetSell * taxRatePct) / 100;
  const grandTotal = targetSell + tax + shippingFlat;

  const totals = {
    msrp,
    costEstimate,
    sell: targetSell,
    marginPct: actualMargin,
    tax,
    shipping: shippingFlat,
    grandTotal
  };

  const quoteData = {
    totals,
    items
  };

  const outputDir = path.join(process.cwd(), "attached_assets", "output");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  fs.writeFileSync(path.join(outputDir, "quote.json"), JSON.stringify(quoteData, null, 2));

  res.json(quoteData);
});
