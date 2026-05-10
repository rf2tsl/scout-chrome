import { Stack, Typography } from "@mui/material";
import type { FieldSpec } from "@/shared/types";
import { FAINT, MUTED } from "../../theme";

interface Props {
  fields: FieldSpec[];
}

export function CouldntFillList({ fields }: Props) {
  if (!fields.length) return null;
  return (
    <Stack spacing={0.5}>
      {fields.map((f) => (
        <Typography key={f.id} sx={{ fontSize: 11, color: MUTED }}>
          • {f.label || f.id}
          {f.options && f.options.length > 0 && (
            <span style={{ color: FAINT }}> ({f.options.join(", ")})</span>
          )}
        </Typography>
      ))}
    </Stack>
  );
}
