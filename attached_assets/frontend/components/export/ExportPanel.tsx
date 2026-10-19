
import React, { useState } from "react";
import { useExportProfiles, useQuoteVersions, useExportQuote, downloadBlob } from "../../api/export";

interface ExportPanelProps {
  quoteId: string;
}

const ExportPanel: React.FC<ExportPanelProps> = ({ quoteId }) => {
  const { data: profiles } = useExportProfiles();
  const { data: versions } = useQuoteVersions(quoteId);
  const exportMutation = useExportQuote();

  const [selectedProfileId, setSelectedProfileId] = useState<string | "">("");
  const [selectedVersionId, setSelectedVersionId] = useState<string | "">("");
  const [format, setFormat] = useState<"pdf" | "html">("pdf");
  const [templateType, setTemplateType] = useState<string>("proposal");
  const [language, setLanguage] = useState<string>("en");

  const handleExport = async () => {
    const { blob, format: fmt } = await exportMutation.mutateAsync({
      quoteId,
      exportProfileId: selectedProfileId || null,
      quoteVersionId: selectedVersionId || null,
      format,
      templateType,
      language,
    });
    const filename = `quote-${quoteId}.${fmt === "pdf" ? "pdf" : "html"}`;
    downloadBlob(blob, filename);
  };

  return (
    <div className="flex flex-col gap-3 rounded-2xl border p-4 shadow-sm">
      <h3 className="text-lg font-semibold">Export &amp; Print</h3>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Export profile</label>
        <select
          className="rounded border px-2 py-1 text-sm"
          value={selectedProfileId}
          onChange={(e) => setSelectedProfileId(e.target.value)}
        >
          <option value="">Default</option>
          {profiles?.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Quote version</label>
        <select
          className="rounded border px-2 py-1 text-sm"
          value={selectedVersionId}
          onChange={(e) => setSelectedVersionId(e.target.value)}
        >
          <option value="">Primary</option>
          {versions?.map((v: any) => (
            <option key={v.id} value={v.id}>
              {v.label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Template</label>
          <select
            className="rounded border px-2 py-1 text-sm"
            value={templateType}
            onChange={(e) => setTemplateType(e.target.value)}
          >
            <option value="proposal">Proposal</option>
            <option value="installer_packet">Installer Packet</option>
            <option value="submittal">Submittal</option>
            <option value="summary_quote">Summary Quote</option>
            <option value="cut_sheet">Cut Sheet</option>
            <option value="change_order">Change Order</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium">Format</label>
          <select
            className="rounded border px-2 py-1 text-sm"
            value={format}
            onChange={(e) => setFormat(e.target.value as "pdf" | "html")}
          >
            <option value="pdf">PDF</option>
            <option value="html">HTML</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Language</label>
        <select
          className="rounded border px-2 py-1 text-sm"
          value={language}
          onChange={(e) => setLanguage(e.target.value)}
        >
          <option value="en">English</option>
          <option value="es">Spanish</option>
          <option value="fr-CA">French (Canada)</option>
        </select>
      </div>

      <button
        type="button"
        onClick={handleExport}
        disabled={exportMutation.isPending}
        className="mt-2 rounded-xl border px-3 py-2 text-sm font-medium hover:bg-gray-50"
      >
        {exportMutation.isPending ? "Exporting..." : "Export"}
      </button>
    </div>
  );
};

export default ExportPanel;
