import { useEffect, useMemo, useRef, useState } from "react";
import {
  Archive,
  CheckSquare,
  ClipboardList,
  FileText,
  Heart,
  LayoutDashboard,
  ListTodo,
  Paperclip,
  Plus,
  Users,
  UsersRound,
} from "lucide-react";
import { toast } from "sonner";
import { ActionCard } from "@/components/app/action-card";
import { ActionDetailDialog } from "@/components/app/action-detail-dialog";
import { BrandHeader } from "@/components/app/brand-header";
import { OrgBadge } from "@/components/app/org-badge";
import { OverviewActionsTable } from "@/components/app/overview-actions-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import {
  ADMIN_ID,
  familyItemsForUser,
  isFamilyAction,
  isInvolvedInAction,
  isOverdue,
  isTeamAction,
  isWorkTodoAction,
  useDashboardStore,
  visibleActionsForViewer,
  workTodoItemsForUser,
} from "@/lib/store";
import type { ActionFile, ActionItem, ActionType, Group, OrgKey, ReviewItem, StaffProfile } from "@/lib/types";
import { cn, daysFromNow, initials, uid } from "@/lib/utils";
import {
  formatFileSize,
  MAX_ATTACHMENT_BYTES,
  MAX_ATTACHMENTS,
  readFilesAsActionFiles,
} from "@/lib/files";

type View =
  | "overview"
  | "all-actions"
  | "my-todo-work"
  | "family"
  | "staff"
  | "staff-person"
  | "groups"
  | "group-detail"
  | "reviews"
  | "closed-actions";

function isWorkTodoType(t: ActionType) {
  return t === "personal_request" || t === "personal_task";
}

function isFamilyType(t: ActionType) {
  return t === "family" || t === "todo";
}

function isPrivateType(t: ActionType) {
  return isWorkTodoType(t) || isFamilyType(t);
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-border bg-card/50 px-4 py-8 text-center text-sm text-muted-foreground">
      {children}
    </div>
  );
}

function StatCard({
  label,
  value,
  tone = "primary",
}: {
  label: string;
  value: number;
  tone?: "primary" | "danger" | "warning" | "ca";
}) {
  const tones = {
    primary: "border-primary/20 bg-primary/[0.04]",
    danger: "border-destructive/20 bg-destructive/[0.04]",
    warning: "border-amber-500/20 bg-amber-500/[0.06]",
    ca: "border-ca-primary/20 bg-ca-primary/[0.05]",
  };
  return (
    <Card className={cn("shadow-sm", tones[tone])}>
      <CardContent className="p-3 sm:p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </div>
        <div className="mt-1 text-2xl font-bold text-hh-navy">{value}</div>
      </CardContent>
    </Card>
  );
}

export function DashboardShell() {
  const { user, isPending } = useCurrentUserState();
  const ready = useDashboardStore((s) => s.ready);
  const loading = useDashboardStore((s) => s.loading);
  const error = useDashboardStore((s) => s.error);
  const load = useDashboardStore((s) => s.load);
  const myStaffId = useDashboardStore((s) => s.myStaffId);
  const staff = useDashboardStore((s) => s.staff);
  const groups = useDashboardStore((s) => s.groups);
  const actions = useDashboardStore((s) => s.actions);
  const reviews = useDashboardStore((s) => s.reviews);
  const upsertStaff = useDashboardStore((s) => s.upsertStaff);
  const deleteStaff = useDashboardStore((s) => s.deleteStaff);
  const upsertGroup = useDashboardStore((s) => s.upsertGroup);
  const deleteGroup = useDashboardStore((s) => s.deleteGroup);
  const upsertAction = useDashboardStore((s) => s.upsertAction);
  const refreshQuiet = useDashboardStore((s) => s.refreshQuiet);
  const upsertReview = useDashboardStore((s) => s.upsertReview);
  const deleteReview = useDashboardStore((s) => s.deleteReview);

  const [view, setView] = useState<View>("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "open" | "overdue" | "closed">("open");

  const [actionOpen, setActionOpen] = useState(false);
  const [aTitle, setATitle] = useState("");
  const [aDesc, setADesc] = useState("");
  const [aDue, setADue] = useState(daysFromNow(7));
  const [aType, setAType] = useState<ActionType>("task");
  const [aAssignee, setAAssignee] = useState("");
  const [aOrg, setAOrg] = useState<OrgKey>("hh");
  const [aNote, setANote] = useState("");
  const [aFiles, setAFiles] = useState<ActionFile[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const [staffOpen, setStaffOpen] = useState(false);
  const [staffDraft, setStaffDraft] = useState<StaffProfile | null>(null);
  const [groupOpen, setGroupOpen] = useState(false);
  const [groupDraft, setGroupDraft] = useState<Group | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rTitle, setRTitle] = useState("");
  const [rContent, setRContent] = useState("");
  const [rOrg, setROrg] = useState<OrgKey>("both");
  const [lastSync, setLastSync] = useState<string>("");
  const prevOpenCount = useRef<number | null>(null);

  useEffect(() => {
    if (user && !ready && !loading) void load();
  }, [user, ready, loading, load]);

  useEffect(() => {
    if (!user) return;
    const tick = () => {
      void refreshQuiet().then(() => {
        setLastSync(new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
      });
    };
    tick();
    const id = window.setInterval(tick, 8000);
    const onVis = () => {
      if (document.visibilityState === "visible") tick();
    };
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [user, refreshQuiet]);

  const me = useMemo(() => {
    if (myStaffId) return staff.find((s) => s.id === myStaffId) ?? null;
    if (!user) return null;
    const email = (user.primaryEmail ?? "").toLowerCase();
    return staff.find((s) => s.email.toLowerCase() === email) ?? null;
  }, [staff, myStaffId, user]);

  const isAdmin = me?.role === "admin";
  const profile = me;
  const visible = profile
    ? visibleActionsForViewer(actions, profile.id, groups)
    : [];

  const teamStaff = staff
    .filter((s) => s.role === "staff" && s.active)
    .sort((a, b) => a.name.localeCompare(b.name));
  const leadershipStaff = staff
    .filter((s) => s.role === "admin" && s.active)
    .sort((a, b) => a.name.localeCompare(b.name));
  const sidebarPeople = staff
    .filter((s) => s.active && s.id !== profile?.id)
    .filter((s) => !(isAdmin && s.role === "admin"))
    .sort((a, b) => {
      if (a.role !== b.role) return a.role === "admin" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  const openAll = visible.filter((a) => isTeamAction(a) && a.status === "open");
  const overdueAll = openAll.filter(isOverdue);
  const myOpen = profile
    ? openAll.filter((a) => {
        if (a.assigneeId === profile.id) return true;
        const g = groups.find((x) => x.id === a.assigneeId);
        return Boolean(g?.memberIds.includes(profile.id));
      })
    : [];
  const myWorkTodoOpen = profile
    ? workTodoItemsForUser(actions, profile.id).filter((a) => a.status === "open")
    : [];
  const myFamilyOpen = profile
    ? familyItemsForUser(actions, profile.id).filter((a) => a.status === "open")
    : [];

  useEffect(() => {
    const count = openAll.length + myWorkTodoOpen.length + myFamilyOpen.length;
    if (prevOpenCount.current !== null && count > prevOpenCount.current) {
      const n = count - prevOpenCount.current;
      toast.message(n === 1 ? "New action received" : `${n} new actions received`);
    }
    prevOpenCount.current = count;
  }, [openAll.length, myWorkTodoOpen.length, myFamilyOpen.length]);

  const myGroups = profile
    ? groups.filter((g) => g.memberIds.includes(profile.id) || isAdmin)
    : [];

  const filteredActions = useMemo(() => {
    let list = visible.filter(isTeamAction).filter((a) => a.status === "open");
    if (statusFilter === "overdue") list = list.filter(isOverdue);
    return list;
  }, [visible, statusFilter]);

  const closedVisible = profile
    ? visible.filter(
        (a) => a.status === "closed" && isInvolvedInAction(a, profile.id, groups),
      )
    : [];

  type NavItem =
    | { kind: "view"; id: View; label: string; icon: typeof LayoutDashboard }
    | { kind: "staff"; staffId: string; label: string; icon: typeof Users }
    | { kind: "group"; groupId: string; label: string; icon: typeof UsersRound };

  const nav: NavItem[] = isAdmin
    ? [
        { kind: "view", id: "overview", label: "Overview", icon: LayoutDashboard },
        { kind: "view", id: "all-actions", label: "All actions", icon: ClipboardList },
        { kind: "view", id: "my-todo-work", label: "My to do · Work", icon: ListTodo },
        { kind: "view", id: "family", label: "Family", icon: Heart },
        ...sidebarPeople.map((s) => ({
          kind: "staff" as const,
          staffId: s.id,
          label: s.name,
          icon: Users,
        })),
        ...groups.map((g) => ({
          kind: "group" as const,
          groupId: g.id,
          label: g.name,
          icon: UsersRound,
        })),
        { kind: "view", id: "staff", label: "Staff profiles", icon: Users },
        { kind: "view", id: "groups", label: "Groups", icon: UsersRound },
        { kind: "view", id: "reviews", label: "For review", icon: FileText },
        { kind: "view", id: "closed-actions", label: "Closed actions", icon: Archive },
      ]
    : [
        { kind: "view", id: "overview", label: "Overview", icon: LayoutDashboard },
        { kind: "view", id: "all-actions", label: "All actions", icon: CheckSquare },
        { kind: "view", id: "my-todo-work", label: "My to do · Work", icon: ListTodo },
        ...staff
          .filter((s) => s.active && s.id !== profile?.id)
          .sort((a, b) => {
            if (a.role !== b.role) return a.role === "admin" ? -1 : 1;
            return a.name.localeCompare(b.name);
          })
          .map((s) => ({
            kind: "staff" as const,
            staffId: s.id,
            label: s.name,
            icon: Users,
          })),
        ...myGroups.map((g) => ({
          kind: "group" as const,
          groupId: g.id,
          label: g.name,
          icon: UsersRound,
        })),
        { kind: "view", id: "reviews", label: "For review", icon: FileText },
        { kind: "view", id: "closed-actions", label: "Closed actions", icon: Archive },
      ];

  function openNewAction(opts?: {
    prefillAssignee?: string;
    workTodo?: boolean;
    family?: boolean;
    personalKind?: "personal_task" | "personal_request" | "family";
    asRequest?: boolean;
    personalToLeadershipId?: string;
  }) {
    if (!profile) return;
    setATitle("");
    setADesc("");
    setADue(daysFromNow(7));
    setANote("");
    setAFiles([]);
    setEditingId(null);
    if (
      opts?.family ||
      view === "family" ||
      opts?.personalKind === "family"
    ) {
      setAType("family");
      setAAssignee(opts?.personalToLeadershipId ?? profile.id);
      setAOrg("both");
    } else if (
      opts?.workTodo ||
      view === "my-todo-work" ||
      opts?.personalToLeadershipId ||
      opts?.personalKind === "personal_task" ||
      opts?.personalKind === "personal_request"
    ) {
      setAType(opts?.personalKind === "personal_task" ? "personal_task" : "personal_request");
      if (opts?.personalKind === "personal_task") setAType("personal_task");
      else if (opts?.personalKind === "personal_request") setAType("personal_request");
      else setAType("personal_request");
      setAAssignee(opts?.personalToLeadershipId ?? profile.id);
      setAOrg(profile.organisation === "both" ? "hh" : profile.organisation);
    } else {
      // All staff can create team tasks/requests to any person or group
      setAType(opts?.asRequest ? "request" : "task");
      setAAssignee(
        opts?.prefillAssignee ??
          staff.find((s) => s.active && s.id !== profile.id)?.id ??
          profile.id,
      );
      setAOrg(profile.organisation === "both" ? "hh" : profile.organisation);
    }
    setActionOpen(true);
  }

  function openEditAction(action: ActionItem) {
    setEditingId(action.id);
    setATitle(action.title);
    setADesc(action.description);
    setADue(action.dueDate || daysFromNow(7));
    setAType(action.type);
    setAAssignee(action.assigneeId);
    setAOrg(action.organisation);
    setANote("");
    setAFiles(action.files ?? []);
    setActionOpen(true);
  }

  async function saveAction() {
    if (!profile) return;
    if (!aTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    const privateItem = isPrivateType(aType);
    const isFamily = isFamilyType(aType);
    if (!privateItem && !aAssignee) {
      toast.error("Choose an assignee");
      return;
    }
    if (isFamily && !isAdmin) {
      toast.error("Family items are only for leadership");
      return;
    }
    // Work/Family private: leadership can assign to each other; staff always self
    let assignee = profile.id;
    if (privateItem) {
      if (isAdmin && aAssignee && leadershipStaff.some((s) => s.id === aAssignee)) {
        assignee = aAssignee;
      } else {
        assignee = profile.id;
      }
    } else {
      assignee = aAssignee;
    }

    const existing = editingId ? actions.find((a) => a.id === editingId) : null;
    const item: ActionItem = {
      id: existing?.id ?? uid("a"),
      title: aTitle.trim(),
      description: aDesc.trim(),
      status: existing?.status ?? "open",
      dueDate: aDue || null,
      createdAt: existing?.createdAt ?? daysFromNow(0),
      createdBy: existing?.createdBy ?? profile.id,
      assigneeId: assignee,
      type: aType,
      organisation: aOrg,
      notes: existing
        ? aNote.trim()
          ? [
              ...existing.notes,
              {
                id: uid("n"),
                text: aNote.trim(),
                authorId: profile.id,
                createdAt: new Date().toISOString(),
              },
            ]
          : existing.notes
        : aNote.trim()
          ? [
              {
                id: uid("n"),
                text: aNote.trim(),
                authorId: profile.id,
                createdAt: new Date().toISOString(),
              },
            ]
          : [],
      files: aFiles,
    };
    try {
      await upsertAction(item);
      setActionOpen(false);
      setEditingId(null);
      const toOther = privateItem && assignee !== profile.id;
      toast.success(
        existing
          ? "Updated"
          : toOther
          ? isFamily
            ? "Family item sent"
            : "Work item sent to leadership"
          : isFamily
            ? "Added to Family"
            : privateItem
              ? "Added to My to do · Work"
              : "Action created",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function saveStaff() {
    if (!staffDraft) return;
    if (!staffDraft.name.trim() || !staffDraft.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    try {
      await upsertStaff({
        ...staffDraft,
        name: staffDraft.name.trim(),
        email: staffDraft.email.trim().toLowerCase(),
      });
      setStaffOpen(false);
      setStaffDraft(null);
      toast.success("Staff profile saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function saveGroup() {
    if (!groupDraft) return;
    if (!groupDraft.name.trim()) {
      toast.error("Group name is required");
      return;
    }
    try {
      await upsertGroup({
        ...groupDraft,
        name: groupDraft.name.trim(),
        memberIds: groupDraft.memberIds.length ? groupDraft.memberIds : [ADMIN_ID],
      });
      setGroupOpen(false);
      setGroupDraft(null);
      toast.success("Group saved");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  async function saveReview() {
    if (!profile) return;
    if (!rTitle.trim()) {
      toast.error("Title is required");
      return;
    }
    const item: ReviewItem = {
      id: uid("r"),
      title: rTitle.trim(),
      content: rContent.trim(),
      audience: "all",
      createdAt: daysFromNow(0),
      createdBy: profile.id,
      organisation: rOrg,
    };
    try {
      await upsertReview(item);
      setReviewOpen(false);
      setRTitle("");
      setRContent("");
      toast.success("Review item posted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  }

  if (isPending || (user && loading && !ready)) {
    return (
      <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
        Loading workspace…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div className="space-y-2">
          <p className="font-semibold text-hh-navy">Please sign in</p>
          <Button asChild>
            <a href="/">Go to sign in</a>
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div className="space-y-3">
          <p className="font-semibold text-destructive">Could not load the hub</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button onClick={() => void load()}>Try again</Button>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="grid min-h-screen place-items-center p-6 text-center">
        <div className="max-w-md space-y-3">
          <p className="font-semibold text-hh-navy">Account not linked yet</p>
          <p className="text-sm text-muted-foreground">
            Signed in as <span className="font-medium">{user.primaryEmail}</span>. Ask leadership
            to add this work email under Staff profiles.
          </p>
          <Button asChild variant="outline">
            <a href="/">Back to sign in</a>
          </Button>
        </div>
      </div>
    );
  }

  const selectedStaff = selectedStaffId
    ? (staff.find((s) => s.id === selectedStaffId) ?? null)
    : null;
  const selectedGroup = selectedGroupId
    ? (groups.find((g) => g.id === selectedGroupId) ?? null)
    : null;

  const otherLeadership = leadershipStaff.filter((s) => s.id !== profile.id);

  return (
    <div className="min-h-screen bg-background">
      <BrandHeader
        user={profile}
        onMenu={() => setMenuOpen((v) => !v)}
        menuOpen={menuOpen}
        lastSync={lastSync}
      />

      <div className="mx-auto flex max-w-[1400px] gap-0 md:gap-6">
        {menuOpen && (
          <button
            type="button"
            className="fixed inset-0 z-30 bg-hh-navy/30 md:hidden"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
        )}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-40 w-72 overflow-y-auto border-r border-border bg-card p-4 pt-20 transition-transform md:static md:z-0 md:w-56 md:shrink-0 md:translate-x-0 md:border-0 md:bg-transparent md:p-0 md:pt-6",
            menuOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
          )}
        >
          <nav className="space-y-1">
            {nav.map((item, idx) => {
              const Icon = item.icon;
              const active =
                item.kind === "view"
                  ? view === item.id && !selectedStaffId && !selectedGroupId
                  : item.kind === "staff"
                    ? view === "staff-person" && selectedStaffId === item.staffId
                    : view === "group-detail" && selectedGroupId === item.groupId;
              const prev = nav[idx - 1];
              const showTeamDivider = item.kind === "staff" && prev?.kind !== "staff";
              const showGroupDivider = item.kind === "group" && prev?.kind !== "group";
              return (
                <div
                  key={
                    item.kind === "view"
                      ? item.id
                      : item.kind === "staff"
                        ? item.staffId
                        : item.groupId
                  }
                >
                  {showTeamDivider && (
                    <div className="mb-1 mt-3 px-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Team
                    </div>
                  )}
                  {showGroupDivider && (
                    <div className="mb-1 mt-3 px-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Groups
                    </div>
                  )}
                  {item.kind === "view" && item.id === "staff" && isAdmin && (
                    <div className="mb-1 mt-3 px-3 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Manage
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      if (item.kind === "staff") {
                        setView("staff-person");
                        setSelectedStaffId(item.staffId);
                        setSelectedGroupId(null);
                      } else if (item.kind === "group") {
                        setView("group-detail");
                        setSelectedGroupId(item.groupId);
                        setSelectedStaffId(null);
                      } else {
                        setView(item.id);
                        setSelectedStaffId(null);
                        setSelectedGroupId(null);
                      }
                      setMenuOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-hh-navy hover:bg-secondary",
                    )}
                  >
                    <Icon className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.kind === "view" && item.id === "all-actions" && openAll.length > 0 && (
                      <span className="rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold">
                        {openAll.length}
                      </span>
                    )}
                    {item.kind === "view" && item.id === "my-todo-work" && myWorkTodoOpen.length > 0 && (
                      <span className="rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold">
                        {myWorkTodoOpen.length}
                      </span>
                    )}
                    {item.kind === "view" && item.id === "family" && myFamilyOpen.length > 0 && (
                      <span className="rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold">
                        {myFamilyOpen.length}
                      </span>
                    )}
                    {item.kind === "view" && item.id === "closed-actions" && closedVisible.length > 0 && (
                      <span className="rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold">
                        {closedVisible.length}
                      </span>
                    )}
                    {item.kind === "staff" &&
                      visible.filter(
                        (a) =>
                          a.status === "open" &&
                          isTeamAction(a) &&
                          (a.assigneeId === item.staffId ||
                            groups.some(
                              (g) =>
                                g.id === a.assigneeId && g.memberIds.includes(item.staffId),
                            )),
                      ).length > 0 && (
                        <span className="rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold">
                          {
                            visible.filter(
                              (a) =>
                                a.status === "open" &&
                                isTeamAction(a) &&
                                (a.assigneeId === item.staffId ||
                                  groups.some(
                                    (g) =>
                                      g.id === a.assigneeId &&
                                      g.memberIds.includes(item.staffId),
                                  )),
                            ).length
                          }
                        </span>
                      )}
                    {item.kind === "group" &&
                      visible.filter(
                        (a) =>
                          a.status === "open" &&
                          isTeamAction(a) &&
                          a.assigneeId === item.groupId,
                      ).length > 0 && (
                        <span className="rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold">
                          {
                            visible.filter(
                              (a) =>
                                a.status === "open" &&
                                isTeamAction(a) &&
                                a.assigneeId === item.groupId,
                            ).length
                          }
                        </span>
                      )}
                    {item.kind === "view" && item.id === "reviews" && reviews.length > 0 && (
                      <span className="rounded-full bg-primary/15 px-1.5 text-[10px] font-semibold">
                        {reviews.length}
                      </span>
                    )}
                  </button>
                </div>
              );
            })}
            <div className="pt-3">
              <Button
                className="w-full"
                size="sm"
                onClick={() => {
                  openNewAction();
                  setMenuOpen(false);
                }}
              >
                <Plus className="size-4" />
                New task
              </Button>
            </div>
          </nav>
        </aside>

        <main className="min-w-0 flex-1 px-3 py-5 sm:px-6 sm:py-6">
          {view === "overview" && (
            <div className="space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-hh-navy">
                    {isAdmin ? "Leadership overview" : `Hi, ${profile.name.split(" ")[0]}`}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Shared workspace across Helping Heroes and Community Assist
                    {lastSync ? ` · Live · updated ${lastSync}` : " · Live"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => openNewAction()}>
                    <Plus className="size-4" />
                    New task
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openNewAction({ asRequest: true })}
                  >
                    <Plus className="size-4" />
                    New request
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                  label={isAdmin ? "Open actions" : "My open"}
                  value={isAdmin ? openAll.length : myOpen.length}
                />
                <StatCard
                  label="Overdue"
                  value={isAdmin ? overdueAll.length : myOpen.filter(isOverdue).length}
                  tone="danger"
                />
                <StatCard
                  label="My to do · Work"
                  value={myWorkTodoOpen.length}
                  tone="warning"
                />
                <StatCard label="Closed" value={closedVisible.length} tone="ca" />
              </div>

              <OverviewActionsTable
                profile={profile}
                isAdmin={isAdmin}
                onEdit={openEditAction}
              />

              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold text-hh-navy">My to do · Work</h3>
                  <Button size="sm" variant="outline" onClick={() => setView("my-todo-work")}>
                    Open
                  </Button>
                </div>
                {myWorkTodoOpen.length === 0 ? (
                  <Empty>Nothing in My to do · Work yet.</Empty>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {myWorkTodoOpen.slice(0, 4).map((a) => (
                      <ActionCard key={a.id} action={a} onOpen={() => setDetailId(a.id)} onEdit={openEditAction} />
                    ))}
                  </div>
                )}
              </div>

              {isAdmin && (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-hh-navy">Family</h3>
                    <Button size="sm" variant="outline" onClick={() => setView("family")}>
                      Open
                    </Button>
                  </div>
                  {myFamilyOpen.length === 0 ? (
                    <Empty>Nothing on the Family list yet.</Empty>
                  ) : (
                    <div className="grid gap-3 md:grid-cols-2">
                      {myFamilyOpen.slice(0, 4).map((a) => (
                        <ActionCard key={a.id} action={a} onOpen={() => setDetailId(a.id)} onEdit={openEditAction} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {view === "all-actions" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-hh-navy">
                  All actions
                </h2>
                <div className="flex flex-wrap gap-2">
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
                  <Button size="sm" onClick={() => openNewAction()}>
                    <Plus className="size-4" />
                    Task
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard label="Open" value={openAll.length} />
                <StatCard label="Overdue" value={overdueAll.length} tone="danger" />
                <StatCard
                  label="Tasks"
                  value={openAll.filter((a) => a.type === "task").length}
                  tone="warning"
                />
                <StatCard
                  label="Requests"
                  value={openAll.filter((a) => a.type === "request").length}
                  tone="ca"
                />
              </div>
              <div className="space-y-3">
                {filteredActions.map((a) => (
                  <ActionCard key={a.id} action={a} onOpen={() => setDetailId(a.id)} onEdit={openEditAction} />
                ))}
                {filteredActions.length === 0 && <Empty>No actions match this filter.</Empty>}
              </div>
            </div>
          )}

          {view === "my-todo-work" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard label="Open" value={myWorkTodoOpen.length} />
                <StatCard
                  label="Overdue"
                  value={myWorkTodoOpen.filter(isOverdue).length}
                  tone="danger"
                />
                <StatCard
                  label="Work tasks"
                  value={myWorkTodoOpen.filter((a) => a.type === "personal_task").length}
                  tone="warning"
                />
                <StatCard
                  label="Work requests"
                  value={myWorkTodoOpen.filter((a) => a.type === "personal_request").length}
                  tone="ca"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-hh-navy">My to do · Work</h2>
                  <p className="text-sm text-muted-foreground">
                    Work-related private list
                    {isAdmin
                      ? " — you can also send these to Laura / Craig."
                      : " — only you see these."}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      openNewAction({ workTodo: true, personalKind: "personal_task" })
                    }
                  >
                    <Plus className="size-4" />
                    Work task
                  </Button>
                  <Button
                    size="sm"
                    onClick={() =>
                      openNewAction({ workTodo: true, personalKind: "personal_request" })
                    }
                  >
                    <Plus className="size-4" />
                    Work request
                  </Button>
                  {isAdmin && otherLeadership[0] && (
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() =>
                        openNewAction({
                          workTodo: true,
                          personalKind: "personal_request",
                          personalToLeadershipId: otherLeadership[0]!.id,
                        })
                      }
                    >
                      <Plus className="size-4" />
                      Work to {otherLeadership[0].name.split(" ")[0]}
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                {workTodoItemsForUser(actions, profile.id)
                  .filter((a) => a.status === "open")
                  .map((a) => (
                    <ActionCard key={a.id} action={a} onOpen={() => setDetailId(a.id)} onEdit={openEditAction} />
                  ))}
                {workTodoItemsForUser(actions, profile.id).filter((a) => a.status === "open")
                  .length === 0 && <Empty>No open work to-do items.</Empty>}
              </div>
            </div>
          )}

          {view === "family" && isAdmin && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard label="Open" value={myFamilyOpen.length} />
                <StatCard
                  label="Overdue"
                  value={myFamilyOpen.filter(isOverdue).length}
                  tone="danger"
                />
                <StatCard
                  label="To me"
                  value={myFamilyOpen.filter((a) => a.assigneeId === profile.id).length}
                  tone="warning"
                />
                <StatCard
                  label="I posted"
                  value={myFamilyOpen.filter((a) => a.createdBy === profile.id).length}
                  tone="ca"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-hh-navy">Family</h2>
                  <p className="text-sm text-muted-foreground">
                    Private to Craig and Laura only — not visible to other staff.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openNewAction({ family: true })}
                  >
                    <Plus className="size-4" />
                    For me
                  </Button>
                  {otherLeadership[0] && (
                    <Button
                      size="sm"
                      onClick={() =>
                        openNewAction({
                          family: true,
                          personalToLeadershipId: otherLeadership[0]!.id,
                        })
                      }
                    >
                      <Plus className="size-4" />
                      To {otherLeadership[0].name.split(" ")[0]}
                    </Button>
                  )}
                </div>
              </div>
              <div className="space-y-3">
                {familyItemsForUser(actions, profile.id)
                  .filter((a) => a.status === "open")
                  .map((a) => (
                    <ActionCard key={a.id} action={a} onOpen={() => setDetailId(a.id)} onEdit={openEditAction} />
                  ))}
                {familyItemsForUser(actions, profile.id).filter((a) => a.status === "open")
                  .length === 0 && <Empty>No open family items.</Empty>}
              </div>
            </div>
          )}

          {view === "staff" && isAdmin && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard label="Active staff" value={staff.filter((s) => s.active).length} />
                <StatCard label="Open actions" value={openAll.length} />
                <StatCard label="Overdue" value={overdueAll.length} tone="danger" />
                <StatCard label="Closed" value={closedVisible.length} tone="warning" />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-hh-navy">Manage staff</h2>
                  <p className="text-sm text-muted-foreground">
                    Add or update people. They sign in with the work email you set here.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setStaffDraft({
                      id: uid("s"),
                      name: "",
                      role: "staff",
                      title: "",
                      email: "",
                      phone: "",
                      organisation: "hh",
                      location: "",
                      specialties: "",
                      bio: "",
                      startDate: daysFromNow(0),
                      active: true,
                    });
                    setStaffOpen(true);
                  }}
                >
                  <Plus className="size-4" />
                  Add staff
                </Button>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {leadershipStaff.map((lead) => (
                  <Card key={lead.id} className="border-primary/20 bg-primary/[0.03]">
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-primary text-sm font-semibold text-white">
                          {initials(lead.name)}
                        </div>
                        <div>
                          <div className="font-semibold text-hh-navy">{lead.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {lead.title} · {lead.email}
                          </div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <Badge variant="secondary">
                          {lead.id === profile.id
                            ? lead.id === ADMIN_ID
                              ? "CEO · you"
                              : "Director · you"
                            : lead.id === ADMIN_ID
                              ? "CEO"
                              : "Director · leadership"}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setStaffDraft({ ...lead });
                            setStaffOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        {lead.id !== profile.id && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                openNewAction({
                                  workTodo: true,
                                  personalKind: "personal_request",
                                  personalToLeadershipId: lead.id,
                                })
                              }
                            >
                              Work request
                            </Button>
                            <Button
                              size="sm"
                              onClick={() =>
                                openNewAction({
                                  family: true,
                                  personalToLeadershipId: lead.id,
                                })
                              }
                            >
                              Family
                            </Button>
                          </>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {teamStaff.map((s) => (
                  <Card key={s.id}>
                    <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-center gap-3 text-left"
                        onClick={() => {
                          setSelectedStaffId(s.id);
                          setView("staff-person");
                        }}
                      >
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-secondary text-sm font-semibold text-hh-navy">
                          {initials(s.name)}
                        </div>
                        <div className="min-w-0">
                          <div className="truncate font-semibold text-hh-navy">{s.name}</div>
                          <div className="truncate text-xs text-muted-foreground">
                            {s.title || "Team member"} · {s.email}
                          </div>
                        </div>
                      </button>
                      <div className="flex gap-2">
                        <OrgBadge org={s.organisation} />
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setStaffDraft({ ...s });
                            setStaffOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm(`Remove ${s.name}?`)) {
                              void deleteStaff(s.id)
                                .then(() => toast.success("Removed"))
                                .catch((e) =>
                                  toast.error(e instanceof Error ? e.message : "Failed"),
                                );
                            }
                          }}
                        >
                          Remove
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {view === "staff-person" && selectedStaff && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                  label="Open"
                  value={visible.filter(
                    (a) =>
                      a.status === "open" &&
                      (a.assigneeId === selectedStaff.id || a.createdBy === selectedStaff.id),
                  ).length}
                />
                <StatCard
                  label="Overdue"
                  value={visible.filter(
                    (a) =>
                      a.status === "open" &&
                      isOverdue(a) &&
                      (a.assigneeId === selectedStaff.id || a.createdBy === selectedStaff.id),
                  ).length}
                  tone="danger"
                />
                <StatCard
                  label="Tasks"
                  value={visible.filter(
                    (a) =>
                      a.status === "open" &&
                      (a.type === "task" || a.type === "personal_task") &&
                      (a.assigneeId === selectedStaff.id || a.createdBy === selectedStaff.id),
                  ).length}
                  tone="warning"
                />
                <StatCard
                  label="Requests"
                  value={visible.filter(
                    (a) =>
                      a.status === "open" &&
                      (a.type === "request" || a.type === "personal_request") &&
                      (a.assigneeId === selectedStaff.id || a.createdBy === selectedStaff.id),
                  ).length}
                  tone="ca"
                />
              </div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-hh-navy">{selectedStaff.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedStaff.title} · {selectedStaff.email}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <OrgBadge org={selectedStaff.organisation} />
                  {isAdmin && selectedStaff.role === "admin" && selectedStaff.id !== profile.id && (
                    <>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          openNewAction({
                            workTodo: true,
                            personalKind: "personal_request",
                            personalToLeadershipId: selectedStaff.id,
                          })
                        }
                      >
                        <Plus className="size-4" />
                        Work request
                      </Button>
                      <Button
                        size="sm"
                        onClick={() =>
                          openNewAction({
                            family: true,
                            personalToLeadershipId: selectedStaff.id,
                          })
                        }
                      >
                        <Plus className="size-4" />
                        Family item
                      </Button>
                    </>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openNewAction({ prefillAssignee: selectedStaff.id })}
                  >
                    <Plus className="size-4" />
                    Team task
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      openNewAction({ prefillAssignee: selectedStaff.id, asRequest: true })
                    }
                  >
                    <Plus className="size-4" />
                    Request
                  </Button>
                </div>
              </div>
              <div className="space-y-3">
                {actions
                  .filter(
                    (a) =>
                      a.status === "open" &&
                      visible.some((v) => v.id === a.id) &&
                      ((isTeamAction(a) &&
                        (a.assigneeId === selectedStaff.id ||
                          groups.some(
                            (g) =>
                              g.id === a.assigneeId && g.memberIds.includes(selectedStaff.id),
                          ))) ||
                        (isPrivateType(a.type) &&
                          (a.assigneeId === selectedStaff.id || a.createdBy === selectedStaff.id) &&
                          (a.assigneeId === profile.id ||
                            a.createdBy === profile.id) &&
                          (isWorkTodoType(a.type) ||
                            (isFamilyType(a.type) && isAdmin)))),
                  )
                  .map((a) => (
                    <ActionCard key={a.id} action={a} onOpen={() => setDetailId(a.id)} onEdit={openEditAction} />
                  ))}
              </div>
            </div>
          )}

          {view === "groups" && isAdmin && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard label="Groups" value={groups.length} />
                <StatCard
                  label="Open group tasks"
                  value={openAll.filter((a) => groups.some((g) => g.id === a.assigneeId)).length}
                  tone="warning"
                />
                <StatCard
                  label="Overdue"
                  value={openAll.filter(
                    (a) => isOverdue(a) && groups.some((g) => g.id === a.assigneeId),
                  ).length}
                  tone="danger"
                />
                <StatCard
                  label="Members"
                  value={new Set(groups.flatMap((g) => g.memberIds)).size}
                  tone="ca"
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-hh-navy">Groups</h2>
                <Button
                  size="sm"
                  onClick={() => {
                    setGroupDraft({
                      id: uid("g"),
                      name: "",
                      description: "",
                      organisation: "both",
                      purpose: "",
                      memberIds: [ADMIN_ID],
                    });
                    setGroupOpen(true);
                  }}
                >
                  <Plus className="size-4" />
                  New group
                </Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                {groups.map((g) => (
                  <Card key={g.id}>
                    <CardContent className="space-y-3 p-4">
                      <button
                        type="button"
                        className="text-left font-semibold text-hh-navy"
                        onClick={() => {
                          setSelectedGroupId(g.id);
                          setView("group-detail");
                        }}
                      >
                        {g.name}
                      </button>
                      <div className="text-xs text-muted-foreground">
                        {g.memberIds.length} members{g.isSystem ? " · System" : ""}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setGroupDraft({ ...g });
                            setGroupOpen(true);
                          }}
                        >
                          Edit
                        </Button>
                        {!g.isSystem && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => {
                              if (confirm(`Delete ${g.name}?`)) {
                                void deleteGroup(g.id)
                                  .then(() => toast.success("Deleted"))
                                  .catch((e) =>
                                    toast.error(e instanceof Error ? e.message : "Failed"),
                                  );
                              }
                            }}
                          >
                            Delete
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {view === "group-detail" && selectedGroup && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard
                  label="Open"
                  value={visible.filter(
                    (a) =>
                      a.status === "open" && isTeamAction(a) && a.assigneeId === selectedGroup.id,
                  ).length}
                />
                <StatCard
                  label="Overdue"
                  value={visible.filter(
                    (a) =>
                      a.status === "open" &&
                      isOverdue(a) &&
                      isTeamAction(a) &&
                      a.assigneeId === selectedGroup.id,
                  ).length}
                  tone="danger"
                />
                <StatCard
                  label="Tasks"
                  value={visible.filter(
                    (a) =>
                      a.status === "open" &&
                      a.type === "task" &&
                      a.assigneeId === selectedGroup.id,
                  ).length}
                  tone="warning"
                />
                <StatCard
                  label="Requests"
                  value={visible.filter(
                    (a) =>
                      a.status === "open" &&
                      a.type === "request" &&
                      a.assigneeId === selectedGroup.id,
                  ).length}
                  tone="ca"
                />
              </div>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-hh-navy">{selectedGroup.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {selectedGroup.purpose || selectedGroup.description}
                  </p>
                </div>
                {(isAdmin || selectedGroup.memberIds.includes(profile.id)) && (
                  <Button
                    size="sm"
                    onClick={() => openNewAction({ prefillAssignee: selectedGroup.id })}
                  >
                    <Plus className="size-4" />
                    Group task
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                {visible
                  .filter(
                    (a) =>
                      isTeamAction(a) &&
                      a.assigneeId === selectedGroup.id &&
                      a.status === "open",
                  )
                  .map((a) => (
                    <ActionCard key={a.id} action={a} onOpen={() => setDetailId(a.id)} onEdit={openEditAction} />
                  ))}
              </div>
            </div>
          )}

          {view === "closed-actions" && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-hh-navy">Closed actions</h2>
                  <p className="text-sm text-muted-foreground">
                    Completed items. Either person involved can reopen.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard label="Closed" value={closedVisible.length} />
                <StatCard
                  label="Tasks"
                  value={closedVisible.filter((a) => a.type === "task" || a.type === "personal_task").length}
                  tone="warning"
                />
                <StatCard
                  label="Requests"
                  value={closedVisible.filter((a) => a.type === "request" || a.type === "personal_request").length}
                  tone="ca"
                />
                <StatCard
                  label="Family"
                  value={closedVisible.filter((a) => a.type === "family" || a.type === "todo").length}
                />
              </div>
              <div className="space-y-3">
                {closedVisible.map((a) => (
                  <ActionCard key={a.id} action={a} onOpen={() => setDetailId(a.id)} onEdit={openEditAction} />
                ))}
                {closedVisible.length === 0 && <Empty>No closed items.</Empty>}
              </div>
            </div>
          )}

          {view === "reviews" && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <StatCard label="Items" value={reviews.length} tone="ca" />
                <StatCard label="Open actions" value={openAll.length} />
                <StatCard label="Overdue" value={overdueAll.length} tone="danger" />
                <StatCard label="Closed" value={closedVisible.length} tone="warning" />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-hh-navy">For review</h2>
                {isAdmin && (
                  <Button size="sm" onClick={() => setReviewOpen(true)}>
                    <Plus className="size-4" />
                    Post for review
                  </Button>
                )}
              </div>
              <div className="space-y-3">
                {reviews.map((r) => (
                  <Card key={r.id}>
                    <CardContent className="space-y-2 p-4">
                      <div className="font-semibold text-hh-navy">{r.title}</div>
                      <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                        {r.content}
                      </p>
                      {isAdmin && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive"
                          onClick={() => {
                            if (confirm("Remove?")) {
                              void deleteReview(r.id)
                                .then(() => toast.success("Removed"))
                                .catch((e) =>
                                  toast.error(e instanceof Error ? e.message : "Failed"),
                                );
                            }
                          }}
                        >
                          Remove
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
                {reviews.length === 0 && <Empty>Nothing for review yet.</Empty>}
              </div>
            </div>
          )}
        </main>
      </div>

      <Dialog open={actionOpen} onOpenChange={setActionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? "Edit item"
                : isFamilyType(aType)
                  ? "Family item"
                  : isWorkTodoType(aType)
                    ? "My to do · Work"
                    : aType === "request"
                      ? "New request"
                      : "New task"}
            </DialogTitle>
            <DialogDescription>
              {isFamilyType(aType)
                ? "Family tab only — visible to Craig and Laura. Assign to yourself or each other."
                : isWorkTodoType(aType)
                  ? isAdmin
                    ? "Work to-do — private list. Assign to yourself or the other leadership member."
                    : "Private work list — only you see this."
                  : "Assign a team task or request to any staff member or group. Closed items leave the live lists."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Title</Label>
              <Input value={aTitle} onChange={(e) => setATitle(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Details</Label>
              <Textarea value={aDesc} onChange={(e) => setADesc(e.target.value)} rows={3} />
            </div>
            <div className="grid gap-1.5">
              <Label>Due date</Label>
              <Input type="date" value={aDue} onChange={(e) => setADue(e.target.value)} />
            </div>

            <div className="grid gap-1.5">
              <Label>Type</Label>
              <select
                className="h-10 rounded-lg border border-input bg-card px-3 text-sm"
                value={aType}
                onChange={(e) => {
                  const next = e.target.value as ActionType;
                  setAType(next);
                  if (isPrivateType(next)) {
                    if (!leadershipStaff.some((s) => s.id === aAssignee)) {
                      setAAssignee(profile.id);
                    }
                  } else if (!aAssignee || isPrivateType(aType)) {
                    setAAssignee(
                      staff.find((s) => s.active && s.id !== profile.id)?.id ?? profile.id,
                    );
                  }
                }}
              >
                <>
                  <optgroup label="Team (shared — any staff)">
                    <option value="task">Task</option>
                    <option value="request">Request</option>
                  </optgroup>
                  <optgroup label="My to do · Work (private)">
                    <option value="personal_task">Work task</option>
                    <option value="personal_request">Work request</option>
                  </optgroup>
                  {isAdmin && (
                    <optgroup label="Family (Craig & Laura only)">
                      <option value="family">Family item</option>
                    </optgroup>
                  )}
                </>
              </select>
            </div>

            {!isPrivateType(aType) ? (
              <>
                <div className="grid gap-1.5">
                  <Label>Assign to</Label>
                  <select
                    className="h-10 rounded-lg border border-input bg-card px-3 text-sm"
                    value={aAssignee}
                    onChange={(e) => setAAssignee(e.target.value)}
                  >
                    <optgroup label="People">
                      {staff
                        .filter((s) => s.active)
                        .map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name}
                            {s.role === "admin" ? " (leadership)" : ""}
                          </option>
                        ))}
                    </optgroup>
                    <optgroup label="Groups">
                      {groups.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.name}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                </div>
                <div className="grid gap-1.5">
                  <Label>Organisation</Label>
                  <select
                    className="h-10 rounded-lg border border-input bg-card px-3 text-sm"
                    value={aOrg}
                    onChange={(e) => setAOrg(e.target.value as OrgKey)}
                  >
                    <option value="hh">Helping Heroes</option>
                    <option value="ca">Community Assist</option>
                    <option value="both">Both</option>
                  </select>
                </div>
              </>
            ) : isAdmin ? (
              <div className="grid gap-1.5">
                <Label>
                  {isFamilyType(aType) ? "Assign family item to" : "Assign work item to"}
                </Label>
                <select
                  className="h-10 rounded-lg border border-input bg-card px-3 text-sm"
                  value={aAssignee || profile.id}
                  onChange={(e) => setAAssignee(e.target.value)}
                >
                  {leadershipStaff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                      {s.id === profile.id ? " (me)" : ""}
                      {s.id === ADMIN_ID ? " · CEO" : " · Director"}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-muted-foreground">
                  {isFamilyType(aType)
                    ? "Family items stay between Craig and Laura only."
                    : "Yourself = your work list. Other leadership = they see it under My to do · Work."}
                </p>
              </div>
            ) : null}

            <div className="grid gap-1.5">
              <Label>Note (optional)</Label>
              <Textarea value={aNote} onChange={(e) => setANote(e.target.value)} rows={2} />
            </div>
            <div className="grid gap-1.5">
              <Label>Attachments (optional)</Label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-secondary/30 px-3 py-3 text-sm text-hh-navy hover:bg-secondary">
                <Paperclip className="size-4" />
                Add files
                <input
                  type="file"
                  multiple
                  className="sr-only"
                  onChange={async (e) => {
                    const list = e.target.files;
                    if (!list?.length) return;
                    try {
                      if (aFiles.length + list.length > MAX_ATTACHMENTS) {
                        toast.error(`Maximum ${MAX_ATTACHMENTS} attachments`);
                        return;
                      }
                      const extra = await readFilesAsActionFiles(list);
                      setAFiles((prev) => [...prev, ...extra]);
                    } catch (err) {
                      toast.error(err instanceof Error ? err.message : "Could not attach");
                    }
                    e.target.value = "";
                  }}
                />
              </label>
              {aFiles.length > 0 && (
                <ul className="space-y-1">
                  {aFiles.map((f, i) => (
                    <li
                      key={`${f.name}-${i}`}
                      className="flex items-center justify-between gap-2 text-xs text-muted-foreground"
                    >
                      <span className="truncate">
                        {f.name} · {formatFileSize(f.size)}
                      </span>
                      <button
                        type="button"
                        className="text-destructive hover:underline"
                        onClick={() => setAFiles((prev) => prev.filter((_, idx) => idx !== i))}
                      >
                        Remove
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="text-[11px] text-muted-foreground">
                Up to {MAX_ATTACHMENTS} files, {MAX_ATTACHMENT_BYTES / (1024 * 1024)} MB each.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveAction()}>
              {editingId ? "Save changes" : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={staffOpen} onOpenChange={setStaffOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{staffDraft?.name ? "Edit staff" : "Add staff"}</DialogTitle>
          </DialogHeader>
          {staffDraft && (
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>Name</Label>
                <Input
                  value={staffDraft.name}
                  onChange={(e) => setStaffDraft({ ...staffDraft, name: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Work email</Label>
                <Input
                  type="email"
                  value={staffDraft.email}
                  onChange={(e) => setStaffDraft({ ...staffDraft, email: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Title</Label>
                <Input
                  value={staffDraft.title}
                  onChange={(e) => setStaffDraft({ ...staffDraft, title: e.target.value })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Organisation</Label>
                <select
                  className="h-10 rounded-lg border border-input bg-card px-3 text-sm"
                  value={staffDraft.organisation}
                  onChange={(e) =>
                    setStaffDraft({
                      ...staffDraft,
                      organisation: e.target.value as OrgKey,
                    })
                  }
                >
                  <option value="hh">Helping Heroes</option>
                  <option value="ca">Community Assist</option>
                  <option value="both">Both</option>
                </select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setStaffOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveStaff()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={groupOpen} onOpenChange={setGroupOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Group</DialogTitle>
          </DialogHeader>
          {groupDraft && (
            <div className="grid gap-3">
              <div className="grid gap-1.5">
                <Label>Name</Label>
                <Input
                  value={groupDraft.name}
                  onChange={(e) => setGroupDraft({ ...groupDraft, name: e.target.value })}
                  disabled={groupDraft.isSystem}
                />
              </div>
              <div className="grid gap-1.5">
                <Label>Members</Label>
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border p-2">
                  {staff
                    .filter((s) => s.active)
                    .map((s) => {
                      const checked = groupDraft.memberIds.includes(s.id);
                      return (
                        <label
                          key={s.id}
                          className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-secondary"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const next = checked
                                ? groupDraft.memberIds.filter((id) => id !== s.id)
                                : [...groupDraft.memberIds, s.id];
                              setGroupDraft({ ...groupDraft, memberIds: next });
                            }}
                          />
                          {s.name}
                        </label>
                      );
                    })}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveGroup()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Post for review</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label>Title</Label>
              <Input value={rTitle} onChange={(e) => setRTitle(e.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label>Content</Label>
              <Textarea value={rContent} onChange={(e) => setRContent(e.target.value)} rows={4} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => void saveReview()}>Post</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ActionDetailDialog
        actionId={detailId}
        onClose={() => setDetailId(null)}
        onEdit={openEditAction}
      />
    </div>
  );
}
