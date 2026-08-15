import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { assigneeLabel, isOverdue, useDashboardStore } from "@/lib/store";
import { formatDate } from "@/lib/utils";

export function ActionDetailDialog({
  actionId,
  onClose,
  onEdit,
}: {
  actionId: string | null;
  onClose: () => void;
  onEdit?: (action: { id: string; createdBy: string }) => void;
}) {
  const actions = useDashboardStore((s) => s.actions);
  const staff = useDashboardStore((s) => s.staff);
  const groups = useDashboardStore((s) => s.groups);
  const myStaffId = useDashboardStore((s) => s.myStaffId);
  const toggleActionStatus = useDashboardStore((s) => s.toggleActionStatus);
  const deleteAction = useDashboardStore((s) => s.deleteAction);
  const action = actions.find((a) => a.id === actionId) ?? null;
  const isPublisher = Boolean(action && myStaffId && action.createdBy === myStaffId);

  return (
    <Dialog open={Boolean(actionId)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-2xl"
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        {action ? (
          <>
            <DialogHeader>
              <DialogTitle>{action.title}</DialogTitle>
              <DialogDescription>
                Full record. Opening does not complete this action.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Attributed to: </span>
                {assigneeLabel(staff, groups, action.assigneeId)}
              </p>
              <p>
                <span className="font-medium">Due: </span>
                {formatDate(action.dueDate)}
                {isOverdue(action) ? " (overdue)" : ""}
              </p>
              {action.description ? (
                <p className="whitespace-pre-wrap text-muted-foreground">{action.description}</p>
              ) : null}
            </div>
            <DialogFooter className="gap-2 sm:justify-between">
              <div className="flex flex-wrap gap-2">
                {isPublisher && onEdit && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      onEdit(action);
                      onClose();
                    }}
                  >
                    Edit
                  </Button>
                )}
                {isPublisher && (
                  <Button
                    variant="ghost"
                    className="text-destructive"
                    onClick={() => {
                      if (confirm("Delete this item?")) void deleteAction(action.id).then(onClose);
                    }}
                  >
                    Delete
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={onClose}>
                  Close window
                </Button>
                <Button onClick={() => void toggleActionStatus(action.id)}>
                  {action.status === "open" ? "Mark completed" : "Mark current"}
                </Button>
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
