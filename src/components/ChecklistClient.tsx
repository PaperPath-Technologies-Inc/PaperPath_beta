"use client";

import { useMemo, useState } from "react";

type Item = {
  id: string;
  title: string;
  description: string;
  href?: string;
};

type Props = {
  storageKey: string;
  items: Item[];
  unlockedCount: number;
  isPro: boolean;
};

function readDone(storageKey: string): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, boolean>;
  } catch {
    return {};
  }
}

function writeDone(storageKey: string, value: Record<string, boolean>) {
  window.localStorage.setItem(storageKey, JSON.stringify(value));
}

export function ChecklistClient({ storageKey, items, unlockedCount, isPro }: Props) {
  const [done, setDone] = useState<Record<string, boolean>>(() => readDone(storageKey));

  const visible = useMemo(() => (isPro ? items : items.slice(0, unlockedCount)), [isPro, items, unlockedCount]);

  const onToggle = (id: string) => {
    const next = { ...done, [id]: !done[id] };
    setDone(next);
    writeDone(storageKey, next);
  };

  return (
    <div className="stack-12">
      {!isPro && <p className="hint">Pro unlocks the full checklist.</p>}
      {visible.map((item) => (
        <article key={item.id} className="card">
          <div className="item-row">
            <button className={done[item.id] ? "check done" : "check"} onClick={() => onToggle(item.id)} type="button">
              {done[item.id] ? "Done" : "Todo"}
            </button>
            <div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
              {item.href ? (
                <a href={item.href} target="_blank" rel="noreferrer" className="text-link">
                  Official link
                </a>
              ) : null}
            </div>
          </div>
        </article>
      ))}
    </div>
  );
}
