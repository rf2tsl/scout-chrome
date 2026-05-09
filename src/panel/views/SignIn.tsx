import { Button, Stack, Typography } from "@mui/material";
import { AccentCard } from "../styled";

interface Props {
  onSignIn: () => void;
}

export function SignIn({ onSignIn }: Props) {
  return (
    <AccentCard>
      <Stack spacing={2}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          Sign in to Scout
        </Typography>
        <Typography variant="body2" color="text.secondary">
          We&apos;ll open the Scout web app to link this extension to your account.
          You only need to do this once per browser.
        </Typography>
        <Button variant="contained" onClick={onSignIn} size="large">
          Open Scout to link
        </Button>
      </Stack>
    </AccentCard>
  );
}
