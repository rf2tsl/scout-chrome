// scout-chrome/src/panel/components/LinkedinProfile/TargetRoleInput.tsx
import { RoleInput } from "./styled";

interface Props {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
}

export function TargetRoleInput({ value, onChange, disabled }: Props) {
  return (
    <RoleInput
      label="Target role"
      placeholder="e.g. Senior Backend Engineer"
      size="small"
      fullWidth
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      InputLabelProps={{ shrink: true }}
    />
  );
}
