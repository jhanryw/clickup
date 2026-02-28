// ==========================================================================
// Tipos TypeScript derivados do schema do Supabase
// Espelha 001_schema.sql
// ==========================================================================

export type Role = 'owner' | 'admin' | 'member' | 'viewer'
export type Priority = 'urgent' | 'high' | 'normal' | 'low'

// --------------------------------------------------------------------------
// PROFILES
// --------------------------------------------------------------------------
export interface Profile {
  id: string // LogTo sub
  email: string
  full_name: string | null
  avatar_url: string | null
  logto_roles: string[]
  created_at: string
  updated_at: string
}

// --------------------------------------------------------------------------
// ORGANIZATIONS
// --------------------------------------------------------------------------
export interface Organization {
  id: string
  name: string
  slug: string
  logo_url: string | null
  created_at: string
  updated_at: string
}

export interface OrganizationMember {
  id: string
  organization_id: string
  user_id: string
  role: Role
  created_at: string
}

// --------------------------------------------------------------------------
// SPACES
// --------------------------------------------------------------------------
export interface Space {
  id: string
  organization_id: string
  name: string
  description: string | null
  color: string | null
  icon: string | null
  is_private: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface SpaceMember {
  id: string
  space_id: string
  user_id: string
  role: Exclude<Role, 'owner'>
  created_at: string
}

// --------------------------------------------------------------------------
// FOLDERS
// --------------------------------------------------------------------------
export interface Folder {
  id: string
  space_id: string
  name: string
  description: string | null
  color: string | null
  is_private: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface FolderMember {
  id: string
  folder_id: string
  user_id: string
  role: Exclude<Role, 'owner'>
  created_at: string
}

// --------------------------------------------------------------------------
// CUSTOM STATUSES
// --------------------------------------------------------------------------
export interface CustomStatus {
  id: string
  name: string
  color: string
  order: number
  is_closed: boolean
  created_at: string
}

// --------------------------------------------------------------------------
// LISTS
// --------------------------------------------------------------------------
export interface List {
  id: string
  folder_id: string | null
  space_id: string | null
  name: string
  description: string | null
  color: string | null
  is_private: boolean
  default_status_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface ListStatus {
  list_id: string
  status_id: string
  order: number
}

export interface ListMember {
  id: string
  list_id: string
  user_id: string
  role: Exclude<Role, 'owner'>
  created_at: string
}

// --------------------------------------------------------------------------
// TASKS
// --------------------------------------------------------------------------
export interface Task {
  id: string
  list_id: string
  parent_task_id: string | null
  title: string
  description: string | null
  status_id: string | null
  priority: Priority | null
  due_date: string | null
  start_date: string | null
  estimated_hours: number | null
  order: number
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface TaskAssignee {
  task_id: string
  user_id: string
  assigned_at: string
  assigned_by: string | null
}

export interface TaskComment {
  id: string
  task_id: string
  user_id: string
  content: string
  created_at: string
  updated_at: string
}

export interface TaskAttachment {
  id: string
  task_id: string
  user_id: string
  file_name: string
  file_url: string
  file_size: number | null
  mime_type: string | null
  created_at: string
}

// --------------------------------------------------------------------------
// WEBHOOKS
// --------------------------------------------------------------------------
export type WebhookEvent =
  | 'task.created'
  | 'task.updated'
  | 'task.completed'
  | 'task.deleted'
  | 'form.submitted'

export interface WebhookConfig {
  id: string
  organization_id: string
  name: string
  url: string
  // NOTA: 'secret' nunca deve ser retornado ao cliente
  events: WebhookEvent[]
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface WebhookLog {
  id: string
  webhook_id: string
  event: WebhookEvent
  payload: Record<string, unknown>
  response_status: number | null
  response_body: string | null
  attempt_count: number
  next_retry_at: string | null
  delivered_at: string | null
  created_at: string
}

// --------------------------------------------------------------------------
// FORMS
// --------------------------------------------------------------------------
export type FormFieldType = 'text' | 'textarea' | 'email' | 'number' | 'select' | 'date' | 'checkbox'

export interface FormField {
  id: string
  label: string
  type: FormFieldType
  required: boolean
  placeholder?: string
  options?: string[] // para select
  maps_to?: 'title' | 'description' | 'priority' | 'due_date' // mapeia para campo de task
}

export interface Form {
  id: string
  list_id: string
  name: string
  description: string | null
  slug: string
  fields: FormField[]
  is_active: boolean
  created_by: string | null
  created_at: string
  updated_at: string
}

export interface FormSubmission {
  id: string
  form_id: string
  task_id: string | null
  data: Record<string, unknown>
  submitted_at: string
}

// --------------------------------------------------------------------------
// TIPOS COMPOSTOS (com JOINs comuns)
// --------------------------------------------------------------------------
export interface TaskWithDetails extends Task {
  status: CustomStatus | null
  assignees: Profile[]
  comments_count: number
  attachments_count: number
  subtasks_count: number
}

export interface ListWithStatuses extends List {
  statuses: CustomStatus[]
}

export interface SpaceWithFolders extends Space {
  folders: (Folder & { lists: List[] })[]
  lists: List[] // listas diretas no space
}

// --------------------------------------------------------------------------
// PAYLOAD DE WEBHOOK
// --------------------------------------------------------------------------
export interface WebhookPayload {
  event: WebhookEvent
  timestamp: string
  organization_id: string
  data: {
    task?: Task
    form_submission?: FormSubmission
  }
}

// --------------------------------------------------------------------------
// CONTEXTO DO USUÁRIO (vindo do LogTo)
// --------------------------------------------------------------------------
export interface UserContext {
  id: string          // LogTo sub
  email: string
  name: string | null
  avatar: string | null
  logto_roles: string[]
  // Papel na organização atual
  org_role: Role | null
}
