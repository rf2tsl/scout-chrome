import { Box, Typography } from "@mui/material";
import { ACCENT, FAINT, MUTED, TEXT } from "../theme";
import { Card, StatusDot, TagChip } from "../styled";

interface Props {
  title: string;
  subtitle?: string;          // e.g. "Linear · Remote · $130k–$170k"
  source?: string;            // hostname
  tags?: string[];
}

export function DetectedJobCard({ title, subtitle, source, tags = [] }: Props) {
  return (
    <Card>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.75 }}>
        <StatusDot />
        <Typography
          sx={{
            fontSize: 9,
            color: ACCENT,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            fontWeight: 600,
          }}
        >
          Detected on page
        </Typography>
        {source && (
          <Typography sx={{ fontSize: 9, color: FAINT, ml: "auto" }}>
            via {source}
          </Typography>
        )}
      </Box>
      <Typography
        sx={{
          fontSize: 13,
          fontWeight: 600,
          color: TEXT,
          mb: 0.25,
          lineHeight: 1.3,
        }}
      >
        {title || "(no title detected)"}
      </Typography>
      {subtitle && (
        <Typography sx={{ fontSize: 11, color: MUTED, mb: tags.length ? 1 : 0 }}>
          {subtitle}
        </Typography>
      )}
      {tags.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
          {tags.map((t) => (
            <TagChip key={t}>{t}</TagChip>
          ))}
        </Box>
      )}
    </Card>
  );
}
