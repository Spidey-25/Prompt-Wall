"use client";

import React from "react";

interface PipelineChatbotProps {
  answer: string | null;
  error?: string;
}

const PipelineChatbot: React.FC<PipelineChatbotProps> = ({ answer, error }) => {
  if (!answer && !error) return null;

  return (
    <section className="card card-pad lg:col-span-12 border border-red-500/30 bg-black">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="section-title text-white">LLM Response</h2>
        <span className="chip border border-white/20 bg-white/5 text-[10px] font-bold uppercase tracking-wider text-slate-300">
          {error ? "Pipeline Notice" : "Pipeline Approved"}
        </span>
      </div>
      <div
        className={`rounded-xl border p-4 text-sm leading-relaxed whitespace-pre-wrap ${
          error
            ? "border-red-500/50 bg-red-950/30 text-red-100"
            : "border-white/15 bg-black text-white"
        }`}
      >
        {answer || error}
      </div>
    </section>
  );
};

export default PipelineChatbot;
