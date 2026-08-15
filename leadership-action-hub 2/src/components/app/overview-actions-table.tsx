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
export type OverviewFocus = "all" | "work" | "todo" | "personal";

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

function openRecord(onOpen: (id: string) => void, id: string) {
  window.setTimeout(() => onOpen(id), 0);
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
              <th className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                View
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
                    "border-b border-border/80 last:border-0 transition hover:bg-secondary/30",
                    overdue && "bg-destructive/[0.03]",
                  )}
                >
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="text-left font-medium text-hh-navy underline-offset-2 hover:underline"
                      onClick={() => openRecord(onOpen, a.id)}
                    >
                      {a.title}
                    </button>
                  </td>
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
                  <td className="px-3 py-3 text-right">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => openRecord(onOpen, a.id)}
                    >
                      View
                    </Button>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
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
              onClick={() => openRecord(onOpen, a.id)}
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
  onOpenAction,
  focus,
}: {
  profile: StaffProfile;
  isAdmin: boolean;
  onEdit?: (action: ActionItem) => void;
  onOpenAction?: (id: string) => void;
  focus?: OverviewFocus;
}) {
  const groups = useDashboardStore((s) => s.groups);
  const actions = useDashboardStore((s) => s.actions);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("open");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [localFocus, setLocalFocus] = useState<OverviewFocus>(focus ?? "all");

  const openAction = (id: string) => {
    if (onOpenAction) onOpenAction(id);
    else setDetailId(id);
  };

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

  const workOpen = visible.filter((a) => isTeamAction(a) && a.status === "open");
  const todoOpen = workTodoItemsForUser(visible, profile.id).filter((a) => a.status === "open");
  const personalOpen = familyItemsForUser(visible, profile.id).filter((a) => a.status === "open");
  const allCurrent = workOpen.length + todoOpen.length + personalOpen.length;
  const activeFocus = localFocus;
  const showWork = activeFocus === "all" || activeFocus === "work";
  const showTodo = activeFocus === "all" || activeFocus === "todo";
  const showPersonal = isAdmin && (activeFocus === "all" || activeFocus === "personal");

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <button type="button" onClick={() => setLocalFocus("all")} className={cn("rounded-xl border border-primary/20 bg-primary/[0.04] p-3 text-left shadow-sm sm:p-4", activeFocus === "all" && "ring-2 ring-primary/40")}>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">All current</div>
          <div className="mt-1 text-2xl font-bold text-hh-navy">{allCurrent}</div>
        </button>
        <button type="button" onClick={() => setLocalFocus("work")} className={cn("rounded-xl border border-primary/20 bg-primary/[0.04] p-3 text-left shadow-sm sm:p-4", activeFocus === "work" && "ring-2 ring-primary/40")}>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Work actions</div>
          <div className="mt-1 text-2xl font-bold text-hh-navy">{workOpen.length}</div>
        </button>
        <button type="button" onClick={() => setLocalFocus("todo")} className={cn("rounded-xl border border-amber-500/20 bg-amber-500/[0.06] p-3 text-left shadow-sm sm:p-4", activeFocus === "todo" && "ring-2 ring-primary/40")}>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">My work to do</div>
          <div className="mt-1 text-2xl font-bold text-hh-navy">{todoOpen.length}</div>
        </button>
        {isAdmin ? (
          <button type="button" onClick={() => setLocalFocus("personal")} className={cn("rounded-xl border border-ca-primary/20 bg-ca-primary/[0.05] p-3 text-left shadow-sm sm:p-4", activeFocus === "personal" && "ring-2 ring-primary/40")}>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Personal</div>
            <div className="mt-1 text-2xl font-bold text-hh-navy">{personalOpen.length}</div>
          </button>
        ) : (
          <div className="rounded-xl border border-destructive/20 bg-destructive/[0.04] p-3 shadow-sm sm:p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Overdue</div>
            <div className="mt-1 text-2xl font-bold text-hh-navy">{[...workOpen, ...todoOpen].filter(isOverdue).length}</div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs font-medium text-muted-foreground">Status</span>
        {(["open", "overdue", "completed", "all"] as const).map((f) => (
          <Button key={f} size="sm" variant={statusFilter === f ? "default" : "outline"} onClick={() => setStatusFilter(f)}>
            {f === "all" ? "All" : f[0]!.toUpperCase() + f.slice(1)}
          </Button>
        ))}
      </div>

      {showWork && (
        <Card className="overflow-hidden shadow-sm">
          <CardContent className="p-0">
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-hh-navy">Work actions</h3>
              <p className="text-xs text-muted-foreground">Team tasks and requests</p>
            </div>
            <ActionLines items={work} empty="No work actions in this filter." onOpen={openAction} />
          </CardContent>
        </Card>
      )}

      {showTodo && (
        <Card className="overflow-hidden shadow-sm">
          <CardContent className="p-0">
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-hh-navy">My work to do</h3>
              <p className="text-xs text-muted-foreground">Private work list</p>
            </div>
            <ActionLines items={myTodo} empty="No work to-do items in this filter." onOpen={openAction} />
          </CardContent>
        </Card>
      )}

      {showPersonal && (
        <Card className="overflow-hidden shadow-sm">
          <CardContent className="p-0">
            <div className="border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-hh-navy">Personal</h3>
              <p className="text-xs text-muted-foreground">Craig and Laura only</p>
            </div>
            <ActionLines items={personal} empty="No personal items in this filter." onOpen={openAction} />
          </CardContent>
        </Card>
      )}

      <ActionDetailDialog actionId={detailId} onClose={() => setDetailId(null)} onEdit={onEdit} />
    </div>
  );
}
