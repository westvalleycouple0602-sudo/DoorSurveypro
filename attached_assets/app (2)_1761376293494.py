
import os, time, uuid, json
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory
app = Flask(__name__)
STORAGE = Path("./storage"); STORAGE.mkdir(parents=True, exist_ok=True)
RESULTS = STORAGE / "results.json"
if not RESULTS.exists(): RESULTS.write_text("{}", encoding="utf-8")
def load_results():
    try: return json.loads(RESULTS.read_text(encoding="utf-8"))
    except Exception: return {}
def save_results(d): RESULTS.write_text(json.dumps(d, indent=2), encoding="utf-8")
@app.get("/health")
def health(): return {"ok": True}
@app.post("/uploadScan")
def upload_scan():
    scan_type = request.headers.get("X-Scan-Type","").lower()
    sid = f"{int(time.time())}-{uuid.uuid4().hex[:8]}"
    res = load_results()
    if scan_type == "ios_lidar":
        ext = request.headers.get("X-File-Ext","ply")
        body = request.get_data(cache=False, as_text=False)
        f = STORAGE / f"{sid}.{ext}"
        f.write_bytes(body)
        res[sid] = {"scan_id": sid, "source":"ios_lidar", "file": str(f)}
    else:
        payload = request.get_json(force=True, silent=True) or {}
        res[sid] = {"scan_id": sid, "source": scan_type or "unknown", **payload}
    save_results(res)
    return jsonify(res[sid]), 201
@app.get("/results")
def all_results(): return jsonify(load_results())
@app.get("/results/<sid>")
def get_res(sid):
    res = load_results(); 
    return (jsonify(res[sid]) if sid in res else (jsonify({"error":"not found"}),404))
@app.get("/artifacts/<path:name>")
def artifacts(name: str): return send_from_directory(STORAGE, name, as_attachment=True)
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT","8080")), debug=True)


# -------- Fast LiDAR processing (bounded-time, efficient) --------
def _try_imports():
    o3d = None; trimesh = None
    try:
        import open3d as _o3d  # type: ignore
        o3d = _o3d
    except Exception:
        o3d = None
    try:
        import trimesh as _trimesh  # type: ignore
        trimesh = _trimesh
    except Exception:
        trimesh = None
    return o3d, trimesh

@app.post("/processLidarFast/<scan_id>")
def process_lidar_fast(scan_id: str):
    import time, math
    import numpy as np
    from pathlib import Path
    res = load_results()
    rec = res.get(scan_id)
    if not rec or rec.get("source") != "ios_lidar":
        return jsonify({"error":"scan not found or not ios_lidar"}), 404
    f = Path(rec.get("file",""))
    if not f.exists():
        return jsonify({"error":"artifact missing"}), 404

    o3d, tmesh = _try_imports()
    start = time.time()
    stats = {"steps": []}

    # Helper to log steps
    def log(step): 
        stats["steps"].append(step)

    width = height = depth = None

    if o3d:
        try:
            log("read_point_cloud")
            # Read + cap points early for speed
            pcd = o3d.io.read_point_cloud(str(f))
            npts = len(pcd.points)
            log(f"points={npts}")
            if npts == 0:
                raise RuntimeError("empty point cloud")
            # Aggressive downsample
            voxel = 0.01  # 10 mm
            log(f"downsample voxel={voxel}")
            pcd = pcd.voxel_down_sample(voxel_size=voxel)
            # Optional cap by random sampling to ~150k points
            if len(pcd.points) > 150_000:
                log("random downsample to 150k")
                import random
                idx = random.sample(range(len(pcd.points)), 150_000)
                pcd = pcd.select_by_index(idx)
            # Quick AABB for fallback
            aabb = pcd.get_axis_aligned_bounding_box()
            ext = np.array(aabb.get_extent()) * 1000.0  # mm
            se = np.sort(ext)[::-1]
            width, height, depth = se[1], se[0], se[2]
            log(f"aabb_mm={ext.tolist()}")

            # Bounded RANSAC to refine jamb/floor/header (≤ ~8s)
            log("segment planes (fast bounds)")
            remain = pcd
            planes = []
            max_planes = 4
            distance_threshold = 0.015  # 15 mm
            num_iter = 200
            while len(planes) < max_planes and len(remain.points) > 2000 and (time.time() - start) < 8.0:
                model, inliers = remain.segment_plane(distance_threshold=distance_threshold, ransac_n=3, num_iterations=num_iter)
                a,b,c,d = model
                planes.append({"model":[float(a),float(b),float(c),float(d)], "count": int(len(inliers))})
                remain = remain.select_by_index(inliers, invert=True)

            # If we found plausible planes, refine width/height estimates
            if planes:
                def norm(v):
                    v = np.array(v[:3], dtype=float); n = np.linalg.norm(v); return v/(n+1e-9)
                def angle(u,v):
                    du, dv = norm(u), norm(v)
                    c = float(np.clip(np.dot(du,dv), -1, 1)); 
                    return math.degrees(math.acos(c))
                z = [0,0,1]
                # Jamb pair: near-parallel & near-vertical
                jambs = None
                for i in range(len(planes)):
                    for j in range(i+1, len(planes)):
                        n1, n2 = planes[i]["model"][:3], planes[j]["model"][:3]
                        if angle(n1,n2) < 12 and abs(angle(n1,z) - 90) < 25:
                            jambs = (planes[i], planes[j]); break
                    if jambs: break
                # Horizontal planes for floor/header
                horiz = [p for p in planes if abs(angle(p["model"][:3], z)) < 15]
                if jambs:
                    nlen = np.linalg.norm(jambs[0]["model"][:3]) + 1e-9
                    d1 = jambs[0]["model"][3] / nlen
                    d2 = jambs[1]["model"][3] / nlen
                    width = abs(d2 - d1) * 1000.0
                if len(horiz) >= 1:
                    # use largest horizontal as floor; height from AABB top minus AABB bottom as fallback
                    # fast mode: keep AABB height (already assigned)
                    pass

        except Exception as e:
            log(f"open3d-fast-error: {e}")

    elif tmesh:
        # Fallback with trimesh (very fast bbox)
        try:
            log("trimesh.load")
            m = tmesh.load(str(f), force='mesh')
            ext = (m.bounds[1] - m.bounds[0]) * 1000.0
            se = np.sort(ext)[::-1]
            width, height, depth = se[1], se[0], se[2]
            log(f"aabb_mm={ext.tolist()}")
        except Exception as e:
            return jsonify({"error": f"cannot read mesh: {e}", "stats": stats}), 500
    else:
        return jsonify({"error":"neither open3d nor trimesh available", "stats": stats}), 500

    # Finalize
    metrics = {
        "status": "ok",
        "width_mm": round(float(width or 0), 1),
        "height_mm": round(float(height or 0), 1),
        "frame_depth_mm": round(float(depth or 0), 1),
        "elapsed_s": round(time.time() - start, 3),
        "notes": "fast-mode; AABB with bounded plane refinement"}
    # Store into results
    rec.update({
        "units":"mm",
        "width": metrics["width_mm"],
        "height": metrics["height_mm"],
        "frame_depth": metrics["frame_depth_mm"],
        "confidence": rec.get("confidence", 0.7)
    })
    res[scan_id] = rec
    save_results(res)
    return jsonify({"scan_id": scan_id, "metrics": metrics, "stats": stats})


# -------- Progress logging helpers --------
from pathlib import Path as _Path
PROGRESS_DIR = _Path("./storage/progress"); PROGRESS_DIR.mkdir(parents=True, exist_ok=True)

def _progress_path(scan_id: str) -> _Path:
    safe = "".join(ch for ch in scan_id if ch.isalnum() or ch in ("-","_"))
    return PROGRESS_DIR / f"{safe}.log"

def progress_log(scan_id: str, message: str) -> None:
    try:
        p = _progress_path(scan_id)
        p.write_text((p.read_text() if p.exists() else "") + message.strip() + "\n", encoding="utf-8")
    except Exception:
        pass

@app.get("/progress/<scan_id>")
def get_progress(scan_id: str):
    p = _progress_path(scan_id)
    if not p.exists():
        return {"scan_id": scan_id, "log": [], "exists": False}
    return {"scan_id": scan_id, "log": p.read_text(encoding="utf-8").splitlines(), "exists": True}


# Core fast runner (used by /processLidarFast and /processLidar with X-Mode: fast)
def _try_imports():
    o3d = None; trimesh = None
    try:
        import open3d as _o3d  # type: ignore
        o3d = _o3d
    except Exception:
        o3d = None
    try:
        import trimesh as _trimesh  # type: ignore
        trimesh = _trimesh
    except Exception:
        trimesh = None
    return o3d, trimesh

def run_fast(scan_id: str):
    import time, math
    import numpy as np
    from pathlib import Path
    res = load_results()
    rec = res.get(scan_id)
    if not rec or rec.get("source") != "ios_lidar":
        return {"error":"scan not found or not ios_lidar"}, 404
    f = Path(rec.get("file",""))
    if not f.exists():
        return {"error":"artifact missing"}, 404

    o3d, tmesh = _try_imports()
    start = time.time()
    stats = {"steps": []}
    def log(msg): stats["steps"].append(msg); progress_log(scan_id, msg)

    width = height = depth = None

    if o3d:
        try:
            log("read_point_cloud")
            pcd = o3d.io.read_point_cloud(str(f))
            npts = len(pcd.points); log(f"points={npts}")
            if npts == 0: raise RuntimeError("empty point cloud")
            voxel = 0.01; log(f"downsample voxel={voxel}")
            pcd = pcd.voxel_down_sample(voxel_size=voxel)
            if len(pcd.points) > 150_000:
                log("random downsample to 150k")
                import random
                idx = random.sample(range(len(pcd.points)), 150_000)
                pcd = pcd.select_by_index(idx)
            aabb = pcd.get_axis_aligned_bounding_box()
            ext = np.array(aabb.get_extent()) * 1000.0
            se = np.sort(ext)[::-1]
            width, height, depth = se[1], se[0], se[2]
            log(f"aabb_mm={ext.tolist()}")

            # bounded plane search (~8s)
            log("segment planes (fast)")
            remain = pcd
            planes = []
            max_planes = 4
            distance_threshold = 0.015
            num_iter = 200
            while len(planes) < max_planes and len(remain.points) > 2000 and (time.time() - start) < 8.0:
                model, inliers = remain.segment_plane(distance_threshold=distance_threshold, ransac_n=3, num_iterations=num_iter)
                a,b,c,d = model
                planes.append({"model":[float(a),float(b),float(c),float(d)], "count": int(len(inliers))})
                remain = remain.select_by_index(inliers, invert=True)

            if planes:
                def norm(v):
                    v = np.array(v[:3], dtype=float); n = np.linalg.norm(v); return v/(n+1e-9)
                def angle(u,v):
                    du, dv = norm(u), norm(v)
                    c = float(np.clip(np.dot(du,dv), -1, 1)); 
                    return math.degrees(math.acos(c))
                z = [0,0,1]
                jambs = None
                for i in range(len(planes)):
                    for j in range(i+1, len(planes)):
                        n1, n2 = planes[i]["model"][:3], planes[j]["model"][:3]
                        if angle(n1,n2) < 12 and abs(angle(n1,z) - 90) < 25:
                            jambs = (planes[i], planes[j]); break
                    if jambs: break
                if jambs:
                    import numpy as np
                    nlen = np.linalg.norm(jambs[0]["model"][:3]) + 1e-9
                    d1 = jambs[0]["model"][3] / nlen
                    d2 = jambs[1]["model"][3] / nlen
                    width = abs(d2 - d1) * 1000.0

        except Exception as e:
            log(f"fast-error: {e}")

    elif tmesh:
        try:
            log("trimesh.load")
            m = tmesh.load(str(f), force='mesh')
            ext = (m.bounds[1] - m.bounds[0]) * 1000.0
            import numpy as np
            se = np.sort(ext)[::-1]
            width, height, depth = se[1], se[0], se[2]
            log(f"aabb_mm={ext.tolist()}")
        except Exception as e:
            return {"error": f"cannot read mesh: {e}", "stats": stats}, 500
    else:
        return {"error":"no geometry libs available", "stats": stats}, 500

    metrics = {
        "status": "ok",
        "width_mm": round(float(width or 0), 1),
        "height_mm": round(float(height or 0), 1),
        "frame_depth_mm": round(float(depth or 0), 1),
        "elapsed_s": round(time.time() - start, 3),
        "notes": "fast-mode; AABB with bounded plane refinement"
    }
    rec.update({"units":"mm","width":metrics["width_mm"],"height":metrics["height_mm"],
                "frame_depth":metrics["frame_depth_mm"],"confidence":rec.get("confidence",0.7)})
    res[scan_id] = rec; save_results(res)
    return {"scan_id": scan_id, "metrics": metrics, "stats": stats}, 200


def run_full(scan_id: str, time_budget_s: float = 25.0):
    import time, math, numpy as np, random
    from pathlib import Path
    res = load_results()
    rec = res.get(scan_id)
    if not rec or rec.get("source") != "ios_lidar":
        return {"error":"scan not found or not ios_lidar"}, 404
    f = Path(rec.get("file",""))
    if not f.exists():
        return {"error":"artifact missing"}, 404

    o3d, tmesh = _try_imports()
    if not o3d:
        return {"error":"open3d required for full mode"}, 500

    start = time.time()
    stats = {"steps": []}
    def log(msg): stats["steps"].append(msg); progress_log(scan_id, msg)

    try:
        log("read_point_cloud")
        pcd = o3d.io.read_point_cloud(str(f))
        npts = len(pcd.points); log(f"points={npts}")
        if npts == 0: raise RuntimeError("empty point cloud")
        voxel = 0.005; log(f"downsample voxel={voxel}")
        pcd = pcd.voxel_down_sample(voxel_size=voxel)
        log("estimate_normals")
        pcd.estimate_normals(o3d.geometry.KDTreeSearchParamHybrid(radius=0.02, max_nn=30))

        aabb = pcd.get_axis_aligned_bounding_box()
        base_ext = np.array(aabb.get_extent()) * 1000.0
        log(f"aabb_mm={base_ext.tolist()}")

        # Plane segmentation with budget
        remain = pcd
        planes = []
        distance_threshold = 0.01
        while len(remain.points) > 2500 and (time.time() - start) < time_budget_s:
            model, inliers = remain.segment_plane(distance_threshold=distance_threshold, ransac_n=3, num_iterations=1000)
            a,b,c,d = model
            planes.append({"model":[float(a),float(b),float(c),float(d)], "count": int(len(inliers))})
            remain = remain.select_by_index(inliers, invert=True)
            if len(planes) >= 6: break
            log(f"plane count={len(planes)} remain={len(remain.points)}")

        # Identify jamb pair and horizontal planes
        def norm(v):
            v = np.array(v[:3], dtype=float); n = np.linalg.norm(v); return v/(n+1e-9)
        def angle(u,v):
            du, dv = norm(u), norm(v)
            c = float(np.clip(np.dot(du,dv), -1, 1)); 
            return math.degrees(math.acos(c))
        z = [0,0,1]

        jambs = None
        cand = [p for p in planes if p["count"] > 2000]
        for i in range(len(cand)):
            for j in range(i+1, len(cand)):
                n1, n2 = cand[i]["model"][:3], cand[j]["model"][:3]
                if angle(n1,n2) < 10 and abs(angle(n1,z) - 90) < 20:
                    jambs = (cand[i], cand[j]); break
            if jambs: break

        horiz = [p for p in planes if abs(angle(p["model"][:3], z)) < 12]
        floor = max(horiz, key=lambda p: p["count"]) if horiz else None
        header = None
        if floor:
            # choose another horizontal plane different from floor
            for p in horiz:
                if p is not floor:
                    header = p; break

        width = height = depth = None
        if jambs:
            nlen = np.linalg.norm(jambs[0]["model"][:3]) + 1e-9
            d1 = jambs[0]["model"][3] / nlen
            d2 = jambs[1]["model"][3] / nlen
            width = abs(d2 - d1) * 1000.0
        if floor and header:
            nlen = np.linalg.norm(floor["model"][:3]) + 1e-9
            d1 = floor["model"][3] / nlen
            d2 = header["model"][3] / nlen
            height = abs(d2 - d1) * 1000.0

        # Fallbacks
        ext = np.array(remain.get_axis_aligned_bounding_box().get_extent()) * 1000.0 if len(remain.points)>0 else base_ext
        se = np.sort(ext)[::-1]
        if width is None: width = se[1]
        if height is None: height = se[0]
        depth = se[2]

        metrics = {
            "status": "ok",
            "width_mm": round(float(width), 1),
            "height_mm": round(float(height), 1),
            "frame_depth_mm": round(float(depth), 1),
            "elapsed_s": round(time.time() - start, 3),
            "notes": "full-mode; plane-based with fallbacks",
            "planes": planes[:6]
        }
        rec.update({"units":"mm","width":metrics["width_mm"],"height":metrics["height_mm"],
                    "frame_depth":metrics["frame_depth_mm"],"confidence":rec.get("confidence",0.8)})
        res[scan_id] = rec; save_results(res)
        return {"scan_id": scan_id, "metrics": metrics, "stats": stats}, 200
    except Exception as e:
        log(f"full-error: {e}")
        return {"error": str(e), "stats": stats}, 500

@app.post("/processLidar/<scan_id>")
def process_lidar_unified(scan_id: str):
    # mode via header X-Mode: fast|full or query ?mode=fast|full; default fast
    mode = (request.headers.get("X-Mode") or request.args.get("mode") or "fast").lower().strip()
    _progress_path(scan_id).write_text("", encoding="utf-8")  # reset progress
    if mode == "full":
        out, status = run_full(scan_id, time_budget_s=25.0)
    else:
        out, status = run_fast(scan_id)
    out["mode"] = mode
    return (out, status)


# -------- Async processing (threaded) for live progress UI --------
import threading

def _process_in_thread(scan_id: str, mode: str):
    try:
        progress_log(scan_id, f"start mode={mode}")
        if mode == "full":
            out, status = run_full(scan_id, time_budget_s=25.0)
        else:
            out, status = run_fast(scan_id)
        progress_log(scan_id, f"done status={status}")
    except Exception as e:
        progress_log(scan_id, f"error: {e}")

@app.post("/processLidarAsync/<scan_id>")
def process_lidar_async(scan_id: str):
    mode = (request.headers.get("X-Mode") or request.args.get("mode") or "fast").lower().strip()
    _progress_path(scan_id).write_text("", encoding="utf-8")  # reset
    t = threading.Thread(target=_process_in_thread, args=(scan_id, mode), daemon=True)
    t.start()
    return {"scan_id": scan_id, "mode": mode, "status": "started"}, 202
