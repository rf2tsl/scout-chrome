import type { ReactNode } from "react";
import { SectionHint, SectionLabelRow, SectionLabelText } from "../styled";

interface Props {
  children: ReactNode;
  hint?: string;
}

export function SectionLabel({ children, hint }: Props) {
  return (
    <SectionLabelRow>
      <SectionLabelText>{children}</SectionLabelText>
      {hint && <SectionHint>{hint}</SectionHint>}
    </SectionLabelRow>
  );
}
