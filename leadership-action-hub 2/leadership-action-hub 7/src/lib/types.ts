export type OrgKey = "hh" | "ca" | "both";
export type UserRole = "admin" | "staff";
export type ActionStatus = "open" | "closed";
/**
 * task/request = shared team hub
 * personal_task / personal_request = private work "My to do"
 * family = Family tab (Craig & Laura only); todo = legacy family/personal item
 */
export type ActionType =
  | "task"
  | "request"
  | "todo"
  | "personal_task"
  | "personal_request"
  | "family";


export interface StaffProfile {
  id: string;
  name: string;
  role: UserRole;
  title: string;
  email: string;
  phone: string;
  organisation: OrgKey;
  location: string;
  specialties: string;
  bio: string;
  startDate: string;
  active: boolean;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  organisation: OrgKey;
  purpose: string;
  memberIds: string[];
  isSystem?: boolean;
}

export interface ActionNote {
  id: string;
  text: string;
  authorId: string;
  createdAt: string;
}

export interface ActionFile {
  name: string;
  size: number;
  type?: string;
  dataUrl?: string;
}

export interface ActionItem {
  id: string;
  title: string;
  description: string;
  status: ActionStatus;
  dueDate: string | null;
  createdAt: string;
  createdBy: string;
  assigneeId: string; // staff id or group id
  type: ActionType;
  organisation: OrgKey;
  notes: ActionNote[];
  files: ActionFile[];
}

export interface ReviewItem {
  id: string;
  title: string;
  content: string;
  audience: "all" | string;
  createdAt: string;
  createdBy: string;
  organisation: OrgKey;
}


export interface DashboardState {
  staff: StaffProfile[];
  groups: Group[];
  actions: ActionItem[];
  reviews: ReviewItem[];
}
