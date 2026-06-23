import { z } from "zod";

export const transactionTypeSchema = z.enum(["COMPRA", "VENDA"]);
export const basketStatusSchema = z.enum(["ATIVA", "RASCUNHO"]);
export const assetTypeSchema = z.enum(["ETF", "RENDA_FIXA", "CRYPTO", "COMMODITY", "CAIXA", "OUTRO"]);

export const createTransactionSchema = z.object({
  assetTicker: z.string().min(1).max(16),
  type: transactionTypeSchema,
  shares: z.number().positive(),
  pricePerShare: z.number().positive(),
  tradedAt: z.string().min(1),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const basketAllocationSchema = z.object({
  assetTicker: z.string().min(1).max(16),
  targetPercentage: z.number().min(0).max(100),
});

export const updateBasketSchema = z.object({
  name: z.string().min(1).max(80),
  allocations: z.array(basketAllocationSchema).min(1),
});

export type TransactionType = z.infer<typeof transactionTypeSchema>;
export type BasketStatus = z.infer<typeof basketStatusSchema>;
export type AssetType = z.infer<typeof assetTypeSchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export const createBasketSchema = z.object({
  name: z.string().min(1).max(80),
  allocations: z.array(basketAllocationSchema).min(1),
});

export type UpdateBasketInput = z.infer<typeof updateBasketSchema>;
export type CreateBasketInput = z.infer<typeof createBasketSchema>;