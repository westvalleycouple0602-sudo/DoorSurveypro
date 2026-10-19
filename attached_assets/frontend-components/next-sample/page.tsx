// app/ultra/page.tsx
"use client";
import React from "react";
import FloorPlanViewer_PinDrop_Ultra from "../components/FloorPlanViewer_PinDrop_Ultra";
import { apiFetch } from "../../frontend-components/apiClient";

export default function Page(){
  // In a real app, you'd pull token/tenant from auth context after /auth/callback
  const token = process.env.NEXT_PUBLIC_TOKEN || "";
  const tenant = process.env.NEXT_PUBLIC_TENANT || "";
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Ultra Floor Plan Viewer</h1>
      <FloorPlanViewer_PinDrop_Ultra planId="00000000-0000-0000-0000-000000000100" />
      <p className="text-sm text-gray-500 mt-4">
        Ensure your Next dev server proxies to the API or use absolute URLs & pass Authorization / X-Tenant-Id.
      </p>
    </div>
  );
}
