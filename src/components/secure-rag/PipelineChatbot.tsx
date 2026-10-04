"use client";

import React from "react";

interface PipelineChatbotProps {
  answer: string | null;
  error?: string;
}

const PipelineChatbot: React.FC<PipelineChatbotProps> = ({ answer, error }) => {
  if (!answer && !error) return null;

  return (
    <section className="card card-pad lg:col-span-12">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="section-title">Secure RAG Chatbot</h2>
        <span className="chip border border-accent-blue/30 bg-accent-blue/10 text-[10px] font-bold uppercase tracking-wider text-accent-blue">
          Pipeline-gated
        </span>
      </div>
      <p className="mb-3 text-xs text-slate-400">
        Claude receives only the sanitized document context after PromptWall security checks pass.
      </p>
      <div className="surface-sunken rounded-xl border border-ink-600 p-4 text-sm leading-relaxed text-slate-100 whitespace-pre-wrap">
        {answer || error}
      </div>
    </section>
  );
};

export default PipelineChatbot;
