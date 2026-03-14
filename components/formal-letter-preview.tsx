import { AnalysisResult, StructuredFacts } from "@/lib/types";

interface FormalLetterPreviewProps {
  structuredFacts: StructuredFacts;
  analysis: AnalysisResult;
  title: string;
  content: string;
  generatedAt: string;
  compact?: boolean;
}

function splitDraftSections(content: string) {
  return content
    .split(/\n\s*\n/)
    .map((section) => section.trim())
    .filter(Boolean);
}

function extractBodySections(content: string, analysis: AnalysisResult) {
  const sections = splitDraftSections(content);
  const greetingIndex = sections.findIndex((section) => /^Dear\b/i.test(section));
  const closingIndex = sections.findIndex((section) => /^Sincerely\b/i.test(section));

  const start = greetingIndex >= 0 ? greetingIndex + 1 : 0;
  const end = closingIndex >= 0 ? closingIndex : sections.length;

  const body = sections
    .slice(start, end)
    .filter((section) => {
      return !/^\[YOUR NAME\]$/i.test(section) &&
        !/^\[YOUR ADDRESS\]$/i.test(section) &&
        !/^\[YOUR CONTACT INFORMATION\]$/i.test(section) &&
        !/^\[RECIPIENT ADDRESS\]$/i.test(section) &&
        !/^(RE:|Claim Number:|Policy Number:|Member:|Date of Service:|Denied Amount:)/i.test(section) &&
        !/Appeals Department/i.test(section) &&
        !/^[A-Z][a-z]+ \d{1,2}, \d{4}$/.test(section);
    });

  if (body.length) return body;

  return analysis.appealGrounds.map((ground, index) => {
    return `${index + 1}. ${ground.basis.replace(/_/g, " ").toUpperCase()}\n\n${ground.argument}`;
  });
}

function formatDisplayDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function FormalLetterPreview({
  structuredFacts,
  analysis,
  title,
  content,
  generatedAt,
  compact = false,
}: FormalLetterPreviewProps) {
  const bodySections = extractBodySections(content, analysis);
  const sectionTextClass = compact ? "text-[11px]" : "text-[12px]";
  const headingClass = compact ? "text-[11px]" : "text-[12px]";
  const bodyGapClass = compact ? "mb-4" : "mb-6";

  return (
    <div className="bg-white border border-[#E8E4DF] letter-shadow text-[#2C2C2C]">
      <div className={compact ? "p-10" : "p-16"}>
        <div className="mb-8 flex items-start justify-between">
          <div className={`${headingClass} uppercase tracking-tight text-[#8B8B8B] font-bold`}>
            Advocate ID: {structuredFacts.claimNumber || "ADV-2047"}
          </div>
          <div className={`${sectionTextClass} text-right`}>
            <p>Date: {formatDisplayDate(generatedAt)}</p>
          </div>
        </div>

        <div className={`${bodyGapClass} ${sectionTextClass} leading-relaxed`}>
          <p className="font-semibold">{structuredFacts.insurer || "Insurance Carrier"}</p>
          <p>Appeals Department / Medical Review</p>
          <p>[RECIPIENT ADDRESS]</p>
        </div>

        <div className={`border-b border-[#E8E4DF] pb-5 ${bodyGapClass}`}>
          <p className={`${headingClass} font-bold uppercase tracking-tight`}>RE: {title}</p>
          <p className={`${sectionTextClass} mt-3`}>Claim Number: {structuredFacts.claimNumber || "[CLAIM NUMBER]"}</p>
          <p className={sectionTextClass}>Policy Number: {structuredFacts.policyNumber || "[POLICY NUMBER]"}</p>
          <p className={sectionTextClass}>Member: {structuredFacts.patientName || "[MEMBER NAME]"}</p>
          <p className={sectionTextClass}>Date of Service: {structuredFacts.dateOfService || "[DATE OF SERVICE]"}</p>
          <p className={sectionTextClass}>Denied Amount: {analysis.deniedAmount}</p>
        </div>

        <div className={bodyGapClass}>
          <p className={sectionTextClass}>Dear Appeals Review Board:</p>
        </div>

        {bodySections.map((section, index) => {
          const isEnumerated = /^\d+\./.test(section);
          return (
            <div
              key={`${index}-${section.slice(0, 24)}`}
              className={`${bodyGapClass} ${isEnumerated ? "border-l-2 border-[#C4A747] pl-4" : ""}`}
            >
              <p className={`${sectionTextClass} whitespace-pre-wrap leading-relaxed`}>
                {section}
              </p>
            </div>
          );
        })}

        <div className={compact ? "mt-12" : "mt-20"}>
          <p className={sectionTextClass}>Sincerely,</p>
          <div className={compact ? "mb-2 h-12 w-32 border-b border-[#CFCFCF]" : "mb-2 h-16 w-40 border-b border-[#CFCFCF]"} />
          <p className={`${sectionTextClass} font-semibold`}>
            [YOUR NAME]
          </p>
          <p className={`${compact ? "text-[10px]" : "text-[11px]"} mt-1 text-[#7A7A7A]`}>
            On behalf of {structuredFacts.patientName || "the claimant"}
          </p>
        </div>
      </div>
    </div>
  );
}
