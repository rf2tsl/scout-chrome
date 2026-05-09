// scout-chrome/src/panel/components/BottomNav/index.tsx
import type { PanelTab } from "@/shared/types";
import { Bar, Glyph, Label, TabButton } from "./styled";

interface Props {
  active: PanelTab;
  onChange: (t: PanelTab) => void;
}

const TABS: ReadonlyArray<{ key: PanelTab; glyph: string; label: string }> = [
  { key: "home", glyph: "✦", label: "Home" },
  { key: "linkedin", glyph: "in", label: "LinkedIn" },
  { key: "resumes", glyph: "▤", label: "Resumes" },
];

export function BottomNav({ active, onChange }: Props) {
  return (
    <Bar role="tablist">
      {TABS.map((t) => (
        <TabButton
          key={t.key}
          role="tab"
          aria-selected={active === t.key}
          active={active === t.key}
          onClick={() => onChange(t.key)}
        >
          <Glyph aria-hidden>{t.glyph}</Glyph>
          <Label>{t.label}</Label>
        </TabButton>
      ))}
    </Bar>
  );
}
