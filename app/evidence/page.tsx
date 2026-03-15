"use client";

import { useRouter } from "next/navigation";
import {
  ChangeEvent,
  DragEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Check, LayoutGrid, UploadCloud, ArrowDownWideNarrow } from "lucide-react";
import { AdvocateNav } from "@/components/advocate-nav";
import { useAuth } from "@/contexts/auth-context";
import {
  clearCaseSession,
  createFallbackCaseSession,
  loadCaseSession,
  type CaseSessionState,
  type VaultDocument,
  saveCaseSession,
  updateCaseSession,
} from "@/lib/client/case-session";
import {
  rerunCaseWithEvidence,
  syncCaseSessionRecord,
} from "@/lib/client/run-case-pipeline";
import {
  EvidenceIngestionResult,
  EvidenceRelevanceRequest,
  EvidenceRelevanceScore,
} from "@/lib/types";

function createId(prefix: string) {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatFileMeta(file: File) {
  const sizeMb = (file.size / 1024 / 1024).toFixed(1);
  const date = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
  return `${date} • ${sizeMb} MB`;
}

async function ingestUploadedDocument(file: File): Promise<EvidenceIngestionResult> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch("/api/evidence/ingest", {
    method: "POST",
    body: formData,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(
      typeof data?.error === "string" ? data.error : "Failed to ingest uploaded document"
    );
  }

  return data as EvidenceIngestionResult;
}

async function scoreUploadedDocument(
  current: CaseSessionState,
  file: File,
  ingested: EvidenceIngestionResult
): Promise<EvidenceRelevanceScore> {
  const payload: EvidenceRelevanceRequest = {
    label: file.name,
    snippet:
      ingested.excerpt ||
      ingested.extractedText.slice(0, 1200) ||
      `Uploaded file ${file.name}. No extracted text available.`,
    sourceType: "uploaded_file",
    analysisSummary: current.analysis.summary,
    denialReason: current.structuredFacts.denialReason,
    patientContext: current.analysis.patientContext,
    insurer: current.structuredFacts.insurer,
    appealGrounds: current.analysis.appealGrounds.map(
      (ground) => `${ground.basis} ${ground.argument}`
    ),
    issueClass: current.analysis.appealGrounds.map((ground) => ground.basis).join(" "),
    branchType:
      current.strategy.nodes.find((node) => node.id === current.selectedNodeId)?.label ||
      current.strategy.explanation?.recommendedNodeId,
    targetNodeLabel:
      current.strategy.nodes.find((node) => node.id === current.selectedNodeId)?.label ||
      current.strategy.explanation?.recommendedNodeId,
  };

  const response = await fetch("/api/models/evidence-relevance", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("Failed to score uploaded document");
  }

  return (await response.json()) as EvidenceRelevanceScore;
}

function filterDocuments(documents: VaultDocument[], activeFilter: string) {
  if (activeFilter === "All Documents") return documents;
  return documents.filter((doc) => doc.category === activeFilter);
}

function buildDocumentPreview(doc?: VaultDocument) {
  if (!doc) return "No extracted text available.";
  const source = doc.extractedText || doc.snippet || "No extracted text available.";
  return source.replace(/\s+/g, " ").trim().slice(0, 340);
}

function fileExtension(name: string) {
  const parts = name.split(".");
  return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : "FILE";
}

function canRenderInlinePreview(doc?: VaultDocument) {
  if (!doc?.previewUrl || !doc.mimeType) return false;
  return (
    doc.mimeType === "application/pdf" ||
    doc.mimeType.startsWith("image/") ||
    doc.mimeType.startsWith("text/")
  );
}

export default function EvidencePage() {
  const router = useRouter();
  const { configured: authConfigured, user, loading: authLoading, getIdToken } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [caseState, setCaseState] = useState<CaseSessionState | null>(null);
  const [activeFilter, setActiveFilter] = useState("All Documents");
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    if (authConfigured && !authLoading && !user) {
      clearCaseSession();
      router.replace("/");
      return;
    }
    const current = loadCaseSession() || createFallbackCaseSession();
    setCaseState(current);
    setSelectedDocId(current.vaultDocuments[0]?.id ?? null);
  }, [authConfigured, authLoading, user, router]);

  const resolved = caseState || createFallbackCaseSession();
  const documents = resolved.vaultDocuments;
  const filteredDocuments = useMemo(
    () => filterDocuments(documents, activeFilter),
    [documents, activeFilter]
  );
  const selectedDocument =
    documents.find((doc) => doc.id === selectedDocId) || filteredDocuments[0] || documents[0];

  const filters = useMemo(() => {
    const counts = new Map<string, number>();
    for (const document of documents) {
      // Bug fix: Handle undefined category gracefully
      const category = document.category || "Uncategorized";
      counts.set(category, (counts.get(category) || 0) + 1);
    }

    return [
      { label: "All Documents", count: String(documents.length) },
      ...Array.from(counts.entries()).map(([label, count]) => ({
        label,
        count: String(count),
      })),
    ];
  }, [documents]);

  function persist(next: CaseSessionState, message?: string) {
    setCaseState(next);
    setSelectedDocId((current) => current && next.vaultDocuments.some((doc) => doc.id === current)
      ? current
      : next.vaultDocuments[0]?.id ?? null);
    if (message) setNotice(message);
    void syncCaseSessionRecord(next, getIdToken).then(setCaseState).catch(() => undefined);
  }

  function triggerFileInput() {
    fileInputRef.current?.click();
  }

  async function addFiles(files: FileList | null) {
    if (!files?.length) return;

    const current = loadCaseSession() || createFallbackCaseSession();
        const uploadedDocuments: VaultDocument[] = await Promise.all(
      Array.from(files).map(async (file) => {
        const ingested = await ingestUploadedDocument(file).catch(() => ({
          fileName: file.name,
          mimeType: file.type || "application/octet-stream",
          sizeBytes: file.size,
          category: "Uploaded",
          ingestionStatus: "metadata_only" as const,
          extractedText: "",
          excerpt: `Uploaded file ${file.name}. No extracted text available yet.`,
          warnings: ["File ingestion fell back to metadata-only mode."],
          storedFileId: undefined,
          previewUrl: undefined,
        }));

        const score = await scoreUploadedDocument(current, file, ingested).catch(() => ({
          relevanceScore: 0.03,
          confidence: 0.2,
          source: "heuristic" as const,
          reasoning: "Scoring was unavailable, so this upload was conservatively marked as low relevance.",
          warning: "Upload scoring fell back because the relevance endpoint did not respond.",
        }));

        return {
          id: createId("upload"),
          name: file.name,
          meta: formatFileMeta(file),
          category: ingested.category,
          snippet: ingested.excerpt,
          extractedText: ingested.extractedText,
          mimeType: ingested.mimeType,
          storedFileId: ingested.storedFileId,
          previewUrl: ingested.previewUrl,
          ingestionStatus: ingested.ingestionStatus,
          ingestionWarnings: ingested.warnings,
          sourceType: "uploaded_file",
          relevanceScore: score.relevanceScore,
          scoreSource: score.source,
          scoreConfidence: score.confidence,
          // Fix 17: surface heuristic fallback warnings directly in the document insight panel.
          scoreReasoning: score.warning ? `${score.reasoning} ${score.warning}` : score.reasoning,
          verified: false,
          linked: false,
          missing: false,
        };
      })
    );

    const localNext = updateCaseSession((current) => ({
      ...current,
      vaultDocuments: [...uploadedDocuments, ...current.vaultDocuments],
      activity: [
        {
          id: createId("activity"),
          label: "Documents uploaded",
          body: `${uploadedDocuments.length} file(s) added to the evidence vault.`,
          timestamp: new Date().toISOString(),
          type: "upload",
        },
        ...current.activity,
      ],
    }));

    setCaseState(localNext);
    setSelectedDocId(uploadedDocuments[0]?.id ?? localNext.vaultDocuments[0]?.id ?? null);
    setNotice(`${uploadedDocuments.length} file(s) uploaded. Refreshing case strategy...`);

    try {
      setIsRefreshing(true);
      const refreshed = await rerunCaseWithEvidence({
        current: localNext,
        evidenceDocuments: localNext.vaultDocuments,
        getIdToken,
      });
      saveCaseSession(refreshed);
      setCaseState(refreshed);
      setSelectedDocId(uploadedDocuments[0]?.id ?? refreshed.vaultDocuments[0]?.id ?? null);
      setNotice(`${uploadedDocuments.length} file(s) uploaded and case strategy refreshed.`);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? `${uploadedDocuments.length} file(s) uploaded, but strategy refresh failed: ${error.message}`
          : `${uploadedDocuments.length} file(s) uploaded, but strategy refresh failed.`
      );
    } finally {
      setIsRefreshing(false);
    }
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    await addFiles(event.target.files);
    event.target.value = "";
  }

  async function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    await addFiles(event.dataTransfer.files);
  }

  function verifySelectedDocument() {
    if (!selectedDocument) return;

    const next = updateCaseSession((current) => ({
      ...current,
      vaultDocuments: current.vaultDocuments.map((doc) =>
        doc.id === selectedDocument.id ? { ...doc, verified: true, linked: true } : doc
      ),
      activity: [
        {
          id: createId("activity"),
          label: "Evidence linked",
          body: `${selectedDocument.name} was verified and linked to the current strategy.`,
          timestamp: new Date().toISOString(),
          type: "upload",
        },
        ...current.activity,
      ],
    }));

    setCaseState(next);
    setNotice(`${selectedDocument.name} verified and linked.`);
  }

  function removeSelectedDocument() {
    if (!selectedDocument) return;

    const next = updateCaseSession((current) => ({
      ...current,
      vaultDocuments: current.vaultDocuments.filter((doc) => doc.id !== selectedDocument.id),
      activity: [
        {
          id: createId("activity"),
          label: "Document removed",
          body: `${selectedDocument.name} was removed from the evidence vault.`,
          timestamp: new Date().toISOString(),
          type: "upload",
        },
        ...current.activity,
      ],
    }));

    persist(next, `${selectedDocument.name} removed from the vault.`);
  }

  function applyHighlight() {
    if (!selectedDocument) return;

    const next = updateCaseSession((current) => ({
      ...current,
      draftEditor: {
        ...current.draftEditor,
        content: `${current.draftEditor.content}\n\nEvidence note: ${selectedDocument.snippet}`,
      },
      activity: [
        {
          id: createId("activity"),
          label: "Evidence inserted into draft",
          body: `${selectedDocument.name} was referenced in the working draft.`,
          timestamp: new Date().toISOString(),
          type: "draft",
        },
        ...current.activity,
      ],
    }));

    setCaseState(next);
    setNotice(`${selectedDocument.name} inserted into the working draft.`);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#FDFCFB] text-[#1E3A5F]">
      <AdvocateNav
        activeItem="evidence"
        showCaseContext
        caseId={resolved.structuredFacts.claimNumber || "#ADV-2047"}
        patientName={resolved.structuredFacts.patientName || "Case review"}
        workspaceHref="/workspace"
        methodologyHref="/#methodology"
        evidenceHref="/evidence"
        supportHref="/status"
        exportHref="/confirmation"
      />

      <div className="flex-1 flex overflow-hidden">
        <aside className="w-64 border-r border-[#E8E4DF] bg-white overflow-y-auto p-6 flex flex-col gap-8">
          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B] mb-4">
              Document Filter
            </h3>
            <nav className="space-y-1">
              {filters.map(({ label, count }) => (
                <button
                  key={label}
                  onClick={() => setActiveFilter(label)}
                  className={`w-full flex items-center justify-between p-2 text-[11px] ${
                    activeFilter === label
                      ? "font-bold bg-[#F9F8F6] text-[#1E3A5F]"
                      : "font-medium text-[#6B6B6B] hover:bg-gray-50"
                  }`}
                >
                  <span>{label}</span>
                  <span className="opacity-50">{count}</span>
                </button>
              ))}
            </nav>
          </section>

          <section>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B] mb-4">
              Vault Status
            </h3>
            <div className="space-y-3">
              {[
                ["#1B5E3F", `${documents.filter((doc) => doc.verified).length} Verified & Linked`],
                ["#C4A747", `${documents.filter((doc) => !doc.verified).length} Pending Analysis`],
                ["#B83A3A", `${documents.filter((doc) => doc.missing).length} Missing Metadata`],
              ].map(([color, label]) => (
                <div key={label} className="flex items-center space-x-2">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                  <span className="text-[11px] font-medium">{label}</span>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-auto">
            <div className="bg-[#F9F8F6] p-4 border border-[#E8E4DF]">
              <p className="text-[10px] font-bold uppercase text-[#1E3A5F] mb-1">
                Vault Storage
              </p>
              <div className="w-full bg-gray-200 h-1 mb-2">
                <div
                  className="bg-[#1E3A5F] h-1"
                  style={{ width: `${Math.min(100, Math.max(10, documents.length * 8))}%` }}
                />
              </div>
              <p className="text-[9px] text-[#6B6B6B]">{documents.length} document(s) in session</p>
            </div>
          </div>
        </aside>

        <main className="flex-1 bg-[#FDFCFB] p-10 overflow-y-auto flex flex-col gap-10">
          <header className="flex justify-between items-end">
            <div className="flex flex-col gap-1">
              <h1 className="font-serif text-4xl text-[#1E3A5F]">Evidence Library</h1>
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#6B6B6B]">
                Repository for Claim {resolved.structuredFacts.claimNumber || "#ADV-2047"}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={triggerFileInput}
                disabled={isRefreshing}
                className="px-4 py-2 border border-[#E8E4DF] bg-white text-[10px] font-bold uppercase tracking-widest hover:bg-gray-50"
              >
                Scan Folder
              </button>
              <button
                onClick={triggerFileInput}
                disabled={isRefreshing}
                className="px-4 py-2 bg-[#1E3A5F] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-[#1B5E3F] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isRefreshing ? "Refreshing Strategy..." : "Upload Documents"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.tiff,.txt,.md,.csv,.tsv,.json,.xml,.html,.htm,.log,.xlsx"
                onChange={handleFileChange}
              />
            </div>
          </header>

          {notice ? (
            <div className="border border-[#E8E4DF] bg-white px-4 py-3 text-[11px] font-medium">
              {notice}
            </div>
          ) : null}

          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={handleDrop}
            onClick={triggerFileInput}
            className="border-2 border-dashed border-[#E8E4DF] bg-[#F9F8F6] p-12 text-center rounded-sm hover:border-[#1E3A5F] transition-colors cursor-pointer"
          >
            <UploadCloud className="text-[#6B6B6B] mb-3 mx-auto h-8 w-8" />
            <p className="text-sm font-semibold">Drag and drop evidence files here</p>
            <p className="text-[11px] text-[#6B6B6B] mt-1 uppercase tracking-wider">
              Supports PDF, images, text, CSV, JSON, and office exports
            </p>
          </div>

          <section>
            <div className="flex items-center justify-between mb-6 pb-2 border-b border-[#E8E4DF]">
              <h2 className="text-[11px] font-bold uppercase tracking-widest text-[#1E3A5F]">
                Recent Uploads
              </h2>
              <div className="flex items-center gap-4 text-[11px] font-medium text-[#6B6B6B]">
                <span className="flex items-center gap-1">
                  <ArrowDownWideNarrow className="h-4 w-4" />
                  Date
                </span>
                <span className="flex items-center gap-1">
                  <LayoutGrid className="h-4 w-4" />
                  Grid
                </span>
              </div>
            </div>

            {filteredDocuments.length ? (
              <div className="doc-grid">
                {filteredDocuments.map((doc) => {
                  // Bug fix: Extracted selected variable calculation to avoid closure issues
                  const selected = doc.id === selectedDocument?.id;
                  return (
                    <button
                      key={doc.id}
                      onClick={() => setSelectedDocId(doc.id)}
                    className={`text-left ${
                      selected
                        ? "border-2 border-[#C4A747] ring-2 ring-[#C4A747] ring-offset-2"
                        : "border border-[#E8E4DF]"
                    } min-w-0 bg-white p-3 flex flex-col gap-3 hover:border-[#1E3A5F] group cursor-pointer`}
                  >
                    <div
                      className={`aspect-[3/4] ${
                        selected ? "bg-[#F9F8F6]" : "bg-[#F3F3F3]"
                      } overflow-hidden border border-gray-100 relative p-3`}
                    >
                      <div className="flex h-full w-full flex-col rounded-sm border border-[#E8E4DF] bg-white p-2 text-left shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-[8px] font-bold uppercase tracking-widest text-[#6B6B6B]">
                            {fileExtension(doc.name)}
                          </span>
                          <span className="text-[8px] font-bold uppercase tracking-widest text-[#C4A747]">
                            Preview
                          </span>
                        </div>
                        <p className="line-clamp-6 whitespace-pre-wrap break-words text-[8px] leading-relaxed text-[#4A4A4A]">
                          {buildDocumentPreview(doc)}
                        </p>
                      </div>
                      {doc.verified || selected ? (
                        <div className="absolute top-2 right-2 flex gap-1">
                          <div
                            className={`w-2 h-2 rounded-full ${
                              selected ? "bg-[#C4A747]" : "bg-[#1B5E3F]"
                            }`}
                          />
                        </div>
                      ) : null}
                    </div>
                    <div className="min-w-0 flex flex-col gap-1">
                      <p
                        className={`line-clamp-2 min-h-[2.8rem] break-all text-[11px] font-bold ${
                          selected ? "underline underline-offset-2" : ""
                        }`}
                      >
                        {doc.name}
                      </p>
                      <p className="break-words text-[9px] text-[#6B6B6B] uppercase">{doc.meta}</p>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase bg-[#EEF4EC] text-[#1B5E3F]">
                        {Math.round(doc.relevanceScore * 100)}% match
                      </span>
                      <span className="px-1.5 py-0.5 text-[8px] font-bold uppercase bg-[#F3F3F3] text-[#1E3A5F]">
                        {doc.category}
                      </span>
                      <span
                        className={`px-1.5 py-0.5 text-[8px] font-bold uppercase ${
                          doc.verified
                            ? "bg-[#E8F5E9] text-[#1B5E3F]"
                            : "bg-[#FFF8E1] text-[#C4A747]"
                        }`}
                      >
                        {doc.verified ? "Linked" : "Pending"}
                      </span>
                    </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="border border-dashed border-[#E8E4DF] bg-white p-8 text-center">
                <p className="text-sm font-semibold">No documents match this filter.</p>
                <p className="mt-2 text-[11px] text-[#6B6B6B]">
                  Upload a new file or switch filters to inspect the current evidence vault.
                </p>
              </div>
            )}
          </section>
        </main>

        <aside className="w-[400px] border-l border-[#E8E4DF] bg-white flex flex-col overflow-hidden">
          <div className="p-6 border-b border-[#E8E4DF] bg-[#F9F8F6] flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#C4A747]">
              Document Insight
            </span>
            <h3 className="min-w-0 font-serif text-lg break-all">
              {selectedDocument?.name || "No document selected"}
            </h3>
          </div>

          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-8">
            <section className="bg-[#F9F8F6] border border-[#E8E4DF] p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[10px] font-bold uppercase tracking-widest">
                  Relevance Score
                </span>
                <span className="text-xl font-serif font-bold text-[#1B5E3F]">
                  {Math.round((selectedDocument?.relevanceScore || 0) * 100)}%
                </span>
              </div>
              <div className="h-1.5 w-full bg-gray-200 rounded-full mb-4">
                <div
                  className="h-1.5 bg-[#1B5E3F] rounded-full"
                  style={{ width: `${Math.round((selectedDocument?.relevanceScore || 0) * 100)}%` }}
                />
              </div>
              <div className="mb-4 flex flex-wrap gap-2">
                <span className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider border border-[#E8E4DF] bg-white text-[#1E3A5F]">
                  {selectedDocument?.scoreSource === "model_service" ? "Model score" : "Heuristic score"}
                </span>
                <span className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider border border-[#E8E4DF] bg-white text-[#6B6B6B]">
                  Confidence {Math.round((selectedDocument?.scoreConfidence || 0) * 100)}%
                </span>
              </div>
              <p className="text-[11px] text-[#6B6B6B] leading-relaxed">
                {selectedDocument?.scoreReasoning ||
                  selectedDocument?.snippet ||
                  "Select a document to inspect its extracted value."}
              </p>
            </section>

            <section className="bg-white border border-[#E8E4DF] p-5">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B]">
                  Inline Preview
                </span>
                {selectedDocument?.mimeType ? (
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[#1E3A5F]">
                    {selectedDocument.mimeType}
                  </span>
                ) : null}
              </div>

              {selectedDocument && canRenderInlinePreview(selectedDocument) ? (
                selectedDocument.mimeType === "application/pdf" ? (
                  <iframe
                    title={`${selectedDocument.name} preview`}
                    src={selectedDocument.previewUrl}
                    className="h-[360px] w-full border border-[#E8E4DF] bg-[#F9F8F6]"
                  />
                ) : selectedDocument.mimeType?.startsWith("image/") ? (
                  <img
                    src={selectedDocument.previewUrl}
                    alt={selectedDocument.name}
                    className="max-h-[360px] w-full border border-[#E8E4DF] bg-[#F9F8F6] object-contain"
                  />
                ) : (
                  <iframe
                    title={`${selectedDocument.name} preview`}
                    src={selectedDocument.previewUrl}
                    className="h-[360px] w-full border border-[#E8E4DF] bg-[#F9F8F6]"
                  />
                )
              ) : (
                <div className="border border-dashed border-[#E8E4DF] bg-[#F9F8F6] px-4 py-6 text-[11px] leading-relaxed text-[#6B6B6B]">
                  No inline preview is available for this file yet. Use the extracted text below to inspect the document contents.
                </div>
              )}
            </section>

            <section className="bg-white border border-[#E8E4DF] p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B]">
                  Ingestion Status
                </span>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#1E3A5F]">
                  {selectedDocument?.ingestionStatus?.replace("_", " ") || "session"}
                </span>
              </div>
              <div className="max-h-[260px] overflow-y-auto border border-[#E8E4DF] bg-[#F9F8F6] p-3">
                <p className="whitespace-pre-wrap break-words text-[11px] leading-relaxed text-[#4A4A4A]">
                  {selectedDocument?.extractedText
                    ? selectedDocument.extractedText.slice(0, 2200)
                    : selectedDocument?.snippet || "No extracted text is available for this file yet."}
                </p>
              </div>
              {selectedDocument?.ingestionWarnings?.length ? (
                <div className="mt-3 flex flex-col gap-1">
                  {selectedDocument.ingestionWarnings.map((warning) => (
                    <p key={warning} className="text-[10px] text-[#B83A3A]">
                      {warning}
                    </p>
                  ))}
                </div>
              ) : null}
            </section>

            <section>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B] mb-3 border-b border-[#E8E4DF] pb-2">
                Evidence Mapping
              </h4>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="mt-1 w-4 h-4 rounded-full bg-[#1B5E3F] flex-shrink-0 flex items-center justify-center">
                    <Check className="text-white h-[10px] w-[10px]" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className="text-[11px] font-bold">Strategy Link: Internal Appeal</p>
                    <p className="text-[10px] text-[#6B6B6B]">
                      {selectedDocument?.linked
                        ? "Mapped as active support for the current recommended branch."
                        : "Not linked yet. Use verify and link to attach it to the case strategy."}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section>
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-[#6B6B6B] mb-3 border-b border-[#E8E4DF] pb-2">
                Annotations
              </h4>
              <div className="space-y-3">
                <div className="p-3 bg-white border border-[#E8E4DF] rounded-sm">
                  <p className="break-words text-[10px] text-[#1E3A5F] leading-relaxed italic">
                    {selectedDocument
                      ? `"${selectedDocument.snippet}"`
                      : "No annotation available."}
                  </p>
                  <div className="flex justify-between mt-2">
                    <span className="text-[9px] font-bold uppercase opacity-40">
                      AI Suggestion
                    </span>
                    <button
                      onClick={applyHighlight}
                      className="text-[9px] font-bold text-[#C4A747] uppercase cursor-pointer hover:underline"
                    >
                      Apply Highlight
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="p-6 border-t border-[#E8E4DF] bg-white flex flex-col gap-3">
            <button
              onClick={verifySelectedDocument}
              disabled={!selectedDocument || isRefreshing}
              className="w-full bg-[#1E3A5F] text-white py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-[#1B5E3F] transition-all disabled:opacity-50"
            >
              Verify and Link Document
            </button>
            <button
              onClick={removeSelectedDocument}
              disabled={!selectedDocument || isRefreshing}
              className="w-full border border-[#B83A3A] text-[#B83A3A] py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-[#B83A3A] hover:text-white transition-all disabled:opacity-50"
            >
              Remove from Vault
            </button>
          </div>
        </aside>
      </div>
    </div>
  );
}
