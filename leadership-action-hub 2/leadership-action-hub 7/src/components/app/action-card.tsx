import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { OrgBadge } from "@/components/app/org-badge";
import {
  assigneeLabel,
  isInvolvedInAction,
  isOverdue,
  isPersonalAction,
  myTodoContext,
  myTodoContextLabel,
  personalKindLabel,
  useDashboardStore,
} from "@/lib/store";
import type { ActionItem } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import {
  ChevronDown,
  ChevronUp,
  MessageSquareText,
  Paperclip,
  Pencil,
  RotateCcw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

export function ActionCard({
  action,
  onOpen,
  onEdit,
}: {
  action: ActionItem;
  onOpen?: () => void;
  onEdit?: (action: ActionItem) => void;
}) {
  const staff = useDashboardStore((s) => s.staff);
  const groups = useDashboardStore((s) => s.groups);
  const myStaffId = useDashboardStore((s) => s.myStaffId);
  const toggleActionStatus = useDashboardStore((s) => s.toggleActionStatus);
  const deleteAction = useDashboardStore((s) => s.deleteAction);
  const addNote = useDashboardStore((s) => s.addNote);
  const [openNotes, setOpenNotes] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [busy, setBusy] = useState(false);

  const overdue = isOverdue(action);
  const author = (id: string) => staff.find((s) => s.id === id)?.name ?? "Unknown";
  const isPublisher = Boolean(myStaffId && action.createdBy === myStaffId);
  const isInvolved = Boolean(myStaffId && isInvolvedInAction(action, myStaffId, groups));

  return (
    <div
      role={onOpen ? "button" : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen}
      onKeyDown={
        onOpen
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onOpen();
              }
            }
          : undefined
      }
      className={`rounded-xl border border-border bg-card p-4 shadow-sm border-l-4 ${
        onOpen ? "cursor-pointer transition hover:border-primary/40 hover:shadow-md" : ""
      } ${
        action.status === "closed"
          ? "border-l-success"
          : overdue
            ? "border-l-destructive"
            : "border-l-primary"
      }`}
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <h3 className="text-sm font-semibold text-hh-navy underline-offset-2 hover:underline">
              {action.title}
            </h3>
            {isPersonalAction(action) ? (
              <>
                <Badge
                  variant={myTodoContext(action) === "personal" ? "family" : "hh"}
                >
                  {myTodoContextLabel(action)}
                </Badge>
                {personalKindLabel(action) !== "family" && (
                  <Badge
                    variant={
                      personalKindLabel(action) === "request" ? "request" : "task"
                    }
                  >
                    {personalKindLabel(action)}
                  </Badge>
                )}
              </>
            ) : (
              <Badge variant={action.type === "family" ? "family" : action.type}>
                {action.type}
              </Badge>
            )}
            <Badge variant={action.status}>{action.status}</Badge>
            {overdue && <Badge variant="overdue">Overdue</Badge>}
            <OrgBadge org={action.organisation} />
          </div>
          {action.description ? (
            <p className="text-sm text-muted-foreground">{action.description}</p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            Assigned to {assigneeLabel(staff, groups, action.assigneeId)} · Due{" "}
            {formatDate(action.dueDate)} · by {author(action.createdBy)}
            {action.files.length > 0 ? (
              <>
                {" "}
                · <Paperclip className="inline size-3" /> {action.files.length} file
                {action.files.length === 1 ? "" : "s"}
              </>
            ) : null}
          </p>
        </div>
        <div
          className="flex shrink-0 flex-wrap gap-2"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          {onOpen && (
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onOpen();
              }}
            >
              View
            </Button>
          )}
          {isPublisher && onEdit && action.status === "open" && (
            <Button size="sm" variant="outline" onClick={() => onEdit(action)}>
              <Pencil className="size-3.5" />
              Edit
            </Button>
          )}
          {isPublisher && (
            <Button
              size="sm"
              variant="ghost"
              className="text-destructive"
              disabled={busy}
              onClick={async () => {
                if (!confirm("Delete this item? This cannot be undone.")) return;
                setBusy(true);
                try {
                  await deleteAction(action.id);
                  toast.success("Deleted");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Could not delete");
                } finally {
                  setBusy(false);
                }
              }}
            >
              <Trash2 className="size-3.5" />
              Delete
            </Button>
          )}
          {isInvolved && action.status === "closed" && (
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={busy}
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setBusy(true);
                  try {
                    await toggleActionStatus(action.id);
                    toast.success("Reopened");
                  } catch (err) {
                    toast.error(err instanceof Error ? err.message : "Update failed");
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                <RotateCcw className="size-3.5" />
                Re-open
              </Button>
            )}
          <Button size="sm" variant="ghost" onClick={() => setOpenNotes((v) => !v)}>
            <MessageSquareText className="size-3.5" />
            Notes ({action.notes.length})
            {openNotes ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </Button>
        </div>
      </div>

      {openNotes && (
        <div
          className="mt-4 space-y-3 rounded-lg border border-border bg-secondary/40 p-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Notes on this request
          </div>
          {action.notes.length === 0 ? (
            <p className="text-sm text-muted-foreground">No notes yet. Add free-text context here.</p>
          ) : (
            <ul className="space-y-2">
              {action.notes.map((n) => (
                <li key={n.id} className="rounded-lg border border-border bg-card px-3 py-2">
                  <p className="whitespace-pre-wrap text-sm text-foreground">{n.text}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {author(n.authorId)} · {formatDate(n.createdAt.slice(0, 10))}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <div className="space-y-2">
            <Textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a free-text note…"
              rows={3}
            />
            <Button
              size="sm"
              disabled={!noteText.trim() || !myStaffId || busy}
              onClick={async () => {
                if (!myStaffId) return;
                setBusy(true);
                try {
                  await addNote(action.id, noteText, myStaffId);
                  setNoteText("");
                  toast.success("Note added");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Could not add note");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Add note
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}