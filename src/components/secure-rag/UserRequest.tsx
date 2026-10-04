"use client";

import React, { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PlayIcon, BoltIcon, XIcon, SpinnerIcon } from "./icons";
import { triggerConfetti, triggerThreatAlertEffect } from "@/lib/effects/confetti";
import { uploadBackendFiles } from "@/lib/api/backendClient";
import { loadWorkspace, subscribeWorkspace, updateWorkspace } from "@/lib/workspace";

interface UserRequestProps {
  onRun: (prompt: string, options?: { securityLevel?: string; allowedTools?: string[] }) => void;
  disabled?: boolean;
}

const AVAILABLE_TOOLS = [
  { id: "read_file", label: "read_file", default: true },
  { id: "search_web", label: "search_web", default: true },
  { id: "send_email", label: "send_email", default: false },
  { id: "exec_code", label: "exec_code", default: false },
];

const UserRequest: React.FC<UserRequestProps> = ({ onRun, disabled }) => {
  const [prompt, setPrompt] = useState("");
  const [securityLevel, setSecurityLevel] = useState<string>("strict");
  const [selectedTools, setSelectedTools] = useState<string[]>(
    AVAILABLE_TOOLS.filter((t) => t.default).map((t) => t.id)
  );
  const [showAdvancedInputOptions, setShowAdvancedInputOptions] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [attachments, setAttachments] = useState<{ name: string; size: string }[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    let active = true;
    loadWorkspace().then((workspace) => {
      if (active && !prompt) setPrompt(workspace.prompt);
    }).catch(() => undefined);
    const unsubscribe = subscribeWorkspace((workspace) => {
      setPrompt(workspace.prompt);
    });
    return () => {
      active = false;
      unsubscribe();
    };
  }, []);

  // Live vulnerability analysis of user input
  const threatAnalysis = useMemo(() => {
    const text = prompt.toLowerCase();
    if (!text.trim()) return { level: "empty", score: 0, label: "Empty Prompt", color: "#6B6B6B" };

    const attackTriggers = [
      "ignore", "previous", "system prompt", "override", "admin", "token",
      "exfil", "send_email", "developer mode", "#0000", "swgnb3jl", "exec", "eval"
    ];

    const matchCount = attackTriggers.filter((trigger) => text.includes(trigger)).length;

    if (matchCount >= 2 || text.includes("ignore all") || text.includes("[system]") || text.includes("external-collector")) {
      return { level: "high", score: 95, label: "High Threat Injection Detected", color: "#EF4444" };
    } else if (matchCount === 1) {
      return { level: "medium", score: 55, label: "Suspicious Pattern Detected", color: "#F87171" };
    }
    return { level: "low", score: 10, label: "Safe / Low Risk Query", color: "#EF4444" };
  }, [prompt]);

  const toggleTool = (id: string) => {
    setSelectedTools((prev) =>
      prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]
    );
  };

  const toggleVoiceInput = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }
    setIsListening(true);

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setPrompt((prev) => (prev ? `${prev} ${transcript}` : transcript));
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => setIsListening(false);
      recognition.start();
    } else {
      setTimeout(() => {
        setIsListening(false);
      }, 1400);
    }
  };

  const processUploadedFiles = async (files: File[]) => {
    if (!files.length) return;

    const newAttachments = files.map((f) => ({
      name: f.name,
      size: (f.size / 1024).toFixed(1) + " KB",
    }));

    setAttachments((prev) => [...prev, ...newAttachments]);

    const fileNames = files.map((f) => f.name).join(", ");
    setPrompt((prev) => (prev ? `${prev}\n\n[Attached Artifact Context: ${fileNames}]` : `[Attached Artifact Context: ${fileNames}]`));

    // Async upload to backend sandbox
    await uploadBackendFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    processUploadedFiles(files);
  };

  // Drag and drop handlers for input
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files = Array.from(e.dataTransfer.files || []);
    processUploadedFiles(files);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const submit = () => {
    if (!prompt.trim() || disabled) return;
    
    // Trigger visual confetti / particle library effect depending on threat analysis
    if (threatAnalysis.level === "high") {
      triggerThreatAlertEffect();
    } else {
      triggerConfetti({ particleCount: 40, spread: 60 });
    }

    onRun(prompt.trim(), {
      securityLevel,
      allowedTools: selectedTools,
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      submit();
    }
  };

  const clear = () => setPrompt("");

  const copyPrompt = () => {
    if (!prompt) return;
    navigator.clipboard.writeText(prompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const cleanPrompt = () => {
    setPrompt((prev) => prev.replace(/\s+/g, " ").trim());
  };

  const enhancePrompt = () => {
    if (!prompt.trim()) return;
    setPrompt(
      `[TASK DEFINITION]\nGoal: ${prompt.trim()}\nScope: Restrict access strictly to designated data sources. Do not execute unauthorized tools.`
    );
  };

  return (
    <section className="card card-pad hover-lift h-full flex flex-col justify-between">
      <div>
        {/* Header Title */}
        <div className="mb-4">
          <h2 className="section-title">Agent Task Input</h2>
        </div>

        {/* Textarea Input Container with Drag and Drop Support */}
        <div
          className={`relative rounded-xl transition-all ${
            isDraggingOver ? "ring-2 ring-accent-blue bg-accent-blue/10" : ""
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {/* Drag & Drop Visual Target Overlay */}
          {isDraggingOver && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-accent-blue bg-ink-900/90 backdrop-blur-sm p-4 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent-blue/20 text-accent-blue mb-2 animate-bounce">
                File
              </div>
              <p className="text-sm font-bold text-white">Drop files here to attach</p>
              <p className="text-xs text-slate-400 mt-1">Files will be attached to your agent prompt context</p>
            </div>
          )}

          <textarea
            className="input-base min-h-[140px] resize-y pr-12 font-mono text-[13px] leading-relaxed"
            placeholder="Type your instruction or drag and drop documents or datasets into this box..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onBlur={() => {
              void updateWorkspace({ prompt });
            }}
            onKeyDown={onKeyDown}
            disabled={disabled}
            spellCheck={false}
          />
          <div className="pointer-events-none absolute right-3 top-3 text-accent-blue/60">
            <BoltIcon size={16} />
          </div>

          {/* Real-time stats & word count */}
          <div className="pointer-events-none absolute bottom-2.5 right-3 flex items-center gap-3 font-mono text-[10.5px] text-slate-500">
            <span>{prompt.trim().split(/\s+/).filter(Boolean).length} words</span>
              <span>-</span>
            <span>{prompt.length} chars</span>
          </div>
        </div>

        {/* Drag & Drop Hint */}
        <div className="mt-1.5 flex items-center justify-between text-[11px] text-slate-400">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-accent-blue" />
            Drag &amp; drop files anywhere into the input box to attach context
          </span>
        </div>

        {/* Attached Files List Pills */}
        {attachments.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-2">
            {attachments.map((file, idx) => (
              <span
                key={idx}
                className="chip border border-accent-blue/40 bg-accent-blue/15 text-accent-blue font-mono text-[11px] font-bold"
              >
                File: {file.name} ({file.size})
                <button
                  type="button"
                  onClick={() => removeAttachment(idx)}
                  className="ml-1.5 text-slate-400 hover:text-status-block font-bold"
                >
                  Remove
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Input Helper Toolbar */}
        <div className="mt-3 space-y-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={toggleVoiceInput}
              disabled={disabled}
              className={`rounded border px-2.5 py-1 font-semibold transition-all ${
                isListening
                  ? "border-status-block bg-status-block/20 text-status-block animate-pulse"
                  : "border-accent-blue/40 bg-accent-blue/10 text-accent-blue hover:bg-accent-blue/20"
              }`}
              title="Dictate prompt via Voice Input"
            >
              {isListening ? "Listening..." : "Voice Input"}
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="rounded border border-accent-blue/40 bg-accent-blue/10 px-2.5 py-1 font-semibold text-accent-blue hover:bg-accent-blue/20 transition-all"
              title="Attach document or dataset for security audit"
            >
              Attach File
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              className="hidden"
            />

            <button
              type="button"
              onClick={cleanPrompt}
              disabled={!prompt.trim()}
              className="rounded border border-ink-600 bg-ink-850 px-2 py-1 text-slate-400 hover:text-white hover:border-slate-500"
              title="Clean extra whitespace"
            >
              Format Clean
            </button>
            <button
              type="button"
              onClick={enhancePrompt}
              disabled={!prompt.trim()}
              className="rounded border border-ink-600 bg-ink-850 px-2 py-1 text-slate-400 hover:text-white hover:border-slate-500"
              title="Wrap prompt into structured enterprise context"
            >
              Structure Context
            </button>
            <button
              type="button"
              onClick={copyPrompt}
              disabled={!prompt.trim()}
              className="rounded border border-ink-600 bg-ink-850 px-2 py-1 text-slate-400 hover:text-white hover:border-slate-500"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>

          {/* Toggle Advanced Input Options */}
          <button
            type="button"
            onClick={() => setShowAdvancedInputOptions(!showAdvancedInputOptions)}
            className="text-accent-blue hover:underline font-medium"
          >
            {showAdvancedInputOptions ? "Hide Configuration Options" : "Advanced Security and Tool Options"}
          </button>
        </div>

        {/* Expandable Advanced Input Options */}
        <AnimatePresence>
          {showAdvancedInputOptions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mt-3 rounded-xl border border-ink-600 bg-ink-850 p-3.5 space-y-3"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Security Level Radio Selector */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Firewall Defense Level
                  </label>
                  <div className="flex gap-2">
                    {[
                      { id: "strict", label: "Strict (Recommended)" },
                      { id: "standard", label: "Standard" },
                      { id: "permissive", label: "Audit Only" },
                    ].map((lvl) => (
                      <button
                        key={lvl.id}
                        type="button"
                        onClick={() => setSecurityLevel(lvl.id)}
                        className={`flex-1 rounded-lg border py-1.5 text-xs font-semibold transition-all ${
                          securityLevel === lvl.id
                            ? "border-accent-blue bg-accent-blue/15 text-accent-blue"
                            : "border-ink-600 bg-ink-900 text-slate-400 hover:text-white"
                        }`}
                      >
                        {lvl.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Allowed Tools Checkboxes */}
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                    Authorized Agent Tool Capabilities
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {AVAILABLE_TOOLS.map((t) => (
                      <label
                        key={t.id}
                        className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-mono cursor-pointer transition-all ${
                          selectedTools.includes(t.id)
                            ? "border-status-allow/50 bg-status-allow/10 text-status-allow"
                            : "border-ink-600 bg-ink-900 text-slate-500"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedTools.includes(t.id)}
                          onChange={() => toggleTool(t.id)}
                          className="rounded border-ink-600 text-accent-blue focus:ring-0"
                        />
                        {t.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Main Action Buttons Bar */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-t border-ink-600 pt-3.5">
        <button
          type="button"
          onClick={clear}
          disabled={disabled || !prompt}
          className="btn-ghost btn border border-ink-600 bg-ink-800 text-slate-300 hover:border-accent-blue/40 hover:text-white"
        >
          <XIcon size={15} />
          Clear Input
        </button>

        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-slate-500 md:inline font-mono">
            Press <kbd className="rounded border border-ink-600 bg-ink-850 px-1 py-0.5 text-[10px]">Ctrl+Enter</kbd>
          </span>

          <button
            type="button"
            className="btn btn-primary text-base px-6 shadow-glow"
            onClick={submit}
            disabled={disabled || !prompt.trim()}
          >
            {disabled ? (
              <>
                <SpinnerIcon size={16} />
                Executing Pipeline...
              </>
            ) : (
              <>
                <PlayIcon size={16} />
                Run Secure Agent Task
              </>
            )}
          </button>
        </div>
      </div>
    </section>
  );
};

export default UserRequest;
