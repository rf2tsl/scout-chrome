// scout-chrome/src/panel/components/LinkedinProfile/SectionCard.tsx
import { CopyButton } from "./CopyButton";
import { Card, Rationale, SectionHeader, SectionTitle, SuggestionText } from "./styled";

interface Props {
  title: string;
  text: string;
  rationale: string;
}

export function SectionCard({ title, text, rationale }: Props) {
  return (
    <Card>
      <SectionHeader>
        <SectionTitle>{title}</SectionTitle>
        <CopyButton text={text} />
      </SectionHeader>
      {rationale && <Rationale>{rationale}</Rationale>}
      <SuggestionText>{text}</SuggestionText>
    </Card>
  );
}
