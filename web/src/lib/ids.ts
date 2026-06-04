// Client-side temporary IDs (e.g. for new product rows in a form before save).
// Postgres assigns the real UUID on insert.
export const tempId = (prefix = 'tmp') =>
  `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
