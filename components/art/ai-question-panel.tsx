"use client";

import { CopilotDemo } from "@/components/copilot-demo";

// GROUNDED PRODUCT Q&A: the shared Copilot keeps this product-route contract.
export function AiQuestionPanel({ productId }: { productId: string }) {
  return <CopilotDemo productId={productId} />;
}
