import { useEffect, useState } from "react";
import { Check, Download, Pencil, Paperclip, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { OrgBadge } from "@/components/app/org-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  downloadActionFile,
  formatFileSize,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS,
  readFilesAsActionFiles,
} from "@/lib/files";
import {
  assigneeLabel,
  isInvolvedInAction,
  isOverdue,
  isPersonalAction,
  myTodoContextLabel,
  useDashboardStore,
} from "@/lib/store";
import type { ActionItem } from "@/lib/types";
import { formatDate } from "@/lib/utils";

function typeLabel(action: ActionItem) {
  if (action.type === "personal_task") return "Work task";
  if (action.type === "personal_request") return "Work request";
  if (action.type === "family" || action.type === "todo") return "Family";
  return action.type === "request" ? "Request" : "Task";
}

export function ActionDetailDialog({
  actionId,
  onClose,
  onEdit,
}: {
  actionId: string | null;
  onClose: () => void;
  onEdit?: (action: ActionItem) => void;
}) {
  const actions = useDashboardStore((s) => s.actions);
  const staff = useDashboardStore((s) => s.staff);
  const groups = useDashboardStore((s) => s.groups);
  const myStaffId = useDashboardStore((s) => s.myStaffId);
  const addNote = useDashboardStore((s) => s.addNote);
  const upsertAction = useDashboardStore((s) => s.upsertAction);
  const deleteAction = useDashboardStore((s) => s.deleteAction);
  const toggleActionStatus = useDashboardStore((s) => s.toggleActionStatus);

  const action = actions.find((a) => a.id === actionId) ?? null;
  const [noteText, setNoteText] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setNoteText("");
  }, [actionId]);

  const author = (id: string) => staff.find((s) => s.id === id)?.name ?? "Unknown";
  const isPublisher = Boolean(action && myStaffId && action.createdBy === myStaffId);
  const isInvolved = Boolean(
    action && myStaffId && isInvolvedInAction(action, myStaffId, groups),
  );

  async function onAddNote() {
    if (!action || !myStaffId || !noteText.trim()) return;
    setBusy(true);
    try {
      await addNote(action.id, noteText.trim(), myStaffId);
      setNoteText("");
      toast.success("Note added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not add note");
    } finally {
      setBusy(false);
    }
  }

  async function onAttach(list: FileList | null) {
    if (!action || !list?.length) return;
    if (action.files.length + list.length > MAX_ATTACHMENTS) {
      toast.error(`Maximum ${MAX_ATTACHMENTS} attachments`);
      return;
    }
    setBusy(true);
    try {
      const extra = await readFilesAsActionFiles(list);
      await upsertAction({ ...action, files: [...action.files, ...extra] });
      toast.success(extra.length === 1 ? "Attachment added" : "Attachments added");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not attach file");
    } finally {
      setBusy(false);
    }
  }

  async function onToggle() {
    if (!action) return;
    setBusy(true);
    try {
      await toggleActionStatus(action.id);
      toast.success(action.status === "open" ? "Moved to Closed actions" : "Reopened");
      if (action.status === "open") onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function onDelete() {
    if (!action) return;
    if (!confirm("Delete this item? This cannot be undone.")) return;
    setBusy(true);
    try {
      await deleteAction(action.id);
      toast.success("Deleted");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not delete");
    } finally {
      setBusy(false);
    }
  }

  const overdue = action ? isOverdue(action) : false;

  return (
    <Dialog open={Boolean(actionId)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        {action ? (
          <>
            <DialogHeader>
              <DialogTitle>{action.title}</DialogTitle>
              <DialogDescription>
                Full record — headings, details, notes and attachments. Opening does not complete it.
              </DialogDescription>
            </DialogHeader>

            <div className="flex flex-wrap gap-1.5">
              <Badge variant={action.type === "family" ? "family" : action.type}>
                {typeLabel(action)}
              </Badge>
              {isPersonalAction(action) && (
                <Badge variant={action.type === "family" || action.type === "todo" ? "family" : "hh"}>
                  {myTodoContextLabel(action)}
                </Badge>
              )}
              <Badge variant={action.status}>{action.status}</Badge>
              {overdue && <Badge variant="overdue">Overdue</Badge>}
              <OrgBadge org={action.organisation} />
            </div>

            <dl className="grid gap-3 rounded-xl border border-border bg-secondary/30 p-3 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Type
                </dt>
                <dd className="mt-0.5 font-medium text-hh-navy">{typeLabel(action)}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Status
                </dt>
                <dd className="mt-0.5 font-medium text-hh-navy">
                  {action.status === "closed" ? "Closed" : overdue ? "Open — overdue" : "Open"}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Assigned to
                </dt>
                <dd className="mt-0.5 font-medium text-hh-navy">
                  {assigneeLabel(staff, groups, action.assigneeId)}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Posted by
                </dt>
                <dd className="mt-0.5 font-medium text-hh-navy">{author(action.createdBy)}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Date received
                </dt>
                <dd className="mt-0.5 text-hh-navy">{formatDate(action.createdAt)}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Due date
                </dt>
                <dd className={`mt-0.5 ${overdue ? "font-semibold text-destructive" : "text-hh-navy"}`}>
                  {formatDate(action.dueDate)}
                </dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Details
                </dt>
                <dd className="mt-0.5 whitespace-pre-wrap text-hh-navy">
                  {action.description.trim() || "—"}
                </dd>
              </div>
            </dl>

            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Attachments ({action.files.length})
                </Label>
                {isInvolved && (
                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                    <Paperclip className="size-3.5" />
                    Add file
                    <input
                      type="file"
                      multiple
                      className="sr-only"
                      disabled={busy}
                      onChange={(e) => {
                        void onAttach(e.target.files);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
              {action.files.length === 0 ? (
                <p className="text-sm text-muted-foreground">No attachments yet.</p>
              ) : (
                <ul className="space-y-1.5">
                  {action.files.map((f, i) => (
                    <li
                      key={`${f.name}-${i}`}
                      className="flex items-center justify-between gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm"
                    >
                      <span className="min-w-0 truncate">
                        <Paperclip className="mr-1.5 inline size-3.5 text-muted-foreground" />
                        {f.name}
                        <span className="ml-2 text-xs text-muted-foreground">
                          {formatFileSize(f.size)}
                        </span>
                      </span>
                      {f.dataUrl ? (
                        <Button size="sm" variant="ghost" onClick={() => downloadActionFile(f)}>
                          <Download className="size-3.5" />
                          Download
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">No file data</span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[11px] text-muted-foreground">
                Up to {MAX_ATTACHMENTS} files, {MAX_ATTACHMENT_BYTES / (1024 * 1024)} MB each.
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Notes ({action.notes.length})
              </Label>
              {action.notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">No notes yet.</p>
              ) : (
                <ul className="max-h-48 space-y-2 overflow-y-auto">
                  {action.notes.map((n) => (
                    <li key={n.id} className="rounded-lg border border-border bg-card px-3 py-2">
                      <p className="whitespace-pre-wrap text-sm">{n.text}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {author(n.authorId)} · {formatDate(n.createdAt.slice(0, 10))}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
              <Textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add a note…"
                rows={3}
              />
              <Button
                size="sm"
                variant="secondary"
                disabled={!noteText.trim() || !myStaffId || busy}
                onClick={() => void onAddNote()}
              >
                Add note
              </Button>
            </div>

            <DialogFooter className="gap-2 sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {isPublisher && (
                  <>
                    <Button
                      variant="outline"
                      disabled={busy}
                      onClick={() => {
                        onEdit?.(action);
                        onClose();
                      }}
                    >
                      <Pencil className="size-3.5" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      className="text-destructive"
                      disabled={busy}
                      onClick={() => void onDelete()}
                    >
                      <Trash2 className="size-3.5" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={onClose}>
                  Close window
                </Button>
                {isInvolved &&
                  (action.status === "open" ? (
                    <Button disabled={busy} onClick={() => void onToggle()}>
                      <Check className="size-3.5" />
                      Mark complete
                    </Button>
                  ) : (
                    <Button variant="secondary" disabled={busy} onClick={() => void onToggle()}>
                      <RotateCcw className="size-3.5" />
                      Reopen
                    </Button>
                  ))}
              </div>
            </DialogFooter>
          </>
        ) : (
          <DialogHeader>
            <DialogTitle>Item not found</DialogTitle>
          </DialogHeader>
        )}
      </DialogContent>
    </Dialog>
  );
}
