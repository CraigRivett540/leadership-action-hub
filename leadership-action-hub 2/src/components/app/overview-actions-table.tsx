import { useMemo, useState } from "react";
import { ActionDetailDialog } from "@/components/app/action-detail-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  assigneeLabel,
  familyItemsForUser,
  isOverdue,
  isTeamAction,
  visibleActionsForViewer,
  workTodoItemsForUser,
  useDashboardStore,
} from "@/lib/store";
import type { ActionItem, StaffProfile } from "@/lib/types";
import { cn, formatDate } from "@/lib/utils";

type StatusFilter = "open" | "overdue" | "completed" | "all";

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

function kindLabel(a: ActionItem) {
  if (a.type === "request" || a.type === "personal_request") return "Request";
  if (a.type === "family" || a.type === "todo") return "Personal";
  return "Task";
}

function applyStatus(list: ActionItem[], filter: StatusFilter) {
  if (filter === "completed") return list.filter((a) => a.status === "closed");
  if (filter === "overdue") return list.filter(isOverdue);
  if (filter === "open") return list.filter((a) => a.status === "open");
  return list;
}

function ActionLines({
  items,
  empty,
  onOpen,
}: {
  items: ActionItem[];
  empty: string;
  onOpen: (id: string) => void;
}) {
  const staff = useDashboardStore((s) => s.staff);
  const groups = useDashboardStore((s) => s.groups);

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40">
              <th className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Action
              </th>
              <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Type
              </th>
              <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Attributed to
              </th>
              <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Due
              </th>
              <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((a) => {
              const overdue = isOverdue(a);
              return (
                <tr
                  key={a.id}
                  className={cn(
                    "cursor-pointer border-b border-border/80 last:border-0 transition hover:bg-secondary/30",
                    overdue && "bg-destructive/[0.03]",
                  )}
                  onClick={() => onOpen(a.id)}
                >
                  <td className="px-4 py-3 font-medium text-hh-navy">{a.title}</td>
                  <td className="px-3 py-3">
                    <Badge variant={a.type === "family" || a.type === "todo" ? "family" : a.type}>
                      {kindLabel(a)}
                    </Badge>
                  </td>
                  <td className="px-3 py-3 text-muted-foreground">
                    {assigneeLabel(staff, groups, a.assigneeId)}
                  </td>
                  <td
                    className={cn(
                      "px-3 py-3 tabular-nums",
                      overdue ? "font-semibold text-destructive" : "text-muted-foreground",
                    )}
                  >
                    {formatDate(a.dueDate)}
                  </td>
                  <td className="px-3 py-3">
                    <Badge variant={statusTone(a)}>{statusLabel(a)}</Badge>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                  {empty}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="divide-y divide-border md:hidden">
        {items.map((a) => {
          const overdue = isOverdue(a);
          return (
            <button
              key={a.id}
              type="button"
              className={cn(
                "block w-full space-y-1.5 px-4 py-3 text-left",
                overdue && "bg-destructive/[0.03]",
              )}
              onClick={() => onOpen(a.id)}
            >
              <div className="font-medium text-hh-navy">{a.title}</div>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant={a.type === "family" || a.type === "todo" ? "family" : a.type}>
                  {kindLabel(a)}
                </Badge>
                <Badge variant={statusTone(a)}>{statusLabel(a)}</Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                {assigneeLabel(staff, groups, a.assigneeId)} · Due {formatDate(a.dueDate)}
              </div>
            </button>
          );
        })}
        {items.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">{empty}</div>
        )}
      </div>
    </>
  );
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
  const groups = useDashboardStore((s) => s.groups);
  const actions = useDashboardStore((s) => s.actions);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [detailId, setDetailId] = useState<string | null>(null);

  const visible = useMemo(
    () => visibleActionsForViewer(actions, profile.id, groups),
    [actions, profile.id, groups],
  );

  const work = useMemo(
    () => applyStatus(visible.filter(isTeamAction), statusFilter),
    [visible, statusFilter],
  );
  const myTodo = useMemo(
    () => applyStatus(workTodoItemsForUser(visible, profile.id), statusFilter),
    [visible, profile.id, statusFilter],
  );
  const personal = useMemo(
    () => applyStatus(familyItemsForUser(visible, profile.id), statusFilter),
    [visible, profile.id, statusFilter],
  );

  const workOpen = visible.filter((a) => isTeamAction(a) && a.status === "open").length;
  const todoOpen = workTodoItemsForUser(visible, profile.id).filter((a) => a.status === "open").length;
  const personalOpen = familyItemsForUser(visible, profile.id).filter((a) => a.status === "open").length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Status</span>
        {(["open", "overdue", "completed", "all"] as const).map((f) => (
          <Button
            key={f}
            size="sm"
            variant={statusFilter === f ? "default" : "outline"}
            onClick={() => setStatusFilter(f)}
          >
            {f === "all" ? "All" : f[0]!.toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      <Card className="overflow-hidden shadow-sm">
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-hh-navy">Work actions</h3>
              <p className="text-xs text-muted-foreground">Team tasks and requests</p>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">{workOpen} open</span>
          </div>
          <ActionLines items={work} empty="No work actions in this filter." onOpen={setDetailId} />
        </CardContent>
      </Card>

      <Card className="overflow-hidden shadow-sm">
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b border-border px-4 py-3">
            <div>
              <h3 className="text-sm font-semibold text-hh-navy">My work to do</h3>
              <p className="text-xs text-muted-foreground">Private work list</p>
            </div>
            <span className="text-xs font-semibold text-muted-foreground">{todoOpen} open</span>
          </div>
          <ActionLines items={myTodo} empty="No work to-do items in this filter." onOpen={setDetailId} />
        </CardContent>
      </Card>

      {isAdmin && (
        <Card className="overflow-hidden shadow-sm">
          <CardContent className="p-0">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <h3 className="text-sm font-semibold text-hh-navy">Personal</h3>
                <p className="text-xs text-muted-foreground">Craig and Laura only</p>
              </div>
              <span className="text-xs font-semibold text-muted-foreground">{personalOpen} open</span>
            </div>
            <ActionLines
              items={personal}
              empty="No personal items in this filter."
              onOpen={setDetailId}
            />
          </CardContent>
        </Card>
      )}

      <ActionDetailDialog
        actionId={detailId}
        onClose={() => setDetailId(null)}
        onEdit={onEdit}
      />
    </div>
  );
}
