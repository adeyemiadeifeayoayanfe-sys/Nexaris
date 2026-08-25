export type app_role = 'ADMIN' | 'WORKER' | 'CLIENT';
export type profile_status = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';

export interface ProfileRecord {
  id: string;
  email: string | null;
  username: string | null;
  full_name: string;
  role: app_role;
  status: profile_status;
}

export type request_status = 'PENDING' | 'REVIEWING' | 'ACCEPTED' | 'DECLINED' | 'ARCHIVED';
export type application_status = 'PENDING' | 'REVIEWING' | 'APPROVED' | 'REJECTED' | 'ARCHIVED';
export type project_status =
  | 'DRAFT'
  | 'PLANNING'
  | 'ACTIVE'
  | 'ON_HOLD'
  | 'IN_REVIEW'
  | 'COMPLETED'
  | 'ARCHIVED'
  | 'CANCELLED';
export type task_status = 'NOT_STARTED' | 'IN_PROGRESS' | 'IN_REVIEW' | 'COMPLETED' | 'REJECTED';
export type task_priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
export type project_member_status = 'ACTIVE' | 'REMOVED' | 'INVITED';
export type worker_account_status = 'NONE' | 'INVITATION_SENT' | 'ACTIVE' | 'EXISTING_ACCOUNT';
export type notification_type =
  | 'TASK_ASSIGNED'
  | 'TASK_APPROVED'
  | 'TASK_REJECTED'
  | 'PROJECT_MESSAGE'
  | 'DIRECT_MESSAGE'
  | 'FILE_UPDATED'
  | 'MENTION'
  | 'APPLICATION_APPROVED';
