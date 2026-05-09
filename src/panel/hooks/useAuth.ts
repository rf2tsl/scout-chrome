import { useEffect, useState } from "react";
import type { AuthChangedEvent, GetAuthStateResponse } from "@/shared/messages";
import type { AuthState } from "@/shared/types";

export function useAuth(): {
  state: AuthState;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
} {
  const [state, setState] = useState<AuthState>({ kind: "unknown" });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const r = (await chrome.runtime.sendMessage({ kind: "GET_AUTH_STATE" })) as
        | GetAuthStateResponse
        | undefined;
      if (cancelled || !r?.ok) return;
      setState(r.state);
    })();

    const onMessage = (msg: AuthChangedEvent) => {
      if (msg?.kind === "AUTH_CHANGED") setState(msg.state);
    };
    chrome.runtime.onMessage.addListener(onMessage);

    return () => {
      cancelled = true;
      chrome.runtime.onMessage.removeListener(onMessage);
    };
  }, []);

  const signIn = async () => {
    await chrome.runtime.sendMessage({ kind: "OPEN_SIGN_IN" });
  };
  const signOut = async () => {
    await chrome.runtime.sendMessage({ kind: "SIGN_OUT" });
  };

  return { state, signIn, signOut };
}
