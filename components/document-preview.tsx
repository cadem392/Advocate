"use client";

import { Copy, Download } from "lucide-react";
import { useState } from "react";

interface DocumentPreviewProps {
  title?: string;
  content?: string;
  keyPoints?: string[];
  isLoading?: boolean;
}

export function DocumentPreview({
  title = "Document",
  content = "",
  keyPoints = [],
  isLoading = false,
}: DocumentPreviewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (content) {
      navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([content], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `${title.toLowerCase().replace(/\s+/g, "-")}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="flex flex-col h-full bg-slate-900/50 border border-slate-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800">
        <div>
          <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
          {keyPoints.length > 0 && (
            <div className="flex gap-2 flex-wrap mt-2">
              {keyPoints.map((point, idx) => (
                <span
                  key={idx}
                  className="text-xs bg-blue-900/30 border border-blue-600/30 text-blue-300 px-2 py-1 rounded"
                >
                  {point}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            disabled={!content || isLoading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Copy to clipboard"
          >
            <Copy className="w-4 h-4 text-slate-300" />
          </button>
          <button
            onClick={handleDownload}
            disabled={!content || isLoading}
            className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Download"
          >
            <Download className="w-4 h-4 text-slate-300" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="inline-block mb-4">
                <div className="w-8 h-8 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
              </div>
              <p className="text-slate-400">Generating document...</p>
            </div>
          </div>
        ) : content ? (
          <div className="prose prose-invert max-w-none">
            <div className="text-slate-300 whitespace-pre-wrap leading-relaxed font-serif text-sm">
              {content}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-slate-500">
            <p>Click a document node in the attack tree to preview it here</p>
          </div>
        )}

        {copied && (
          <div className="fixed bottom-4 right-4 bg-green-900/90 border border-green-600 text-green-300 px-4 py-2 rounded-lg">
            Copied to clipboard!
          </div>
        )}
      </div>
    </div>
  );
}
