import { GradingGroup, GradingItem, ListinoGradingItem } from "../../types";

export function getDirectImageUrl(url: string): string {
  if (!url) return "";
  const trimmed = url.trim();
  if (trimmed.startsWith("blob:") || trimmed.startsWith("data:")) {
    return trimmed;
  }
  if (trimmed.includes("drive.google.com")) {
    let fileId = "";
    const fileDMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
    if (fileDMatch && fileDMatch[1]) {
      fileId = fileDMatch[1];
    } else {
      const idParamMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
      if (idParamMatch && idParamMatch[1]) {
        fileId = idParamMatch[1];
      }
    }
    if (fileId) {
      return `https://lh3.googleusercontent.com/d/${fileId}`;
    }
  }
  return trimmed;
}

export interface GradingDashboardProps {
  onSaveGroup: (group: GradingGroup) => Promise<void>;
  onAssignCards: (groupId: string, cardIds: string[]) => Promise<void>;
  onUpdateCard?: (cardId: string, updates: Partial<GradingItem>) => Promise<void>;
  onUploadPhoto?: (file: File, folderType?: string, customName?: string, subFolderName?: string) => Promise<string>;
  onSaveListino: (items: ListinoGradingItem[]) => Promise<void>;
}
