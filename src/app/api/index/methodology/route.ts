import { INDEX_V1_METHOD } from "@/lib/index/methodology";

import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    methodology: INDEX_V1_METHOD,
    generatedAt: new Date().toISOString(),
  });
}
