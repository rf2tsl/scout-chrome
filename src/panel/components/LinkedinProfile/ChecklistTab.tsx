// scout-chrome/src/panel/components/LinkedinProfile/ChecklistTab.tsx
import { useMemo } from "react";
import { Stack } from "@mui/material";
import { ChecklistGroupTitle, ChecklistRow } from "./styled";
import type { ChecklistItem } from "./types";

interface Props {
  items: ChecklistItem[];
}

export function ChecklistTab({ items }: Props) {
  const grouped = useMemo(() => {
    const map = new Map<string, ChecklistItem[]>();
    for (const item of items) {
      const list = map.get(item.section) ?? [];
      list.push(item);
      map.set(item.section, list);
    }
    return Array.from(map.entries());
  }, [items]);

  if (items.length === 0) {
    return <ChecklistGroupTitle>No checklist results yet.</ChecklistGroupTitle>;
  }

  return (
    <Stack gap={1}>
      {grouped.map(([section, rows]) => (
        <div key={section}>
          <ChecklistGroupTitle>{section}</ChecklistGroupTitle>
          <Stack gap={0.5}>
            {rows.map((row) => (
              <ChecklistRow key={row.id} status={row.status}>
                <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
                  <strong style={{ fontSize: 11 }}>{row.label}</strong>
                  {row.note && <span style={{ fontSize: 10, opacity: 0.85 }}>{row.note}</span>}
                </div>
              </ChecklistRow>
            ))}
          </Stack>
        </div>
      ))}
    </Stack>
  );
}
