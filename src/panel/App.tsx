import { Box, CircularProgress } from "@mui/material";
import { isLinkedinProfileUrl } from "@/shared/linkedin";
import { useAuth } from "./hooks/useAuth";
import { useActiveJob } from "./hooks/useActiveJob";
import { useActiveTab } from "./hooks/useActiveTab";
import { usePanelTab } from "./hooks/usePanelTab";
import { PanelShell } from "./components/PanelShell";
import { LinkedinProfile } from "./views/LinkedinProfile";
import { LinkedinHistory } from "./views/LinkedinHistory";
import { Listing } from "./views/Listing";
import { OptimizationResult } from "./views/OptimizationResult";
import { ResumeHistory } from "./views/ResumeHistory";
import { SignIn } from "./views/SignIn";
import { ACCENT } from "./theme";

export function App() {
  const auth = useAuth();
  const job = useActiveJob();
  const { tab: activeTab } = useActiveTab();
  const { tab, setTab, ready } = usePanelTab();

  if (auth.state.kind === "unknown" || job.loading || !ready) {
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

  let content;
  if (tab === "linkedin") {
    content = <LinkedinHistory />;
  } else if (tab === "resumes") {
    content = <ResumeHistory />;
  } else if (activeTab && isLinkedinProfileUrl(activeTab.url)) {
    content = <LinkedinProfile tab={activeTab} />;
  } else if (
    job.job &&
    (job.job.kind === "optimizing" ||
      job.job.kind === "completed" ||
      (job.job.kind === "failed" && job.job.phase === "optimize"))
  ) {
    content = <OptimizationResult job={job.job} onBack={() => void job.reset()} />;
  } else {
    content = (
      <Listing
        job={job.job}
        reset={job.reset}
        startCapture={job.startCapture}
        startOptimize={job.startOptimize}
      />
    );
  }

  return <PanelShell tab={tab} onTabChange={setTab}>{content}</PanelShell>;
}
