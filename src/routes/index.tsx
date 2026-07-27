import { createFileRoute } from "@tanstack/react-router";
import { ModelPricingTable } from "@/components/model-pricing-table";

export const Route = createFileRoute("/")({
  component: ModelPricingTable,
});
