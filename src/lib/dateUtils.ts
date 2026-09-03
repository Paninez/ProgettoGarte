export function isDataImmediata(dataStr: string | undefined | null): boolean {
  if (!dataStr) return false;
  const s = dataStr.trim().toLowerCase();
  if (s === "immediata") return true;

  const parts = dataStr.split("/");
  if (parts.length === 3) {
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);

    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      const targetDate = new Date(year, month, day);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (targetDate <= today) {
        return true;
      }
    }
  } else {
    // Fallback if they enter YYYY-MM-DD manually
    const d = new Date(dataStr);
    if (!isNaN(d.getTime())) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (d <= today) {
        return true;
      }
    }
  }

  return false;
}
