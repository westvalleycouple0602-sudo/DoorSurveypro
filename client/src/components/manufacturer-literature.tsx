import { apiRequest as fetch } from "@/lib/queryClient";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
  Upload,
  Download,
  Trash2,
  FileText,
  Loader2,
  X,
  File as FileIcon,
  Book,
  Wrench,
  Building,
  AlertCircle,
  CheckCircle,
  Shield
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { ManufacturerLiterature } from "@shared/schema";

interface ManufacturerLiteratureProps {
  contactId: string;
  manufacturerName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const DOCUMENT_TYPE_OPTIONS = [
  { value: "cut-sheet", label: "Cut Sheet", icon: FileText },
  { value: "installation-manual", label: "Installation Manual", icon: Wrench },
  { value: "elevation", label: "Elevation Drawing", icon: Building },
  { value: "building-requirements", label: "Building Requirements", icon: AlertCircle },
  { value: "specification", label: "Specification", icon: Book },
  { value: "warranty", label: "Warranty Document", icon: Shield },
  { value: "other", label: "Other", icon: FileIcon },
];

function getDocumentTypeIcon(type: string) {
  const option = DOCUMENT_TYPE_OPTIONS.find(opt => opt.value === type);
  return option ? option.icon : FileIcon;
}

function getDocumentTypeLabel(type: string) {
  const option = DOCUMENT_TYPE_OPTIONS.find(opt => opt.value === type);
  return option ? option.label : type;
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return "Unknown size";
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(1)} MB`;
}

export function ManufacturerLiteratureDialog({
  contactId,
  manufacturerName,
  open,
  onOpenChange,
}: ManufacturerLiteratureProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState<string>("cut-sheet");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  const { data: literature, isLoading } = useQuery<ManufacturerLiterature[]>({
    queryKey: ["/api/manufacturers", contactId, "literature"],
    enabled: open && !!contactId,
  });

  const literatureList = Array.isArray(literature) ? literature : [];

  const uploadMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      // For file uploads with FormData, we need to use fetch directly
      // because apiRequest adds JSON headers which conflict with FormData
      const token = await fetch("/api/csrf-token", { credentials: "include" })
        .then(res => res.json())
        .then(data => data.csrfToken);
      
      const response = await fetch(`/api/manufacturers/${contactId}/literature`, {
        method: "POST",
        headers: {
          "x-csrf-token": token,
        },
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manufacturers", contactId, "literature"] });
      toast({ title: "Literature uploaded successfully" });
      setSelectedFile(null);
      setTitle("");
      setDescription("");
      setDocumentType("cut-sheet");
    },
    onError: (error: Error) => {
      toast({
        title: "Upload failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/manufacturer-literature/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/manufacturers", contactId, "literature"] });
      toast({ title: "Literature deleted successfully" });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!title) {
        setTitle(file.name);
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to upload",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("documentType", documentType);
    formData.append("title", title || selectedFile.name);
    if (description) {
      formData.append("description", description);
    }

    try {
      await uploadMutation.mutateAsync(formData);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDownload = (lit: ManufacturerLiterature) => {
    window.open(`/api/manufacturer-literature/${lit.id}/download`, "_blank");
  };

  const handleDelete = (id: string, fileName: string) => {
    if (confirm(`Are you sure you want to delete "${fileName}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            <Book className="inline-block h-5 w-5 mr-2 mb-1" />
            Manufacturer Literature - {manufacturerName}
          </DialogTitle>
          <DialogDescription>
            Manage technical documents like cut sheets, manuals, and specifications
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Upload Section */}
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <Upload className="h-4 w-4" />
              Upload New Document
            </h3>

            <div className="grid gap-4">
              <div>
                <Label htmlFor="document-type">Document Type</Label>
                <Select value={documentType} onValueChange={setDocumentType}>
                  <SelectTrigger id="document-type" data-testid="select-document-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DOCUMENT_TYPE_OPTIONS.map((option) => {
                      const Icon = option.icon;
                      return (
                        <SelectItem key={option.value} value={option.value}>
                          <div className="flex items-center gap-2">
                            <Icon className="h-3 w-3" />
                            {option.label}
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="file">File</Label>
                <Input
                  id="file"
                  type="file"
                  data-testid="input-file"
                  onChange={handleFileSelect}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.svg,.webp,.zip"
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  data-testid="input-title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Document title"
                />
              </div>

              <div>
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  data-testid="input-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Additional notes about this document"
                  rows={2}
                />
              </div>

              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                data-testid="button-upload"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Document
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Literature List */}
          <div className="space-y-4">
            <h3 className="font-medium flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents ({literatureList.length})
            </h3>

            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : literatureList.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Book className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No documents uploaded yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {literatureList.map((lit) => {
                  const Icon = getDocumentTypeIcon(lit.documentType);
                  return (
                    <div
                      key={lit.id}
                      className="border rounded-lg p-3 flex items-start justify-between gap-4 hover-elevate"
                      data-testid={`literature-${lit.id}`}
                    >
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Icon className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium truncate">{lit.title}</h4>
                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            <Badge variant="secondary">
                              {getDocumentTypeLabel(lit.documentType)}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatFileSize(lit.fileSize)}
                            </span>
                            {lit.uploadedBy && (
                              <span className="text-sm text-muted-foreground">
                                by {lit.uploadedBy}
                              </span>
                            )}
                          </div>
                          {lit.description && (
                            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                              {lit.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDownload(lit)}
                          aria-label="Download literature"
                          data-testid={`button-download-${lit.id}`}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDelete(lit.id, lit.title)}
                          disabled={deleteMutation.isPending}
                          aria-label="Delete literature"
                          data-testid={`button-delete-${lit.id}`}
                        >
                          {deleteMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
