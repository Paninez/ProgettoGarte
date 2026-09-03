export const formatStatoHuman = (stato?: string) => {
  if (!stato) return "";
  return stato.replace(/_/g, " ");
};
