import { Alert, Button, Stack, Typography } from "@mui/material";
import { PopupShell } from "../../components/PopupShell";
import { useActiveTab } from "../../hooks/useActiveTab";
import { useAutofill } from "../../hooks/useAutofill";
import { ReviewStep } from "./ReviewStep";
import { ScanStep } from "./ScanStep";
import { ACCENT, TEXT } from "../../theme";

interface Props {
  initialOptimizationId: number | null;
  onClose: () => void;
}

export function Autofill({ initialOptimizationId, onClose }: Props) {
  const { tab } = useActiveTab();
  const { state, scan, setValue, setProfileField, setSaveProfile, fill, reset } = useAutofill();

  const close = () => {
    reset();
    onClose();
  };

  if (!tab) {
    return (
      <PopupShell footer={null}>
        <Alert severity="info">Open a tab with a job application page.</Alert>
      </PopupShell>
    );
  }

  if (state.kind === "idle" || state.kind === "scanning" || state.kind === "error") {
    return (
      <PopupShell footer={null}>
        <ScanStep
          defaultOptimizationId={initialOptimizationId}
          scanning={state.kind === "scanning"}
          errorMessage={state.kind === "error" ? state.message : undefined}
          activeTabUrl={tab.url}
          activeTabTitle={tab.title}
          onScan={(optId) => void scan(optId, tab.tabId)}
          onCancel={close}
        />
      </PopupShell>
    );
  }

  if (state.kind === "reviewing" || state.kind === "filling") {
    const reviewing = state.kind === "reviewing" ? state : null;
    if (!reviewing) {
      return (
        <PopupShell footer={null}>
          <Stack alignItems="center" sx={{ py: 4 }}>
            <Typography sx={{ fontSize: 12, color: TEXT }}>Filling…</Typography>
          </Stack>
        </PopupShell>
      );
    }
    return (
      <PopupShell footer={null}>
        <ReviewStep
          schema={reviewing.schema}
          response={reviewing.response}
          values={reviewing.values}
          profile={reviewing.profile}
          saveProfile={reviewing.saveProfile}
          filling={false}
          onValueChange={setValue}
          onProfileChange={setProfileField}
          onSaveProfileChange={setSaveProfile}
          onFill={() => void fill(tab.tabId)}
          onCancel={close}
        />
      </PopupShell>
    );
  }

  // state.kind === "done"
  const { filled, failed, profileSaved } = state;
  return (
    <PopupShell footer={null}>
      <Stack spacing={1}>
        <Alert severity="success">
          Filled {filled} field{filled === 1 ? "" : "s"}.
          {failed.length > 0 && <> {failed.length} couldn't be found — try Scan again.</>}
          {!profileSaved && (
            <> (Profile changes weren't saved — try again from your profile.)</>
          )}
        </Alert>
        <Typography sx={{ fontSize: 11, color: TEXT }}>
          Don't forget to upload your resume PDF — download it from the optimization details.
        </Typography>
        <Button
          variant="contained"
          fullWidth
          onClick={close}
          sx={{
            background: ACCENT,
            color: "#0a0e14",
            "&:hover": { background: ACCENT, opacity: 0.9 },
          }}
        >
          Done
        </Button>
      </Stack>
    </PopupShell>
  );
}
