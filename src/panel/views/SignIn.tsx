import { Box, Button, Stack, Typography } from "@mui/material";
import { ACCENT, BORDER_HI, DIM, FAINT, MUTED, SURFACE, TEXT } from "../theme";
import { PopupShell } from "../components/PopupShell";
import { ScoutGlyph } from "../components/ScoutGlyph";
import { SectionLabel } from "../components/SectionLabel";
import { Card } from "../styled";

interface Props {
  onSignIn: () => void;
}

export function SignIn({ onSignIn }: Props) {
  return (
    <PopupShell
      tagline="Sign in to start optimizing"
      footer={
        <Button
          variant="contained"
          fullWidth
          onClick={onSignIn}
          sx={{
            background: ACCENT,
            color: "#0a0e14",
            "&:hover": { background: ACCENT, opacity: 0.9 },
          }}
        >
          Open Scout to link
        </Button>
      }
    >
      <SectionLabel>Welcome</SectionLabel>
      <Box
        sx={{
          background: SURFACE,
          border: `1.5px dashed ${BORDER_HI}`,
          borderRadius: 2,
          padding: "24px 14px",
          textAlign: "center",
        }}
      >
        <Box
          sx={{
            width: 44,
            height: 44,
            margin: "0 auto 10px",
            borderRadius: "50%",
            background: `${ACCENT}11`,
            border: `1px solid ${ACCENT}33`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <ScoutGlyph size={26} />
        </Box>
        <Typography sx={{ fontSize: 12, color: TEXT, mb: 0.5, fontWeight: 500 }}>
          Link this extension to your Scout account
        </Typography>
        <Typography sx={{ fontSize: 10, color: MUTED, lineHeight: 1.5 }}>
          We&apos;ll open Scout in a new tab. Once you&apos;re signed in,
          this popup will pick up where you left off.
        </Typography>
      </Box>

      <SectionLabel>Why link?</SectionLabel>
      <Stack spacing={1}>
        {[
          "Pull the job listing from any page",
          "Optimize your resume in ~20 seconds",
          "Download a tailored PDF or DOCX",
        ].map((line) => (
          <Card key={line} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <Box sx={{ color: ACCENT, fontSize: 12, flexShrink: 0 }}>✦</Box>
            <Typography sx={{ fontSize: 12, color: DIM }}>{line}</Typography>
          </Card>
        ))}
      </Stack>

      <Box sx={{ mt: "auto" }}>
        <Typography sx={{ fontSize: 9, color: FAINT, textAlign: "center", pt: 1 }}>
          Linked once per browser. Token expires in 90 days.
        </Typography>
      </Box>
    </PopupShell>
  );
}
