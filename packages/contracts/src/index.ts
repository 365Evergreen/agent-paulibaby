import { z } from "zod";

export type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export const jsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.null(),
    z.boolean(),
    z.number().finite(),
    z.string(),
    z.array(jsonValueSchema),
    z.record(z.string(), jsonValueSchema),
  ]),
);

export const agentErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string().min(1),
  retryable: z.boolean(),
  details: jsonValueSchema.optional(),
});

export const apiErrorResponseSchema = z.object({
  error: agentErrorSchema,
});

export const delegationRequestSchema = z.object({
  requestId: z.string().min(1),
  specialistId: z.string().regex(/^[a-z][a-z0-9-]*$/),
  conversationId: z.string().min(1).optional(),
  input: jsonValueSchema,
});

export const delegationResultSchema = z.discriminatedUnion("status", [
  z.object({
    requestId: z.string().min(1),
    status: z.literal("completed"),
    output: jsonValueSchema,
  }),
  z.object({
    requestId: z.string().min(1),
    status: z.literal("failed"),
    error: agentErrorSchema,
  }),
]);

export const chatStreamEventSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text_delta"),
    requestId: z.string().min(1),
    sequence: z.number().int().nonnegative(),
    text: z.string().min(1),
  }),
  z.object({
    type: z.literal("completed"),
    requestId: z.string().min(1),
    sequence: z.number().int().nonnegative(),
  }),
  z.object({
    type: z.literal("error"),
    requestId: z.string().min(1),
    sequence: z.number().int().nonnegative(),
    error: agentErrorSchema,
  }),
]);

export const pendingApprovalSchema = z.object({
  executionId: z.string().min(1),
  seq: z.number().int().nonnegative(),
  connector: z.string().min(1),
  method: z.string().min(1),
  args: jsonValueSchema,
});

export const pendingApprovalsSchema = z.array(pendingApprovalSchema);

export const approvalCommandSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    executionId: z.string().min(1),
  }),
  z.object({
    action: z.literal("reject"),
    executionId: z.string().min(1),
    seq: z.number().int().nonnegative(),
  }),
]);

export type AgentError = z.infer<typeof agentErrorSchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
export type DelegationRequest = z.infer<typeof delegationRequestSchema>;
export type DelegationResult = z.infer<typeof delegationResultSchema>;
export type ChatStreamEvent = z.infer<typeof chatStreamEventSchema>;
export type PendingApproval = z.infer<typeof pendingApprovalSchema>;
export type ApprovalCommand = z.infer<typeof approvalCommandSchema>;
