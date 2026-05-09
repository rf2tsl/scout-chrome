// scout-chrome/src/panel/components/LinkedinProfile/CopyButton.tsx
import { useEffect, useState } from "react";
import { SmallButton } from "./styled";

interface Props {
  text: string;
  label?: string;
}

export function CopyButton({ text, label = "Copy" }: Props) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(t);
  }, [copied]);

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  };

  return (
    <SmallButton onClick={() => void onClick()} disabled={!text}>
      {copied ? "Copied!" : label}
    </SmallButton>
  );
}
