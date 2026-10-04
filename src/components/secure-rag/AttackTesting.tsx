"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type {
  AttackCategory,
  AttackDef,
  AttackResult,
  AttackRunResult,
} from "@/types";
import {
  ATTACK_CATEGORIES,
  ATTACK_LIBRARY,
  attacksForCategory,
} from "@/lib/secure-rag/mockData";
import {
  FlaskIcon,
  CheckIcon,
  XIcon,
  SpinnerIcon,
} from "./icons";
import { triggerConfetti, triggerThreatAlertEffect } from "@/lib/effects/confetti";

interface AttackTestingProps {
  result: AttackRunResult | null;
  running: boolean;
  onRun: (attack: AttackDef) => void;
}

const RESULT_META: Record<
  AttackResult,
  { label: string; color: string; icon: React.FC<{ size?: number }> }
> = {
  BLOCKED: { label: "SAFE — BLOCKED BY FIREWALL", color: "#22C55E", icon: CheckIcon },
  BYPASSED: { label: "CRITICAL — BYPASSED GUARD", color: "#EF4444", icon: XIcon },
  PENDING: { label: "ANALYZING ATTACK VECTOR…", color: "#A1A1A1", icon: SpinnerIcon },
};

const AttackTesting: React.FC<AttackTestingProps> = ({
  result,
  running,
  onRun,
}) => {
  const [category, setCategory] = useState<AttackCategory>(ATTACK_CATEGORIES[0]);
  const [attackId, setAttackId] = useState<string>(
    attacksForCategory(ATTACK_CATEGORIES[0])[0].id
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [customPayload, setCustomPayload] = useState<string | null>(null);
  const [isEditingPayload, setIsEditingPayload] = useState(false);

  const attacks = useMemo(() => {
    let list = attacksForCategory(category);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (a) => a.label.toLowerCase().includes(q) || a.payload.toLowerCase().includes(q)
      );
    }
    return list;
  }, [category, searchQuery]);

  const selectedAttack = useMemo(
    () => ATTACK_LIBRARY.find((a) => a.id === attackId) ?? attacks[0] ?? ATTACK_LIBRARY[0],
    [attackId, attacks]
  );

  const currentPayload = customPayload !== null ? customPayload : (selectedAttack?.payload ?? "");

  const onChangeCategory = (cat: AttackCategory) => {
    setCategory(cat);
    const first = attacksForCategory(cat)[0];
    if (first) {
      setAttackId(first.id);
      setCustomPayload(null);
    }
  };

  const handleSelectAttack = (id: string) => {
    setAttackId(id);
    setCustomPayload(null);
  };

  const handleRunAttack = (def: AttackDef) => {
    const finalDef: AttackDef = {
      ...def,
      payload: currentPayload,
    };

    // Trigger visual confetti / particle effect when attack resolves
    if (result?.result === "BLOCKED") {
      triggerConfetti({ particleCount: 50, spread: 70 });
    } else if (result?.result === "BYPASSED") {
      triggerThreatAlertEffect();
    }

    onRun(finalDef);
  };

  const meta = result ? RESULT_META[result.result] : null;
  const ResultIcon = meta?.icon;

  return (
    <section className="card card-pad h-full flex flex-col justify-between">
      <div>
        {/* Header Title */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="section-title">Adversarial Attack Simulation &amp; Testing</h2>
            <p className="mt-1 text-[13px] text-slate-400">
              Select or customize a prompt injection vector to benchmark PromptWall firewall resilience.
            </p>
          </div>

          <span className="rounded-full border border-accent-purple/30 bg-accent-purple/10 px-3 py-1 text-xs font-bold text-accent-purple">
            {ATTACK_LIBRARY.length} Pre-built Attack Vectors
          </span>
        </div>

        {/* Input Options Grid: Category Select + Attack Select + Search Filter */}
        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              1. Attack Category
            </label>
            <select
              className="input-base"
              value={category}
              onChange={(e) => onChangeCategory(e.target.value as AttackCategory)}
              disabled={running}
            >
              {ATTACK_CATEGORIES.map((c) => (
                <option key={c} value={c} className="bg-ink-900 text-white">
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              2. Attack Vector
            </label>
            <select
              className="input-base"
              value={attackId}
              onChange={(e) => handleSelectAttack(e.target.value)}
              disabled={running}
            >
              {attacks.map((a) => (
                <option key={a.id} value={a.id} className="bg-ink-900 text-white">
                  {a.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
              3. Filter Vector Search
            </label>
            <input
              type="text"
              className="input-base"
              placeholder="Search by keyword…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              disabled={running}
            />
          </div>
        </div>

        {/* Payload Preview & Interactive Input Editor */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
              Payload Content &amp; Input Customization
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsEditingPayload(!isEditingPayload)}
                className="text-xs text-accent-blue hover:underline font-medium"
              >
                {isEditingPayload ? "✓ Done Editing" : "✏️ Customize Payload"}
              </button>
              {customPayload !== null && (
                <button
                  type="button"
                  onClick={() => setCustomPayload(null)}
                  className="text-xs text-slate-400 hover:text-white underline"
                >
                  Reset Default
                </button>
              )}
            </div>
          </div>

          {isEditingPayload ? (
            <textarea
              className="input-base min-h-[100px] font-mono text-[12.5px] leading-relaxed text-amber-300 border-amber-500/40"
              value={currentPayload}
              onChange={(e) => setCustomPayload(e.target.value)}
              placeholder="Enter custom attack vector payload string…"
            />
          ) : (
            <pre className="surface-sunken max-h-36 overflow-auto p-3.5 font-mono text-[12.5px] leading-relaxed text-slate-200 border-ink-600">
              {currentPayload}
            </pre>
          )}
        </div>
      </div>

      {/* Action Controls & Real-time Test Output */}
      <div className="mt-5 border-t border-ink-600 pt-3.5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          className="btn btn-primary px-6 text-base"
          onClick={() => selectedAttack && handleRunAttack(selectedAttack)}
          disabled={running || !selectedAttack}
        >
          {running ? <SpinnerIcon size={16} /> : <FlaskIcon size={16} />}
          {running ? "Simulating Attack Vector…" : "Execute Security Test"}
        </button>

        {/* Test Result Indicator */}
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            Firewall Result:
          </span>
          {meta && ResultIcon ? (
            <div
              className="chip border px-3 py-1 font-bold text-xs"
              style={{
                color: meta.color,
                borderColor: `${meta.color}60`,
                background: `${meta.color}15`,
                boxShadow: `var(--shadow-3d-sm), 0 0 12px -2px ${meta.color}40`,
              }}
            >
              <ResultIcon size={14} />
              {meta.label}
            </div>
          ) : (
            <span className="chip border border-ink-600 bg-ink-850 text-slate-500 font-mono text-xs">
              Awaiting Test Trigger
            </span>
          )}
        </div>
      </div>

      {result?.detail && (
        <AnimatePresence>
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="surface-sunken mt-3 p-3.5 text-[12.5px] text-slate-300 border-l-4 border-l-accent-blue"
          >
            <div className="font-bold text-slate-200 mb-1">Diagnostic Log Output:</div>
            {result.detail}
          </motion.div>
        </AnimatePresence>
      )}
    </section>
  );
};

export default AttackTesting;
