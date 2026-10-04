"use client";

import React, { useState } from "react";
import type { Scope } from "@/types";
import { DEMO_SCOPE } from "@/lib/secure-rag/mockData";

interface AuthorizedScopeProps {
  scope?: Scope;
  onExpand?: () => void;
  onUpdateScope?: (updated: Scope) => void;
}

/**
 * Authorized Scope — panel displaying extracted goal, allowed & restricted tools,
 * resource paths, and external recipient constraints. Includes interactive editing options.
 */
const AuthorizedScope: React.FC<AuthorizedScopeProps> = ({
  scope = DEMO_SCOPE,
  onExpand,
  onUpdateScope,
}) => {
  const [currentScope, setCurrentScope] = useState<Scope>(scope);
  const [isEditing, setIsEditing] = useState(false);
  const [newTool, setNewTool] = useState("");

  const handleAddAllowedTool = () => {
    if (!newTool.trim()) return;
    const tool = newTool.trim().toLowerCase();
    if (!currentScope.allowedTools.includes(tool)) {
      const updated = {
        ...currentScope,
        allowedTools: [...currentScope.allowedTools, tool],
        restrictedTools: currentScope.restrictedTools.filter((t) => t !== tool),
      };
      setCurrentScope(updated);
      onUpdateScope?.(updated);
    }
    setNewTool("");
  };

  const handleRemoveAllowedTool = (tool: string) => {
    const updated = {
      ...currentScope,
      allowedTools: currentScope.allowedTools.filter((t) => t !== tool),
      restrictedTools: [...currentScope.restrictedTools, tool],
    };
    setCurrentScope(updated);
    onUpdateScope?.(updated);
  };

  return (
    <section className="card card-pad h-full flex flex-col justify-between">
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="section-title">Authorized Execution Scope</h2>
            <p className="mt-1 text-[12.5px] text-slate-400">
              Extracted operational boundaries &amp; permission constraints.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsEditing(!isEditing)}
            className="btn-ghost rounded-lg border border-ink-600 bg-ink-850 px-3 py-1 text-xs font-semibold text-slate-200 hover:border-accent-blue/40 hover:text-white"
            style={{ boxShadow: "var(--shadow-3d-sm)" }}
          >
            {isEditing ? "✓ Save Scope" : "⚙ Edit Scope Controls"}
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {/* Goal */}
          <div className="surface-sunken p-3.5 sm:col-span-2">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Extracted Operational Goal
            </div>
            {isEditing ? (
              <input
                type="text"
                className="input-base text-xs font-medium py-1.5"
                value={currentScope.goal}
                onChange={(e) => {
                  const updated = { ...currentScope, goal: e.target.value };
                  setCurrentScope(updated);
                  onUpdateScope?.(updated);
                }}
              />
            ) : (
              <div className="text-[13px] font-semibold text-slate-100 leading-snug">
                {currentScope.goal}
              </div>
            )}
          </div>

          {/* Tools permissions */}
          <div className="sm:col-span-2 grid gap-3 sm:grid-cols-2">
            <div className="surface-sunken p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-status-allow">
                  Allowed Tool Calls
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  ({currentScope.allowedTools.length} Active)
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {currentScope.allowedTools.map((t) => (
                  <span
                    key={t}
                    className="chip border border-status-allow/40 bg-status-allow/10 text-[11px] font-mono text-status-allow"
                  >
                    ✓ {t}
                    {isEditing && (
                      <button
                        type="button"
                        onClick={() => handleRemoveAllowedTool(t)}
                        className="ml-1 text-status-allow hover:text-red-400 font-bold"
                      >
                        ×
                      </button>
                    )}
                  </span>
                ))}
              </div>

              {isEditing && (
                <div className="mt-2.5 flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Add tool name…"
                    className="input-base text-xs py-1 px-2 font-mono"
                    value={newTool}
                    onChange={(e) => setNewTool(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddAllowedTool()}
                  />
                  <button
                    type="button"
                    onClick={handleAddAllowedTool}
                    className="btn btn-primary text-xs py-1 px-2.5"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            <div className="surface-sunken p-3.5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-status-block">
                  Restricted / Blocked Tools
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  ({currentScope.restrictedTools.length} Restricted)
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {currentScope.restrictedTools.map((t) => (
                  <span
                    key={t}
                    className="chip border border-status-block/40 bg-status-block/10 text-[11px] font-mono text-status-block"
                  >
                    🔒 {t}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Resources & Recipients */}
          <div className="surface-sunken p-3.5">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Authorized Resource Paths
            </div>
            {isEditing ? (
              <input
                type="text"
                className="input-base text-xs font-mono py-1.5"
                value={currentScope.allowedResources}
                onChange={(e) => {
                  const updated = { ...currentScope, allowedResources: e.target.value };
                  setCurrentScope(updated);
                  onUpdateScope?.(updated);
                }}
              />
            ) : (
              <div className="font-mono text-[12px] text-slate-200">
                {currentScope.allowedResources}
              </div>
            )}
          </div>

          <div className="surface-sunken p-3.5">
            <div className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              External Egress Destinations
            </div>
            {isEditing ? (
              <input
                type="text"
                className="input-base text-xs font-mono py-1.5"
                value={currentScope.externalRecipients}
                onChange={(e) => {
                  const updated = { ...currentScope, externalRecipients: e.target.value };
                  setCurrentScope(updated);
                  onUpdateScope?.(updated);
                }}
              />
            ) : (
              <div className="font-mono text-[12px] text-slate-200">
                {currentScope.externalRecipients}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};

export default AuthorizedScope;
