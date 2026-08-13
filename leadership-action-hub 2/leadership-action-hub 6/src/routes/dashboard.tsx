import { createFileRoute } from "@tanstack/react-router";
import { DashboardShell } from "@/components/app/dashboard-shell";

export const Route = createFileRoute("/dashboard")({
  component: DashboardShell,
});
