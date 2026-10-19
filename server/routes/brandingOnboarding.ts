import { Router } from "express";
import multer from "multer";
import sharp from "sharp";
import { extractLogoPalette } from "../lib/logo-palette";
import { db } from "../db";
import { organizations, exportBranding, insertExportBrandingSchema } from "@shared/schema";
import { eq } from "drizzle-orm";
import { getOrganizationContext } from "../clerkAuth";
import { z } from "zod";

const router = Router();

// Configure multer for logo uploads (onboarding wizard)
const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ["image/jpeg", "image/jpg", "image/png", "image/svg+xml", "image/webp"];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, SVG, and WebP images are allowed."));
    }
  },
});

// Zod schemas for validation
const brandingOnboardingStepSchema = z.object({
  stepId: z.enum(["step1", "step2", "step3", "step4"]),
  data: insertExportBrandingSchema.omit({ organizationId: true }).partial(),
});

const brandingOnboardingCompleteSchema = z.object({
  // Optional - can be empty object
});

// GET /api/onboarding/branding - Get organization's branding onboarding status
router.get("/api/onboarding/branding", async (req, res, next) => {
  try {
    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { organizationId } = context;

    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!org) {
      return res.status(404).json({ error: "Organization not found" });
    }

    // Fetch existing export branding if any
    const [branding] = await db
      .select()
      .from(exportBranding)
      .where(eq(exportBranding.organizationId, organizationId))
      .limit(1);

    res.json({
      status: org.brandingOnboardingStatus || "not_started",
      progress: org.brandingOnboardingProgress || {},
      exportBranding: branding || null,
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/onboarding/branding/progress - Update progress for a specific step
router.patch("/api/onboarding/branding/progress", async (req, res, next) => {
  try {
    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { organizationId } = context;

    const validated = brandingOnboardingStepSchema.parse(req.body);
    const { stepId, data } = validated;

    // Get current organization
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!org) {
      return res.status(404).json({ error: "Organization not found" });
    }

    // Update progress with step completion
    const currentProgress = (org.brandingOnboardingProgress || {}) as Record<string, any>;
    const updatedProgress = {
      ...currentProgress,
      [stepId]: {
        completed: true,
        updatedAt: new Date().toISOString(),
        data,
      },
    };

    // Auto-advance status from not_started to in_progress
    let newStatus = org.brandingOnboardingStatus;
    if (!newStatus || newStatus === "not_started") {
      newStatus = "in_progress";
    }

    // Update organization
    const [updated] = await db
      .update(organizations)
      .set({
        brandingOnboardingProgress: updatedProgress,
        brandingOnboardingStatus: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId))
      .returning();

    // Optionally sync data to export branding table
    if (Object.keys(data).length > 0) {
      const [existing] = await db
        .select()
        .from(exportBranding)
        .where(eq(exportBranding.organizationId, organizationId))
        .limit(1);

      if (existing) {
        // Update existing
        await db
          .update(exportBranding)
          .set({
            ...data,
            updatedAt: new Date(),
          })
          .where(eq(exportBranding.id, existing.id));
      } else {
        // Create new
        await db
          .insert(exportBranding)
          .values({
            organizationId,
            ...data,
          });
      }
    }

    res.json({
      status: updated.brandingOnboardingStatus,
      progress: updated.brandingOnboardingProgress,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/onboarding/branding/complete - Mark onboarding as complete
router.post("/api/onboarding/branding/complete", async (req, res, next) => {
  try {
    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { organizationId } = context;

    brandingOnboardingCompleteSchema.parse(req.body);

    // Get current organization and validate required steps
    const [org] = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);

    if (!org) {
      return res.status(404).json({ error: "Organization not found" });
    }

    const progress = (org.brandingOnboardingProgress || {}) as Record<string, any>;

    // Validate required steps (step1, step2, step3 are required; step4 watermark is optional)
    const requiredSteps = ["step1", "step2", "step3"];
    const missingSteps = requiredSteps.filter(step => !progress[step]?.completed);

    if (missingSteps.length > 0) {
      return res.status(400).json({
        error: "Cannot complete onboarding - required steps not finished",
        missingSteps,
      });
    }

    // Verify export branding exists with minimum required data
    const [branding] = await db
      .select()
      .from(exportBranding)
      .where(eq(exportBranding.organizationId, organizationId))
      .limit(1);

    if (!branding) {
      return res.status(400).json({
        error: "Export branding not found - please complete all steps",
      });
    }

    // Validate minimum required fields
    if (!branding.primaryColor || !branding.secondaryColor || !branding.accentColor) {
      return res.status(400).json({
        error: "Brand colors not set - please complete step 2",
      });
    }

    if (!branding.headerText || !branding.footerText) {
      return res.status(400).json({
        error: "Headers/footers not set - please complete step 3",
      });
    }

    // Mark onboarding as complete
    const [updated] = await db
      .update(organizations)
      .set({
        brandingOnboardingStatus: "complete",
        updatedAt: new Date(),
      })
      .where(eq(organizations.id, organizationId))
      .returning();

    res.json({
      status: updated.brandingOnboardingStatus,
      progress: updated.brandingOnboardingProgress,
      message: "Branding onboarding completed successfully",
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/upload/logo - Upload logo for branding onboarding
router.post("/api/upload/logo", logoUpload.single("logo"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const context = await getOrganizationContext(req);
    if (!context) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { organizationId } = context;

    // Convert to base64 data URL
    const base64 = req.file.buffer.toString('base64');
    const dataUrl = `data:${req.file.mimetype};base64,${base64}`;

    res.json({
      url: dataUrl,
    });
  } catch (err) {
    if (err instanceof Error && err.message.includes("Invalid file type")) {
      return res.status(400).json({ error: err.message });
    }
    next(err);
  }
});

// POST /api/onboarding/branding/logo/process - Process and analyze uploaded logo
router.post(
  "/api/onboarding/branding/logo/process",
  logoUpload.single("logo"),
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const context = await getOrganizationContext(req);
      if (!context) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      // Helper to convert RGB to HSL
      const rgbToHsl = (r: number, g: number, b: number): [number, number, number] => {
        r /= 255;
        g /= 255;
        b /= 255;
        const max = Math.max(r, g, b);
        const min = Math.min(r, g, b);
        let h = 0, s = 0;
        const l = (max + min) / 2;

        if (max !== min) {
          const d = max - min;
          s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
          switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
          }
        }
        return [h * 360, s * 100, l * 100];
      };

      // Helper to convert HSL to hex
      const hslToHex = (h: number, s: number, l: number): string => {
        s /= 100;
        l /= 100;
        const a = s * Math.min(l, 1 - l);
        const f = (n: number) => {
          const k = (n + h / 30) % 12;
          const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
          return Math.round(255 * color).toString(16).padStart(2, '0');
        };
        return `#${f(0)}${f(8)}${f(4)}`;
      };

      // Process image with Sharp
      let imageBuffer = req.file.buffer;
      const isSvg = req.file.mimetype === "image/svg+xml";

      // Handle SVG conversion
      if (isSvg) {
        imageBuffer = await sharp(req.file.buffer, { density: 240 })
          .png()
          .toBuffer();
      }

      // Get metadata to determine if we need padding
      const metadata = await sharp(imageBuffer).metadata();
      const { width = 500, height = 200 } = metadata;

      // Trim transparent/white edges
      const trimmedBuffer = await sharp(imageBuffer)
        .trim({ threshold: 10 })
        .toBuffer();

      // Resize to max 500x200, maintaining aspect ratio
      const maxWidth = 500;
      const maxHeight = 200;
      const aspectRatio = width / height;
      
      let resizeWidth = maxWidth;
      let resizeHeight = maxHeight;
      
      if (aspectRatio > maxWidth / maxHeight) {
        resizeHeight = Math.round(maxWidth / aspectRatio);
      } else {
        resizeWidth = Math.round(maxHeight * aspectRatio);
      }

      // Resize and add transparent padding to center the logo
      const processedBuffer = await sharp(trimmedBuffer)
        .resize(resizeWidth, resizeHeight, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .extend({
          top: Math.floor((maxHeight - resizeHeight) / 2),
          bottom: Math.ceil((maxHeight - resizeHeight) / 2),
          left: Math.floor((maxWidth - resizeWidth) / 2),
          right: Math.ceil((maxWidth - resizeWidth) / 2),
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        })
        .png()
        .toBuffer();

      // Extract color palette using Vibrant
      const palette = await extractLogoPalette(processedBuffer);

      // Default colors as fallback
      const defaultColors = {
        primary: "#2563eb", // blue-600
        secondary: "#475569", // slate-600
        accent: "#0ea5e9", // sky-500
      };

      let extractedColors = { ...defaultColors };
      let confidence = 0;

      if (palette) {
        // Get swatches sorted by population (prominence in image)
        const swatches = Object.values(palette).filter((s): s is NonNullable<typeof s> => s !== null);
        
        if (swatches.length > 0) {
          // Primary: Most saturated color
          const saturationSorted = [...swatches].sort((a, b) => {
            const [, satA] = rgbToHsl(...a.rgb);
            const [, satB] = rgbToHsl(...b.rgb);
            return satB - satA;
          });

          // Check for monochrome (low saturation variance)
          const avgSaturation = saturationSorted.reduce((sum, s) => {
            const [, sat] = rgbToHsl(...s.rgb);
            return sum + sat;
          }, 0) / saturationSorted.length;

          if (avgSaturation > 15) { // Not monochrome
            const primarySwatch = saturationSorted[0];
            const [h, s, l] = rgbToHsl(...primarySwatch.rgb);
            extractedColors.primary = primarySwatch.hex;

            // Secondary: Complementary or muted version
            const mutedSwatch = palette.Muted || palette.DarkMuted;
            if (mutedSwatch) {
              extractedColors.secondary = mutedSwatch.hex;
            } else {
              // Use complementary hue
              const compH = (h + 180) % 360;
              extractedColors.secondary = hslToHex(compH, s * 0.6, l * 0.8);
            }

            // Accent: Vibrant or light version
            const vibrantSwatch = palette.Vibrant || palette.LightVibrant;
            if (vibrantSwatch) {
              extractedColors.accent = vibrantSwatch.hex;
            } else {
              // Lighter, more saturated version
              extractedColors.accent = hslToHex(h, Math.min(s * 1.2, 100), Math.min(l * 1.3, 90));
            }

            confidence = Math.min(avgSaturation / 100, 1);
          } else {
            // Monochrome logo - use defaults
            confidence = 0.2;
          }
        }
      }

      // Convert to base64
      const base64 = processedBuffer.toString("base64");
      const dataUrl = `data:image/png;base64,${base64}`;

      res.json({
        url: dataUrl,
        colors: extractedColors,
        confidence: Math.round(confidence * 100),
        dimensions: {
          width: maxWidth,
          height: maxHeight,
        },
      });
    } catch (err) {
      console.error("Logo processing error:", err);
      next(err);
    }
  }
);

export default router;
