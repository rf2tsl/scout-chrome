import { Chip, Stack, TextField, Typography } from "@mui/material";
import type { FieldSpec, FieldValue } from "@/shared/types";
import { ACCENT, FAINT, MUTED, TEXT } from "../../theme";
import { FieldRowOuter } from "./styled";

interface Props {
  field: FieldSpec;
  value: FieldValue | undefined;
  status: "matched" | "ai_drafted" | "unmatched";
  onChange: (v: FieldValue) => void;
}

const STATUS: Record<Props["status"], { label: string; color: string }> = {
  matched: { label: "Matched", color: ACCENT },
  ai_drafted: { label: "AI draft", color: "#a78bfa" },
  unmatched: { label: "Unmatched", color: "#f59e0b" },
};

export function FieldRow({ field, value, status, onChange }: Props) {
  const empty = value === undefined || value === "" || value === null;
  const required = field.required && empty;
  const meta = STATUS[status];

  return (
    <FieldRowOuter>
      <Stack direction="row" alignItems="center" justifyContent="space-between">
        <Typography sx={{ fontSize: 11, color: TEXT, fontWeight: 500 }}>
          {field.label || field.id}
          {field.required && <span style={{ color: "#f87171" }}> *</span>}
        </Typography>
        <Chip
          label={meta.label}
          size="small"
          sx={{
            height: 18,
            fontSize: 9,
            color: meta.color,
            background: `${meta.color}20`,
            borderRadius: 1,
          }}
        />
      </Stack>
      {field.kind === "textarea" ? (
        <TextField
          multiline
          minRows={2}
          maxRows={6}
          size="small"
          value={(value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          error={required}
          inputProps={{ style: { fontSize: 12, color: TEXT } }}
        />
      ) : field.kind === "checkbox" ? (
        <Typography sx={{ fontSize: 10, color: MUTED }}>
          {value ? "Will be checked" : "Will not be checked"}
        </Typography>
      ) : (
        <TextField
          size="small"
          value={Array.isArray(value) ? (value as string[]).join(", ") : (value as string) ?? ""}
          onChange={(e) => onChange(e.target.value)}
          error={required}
          inputProps={{ style: { fontSize: 12, color: TEXT } }}
        />
      )}
      {field.options && field.options.length > 0 && (
        <Typography sx={{ fontSize: 9, color: FAINT, mt: 0.25 }}>
          options: {field.options.join(" / ")}
        </Typography>
      )}
    </FieldRowOuter>
  );
}
