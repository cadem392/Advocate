"use client";

import { useEffect, useState } from "react";
import { Loader } from "lucide-react";

interface AnalysisStreamProps {
  isAnalyzing: boolean;
  messages?: string[];
}

export function AnalysisStream({ isAnalyzing, messages = [] }: AnalysisStreamProps) {
  const [displayedMessages, setDisplayedMessages] = useState<string[]>([]);

  useEffect(() => {
    if (messages.length > displayedMessages.length) {
      setDisplayedMessages(messages);
    }
  }, [messages, displayedMessages.length]);

  if (!isAnalyzing && displayedMessages.length === 0) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 max-w-md w-full mx-4">
        <div className="flex items-center justify-center mb-6">
          <div className="w-12 h-12 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin" />
        </div>

        <h2 className="text-xl font-semibold text-slate-100 text-center mb-6">
          Analyzing Your Bill
        </h2>

        <div className="space-y-3 mb-8">
          {displayedMessages.length === 0 ? (
            <>
              <StreamingMessage text="Scanning for billing errors..." delay={0} />
              <StreamingMessage
                text="Identifying appeal grounds..."
                delay={1}
              />
              <StreamingMessage text="Extracting deadlines..." delay={2} />
              <StreamingMessage text="Building attack tree..." delay={3} />
            </>
          ) : (
            displayedMessages.map((msg, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg animate-fadeInUp"
              >
                <span className="text-green-400 font-bold flex-shrink-0">✓</span>
                <p className="text-slate-300 text-sm">{msg}</p>
              </div>
            ))
          )}
        </div>

        <div className="text-center text-sm text-slate-500">
          <p>This should take about 30-60 seconds...</p>
        </div>
      </div>
    </div>
  );
}

function StreamingMessage({ text, delay }: { text: string; delay: number }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShow(true), delay * 800);
    return () => clearTimeout(timer);
  }, [delay]);

  if (!show) return null;

  return (
    <div className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg animate-fadeInUp">
      <Loader className="w-4 h-4 text-blue-400 flex-shrink-0 animate-spin" />
      <p className="text-slate-300 text-sm">{text}</p>
    </div>
  );
}
