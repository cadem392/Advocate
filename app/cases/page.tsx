"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import { AdvocateNav } from "@/components/advocate-nav";
import { BrandLockup } from "@/components/brand-lockup";
import { useAuth } from "@/contexts/auth-context";
import { saveCaseSession } from "@/lib/client/case-session";
import type { CaseSessionState } from "@/lib/client/case-session";
import type { StoredCaseRecord } from "@/lib/types";

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export default function MyCasesPage() {
  const router = useRouter();
  const { configured, user, loading: authLoading, getIdToken } = useAuth();
  const [records, setRecords] = useState<StoredCaseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) {
      // Auth-backed case history is unavailable in local demo mode.
      setLoading(false);
      setError("Authentication is not configured in this environment.");
      return;
    }
    if (!user) {
      router.replace("/auth?redirect=/cases");
      return;
    }
    let cancelled = false;
    async function fetchCases() {
      const token = await getIdToken();
      if (!token) return;
      try {
        const res = await fetch("/api/cases", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          throw new Error(res.status === 401 ? "Please sign in again." : "Failed to load cases.");
        }
        const data = (await res.json()) as StoredCaseRecord[];
        if (!cancelled) setRecords(Array.isArray(data) ? data : []);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load cases");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchCases();
    return () => {
      cancelled = true;
    };
  }, [configured, user, getIdToken, router]);

  async function openCase(record: StoredCaseRecord) {
    const state: CaseSessionState = {
      ...record.payload,
      caseRecordId: record.id,
    };
    saveCaseSession(state);
    router.push("/workspace");
  }

  if (configured && (authLoading || !user)) {
    return (
      <div className="min-h-screen bg-[#FDFCFB] flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#1E3A5F]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1E3A5F] flex flex-col">
      <AdvocateNav
        activeItem="cases"
        homeHref="/"
        intakeHref="/"
        workspaceHref="/workspace"
        methodologyHref="/#methodology"
        evidenceHref="/evidence"
        supportHref="/status"
        exportHref="/confirmation"
        exportLabel="Export Case Packet"
      />

      <main className="flex-1 max-w-[1000px] mx-auto w-full px-8 py-12">
        <h1 className="font-serif text-4xl text-[#1E3A5F] mb-2">My Cases</h1>
        <p className="text-[11px] font-bold uppercase tracking-widest text-[#6B6B6B] mb-8">
          Your saved cases and attack trees
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-[#1E3A5F]" />
          </div>
        ) : error ? (
          <p className="text-[11px] font-medium text-[#B83A3A] py-8">{error}</p>
        ) : records.length === 0 ? (
          <div className="border border-[#E8E4DF] bg-white p-12 text-center">
            <FileText className="h-12 w-12 text-[#6B6B6B] mx-auto mb-4" />
            <p className="text-[#6B6B6B] mb-2">No cases yet</p>
            <p className="text-[11px] text-[#6B6B6B] mb-6">
              Generate a case strategy from the Intake page to see it here.
            </p>
            <Link
              href="/"
              className="inline-block bg-[#1E3A5F] text-white px-6 py-3 text-[11px] font-bold tracking-widest uppercase hover:bg-[#1B5E3F]"
            >
              Go to Intake
            </Link>
          </div>
        ) : (
          <ul className="space-y-4">
            {records.map((record) => {
              const payload = record.payload;
              const title =
                payload?.structuredFacts?.claimNumber ||
                payload?.analysis?.summary?.slice(0, 50) ||
                `Case ${record.id.slice(0, 8)}`;
              const subtitle = payload?.structuredFacts?.insurer
                ? `${payload.structuredFacts.insurer} · ${payload.analysis?.deniedAmount ?? ""}`
                : formatDate(record.updatedAt);
              return (
                <li key={record.id}>
                  <button
                    type="button"
                    onClick={() => openCase(record)}
                    className="w-full text-left border border-[#E8E4DF] bg-white p-6 hover:bg-[#F9F8F6] hover:border-[#1E3A5F]/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-serif text-xl text-[#1E3A5F] truncate">
                          {title}
                        </p>
                        <p className="text-[11px] text-[#6B6B6B] mt-1">
                          {subtitle}
                        </p>
                        <p className="text-[10px] text-[#6B6B6B] mt-2">
                          Updated {formatDate(record.updatedAt)}
                        </p>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-[#1E3A5F] shrink-0">
                        Open →
                      </span>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
