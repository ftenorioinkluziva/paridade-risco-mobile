import { errorEnvelope, operationErrorSchema, type OperationError } from "@paridade-risco/shared";
import { NextResponse } from "next/server";

export function operationErrorResponse(error: OperationError, status: number) {
  return NextResponse.json(errorEnvelope(operationErrorSchema.parse(error)), { status });
}
