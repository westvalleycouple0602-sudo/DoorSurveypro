export const STRINGS: Record<string, Record<string, string>> = {
  "en-US": {
    start_calibration: "Starting calibration phase.", calibrating: "Hold steady while we calibrate.",
    calibration_done: "Calibration complete. Now scan the frame.", scan_frame: "Scanning frame edges. Maintain green distance.",
    frame_done: "Frame scan done. Proceed to door scan.", scan_door: "Scanning door faces. Hold device steady.",
    door_done: "Door scan complete. Checking hardware next.", scan_hardware: "Tap hinge and latch points to record anchors.",
    hardware_done: "Hardware complete. Running quality analysis.", analyzing_quality: "Analyzing scan quality.",
    quality_ok: "Excellent quality. Proceed to manual verification.", quality_low: "Coverage too low. Please rescan.",
    export_report: "Exporting report.", export_done: "Export complete."
  }
};
