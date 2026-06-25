export const DEFAULT_DRIVER_SCORE = 100;

/** Kayıt sonrası gösterim — null/undefined ise 100. */
export const displayDriverScore = (score: number | null | undefined): number =>
  score ?? DEFAULT_DRIVER_SCORE;
