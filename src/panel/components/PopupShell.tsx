import { Box, IconButton } from "@mui/material";
import type { ReactNode } from "react";
import { MUTED } from "../theme";
import {
  Body,
  Footer,
  Header,
  HeaderBadge,
  HeaderIcon,
  HeaderTagline,
  HeaderTitle,
  PopupRoot,
} from "../styled";

interface Props {
  children: ReactNode;
  footer?: ReactNode;
  badge?: string;
  tagline?: string;
  onMenuClick?: () => void;
}

export function PopupShell({
  children,
  footer,
  badge = "RESUME AI",
  tagline = "Optimize for the role on this page",
  onMenuClick,
}: Props) {
  return (
    <PopupRoot>
      <Header>
        <HeaderIcon>◎</HeaderIcon>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
            <HeaderTitle>Scout</HeaderTitle>
            {badge && <HeaderBadge>{badge}</HeaderBadge>}
          </Box>
          <HeaderTagline>{tagline}</HeaderTagline>
        </Box>
        <IconButton
          size="small"
          onClick={onMenuClick}
          sx={{ color: MUTED, width: 22, height: 22, fontSize: 16 }}
        >
          ⋯
        </IconButton>
      </Header>
      <Body>{children}</Body>
      {footer && <Footer>{footer}</Footer>}
    </PopupRoot>
  );
}
