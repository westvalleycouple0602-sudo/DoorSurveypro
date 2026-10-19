// server_route.ts - BOM generation endpoint
import { Router } from "express";

export const router = Router();

router.post("/bom", (req, res) => {
  const context = req.body;
  
  const items = [
    {
      category: "Lock",
      description: "Mortise Lock",
      family: "Schlage ND-Series",
      bhma_function: "F86",
      brand: "Schlage",
      sku: "ND80PD-626",
      finish: context?.finish?.lock || "626",
      grade: "Grade 1",
      qty: 1,
      msrp: 425.00
    },
    {
      category: "Hinge",
      description: "Heavy Weight Hinge",
      family: "McKinney TA2714",
      bhma_function: "",
      brand: "McKinney",
      sku: "TA2714-4.5x4.5",
      finish: context?.finish?.hinge || "652",
      grade: "",
      qty: context?.door?.is_fire_door ? 3 : 2,
      msrp: 45.00
    },
    {
      category: "Closer",
      description: "Surface Door Closer",
      family: "LCN 4040XP",
      bhma_function: "",
      brand: "LCN",
      sku: "4040XP-689",
      finish: context?.finish?.closer || "689",
      grade: "Grade 1",
      qty: 1,
      msrp: 385.00
    }
  ];

  if (context?.door?.requires_panic || context?.door?.is_egress_required) {
    items.push({
      category: "Exit Device",
      description: "Rim Exit Device",
      family: "Von Duprin 99-Series",
      bhma_function: "F84",
      brand: "Von Duprin",
      sku: "99-L-06-689",
      finish: context?.finish?.exit_device || "689",
      grade: "Grade 1",
      qty: 1,
      msrp: 895.00
    });
  }

  if (context?.electrical?.device_type === "maglock") {
    items.push({
      category: "Access Control",
      description: "Electromagnetic Lock 1200lb",
      family: "Securitron M62",
      bhma_function: "",
      brand: "Securitron",
      sku: "M62",
      finish: "Aluminum",
      grade: "",
      qty: 1,
      msrp: 425.00
    });
  }

  const bomData = {
    items,
    downloads: {
      json: "/output/bom.json",
      csv: "/output/bom.csv"
    }
  };

  res.json(bomData);
});
