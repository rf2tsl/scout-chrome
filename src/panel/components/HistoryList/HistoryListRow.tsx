// scout-chrome/src/panel/components/HistoryList/HistoryListRow.tsx
import type { MouseEvent } from "react";
import {
  Badge,
  Row,
  RowDate,
  RowMain,
  RowMeta,
  RowSubtitle,
  RowTitle,
  TrashButton,
} from "./styled";
import type { HistoryListRowData } from "./types";

interface Props {
  data: HistoryListRowData;
  onOpen: (id: number) => void;
  onDelete: (id: number) => void;
}

export function HistoryListRow({ data, onOpen, onDelete }: Props) {
  const stopAndDelete = (e: MouseEvent) => {
    e.stopPropagation();
    onDelete(data.id);
  };

  return (
    <Row onClick={() => onOpen(data.id)}>
      <RowMain>
        <RowTitle>{data.title}</RowTitle>
        <RowSubtitle>{data.subtitle}</RowSubtitle>
      </RowMain>
      <RowMeta>
        {data.badge && <Badge tone={data.badge.tone}>{data.badge.text}</Badge>}
        <RowDate>{data.dateLabel}</RowDate>
        <TrashButton aria-label="Delete" onClick={stopAndDelete}>
          🗑
        </TrashButton>
      </RowMeta>
    </Row>
  );
}
