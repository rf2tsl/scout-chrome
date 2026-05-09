import { Box, CircularProgress } from "@mui/material";
import { useAuth } from "./hooks/useAuth";
import { useActiveJob } from "./hooks/useActiveJob";
import { Listing } from "./views/Listing";
import { OptimizationResult } from "./views/OptimizationResult";
import { SignIn } from "./views/SignIn";
import { ACCENT } from "./theme";

export function App() {
  const auth = useAuth();
  const job = useActiveJob();

  if (auth.state.kind === "unknown" || job.loading) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100%",
        }}
      >
        <CircularProgress size={20} sx={{ color: ACCENT }} />
      </Box>
    );
  }

  if (auth.state.kind === "signed-out") {
    return <SignIn onSignIn={() => void auth.signIn()} />;
  }

  // Optimization-stage states fall through to the result view.
  if (
    job.job &&
    (job.job.kind === "optimizing" ||
      job.job.kind === "completed" ||
      (job.job.kind === "failed" && job.job.phase === "optimize"))
  ) {
    return <OptimizationResult job={job.job} onBack={() => void job.reset()} />;
  }

  return (
    <Listing
      job={job.job}
      reset={job.reset}
      startCapture={job.startCapture}
      startOptimize={job.startOptimize}
    />
  );
}
