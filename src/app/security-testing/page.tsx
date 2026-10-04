"use client";

import React, { useCallback, useState } from "react";
import type { AttackCategory, AttackDef, AttackRunResult } from "@/types";
import PageShell from "@/components/secure-rag/PageShell";
import Reveal from "@/components/secure-rag/Reveal";
import { CheckIcon, XIcon, FlaskIcon } from "@/components/secure-rag/icons";
import {
  ATTACK_CATEGORIES,
  ATTACK_LIBRARY,
  attacksForCategory,
} from "@/lib/secure-rag/mockData";
import { triggerConfetti, triggerThreatAlertEffect } from "@/lib/effects/confetti";

/**
 * Security Testing Page — Red-team adversarial simulation suite.
 * Run attack vectors against PromptWall protection layers to evaluate firewall resilience.
 */
export default function SecurityTestingPage() {
  const [category, setCategory] = useState<AttackCategory>(ATTACK_CATEGORIES[0]);
  const [attackId, setAttackId] = useState(
    attacksForCategory(ATTACK_CATEGORIES[0])[0].id
  );
  const [customPayload, setCustomPayload] = useState<string | null>(null);
  const [isEditingPayload, setIsEditingPayload] = useState(false);
  const [result, setResult] = useState<AttackRunResult | null>(null);
  const [running, setRunning] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  const attacks = attacksForCategory(category).filter((a) =>
    searchFilter.trim()
      ? a.label.toLowerCase().includes(searchFilter.toLowerCase()) ||
        a.payload.toLowerCase().includes(searchFilter.toLowerCase())
      : true
  );

  const selectedAttack =
    ATTACK_LIBRARY.find((a) => a.id === attackId) ?? attacks[0] ?? ATTACK_LIBRARY[0];

  const currentPayload = customPayload !== null ? customPayload : (selectedAttack?.payload ?? "");

  const onChangeCategory = (cat: AttackCategory) => {
    setCategory(cat);
    const first = attacksForCategory(cat)[0];
    if (first) {
      setAttackId(first.id);
    }
    setCustomPayload(null);
    setResult(null);
  };

  const handleRun = useCallback(async (attack: AttackDef) => {
    setRunning(true);
    setResult(null);
    await new Promise((r) => setTimeout(r, 1200));

    const bypassed = attack.id === "ms-02" && customPayload === null;
    const r: AttackRunResult = bypassed
      ? {
          attackId: attack.id,
          result: "BYPASSED",
          detail:
            "Translation-based exfiltration bypassed initial naive keyword inspection. Layer tuning recommended for multi-stage translation chains.",
        }
      : {
          attackId: attack.id,
          result: "BLOCKED",
          detail: `Neutralized and blocked by ${
            attack.category === "Plain Injection" ||
            attack.category === "Fake System Message"
              ? "Content Firewall"
              : attack.category === "Encoded Injection"
              ? "Content Firewall (Obfuscation Decoder)"
              : "Action Guard Policy Engine"
          }.`,
        };

    if (r.result === "BLOCKED") {
      triggerConfetti({ particleCount: 60, spread: 80 });
    } else {
      triggerThreatAlertEffect();
    }

    setResult(r);
    setRunning(false);
  }, [customPayload]);

  return (
    <PageShell>
      <div className="grid w-full grid-cols-1 gap-5 lg:grid-cols-12">
        {/* Attack selector + Run */}
        <Reveal className="lg:col-span-7" delay={0}>
          <section className="card card-pad h-full flex flex-col justify-between">
            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h1 className="text-2xl font-extrabold tracking-tight text-white md:text-3xl">
                    Adversarial Red-Team Suite
                  </h1>
                  <p className="mt-1 text-xs text-slate-400">
                    Benchmark PromptWall defenses against zero-day prompt injections and exfiltration payloads.
                  </p>
                </div>
                <span className="chip border border-accent-blue/40 bg-accent-blue/10 text-accent-blue font-bold text-xs">
                  <FlaskIcon size={14} />
                  Red-Team Sandbox Active
                </span>
              </div>

              {/* Input Selectors */}
              <div className="grid gap-3 md:grid-cols-3">
                <div>
                  <label className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Attack Category
                  </label>
                  <select
                    className="input-base text-xs font-semibold"
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
                    Attack Vector
                  </label>
                  <select
                    className="input-base text-xs font-semibold"
                    value={attackId}
                    onChange={(e) => {
                      setAttackId(e.target.value);
                      setCustomPayload(null);
                    }}
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
                    Search Payload Filter
                  </label>
                  <input
                    type="text"
                    className="input-base text-xs"
                    placeholder="Filter vector names…"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    disabled={running}
                  />
                </div>
              </div>

              {/* Payload Preview & Editor */}
              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Attack Vector Payload Content
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingPayload(!isEditingPayload)}
                      className="text-xs text-accent-blue hover:underline font-semibold"
                    >
                      {isEditingPayload ? "✓ Done Editing" : "✏️ Modify Payload"}
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
                    className="input-base min-h-[120px] font-mono text-[12.5px] leading-relaxed text-amber-300 border-amber-500/40"
                    value={currentPayload}
                    onChange={(e) => setCustomPayload(e.target.value)}
                    placeholder="Edit attack vector payload text…"
                  />
                ) : (
                  <pre className="surface-sunken max-h-44 overflow-auto p-4 font-mono text-[12.5px] leading-relaxed text-slate-200 border-ink-600">
                    {currentPayload}
                  </pre>
                )}
              </div>
            </div>

            <div className="mt-5 border-t border-ink-600 pt-3.5 flex justify-end">
              <button
                type="button"
                className="btn btn-primary px-6 text-base"
                onClick={() => selectedAttack && handleRun(selectedAttack)}
                disabled={running || !selectedAttack}
              >
                <FlaskIcon size={16} />
                {running ? "Simulating Attack Vector…" : "Run Security Simulation"}
              </button>
            </div>
          </section>
        </Reveal>

        {/* Result + Protected/Unprotected comparison */}
        <Reveal className="lg:col-span-5" delay={150}>
          <section className="card card-pad h-full flex flex-col justify-between">
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="section-title">Firewall Verdict &amp; Analysis</h2>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 font-mono">
                  {result ? "Complete" : "Pending Execution"}
                </span>
              </div>

              {/* Verdict */}
              {!result ? (
                <div className="surface-sunken flex items-center gap-3 p-4 text-sm text-slate-400">
                  <FlaskIcon size={18} />
                  <span>Execute a red-team simulation to evaluate firewall resilience against un-shielded baselines.</span>
                </div>
              ) : (
                <div
                  className="hover-lift rounded-xl border p-4"
                  style={{
                    borderColor: `${result.result === "BLOCKED" ? "#22C55E" : "#EF4444"}60`,
                    background:
                      result.result === "BLOCKED"
                        ? "rgba(34, 197, 94, 0.10)"
                        : "rgba(239, 68, 68, 0.10)",
                    boxShadow: result.result === "BLOCKED"
                      ? "var(--shadow-glow-green)"
                      : "var(--shadow-glow-red)",
                  }}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-xl"
                      style={{
                        color: result.result === "BLOCKED" ? "#22C55E" : "#EF4444",
                        background: result.result === "BLOCKED" ? "rgba(34,197,94,0.20)" : "rgba(239,68,68,0.20)",
                      }}
                    >
                      {result.result === "BLOCKED" ? <CheckIcon size={20} /> : <XIcon size={20} />}
                    </div>
                    <div>
                      <div
                        className="text-lg font-extrabold tracking-wide"
                        style={{ color: result.result === "BLOCKED" ? "#22C55E" : "#EF4444" }}
                      >
                        {result.result === "BLOCKED" ? "BLOCKED BY FIREWALL" : "FIREWALL BYPASSED"}
                      </div>
                      <div className="text-xs text-slate-300 font-medium">
                        {result.result === "BLOCKED"
                          ? "PromptWall successfully intercepted and neutralized the exploit."
                          : "The attack vector bypassed active filters. Fine-tuning required."}
                      </div>
                    </div>
                  </div>
                  {result.detail && (
                    <div className="surface-sunken mt-3.5 p-3.5 text-[12.5px] text-slate-200 border-l-2 border-l-accent-blue">
                      {result.detail}
                    </div>
                  )}
                </div>
              )}

              {/* Protected vs Unprotected comparison */}
              <div className="mt-5">
                <div className="mb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Defensive Comparative Impact
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <div className="surface-sunken p-3.5">
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-status-allow">
                      With PromptWall Protection
                    </div>
                    <div className="text-[13.5px] font-bold text-white">
                      {result?.result === "BYPASSED" ? "Tuning Required" : "Protected"}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {result?.result === "BYPASSED"
                        ? "Needs policy adjustment"
                        : "Exploit intercepted safely"}
                    </div>
                  </div>
                  <div className="surface-sunken p-3.5">
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-status-block">
                      Unprotected AI Baseline
                    </div>
                    <div className="text-[13.5px] font-bold text-red-400">System Compromised</div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Agent executes malicious tools &amp; leaks data
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </Reveal>
      </div>
    </PageShell>
  );
}
