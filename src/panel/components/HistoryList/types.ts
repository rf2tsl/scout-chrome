// scout-chrome/src/panel/components/HistoryList/types.ts
export interface HistoryListRowData {
  id: number;
  title: string;
  subtitle: string;
  badge?: { text: string; tone: "success" | "warn" | "error" | "neutral" };
  dateLabel: string;
}
