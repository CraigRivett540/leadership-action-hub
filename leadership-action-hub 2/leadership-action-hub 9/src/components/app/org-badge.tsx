import { Badge } from "@/components/ui/badge";
import type { OrgKey } from "@/lib/types";

const labels: Record<OrgKey, string> = {
  hh: "Helping Heroes",
  ca: "Community Assist",
  both: "Both orgs",
};

export function OrgBadge({ org }: { org: OrgKey }) {
  return <Badge variant={org}>{labels[org]}</Badge>;
}

export function orgShort(org: OrgKey) {
  return org === "hh" ? "HH" : org === "ca" ? "CA" : "Both";
}
