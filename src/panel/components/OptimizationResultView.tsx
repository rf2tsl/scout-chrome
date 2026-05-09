// scout-chrome/src/panel/components/OptimizationResultView.tsx
import { useMemo } from "react";
import { Box, Stack, Typography } from "@mui/material";
import DOMPurify from "isomorphic-dompurify";
import { marked } from "marked";
import { Card } from "../styled";
import { SectionLabel } from "./SectionLabel";
import { ACCENT, DIM, FAINT, TEXT } from "../theme";

interface Props {
  changeSummary: string[];
  recruiterReview: string;
}

export function OptimizationResultView({ changeSummary, recruiterReview }: Props) {
  const reviewHtml = useMemo(() => {
    const raw = recruiterReview || "";
    if (!raw.trim()) return "";
    return DOMPurify.sanitize(marked.parse(raw, { async: false }) as string);
  }, [recruiterReview]);

  return (
    <>
      {changeSummary.length > 0 && (
        <>
          <SectionLabel hint={`${changeSummary.length} edits`}>What changed</SectionLabel>
          <Card>
            <Stack spacing={0.75}>
              {changeSummary.map((line, i) => (
                <Stack key={i} direction="row" spacing={1} alignItems="flex-start">
                  <Box sx={{ color: ACCENT, fontSize: 11, lineHeight: 1.55, flexShrink: 0 }}>+</Box>
                  <Typography sx={{ fontSize: 11, color: DIM, lineHeight: 1.55 }}>
                    {line}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Card>
        </>
      )}

      {reviewHtml && (
        <>
          <SectionLabel>10-second recruiter review</SectionLabel>
          <Card>
            <Box
              sx={{
                fontSize: 11,
                lineHeight: 1.55,
                color: DIM,
                "& p": { margin: "5px 0" },
                "& ol, & ul": { paddingLeft: 2.5, margin: "5px 0" },
                "& strong": { color: TEXT, fontWeight: 600 },
                "& em": { color: ACCENT, fontStyle: "normal" },
              }}
              dangerouslySetInnerHTML={{ __html: reviewHtml }}
            />
          </Card>
        </>
      )}

      {!changeSummary.length && !reviewHtml && (
        <Card>
          <Typography sx={{ fontSize: 12, color: FAINT, textAlign: "center", py: 2 }}>
            No edits returned.
          </Typography>
        </Card>
      )}
    </>
  );
}
