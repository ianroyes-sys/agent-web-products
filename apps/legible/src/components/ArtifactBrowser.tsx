"use client";

import { useState } from "react";
import { CopyButton } from "./CopyButton";
import type { Artifact } from "@/lib/fixkit/types";

export function ArtifactBrowser({ artifacts }: { artifacts: Artifact[] }) {
  const [activeId, setActiveId] = useState(artifacts[0]?.id ?? "");
  const active = artifacts.find((artifact) => artifact.id === activeId) ?? artifacts[0];

  if (!active) {
    return (
      <div className="card p-10 text-center">
        <p className="text-[14px] text-[var(--color-muted)]">
          No artifacts generated. Run an audit first — the kit is built from the report.
        </p>
      </div>
    );
  }

  const fillCount = (active.content.match(/\[FILL:/g) ?? []).length;

  return (
    <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
      <nav aria-label="Fix kit artifacts">
        <ul className="space-y-1">
          {artifacts.map((artifact) => {
            const selected = artifact.id === active.id;
            return (
              <li key={artifact.id}>
                <button
                  type="button"
                  onClick={() => setActiveId(artifact.id)}
                  aria-current={selected}
                  className={`w-full rounded-lg border px-3.5 py-2.5 text-left transition-colors ${
                    selected
                      ? "border-[var(--accent-line)] bg-[var(--color-raised)]"
                      : "border-transparent hover:border-[var(--color-line)] hover:bg-[var(--color-surface)]"
                  }`}
                >
                  <span
                    className={`block font-mono text-[12.5px] ${
                      selected ? "text-[var(--accent)]" : "text-[var(--color-body)]"
                    }`}
                  >
                    {artifact.filename}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] text-[var(--color-faint)]">
                    {artifact.name}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="card overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-line)] bg-[var(--color-raised)] px-5 py-4">
          <div className="min-w-0">
            <p className="font-mono text-[13px] text-[var(--color-chalk)]">{active.filename}</p>
            <p className="mt-1.5 max-w-[62ch] text-[12.5px] leading-relaxed text-[var(--color-muted)]">
              {active.description}
            </p>
            <p className="mt-2 text-[11.5px] text-[var(--color-faint)]">Fixes: {active.fixes}</p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="chip">{active.language}</span>
            <CopyButton text={active.content} label="Copy file" />
          </div>
        </div>

        {fillCount > 0 && (
          <p className="border-b border-[var(--color-line)] bg-[color-mix(in_oklab,var(--color-warn)_8%,transparent)] px-5 py-2.5 font-mono text-[11.5px] text-[var(--color-warn)]">
            {fillCount} [FILL:…] placeholder{fillCount === 1 ? "" : "s"} — facts the crawl could not
            verify. We fill these with you rather than guessing them.
          </p>
        )}

        <pre className="max-h-[560px] overflow-auto px-5 py-5 font-mono text-[12.5px] leading-[1.7] text-[var(--color-body)]">
          {active.content}
        </pre>
      </div>
    </div>
  );
}
