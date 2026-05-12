import { useMemo, useState } from "react";
import { Alert, Box, Button, Collapse, Stack, Typography } from "@mui/material";
import type { AutofillResponse, FieldSpec, FieldValue, ApplicantProfile } from "@/shared/types";
import { CouldntFillList } from "./CouldntFillList";
import { FieldRow } from "./FieldRow";
import { ProfileSection } from "./ProfileSection";
import { SectionCard, SectionHeader } from "./styled";
import { ACCENT, MUTED, TEXT } from "../../theme";
import type { ProfileFieldKey } from "./types";

interface Props {
  schema: FieldSpec[];
  response: AutofillResponse;
  values: Record<string, FieldValue>;
  profile: ApplicantProfile;
  saveProfile: boolean;
  filling: boolean;
  onValueChange: (fieldId: string, value: FieldValue) => void;
  onProfileChange: <K extends ProfileFieldKey>(key: K, value: ApplicantProfile[K]) => void;
  onSaveProfileChange: (v: boolean) => void;
  onFill: () => void;
  onCancel: () => void;
}

export function ReviewStep({
  schema,
  response,
  values,
  profile,
  saveProfile,
  filling,
  onValueChange,
  onProfileChange,
  onSaveProfileChange,
  onFill,
  onCancel,
}: Props) {
  const [openProfile, setOpenProfile] = useState(true);
  const [openQs, setOpenQs] = useState(true);
  const [openCantFill, setOpenCantFill] = useState(false);

  const aiDrafted = useMemo(() => new Set(response.aiDrafted), [response.aiDrafted]);
  const matched = useMemo(() => new Set(Object.keys(response.matched)), [response.matched]);
  const memory = useMemo(() => new Set(response.memoryMatched), [response.memoryMatched]);
  const cantFill = useMemo(
    () =>
      schema.filter(
        (f) =>
          response.unmatched.includes(f.id) &&
          (f.kind === "select" ||
            f.kind === "multiselect" ||
            f.kind === "checkbox" ||
            f.kind === "yesno"),
      ),
    [schema, response.unmatched],
  );

  const editableFields = useMemo(
    () => schema.filter((f) => !cantFill.find((c) => c.id === f.id)),
    [schema, cantFill],
  );

  const aiFailed =
    response.aiDrafted.length === 0 &&
    schema.some((f) => f.kind === "textarea" && !matched.has(f.id));

  const requiredEmpty = editableFields.some((f) => {
    if (!f.required) return false;
    const v = values[f.id];
    return v === undefined || v === "" || v === null;
  });

  const fieldStatus = (f: FieldSpec): "matched" | "memory" | "ai_drafted" | "unmatched" => {
    if (matched.has(f.id)) return "matched";
    if (memory.has(f.id)) return "memory";
    if (aiDrafted.has(f.id)) return "ai_drafted";
    return "unmatched";
  };

  return (
    <Stack spacing={1.5}>
      <SectionCard>
        <SectionHeader onClick={() => setOpenProfile(!openProfile)}>
          <span>Your details</span>
          <span style={{ color: MUTED }}>{openProfile ? "−" : "+"}</span>
        </SectionHeader>
        <Collapse in={openProfile}>
          <Box sx={{ pt: 1 }}>
            <ProfileSection
              profile={profile}
              saveProfile={saveProfile}
              onChange={onProfileChange}
              onSaveProfileChange={onSaveProfileChange}
            />
          </Box>
        </Collapse>
      </SectionCard>

      <SectionCard>
        <SectionHeader onClick={() => setOpenQs(!openQs)}>
          <span>Page questions ({editableFields.length})</span>
          <span style={{ color: MUTED }}>{openQs ? "−" : "+"}</span>
        </SectionHeader>
        <Collapse in={openQs}>
          <Box sx={{ pt: 1 }}>
            {aiFailed && (
              <Alert severity="warning" sx={{ mb: 1, fontSize: 11 }}>
                AI drafting failed — fill these yourself.
              </Alert>
            )}
            {editableFields.map((f) => (
              <FieldRow
                key={f.id}
                field={f}
                value={values[f.id]}
                status={fieldStatus(f)}
                onChange={(v) => onValueChange(f.id, v)}
              />
            ))}
          </Box>
        </Collapse>
      </SectionCard>

      {cantFill.length > 0 && (
        <SectionCard>
          <SectionHeader onClick={() => setOpenCantFill(!openCantFill)}>
            <span>Couldn't fill ({cantFill.length})</span>
            <span style={{ color: MUTED }}>{openCantFill ? "−" : "+"}</span>
          </SectionHeader>
          <Collapse in={openCantFill}>
            <Box sx={{ pt: 1 }}>
              <CouldntFillList fields={cantFill} />
            </Box>
          </Collapse>
        </SectionCard>
      )}

      <Stack direction="row" spacing={0.75}>
        <Button
          variant="contained"
          fullWidth
          disabled={filling || requiredEmpty}
          onClick={onFill}
          sx={{
            background: ACCENT,
            color: "#0a0e14",
            "&:hover": { background: ACCENT, opacity: 0.9 },
          }}
        >
          {filling ? "Filling…" : "Fill page"}
        </Button>
        <Button onClick={onCancel} sx={{ color: MUTED, fontSize: 12 }}>
          Cancel
        </Button>
      </Stack>
      {requiredEmpty && (
        <Typography sx={{ fontSize: 10, color: TEXT }}>
          Required fields are empty — fill them above to enable Fill page.
        </Typography>
      )}
    </Stack>
  );
}
