import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import scanDoorImage from "@assets/generated_images/LiDAR_door_scanning_visualization_89ad7865.png";
import hardwareScanImage from "@assets/generated_images/Hardware_barcode_scanning_interface_740cfb5b.png";
import codeComplianceImage from "@assets/generated_images/Code_compliance_dashboard_view_8b5c90e6.png";
import hubspotSyncImage from "@assets/generated_images/HubSpot_CRM_integration_interface_46b6819c.png";

type CTAMode = "form" | "link";

interface DemoShowcaseProps {
  ctaMode?: CTAMode;
  ctaHref?: string;
  hubspotPortalId?: string;
  hubspotFormId?: string;
  hubspotRegion?: string;
  ctaText?: string;
}

const slides = [
  {
    id: "scan",
    title: "Scan & Measure Openings",
    caption: "Capture door and frame dimensions in seconds with LiDAR or AR.",
    image: scanDoorImage,
    durationMs: 5200,
  },
  {
    id: "hardware",
    title: "Smart Hardware Recognition",
    caption: "Scan barcodes and labels to auto-document hardware.",
    image: hardwareScanImage,
    durationMs: 5200,
  },
  {
    id: "codes",
    title: "Code Compliance Insights",
    caption: "Instant checks against life safety and access control standards.",
    image: codeComplianceImage,
    durationMs: 5200,
  },
  {
    id: "crm",
    title: "HubSpot-Integrated Reports",
    caption: "One-click export to your CRM, proposals, or project pipeline.",
    image: hubspotSyncImage,
    durationMs: 5200,
  },
];

const prefersReducedMotion = () =>
  typeof window !== "undefined" &&
  window.matchMedia &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function DemoShowcase({
  ctaMode = "link",
  ctaHref = "#signup",
  hubspotPortalId,
  hubspotFormId,
  hubspotRegion = "na1",
  ctaText = "Try DoorSurveyPro Now",
}: DemoShowcaseProps) {
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showForm, setShowForm] = useState(false);

  const timeoutRef = useRef<number | null>(null);
  const formContainerRef = useRef<HTMLDivElement | null>(null);
  const scriptLoadedRef = useRef(false);

  useEffect(() => {
    if (prefersReducedMotion()) return;
    if (!isPlaying) return;

    const { durationMs } = slides[index];

    const next = () => setIndex((prev) => (prev + 1) % slides.length);
    timeoutRef.current = window.setTimeout(next, durationMs);

    return () => {
      if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    };
  }, [index, isPlaying]);

  const handlePause = () => {
    setIsPlaying(false);
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
  };

  const handlePlay = () => setIsPlaying(true);

  const goTo = (i: number) => {
    if (i === index) return;
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    setIndex(i);
  };

  const ensureHubSpotScript = () =>
    new Promise<void>((resolve) => {
      if (scriptLoadedRef.current) return resolve();
      const existing = document.querySelector<HTMLScriptElement>(
        'script[src="https://js.hsforms.net/forms/embed/v2.js"]'
      );
      const onReady = () => {
        scriptLoadedRef.current = true;
        resolve();
      };
      if (existing) {
        if ((window as any).hbspt) onReady();
        else existing.addEventListener("load", onReady, { once: true });
        return;
      }
      const s = document.createElement("script");
      s.src = "https://js.hsforms.net/forms/embed/v2.js";
      s.async = true;
      s.defer = true;
      s.onload = onReady;
      document.body.appendChild(s);
    });

  const openForm = async () => {
    setShowForm(true);
    if (ctaMode !== "form") return;
    if (!hubspotPortalId || !hubspotFormId) return;
    await ensureHubSpotScript();
    const hbspt = (window as any).hbspt;
    if (!hbspt || !formContainerRef.current) return;
    formContainerRef.current.innerHTML = "";
    hbspt.forms.create({
      region: hubspotRegion || "na1",
      portalId: hubspotPortalId,
      formId: hubspotFormId,
      target: formContainerRef.current,
    });
  };

  const slide = slides[index];

  return (
    <div className="max-w-5xl mx-auto p-6">
      <div className="flex flex-col items-center justify-center bg-card rounded-2xl shadow-xl p-6">
        <div className="w-full flex items-center justify-between mb-4">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
            DoorSurveyPro: Live Demo
          </h2>
          <div className="flex items-center gap-2">
            <button
              onClick={isPlaying ? handlePause : handlePlay}
              className="px-3 py-2 rounded-md bg-secondary hover-elevate active-elevate-2 text-sm"
              aria-label={isPlaying ? "Pause demo" : "Play demo"}
              data-testid={isPlaying ? "button-pause-demo" : "button-play-demo"}
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
          </div>
        </div>

        <div className="w-full">
          <AnimatePresence mode="wait">
            <motion.div
              key={slide.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center"
            >
              <div className="w-full">
                <img
                  src={slide.image}
                  alt={slide.title}
                  className="w-full rounded-xl shadow-md"
                  loading="eager"
                  data-testid={`image-${slide.id}`}
                />
              </div>

              <div className="w-full">
                <h3 className="text-xl md:text-2xl font-semibold mb-3" data-testid="text-slide-title">
                  {slide.title}
                </h3>
                <p className="text-muted-foreground mb-6" data-testid="text-slide-caption">
                  {slide.caption}
                </p>

                {ctaMode === "form" ? (
                  <button
                    onClick={openForm}
                    className="inline-block mt-6 px-5 py-3 rounded-md bg-primary text-primary-foreground hover-elevate active-elevate-2 shadow-sm"
                    aria-expanded={showForm}
                    aria-controls="hubspot-form"
                    data-testid="button-cta-form"
                  >
                    {ctaText}
                  </button>
                ) : (
                  <a
                    href={ctaHref}
                    className="inline-block mt-6 px-5 py-3 rounded-md bg-primary text-primary-foreground hover-elevate active-elevate-2 shadow-sm"
                    data-testid="link-cta"
                  >
                    {ctaText}
                  </a>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex items-center gap-2 mt-6" aria-label="Slide progress">
          {slides.map((s, i) => (
            <button
              key={s.id}
              onClick={() => goTo(i)}
              className={`h-2.5 rounded-full transition-all ${
                i === index ? "w-6 bg-primary" : "w-2.5 bg-muted hover-elevate"
              }`}
              aria-label={`Go to slide ${i + 1}: ${s.title}`}
              data-testid={`button-slide-${i}`}
            />
          ))}
        </div>

        {ctaMode === "form" && (
          <AnimatePresence>
            {showForm && (
              <motion.div
                id="hubspot-form"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.25 }}
                className="w-full mt-6 p-4 bg-muted border border-border rounded-md"
              >
                <div ref={formContainerRef} />
                {(!hubspotPortalId || !hubspotFormId) && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Add <code>hubspotPortalId</code> and <code>hubspotFormId</code> props to render the form here.
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-3 hidden md:block">
        Tip: Click on the dots below to navigate between slides. We respect your Reduced Motion settings.
      </p>
    </div>
  );
}
