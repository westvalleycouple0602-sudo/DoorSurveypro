import React, { useEffect, useState } from "react";
import type { OpeningScanRecord } from "@doorsurvey/scan-core";
import { createAdapter } from "@doorsurvey/scan-platform";
import { useTenant, hasPerm, Permission } from "./tenant-context";
import { useEmitMetric } from "./telemetry";
import { STRINGS } from "./i18n/strings";

export enum ScanStep { Prep="Prep", Calibrate="Calibrate", FramePass="FramePass", DoorPass="DoorPass", HardwarePass="HardwarePass", QualityGate="QualityGate", ManualVerify="ManualVerify", Compliance="Compliance", ReviewExport="ReviewExport" }

function Subtitle({ text }: { text: string }) {
  if (!text) return null;
  return <div style={{position:"fixed",bottom:16,left:"50%",transform:"translateX(-50%)",background:"rgba(0,0,0,0.7)",color:"#fff",padding:"6px 10px",borderRadius:8,zIndex:9999,fontSize:12}}>{text}</div>;
}

export default function DoorScanFlow({ onComplete }: { onComplete: (data: OpeningScanRecord) => void }) {
  const { tenant, user, flags, thresholds } = useTenant();
  const can = (p: Permission) => hasPerm(tenant, user.role, p);
  const emit = useEmitMetric();
  const adapter = createAdapter();

  const [step, setStep] = useState<ScanStep>(ScanStep.Prep);
  const [record, setRecord] = useState<OpeningScanRecord>({ openingId: crypto.randomUUID() });
  const [busy, setBusy] = useState(false);
  const [distance, setDistance] = useState<number>(1.8);
  const [angle, setAngle] = useState<number>(5);
  const [coverage, setCoverage] = useState<number>(0);
  const [message, setMessage] = useState<string>("");

  const say = (text: string) => {
    if (flags.voice && can("scan:voice")) {
      try { const u = new SpeechSynthesisUtterance(text); u.lang = tenant.locale || "en-US"; window.speechSynthesis.cancel(); window.speechSynthesis.speak(u); } catch {}
    }
    setMessage(flags.subtitles && can("scan:subtitles") ? text : "");
    if (navigator.vibrate) navigator.vibrate([20]);
  };

  const okPose = () => distance >= thresholds.minDistM && distance <= thresholds.maxDistM && angle < thresholds.maxAngleDeg;
  const t = (k: string) => (STRINGS[tenant.locale || "en-US"]?.[k] || STRINGS["en-US"][k] || k);

  useEffect(() => {
    const interval = setInterval(() => {
      setDistance(prev => Math.max(0.5, Math.min(3.0, 1.6 + Math.sin(Date.now()/1000)*0.35)));
      setAngle(Math.abs(Math.sin(Date.now()/1200)*28));
      setCoverage(prev => (prev < 100 ? prev + 0.6 : prev));
    }, 400);
    return () => clearInterval(interval);
  }, []);

  const doCalibrate = async () => {
    if (!okPose()) { setMessage(`Adjust position: distance ${thresholds.minDistM}-${thresholds.maxDistM}m, angle < ${thresholds.maxAngleDeg}°`); return; }
    if (!can('scan:start')) { setMessage('No permission to start scan.'); return; }
    setBusy(true); emit('scan.calibrate.start', { distance, angle });
    say(t('calibrating')); await adapter.ensureScale();
    setBusy(false); emit('scan.calibrate.done', {});
    say(t('calibration_done')); setStep(ScanStep.FramePass);
  };

  const measureFrame = async () => {
    if (!okPose()) { setMessage(`Adjust position: distance ${thresholds.minDistM}-${thresholds.maxDistM}m, angle < ${thresholds.maxAngleDeg}°`); return; }
    if (!can('scan:start')) { setMessage('No permission to scan.'); return; }
    setBusy(true); emit('scan.frame.start', { distance, angle });
    say(t('scan_frame')); const width = await adapter.measureEdgeSeries("mid");
    setRecord(prev => ({ ...prev, frameWidthMin: width }));
    setBusy(false); emit('scan.frame.done', { widthMm: width.valueMm });
    say(t('frame_done')); setStep(ScanStep.DoorPass);
  };

  const measureDoor = async () => {
    if (!okPose()) { setMessage(`Adjust position: distance ${thresholds.minDistM}-${thresholds.maxDistM}m, angle < ${thresholds.maxAngleDeg}°`); return; }
    if (!can('scan:start')) { setMessage('No permission to scan.'); return; }
    setBusy(true); emit('scan.door.start', { distance, angle });
    say(t('scan_door'));
    const width = await adapter.measureBetween("leaf-left-edge","leaf-right-edge");
    const height = await adapter.measureBetween("leaf-bottom-edge","leaf-top-edge");
    setRecord(prev => ({ ...prev, leafWidth: width, leafHeight: height }));
    setBusy(false); emit('scan.door.done', { widthMm: width.valueMm, heightMm: height.valueMm });
    say(t('door_done')); setStep(ScanStep.HardwarePass);
  };

  const measureHardware = async () => {
    if (!okPose()) { setMessage(`Adjust position: distance ${thresholds.minDistM}-${thresholds.maxDistM}m, angle < ${thresholds.maxAngleDeg}°`); return; }
    if (!can('scan:hardware')) { setMessage('No permission for hardware step.'); return; }
    setBusy(true); emit('scan.hardware.start', {});
    say(t('scan_hardware')); await new Promise(r => setTimeout(r, 600));
    setBusy(false); emit('scan.hardware.done', {});
    say(t('hardware_done')); setStep(ScanStep.QualityGate);
  };

  const runQuality = async () => {
    if (!can('scan:compliance')) { setMessage('No permission to run quality/compliance.'); return; }
    setBusy(true); emit('scan.quality.start', {});
    say(t('analyzing_quality'));
    const q = await adapter.getQuality();
    setCoverage(q.coveragePct);
    setRecord(prev => ({ ...prev, coveragePct: q.coveragePct, qualityScore: q.qualityScore, confidence: q.confidence }));
    setBusy(false);
    const pass = (q.coveragePct >= thresholds.coveragePct) && ((q.confidence ?? 0) >= thresholds.confidence);
    emit('scan.quality.done', { pass, coveragePct: q.coveragePct, confidence: q.confidence });
    if (pass) { say(t('quality_ok')); setStep(ScanStep.ManualVerify); }
    else { setMessage(`Need coverage ≥ ${thresholds.coveragePct}% and confidence ≥ ${thresholds.confidence}`); say(t('quality_low')); }
  };

  return (
    <div style={{maxWidth:900, margin:"0 auto", display:"grid", gap:16}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center"}}>
        <h2 style={{fontSize:24,fontWeight:700}}>Opening Scan</h2>
        <div style={{display:"flex", gap:8}}>
          <div style={{background: (distance>=thresholds.minDistM && distance<=thresholds.maxDistM) ? "#16a34a" : "#ef4444", color:"#fff", borderRadius:12, padding:"4px 8px", fontSize:12}}>Dist: {distance.toFixed(2)}m</div>
          <div style={{background: angle < thresholds.maxAngleDeg ? "#16a34a" : "#ef4444", color:"#fff", borderRadius:12, padding:"4px 8px", fontSize:12}}>Angle: {angle.toFixed(1)}°</div>
        </div>
      </div>

      {message && <Subtitle text={message} />}

      {step === ScanStep.Prep && (
        <div style={{background:"#fff", borderRadius:12, padding:16, boxShadow:"0 1px 6px rgba(0,0,0,0.08)"}}>
          <h3 style={{fontWeight:600, marginBottom:8}}>Prep the Opening</h3>
          <ul style={{marginLeft:16, color:"#374151", fontSize:13}}>
            <li>Clear sightlines and reflections.</li>
            <li>Stand {thresholds.minDistM}–{thresholds.maxDistM} m away; keep door at 90°.</li>
          </ul>
          <button style={{marginTop:12}} onClick={() => { if (!can('scan:start')) { setMessage('No permission to start scan.'); return; } say(t('start_calibration')); setStep(ScanStep.Calibrate); }}>Start</button>
        </div>
      )}

      {step === ScanStep.Calibrate && (
        <div style={{background:"#fff", borderRadius:12, padding:16, boxShadow:"0 1px 6px rgba(0,0,0,0.08)"}}>
          <h3 style={{fontWeight:600, marginBottom:8}}>Calibrate</h3>
          <p style={{fontSize:13}}>Hold device steady. Wait for confirmation.</p>
          <button style={{marginTop:12}} onClick={doCalibrate} disabled={busy || !okPose()}>{busy ? "Calibrating…" : "Calibrate"}</button>
        </div>
      )}

      {step === ScanStep.FramePass && (
        <div style={{background:"#fff", borderRadius:12, padding:16, boxShadow:"0 1px 6px rgba(0,0,0,0.08)"}}>
          <h3 style={{fontWeight:600, marginBottom:8}}>Frame Scan</h3>
          <button style={{marginTop:12}} onClick={measureFrame} disabled={!can('scan:start') || !okPose()}>{busy ? "Scanning…" : "Scan Frame"}</button>
        </div>
      )}

      {step === ScanStep.DoorPass && (
        <div style={{background:"#fff", borderRadius:12, padding:16, boxShadow:"0 1px 6px rgba(0,0,0,0.08)"}}>
          <h3 style={{fontWeight:600, marginBottom:8}}>Door Scan</h3>
          <button style={{marginTop:12}} onClick={measureDoor} disabled={!can('scan:start') || !okPose()}>{busy ? "Scanning…" : "Scan Door"}</button>
        </div>
      )}

      {step === ScanStep.HardwarePass && (
        <div style={{background:"#fff", borderRadius:12, padding:16, boxShadow:"0 1px 6px rgba(0,0,0,0.08)"}}>
          <h3 style={{fontWeight:600, marginBottom:8}}>Hardware Scan</h3>
          <button style={{marginTop:12}} onClick={measureHardware} disabled={!can('scan:hardware') || !okPose()}>{busy ? "Scanning…" : "Scan Hardware"}</button>
        </div>
      )}

      {step === ScanStep.QualityGate && (
        <div style={{background:"#fff", borderRadius:12, padding:16, boxShadow:"0 1px 6px rgba(0,0,0,0.08)"}}>
          <h3 style={{fontWeight:600, marginBottom:8}}>Quality Gate</h3>
          <p style={{fontSize:13}}>Coverage: {record.coveragePct ?? 0}% | Confidence: {record.confidence ?? 0}</p>
          <button style={{marginTop:12}} onClick={runQuality} disabled={!can('scan:compliance')}>{busy ? "Analyzing…" : "Run Quality Check"}</button>
        </div>
      )}

      {step === ScanStep.ManualVerify && (
        <div style={{background:"#fff", borderRadius:12, padding:16, boxShadow:"0 1px 6px rgba(0,0,0,0.08)"}}>
          <h3 style={{fontWeight:600, marginBottom:8}}>Manual Verify</h3>
          <p className="text-sm">Confirm smallest width, height, and bottom gap manually.</p>
          <button style={{marginTop:12}} onClick={() => setStep(ScanStep.Compliance)}>Continue</button>
        </div>
      )}

      {step === ScanStep.Compliance && (
        <div style={{background:"#fff", borderRadius:12, padding:16, boxShadow:"0 1px 6px rgba(0,0,0,0.08)"}}>
          <h3 style={{fontWeight:600, marginBottom:8}}>Compliance</h3>
          <p style={{fontSize:13}}>Tenant policy applied. Review results.</p>
          <button style={{marginTop:12}} onClick={() => setStep(ScanStep.ReviewExport)} disabled={!can('scan:compliance')}>Review</button>
        </div>
      )}

      {step === ScanStep.ReviewExport && (
        <div style={{background:"#fff", borderRadius:12, padding:16, boxShadow:"0 1px 6px rgba(0,0,0,0.08)"}}>
          <h3 style={{fontWeight:600, marginBottom:8}}>Export</h3>
          <button style={{marginTop:12}} onClick={() => { if (!can('scan:export')) { setMessage('No permission to export.'); return; } emit('scan.export', {}); say(t('export_done')); onComplete(record); }}>Finish</button>
        </div>
      )}
    </div>
  );
}
