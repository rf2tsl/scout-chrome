// scout-chrome/src/panel/components/LinkedinProfile/ExperienceSection.tsx
import { CopyButton } from "./CopyButton";
import { Card, Rationale, SectionHeader, SectionTitle, SuggestionText } from "./styled";
import type { ExperienceRoleSuggestion } from "./types";

interface Props {
  roles: ExperienceRoleSuggestion[];
}

export function ExperienceSection({ roles }: Props) {
  if (roles.length === 0) {
    return (
      <Card>
        <SectionTitle>Experience</SectionTitle>
        <Rationale>No experience entries detected on this profile.</Rationale>
      </Card>
    );
  }

  return (
    <>
      {roles.map((role, idx) => {
        const allBullets = role.bullets.map((b) => `• ${b.text}`).join("\n");
        return (
          <Card key={`${role.company}-${role.role}-${idx}`}>
            <SectionHeader>
              <SectionTitle>
                {role.role} · {role.company}
              </SectionTitle>
              <CopyButton text={allBullets} label="Copy all bullets" />
            </SectionHeader>
            {role.bullets.map((bullet, i) => (
              <Card key={i} sx={{ background: "transparent", padding: 0, gap: 4, border: "none" }}>
                <SectionHeader>
                  <Rationale>{bullet.rationale}</Rationale>
                  <CopyButton text={bullet.text} />
                </SectionHeader>
                <SuggestionText>{bullet.text}</SuggestionText>
              </Card>
            ))}
          </Card>
        );
      })}
    </>
  );
}
