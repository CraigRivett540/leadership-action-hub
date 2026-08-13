import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { ActionDetailDialog } from "@/components/app/action-detail-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  assigneeLabel,
  isOverdue,
  isTeamAction,
  visibleActionsForViewer,
  useDashboardStore,
} from "@/lib/store";
import type { ActionItem, StaffProfile } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

type SortKey = "received" | "due" | "task" | "type" | "member" | "status";
type SortDir = "asc" | "desc";

function statusLabel(a: ActionItem) {
  if (a.status === "closed") return "Completed";
  if (isOverdue(a)) return "Overdue";
  return "Open";
}

function statusTone(a: ActionItem): "open" | "closed" | "overdue" {
  if (a.status === "closed") return "closed";
  if (isOverdue(a)) return "overdue";
  return "open";
}

export function OverviewActionsTable({
  profile,
  isAdmin,
  onEdit,
}: {
  profile: StaffProfile;
  isAdmin: boolean;
  onEdit?: (action: ActionItem) => void;
}) {
  const staff = useDashboardStore((s) => s.staff);
  const groups = useDashboardStore((s) => s.groups);
  const actions = useDashboardStore((s) => s.actions);

  const [typeFilter, setTypeFilter] = useState<"all" | "task" | "request">("all");
  const [statusFilter, setStatusFilter] = useState<"open" | "overdue">("open");
  const [memberFilter, setMemberFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("due");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [detailId, setDetailId] = useState<string | null>(null);

  const teamStaff = staff.filter((s) => s.active);

  const baseList = useMemo(() => {
    return visibleActionsForViewer(actions, profile.id, groups)
      .filter(isTeamAction)
      .filter((a) => a.status === "open");
  }, [actions, profile.id, groups]);

  const rows = useMemo(() => {
    let list = [...baseList];
    if (statusFilter === "overdue") list = list.filter(isOverdue);
    if (typeFilter !== "all") list = list.filter((a) => a.type === typeFilter);
    if (memberFilter !== "all") {
      list = list.filter((a) => {
        if (a.assigneeId === memberFilter) return true;
        const g = groups.find((x) => x.id === a.assigneeId);
        return Boolean(g?.memberIds.includes(memberFilter));
      });
    }

    const dir = sortDir === "asc" ? 1 : -1;
    list.sort((a, b) => {
      const memberA = assigneeLabel(staff, groups, a.assigneeId);
      const memberB = assigneeLabel(staff, groups, b.assigneeId);
      let cmp = 0;
      switch (sortKey) {
        case "received":
          cmp = (a.createdAt || "").localeCompare(b.createdAt || "");
          break;
        case "due":
          cmp = (a.dueDate ?? "9999-99-99").localeCompare(b.dueDate ?? "9999-99-99");
          break;
        case "task":
          cmp = a.title.localeCompare(b.title);
          break;
        case "type":
          cmp = a.type.localeCompare(b.type);
          break;
        case "member":
          cmp = memberA.localeCompare(memberB);
          break;
        case "status":
          cmp = statusLabel(a).localeCompare(statusLabel(b));
          break;
      }
      return cmp * dir;
    });
    return list;
  }, [
    baseList,
    statusFilter,
    typeFilter,
    memberFilter,
    sortKey,
    sortDir,
    staff,
    groups,
  ]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  function SortBtn({ k, label }: { k: SortKey; label: string }) {
    const active = sortKey === k;
    return (
      <button
        type="button"
        onClick={() => toggleSort(k)}
        className={cn(
          "inline-flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wide transition",
          active ? "text-hh-navy" : "text-muted-foreground hover:text-hh-navy",
        )}
      >
        {label}
        {active ? (
          sortDir === "asc" ? (
            <ArrowUp className="size-3" />
          ) : (
            <ArrowDown className="size-3" />
          )
        ) : (
          <ArrowUpDown className="size-3 opacity-50" />
        )}
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Filter</span>
        {(["open", "overdue"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={statusFilter === f ? "default" : "outline"}
            onClick={() => setStatusFilter(f)}
          >
            {f[0]!.toUpperCase() + f.slice(1)}
          </Button>
        ))}
        <span className="mx-1 h-4 w-px bg-border" />
        {(["all", "task", "request"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={typeFilter === f ? "secondary" : "outline"}
            onClick={() => setTypeFilter(f)}
          >
            {f === "all" ? "All types" : f[0]!.toUpperCase() + f.slice(1) + "s"}
          </Button>
        ))}
        {isAdmin && (
          <>
            <span className="mx-1 h-4 w-px bg-border" />
            <select
              className="h-8 rounded-md border border-input bg-card px-2 text-xs font-medium"
              value={memberFilter}
              onChange={(e) => setMemberFilter(e.target.value)}
            >
              <option value="all">All team members</option>
              {teamStaff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </>
        )}
      </div>

      <Card className="overflow-hidden shadow-sm">
        <CardContent className="p-0">
          <div className="border-b border-border px-4 py-3">
            <h3 className="text-sm font-semibold text-hh-navy">
              Actions required{" "}
              <span className="font-normal text-muted-foreground">(live)</span>
            </h3>
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-secondary/40">
                  <th className="px-4 py-2.5">
                    <SortBtn k="task" label="Action" />
                  </th>
                  <th className="px-3 py-2.5">
                    <SortBtn k="type" label="Type" />
                  </th>
                  <th className="px-3 py-2.5">
                    <SortBtn k="member" label="Team member" />
                  </th>
                  <th className="px-3 py-2.5">
                    <SortBtn k="received" label="Received" />
                  </th>
                  <th className="px-3 py-2.5">
                    <SortBtn k="due" label="Due" />
                  </th>
                  <th className="px-3 py-2.5">
                    <SortBtn k="status" label="Status" />
                  </th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                    View
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((a) => {
                  const overdue = isOverdue(a);
                  return (
                    <tr
                      key={a.id}
                      className={cn(
                        "group cursor-pointer border-b border-border/80 last:border-0 transition hover:bg-secondary/30",
                        overdue && "bg-destructive/[0.03]",
                      )}
                      onClick={() => setDetailId(a.id)}
                    >
                      <td className="px-4 py-3">
                      <div className="font-medium text-hh-navy underline-offset-2 group-hover:underline">
                        {a.title}
                      </div>
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={a.type}>{a.type}</Badge>
                      </td>
                      <td className="px-3 py-3 text-muted-foreground">
                        {assigneeLabel(staff, groups, a.assigneeId)}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-muted-foreground">
                        {formatDate(a.createdAt)}
                      </td>
                      <td
                        className={cn(
                          "px-3 py-3 tabular-nums",
                          overdue
                            ? "font-semibold text-destructive"
                            : "text-muted-foreground",
                        )}
                      >
                        {formatDate(a.dueDate)}
                      </td>
                      <td className="px-3 py-3">
                        <Badge variant={statusTone(a)}>{statusLabel(a)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          aria-label={`View record: ${a.title}`}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDetailId(a.id);
                          }}
                        >
                          View
                        </Button>
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-sm text-muted-foreground"
                    >
                      No actions match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="divide-y divide-border md:hidden">
            {rows.map((a) => {
              const overdue = isOverdue(a);
              return (
                <div
                  key={a.id}
                  role="button"
                  tabIndex={0}
                  className={cn(
                    "cursor-pointer space-y-2 px-4 py-3 transition hover:bg-secondary/30",
                    overdue && "bg-destructive/[0.03]",
                  )}
                  onClick={() => setDetailId(a.id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setDetailId(a.id);
                    }
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="font-medium text-hh-navy">{a.title}</div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        <Badge variant={a.type}>{a.type}</Badge>
                        <Badge variant={statusTone(a)}>{statusLabel(a)}</Badge>
                      </div>
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      aria-label={`View record: ${a.title}`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setDetailId(a.id);
                      }}
                    >
                      View
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs text-muted-foreground">
                    <span>Member: {assigneeLabel(staff, groups, a.assigneeId)}</span>
                    <span>Received: {formatDate(a.createdAt)}</span>
                    <span className={overdue ? "font-semibold text-destructive" : undefined}>
                      Due: {formatDate(a.dueDate)}
                    </span>
                  </div>
                </div>
              );
            })}
            {rows.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No actions match this filter.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <ActionDetailDialog
        actionId={detailId}
        onClose={() => setDetailId(null)}
        onEdit={onEdit}
      />
    </div>
  );
}
