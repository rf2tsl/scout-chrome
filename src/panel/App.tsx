import { useState } from "react";
import { Button, CircularProgress, Stack, Typography } from "@mui/material";
import type { ExtractedListing } from "@/shared/types";
import { useAuth } from "./hooks/useAuth";
import { Body, Header, PanelRoot } from "./styled";
import { Listing } from "./views/Listing";
import { OptimizationResult } from "./views/OptimizationResult";
import { SignIn } from "./views/SignIn";

type Route =
  | { kind: "listing" }
  | { kind: "optimization"; listing: ExtractedListing };

export function App() {
  const { state, signIn, signOut } = useAuth();
  const [route, setRoute] = useState<Route>({ kind: "listing" });

  if (state.kind === "unknown") {
    return (
      <PanelRoot>
        <PanelHeader signedIn={false} onSignOut={signOut} />
        <Body>
          <Stack alignItems="center" sx={{ mt: 6 }}>
            <CircularProgress size={20} />
          </Stack>
        </Body>
      </PanelRoot>
    );
  }

  if (state.kind === "signed-out") {
    return (
      <PanelRoot>
        <PanelHeader signedIn={false} onSignOut={signOut} />
        <Body>
          <SignIn onSignIn={() => void signIn()} />
        </Body>
      </PanelRoot>
    );
  }

  return (
    <PanelRoot>
      <PanelHeader signedIn onSignOut={signOut} />
      <Body>
        {route.kind === "listing" && (
          <Listing onOptimize={(listing) => setRoute({ kind: "optimization", listing })} />
        )}
        {route.kind === "optimization" && (
          <OptimizationResult
            listing={route.listing}
            onBack={() => setRoute({ kind: "listing" })}
          />
        )}
      </Body>
    </PanelRoot>
  );
}

function PanelHeader({ signedIn, onSignOut }: { signedIn: boolean; onSignOut: () => void }) {
  return (
    <Header>
      <Typography variant="subtitle1" sx={{ fontWeight: 700, letterSpacing: 0.5 }}>
        SCOUT
      </Typography>
      {signedIn && (
        <Button size="small" onClick={() => void onSignOut()}>
          Sign out
        </Button>
      )}
    </Header>
  );
}
