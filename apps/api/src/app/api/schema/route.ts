import { NextResponse } from "next/server";

import {
  assetTypeSchema,
  basketStatusSchema,
  transactionTypeSchema,
} from "@paridade-risco/shared";

export async function GET() {
  return NextResponse.json({
    transactionTypes: transactionTypeSchema.options,
    basketStatuses: basketStatusSchema.options,
    assetTypes: assetTypeSchema.options,
  });
}
