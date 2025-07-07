export const PRECIOS = {
  soda: 50,
  bidon10: 300,
  bidon20: 500
} as const;

// Tipos para los precios
export type PreciosConfig = typeof PRECIOS; 