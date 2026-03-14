"use client";

import { useRef } from "react";
import { Upload, ClipboardPaste } from "lucide-react";

interface UploadZoneProps {
  onUpload: (text: string) => void;
  isLoading?: boolean;
}

export function UploadZone({ onUpload, isLoading }: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        onUpload(text);
      };
      reader.readAsText(file);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        onUpload(text);
      };
      reader.readAsText(file);
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      onUpload(text);
    } catch (error) {
      console.error("Failed to read clipboard:", error);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="border-2 border-dashed border-slate-700 rounded-lg p-8 text-center cursor-pointer hover:border-blue-500 hover:bg-slate-800/30 transition-colors"
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".txt,.pdf"
        onChange={handleFileSelect}
        className="hidden"
      />

      <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />

      <h3 className="text-lg font-semibold text-slate-100 mb-2">
        Drag and drop your file
      </h3>
      <p className="text-slate-400 mb-6">or click to select a file</p>

      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isLoading}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-700 rounded-lg font-medium transition-colors"
        >
          Select File
        </button>

        <button
          onClick={handlePaste}
          disabled={isLoading}
          className="px-6 py-2 flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-700 border border-slate-700 rounded-lg font-medium transition-colors"
        >
          <ClipboardPaste className="w-4 h-4" />
          Paste from Clipboard
        </button>
      </div>

      <p className="text-xs text-slate-500 mt-6">
        Supports .txt and .pdf files • Max 10MB
      </p>
    </div>
  );
}
