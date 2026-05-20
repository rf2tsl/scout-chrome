import { Checkbox, FormControlLabel, Stack, TextField, Typography } from "@mui/material";
import type { ApplicantProfile } from "@/shared/types";
import type { ProfileFieldKey } from "./types";
import { FAINT, TEXT } from "../../theme";

interface Props {
  profile: ApplicantProfile;
  saveProfile: boolean;
  onChange: <K extends ProfileFieldKey>(key: K, value: ApplicantProfile[K]) => void;
  onSaveProfileChange: (v: boolean) => void;
}

const TEXT_FIELDS: { key: ProfileFieldKey; label: string }[] = [
  { key: "firstName", label: "First name" },
  { key: "lastName", label: "Last name" },
  { key: "phone", label: "Phone" },
  { key: "linkedinUrl", label: "LinkedIn URL" },
  { key: "portfolioUrl", label: "Portfolio URL" },
  { key: "locationCity", label: "City" },
  { key: "locationCountry", label: "Country" },
];

export function ProfileSection({
  profile,
  saveProfile,
  onChange,
  onSaveProfileChange,
}: Props) {
  return (
    <Stack spacing={1}>
      {TEXT_FIELDS.map(({ key, label }) => (
        <TextField
          key={key}
          size="small"
          label={label}
          value={(profile[key] as string) ?? ""}
          onChange={(e) => onChange(key, e.target.value as never)}
          InputLabelProps={{ sx: { fontSize: 11, color: FAINT } }}
          inputProps={{ style: { fontSize: 12, color: TEXT } }}
        />
      ))}
      <Typography sx={{ fontSize: 10, color: FAINT, mt: 1 }}>
        Email is read from your Scout account ({"<not editable here>"}).
      </Typography>
      <FormControlLabel
        control={
          <Checkbox
            checked={saveProfile}
            onChange={(e) => onSaveProfileChange(e.target.checked)}
            size="small"
          />
        }
        label={<Typography sx={{ fontSize: 11, color: TEXT }}>Save changes to profile</Typography>}
      />
    </Stack>
  );
}
