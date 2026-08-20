import { z } from "zod";

export const errorCategorySchema: z.ZodEnum<["validation", "authorization", "not_found", "conflict", "rate_limit", "upstream", "internal"]>;
export const operationErrorSchema: z.ZodType<{
  code: string;
  category: "validation" | "authorization" | "not_found" | "conflict" | "rate_limit" | "upstream" | "internal";
  message: string;
  retryable: boolean;
  hint?: string;
  invalidFields?: string[];
}>;
export type OperationError = z.infer<typeof operationErrorSchema>;
export const errorEnvelopeSchema: z.ZodType<{ success: false; error: OperationError }>;
export const successEnvelopeSchema: z.ZodType<{ success: true; data: unknown }>;
export const loginOutputSchema: z.ZodType<{ token: string; user: { id: string; email: string; [key: string]: unknown }; [key: string]: unknown }>;
export const emptyInputSchema: z.ZodType<{}>;
export const basketDetailInputSchema: z.ZodType<{ basketId: string }>;
export const mapPluggyInvestmentInputSchema: z.ZodType<{ investmentId: string; assetId?: string; resolution?: "MAPEADO" | "FORA_DA_ESTRATEGIA"; reason?: string }>;
export const operationCatalog: Readonly<Record<string, { name: string; description: string; path: string; method: "GET" | "POST"; inputSchema: z.ZodTypeAny; outputSchema: z.ZodTypeAny }>>;
export const responseSchemaCatalog: Readonly<Record<string, z.ZodTypeAny>>;
export function operationPath(operation: string, input?: unknown): string;
export function operationFailure(code: string, category: OperationError["category"], message: string, retryable: boolean, details?: Partial<OperationError>): Error & { operationError: OperationError };
export function toOperationError(value: unknown, fallback?: Partial<OperationError>): OperationError;
export function errorEnvelope(error: unknown): { success: false; error: OperationError };
export function mcpErrorResult(error: unknown, fallback?: Partial<OperationError>): { content: Array<{ type: "text"; text: string }>; isError: true };
export function executeMcpReadOperation(operation: string, input: unknown, request: (path: string, operation: string, body?: unknown) => Promise<{ ok: boolean; data?: unknown; operationError?: OperationError }>): Promise<{ content: Array<{ type: "text"; text: string }>; isError?: true }>;
export function executeCliReadOperation(operation: string, input: unknown, request: (path: string, operation: string, body?: unknown) => Promise<{ ok: boolean; data?: unknown; operationError?: OperationError }>): Promise<{ success: true; data: unknown }>;
export function operationToMcpTool(contract: (typeof operationCatalog)[string]): { name: string; description: string; inputSchema: object };
