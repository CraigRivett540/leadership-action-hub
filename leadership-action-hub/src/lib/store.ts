import { create } from "zustand";
import type {
  ActionItem,
  Group,
  ReviewItem,
  StaffProfile,
} from "./types";
import {
  addActionNote,
  bootstrapDashboard,
  removeGroupRecord,
  removeReviewRecord,
  removeStaffProfile,
  saveActionRecord,
  saveGroupRecord,
  saveReviewRecord,
  saveStaffProfile,
  toggleActionRecord,
} from "./dashboard-server";
import { uid } from "./utils";

interface Store {
  ready: boolean;
  loading: boolean;
  error: string | null;
  myStaffId: string | null;
  staff: StaffProfile[];
  groups: Group[];
  actions: ActionItem[];
  reviews: ReviewItem[];

  load: () => Promise<void>;
  upsertStaff: (profile: StaffProfile) => Promise<void>;
  deleteStaff: (id: string) => Promise<void>;
  upsertGroup: (group: Group) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  upsertAction: (action: ActionItem) => Promise<void>;
  toggleActionStatus: (id: string) => Promise<void>;
  addNote: (actionId: string, text: string, authorId: string) => Promise<void>;
  upsertReview: (item: ReviewItem) => Promise<void>;
  deleteReview: (id: string) => Promise<void>;
}

export const useDashboardStore = create<Store>((set, get) => ({
  ready: false,
  loading: false,
  error: null,
  myStaffId: null,
  staff: [],
  groups: [],
  actions: [],
  reviews: [],

  load: async () => {
    set({ loading: true, error: null });
    try {
      const data = await bootstrapDashboard();
      set({
        ready: true,
        loading: false,
        myStaffId: data.myStaffId,
        staff: data.staff,
        groups: data.groups,
        actions: data.actions,
        reviews: data.reviews,
      });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : "Failed to load dashboard",
      });
    }
  },

  upsertStaff: async (profile) => {
    await saveStaffProfile({ data: profile });
    await get().load();
  },

  deleteStaff: async (id) => {
    await removeStaffProfile({ data: id });
    await get().load();
  },

  upsertGroup: async (group) => {
    await saveGroupRecord({ data: group });
    await get().load();
  },

  deleteGroup: async (id) => {
    await removeGroupRecord({ data: id });
    await get().load();
  },

  upsertAction: async (action) => {
    await saveActionRecord({ data: action });
    await get().load();
  },

  toggleActionStatus: async (id) => {
    await toggleActionRecord({ data: id });
    await get().load();
  },

  addNote: async (actionId, text, authorId) => {
    await addActionNote({
      data: { actionId, text, noteId: uid("n"), authorId },
    });
    await get().load();
  },

  upsertReview: async (item) => {
    await saveReviewRecord({ data: item });
    await get().load();
  },

  deleteReview: async (id) => {
    await removeReviewRecord({ data: id });
    await get().load();
  },

}));

export function getStaffById(staff: StaffProfile[], id: string) {
  return staff.find((s) => s.id === id);
}

export function getGroupById(groups: Group[], id: string) {
  return groups.find((g) => g.id === id);
}

export function assigneeLabel(
  staff: StaffProfile[],
  groups: Group[],
  assigneeId: string,
) {
  const person = getStaffById(staff, assigneeId);
  if (person) return person.name;
  const group = getGroupById(groups, assigneeId);
  return group?.name ?? "—";
}

export function isOverdue(action: ActionItem) {
  if (action.status === "closed" || !action.dueDate) return false;
  return action.dueDate < new Date().toISOString().slice(0, 10);
}

/** Shared team actions only (excludes personal task/request items). */
export function isTeamAction(action: ActionItem) {
  return action.type === "task" || action.type === "request";
}

/** Private work My to do (not team-shared). */
export function isWorkTodoAction(action: ActionItem) {
  return action.type === "personal_task" || action.type === "personal_request";
}

/** Family tab items (Craig & Laura only). Legacy "todo" counts as family. */
export function isFamilyAction(action: ActionItem) {
  return action.type === "family" || action.type === "todo";
}

/** Any non-team private action (work My to do or Family). */
export function isPersonalAction(action: ActionItem) {
  return isWorkTodoAction(action) || isFamilyAction(action);
}

export function personalKindLabel(action: ActionItem): "task" | "request" | "family" {
  if (action.type === "personal_request") return "request";
  if (action.type === "family" || action.type === "todo") return "family";
  return "task";
}

/** @deprecated prefer isWorkTodoAction / isFamilyAction */
export function myTodoContext(action: ActionItem): "work" | "personal" {
  if (isFamilyAction(action)) return "personal";
  if (isWorkTodoAction(action)) return "work";
  return "work";
}

export function myTodoContextLabel(action: ActionItem): string {
  if (isFamilyAction(action)) return "Family";
  return "Work-related";
}

/** Open shared actions assigned to a person (or their groups). */
export function openActionsForUser(
  actions: ActionItem[],
  groups: Group[],
  userId: string,
) {
  return actions.filter((a) => {
    if (a.status !== "open" || !isTeamAction(a)) return false;
    if (a.assigneeId === userId) return true;
    const g = getGroupById(groups, a.assigneeId);
    return Boolean(g?.memberIds.includes(userId));
  });
}

/** Work My to do items for a user (assigned or sent by them). */
export function workTodoItemsForUser(actions: ActionItem[], userId: string) {
  return actions
    .filter(
      (a) =>
        isWorkTodoAction(a) &&
        (a.assigneeId === userId || a.createdBy === userId),
    )
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
}

/** Family tab items for a user (Craig ↔ Laura). */
export function familyItemsForUser(actions: ActionItem[], userId: string) {
  return actions
    .filter(
      (a) =>
        isFamilyAction(a) &&
        (a.assigneeId === userId || a.createdBy === userId),
    )
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
}

/** All private items (work + family). */
export function personalItemsForUser(actions: ActionItem[], userId: string) {
  return actions
    .filter(
      (a) =>
        isPersonalAction(a) &&
        (a.assigneeId === userId || a.createdBy === userId),
    )
    .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));
}

/** @deprecated use workTodoItemsForUser */
export function personalTodosForUser(actions: ActionItem[], userId: string) {
  return workTodoItemsForUser(actions, userId);
}

export const ADMIN_ID = "admin";
