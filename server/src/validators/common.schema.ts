import { z } from 'zod';

const MAX_INT4 = 2_147_483_647;

// Para IDs enteros que vienen en JSON (body)
export const intId = (msg = 'ID inválido') =>
  z.number({ message: msg }).int(msg).positive(msg).max(MAX_INT4, msg);

// Para IDs enteros que vienen en URL (req.params siempre llega como string)
export const intParamId = (msg = 'ID inválido') =>
  z.string()
    .regex(/^\d+$/, msg)
    .transform(Number)
    .pipe(z.number().int(msg).positive(msg).max(MAX_INT4, msg));

// Para Int? en body (acepta number, string numérico de <select>, '' -> null, null, y respeta undefined en PATCH)
export const nullableIntId = (msg = 'ID inválido') =>
  z.preprocess(
    (val) => {
      if (val === undefined) return undefined;
      if (val === null || (typeof val === 'string' && val.trim() === '')) return null;
      if (typeof val === 'string' && /^\d+$/.test(val.trim())) return Number(val.trim());
      return val;
    },
    z.number({ message: msg }).int(msg).positive(msg).max(MAX_INT4, msg).nullable().optional()
  );