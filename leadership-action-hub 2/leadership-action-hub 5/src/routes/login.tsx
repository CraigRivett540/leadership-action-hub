import { createFileRoute, Navigate } from "@tanstack/react-router";

/** Legacy /login → home sign-in screen */
export const Route = createFileRoute("/login")({
  component: () => <Navigate to="/" />,
});
