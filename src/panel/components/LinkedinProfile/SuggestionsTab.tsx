// scout-chrome/src/panel/components/LinkedinProfile/SuggestionsTab.tsx
import { Stack } from "@mui/material";
import { ExperienceSection } from "./ExperienceSection";
import { SectionCard } from "./SectionCard";
import { Card, Rationale, SectionHeader, SectionTitle, SuggestionText } from "./styled";
import { CopyButton } from "./CopyButton";
import type { ProfileSuggestionsBundle } from "./types";

interface Props {
  suggestions: ProfileSuggestionsBundle;
}

export function SuggestionsTab({ suggestions }: Props) {
  return (
    <Stack gap={1.5}>
      <SectionCard
        title="Headline"
        text={suggestions.headline.text}
        rationale={suggestions.headline.rationale}
      />
      <SectionCard
        title="About"
        text={suggestions.about.text}
        rationale={suggestions.about.rationale}
      />
      <ExperienceSection roles={suggestions.experience} />
      <SectionCard
        title="Skills"
        text={suggestions.skills.text}
        rationale={suggestions.skills.rationale}
      />
      <Card>
        <SectionHeader>
          <SectionTitle>Featured</SectionTitle>
        </SectionHeader>
        {suggestions.featured.rationale && (
          <Rationale>{suggestions.featured.rationale}</Rationale>
        )}
        {suggestions.featured.items.length === 0 ? (
          <Rationale>No featured suggestions.</Rationale>
        ) : (
          suggestions.featured.items.map((item, i) => (
            <Card
              key={i}
              sx={{ background: "transparent", padding: 0, gap: 4, border: "none" }}
            >
              <SectionHeader>
                <SectionTitle>{item.title}</SectionTitle>
                <CopyButton text={item.suggestion} />
              </SectionHeader>
              <SuggestionText>{item.suggestion}</SuggestionText>
            </Card>
          ))
        )}
      </Card>
    </Stack>
  );
}
