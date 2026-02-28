/**
 * Schemas Zod para validação de inputs.
 * Usados em Server Actions e API Routes.
 */

import { z } from 'zod'

// --------------------------------------------------------------------------
// Tipos base
// --------------------------------------------------------------------------
export const RoleSchema = z.enum(['owner', 'admin', 'member', 'viewer'])
export const PrioritySchema = z.enum(['urgent', 'high', 'normal', 'low'])
export const WebhookEventSchema = z.enum([
  'task.created',
  'task.updated',
  'task.completed',
  'task.deleted',
  'form.submitted',
])

// --------------------------------------------------------------------------
// ORGANIZATION
// --------------------------------------------------------------------------
export const CreateOrganizationSchema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres').max(100),
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  logo_url: z.string().url().optional().nullable(),
})

export const InviteMemberSchema = z.object({
  email: z.string().email('Email inválido'),
  role: RoleSchema,
})

// --------------------------------------------------------------------------
// SPACE
// --------------------------------------------------------------------------
export const CreateSpaceSchema = z.object({
  organization_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, 'Cor deve ser um hex válido (ex: #3B82F6)')
    .optional()
    .nullable(),
  icon: z.string().max(10).optional().nullable(),
  is_private: z.boolean().default(false),
})

export const UpdateSpaceSchema = CreateSpaceSchema.partial().omit({ organization_id: true })

// --------------------------------------------------------------------------
// FOLDER
// --------------------------------------------------------------------------
export const CreateFolderSchema = z.object({
  space_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/)
    .optional()
    .nullable(),
  is_private: z.boolean().default(false),
})

export const UpdateFolderSchema = CreateFolderSchema.partial().omit({ space_id: true })

// --------------------------------------------------------------------------
// LIST
// --------------------------------------------------------------------------
export const CreateListSchema = z
  .object({
    folder_id: z.string().uuid().optional().nullable(),
    space_id: z.string().uuid().optional().nullable(),
    name: z.string().min(1).max(100),
    description: z.string().max(500).optional().nullable(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional().nullable(),
    is_private: z.boolean().default(false),
  })
  .refine(
    (data) =>
      (data.folder_id != null && data.space_id == null) ||
      (data.folder_id == null && data.space_id != null),
    { message: 'Uma lista deve pertencer a um folder OU a um space, não ambos.' }
  )

// --------------------------------------------------------------------------
// TASK
// --------------------------------------------------------------------------
export const CreateTaskSchema = z.object({
  list_id: z.string().uuid(),
  parent_task_id: z.string().uuid().optional().nullable(),
  title: z.string().min(1, 'Título é obrigatório').max(500),
  description: z.string().max(10000).optional().nullable(),
  status_id: z.string().uuid().optional().nullable(),
  priority: PrioritySchema.optional().nullable(),
  due_date: z.string().datetime().optional().nullable(),
  start_date: z.string().datetime().optional().nullable(),
  estimated_hours: z.number().positive().max(9999).optional().nullable(),
  assignee_ids: z.array(z.string()).max(50).default([]),
})

export const UpdateTaskSchema = CreateTaskSchema
  .omit({ list_id: true, assignee_ids: true })
  .partial()

export const MoveTaskSchema = z.object({
  task_id: z.string().uuid(),
  target_list_id: z.string().uuid(),
  new_order: z.number().int().min(0),
})

// --------------------------------------------------------------------------
// COMMENT
// --------------------------------------------------------------------------
export const CreateCommentSchema = z.object({
  task_id: z.string().uuid(),
  content: z.string().min(1).max(5000),
})

// --------------------------------------------------------------------------
// WEBHOOK
// --------------------------------------------------------------------------
export const CreateWebhookSchema = z.object({
  organization_id: z.string().uuid(),
  name: z.string().min(1).max(100),
  url: z.string().url('URL do webhook inválida'),
  secret: z.string().min(16).max(256).optional(),
  events: z.array(WebhookEventSchema).min(1, 'Selecione ao menos um evento'),
})

// --------------------------------------------------------------------------
// FORM
// --------------------------------------------------------------------------
export const FormFieldSchema = z.object({
  id: z.string().uuid(),
  label: z.string().min(1).max(200),
  type: z.enum(['text', 'textarea', 'email', 'number', 'select', 'date', 'checkbox']),
  required: z.boolean().default(false),
  placeholder: z.string().max(200).optional(),
  options: z.array(z.string()).optional(),
  maps_to: z.enum(['title', 'description', 'priority', 'due_date']).optional(),
})

export const CreateFormSchema = z.object({
  list_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).optional().nullable(),
  slug: z
    .string()
    .min(3)
    .max(100)
    .regex(/^[a-z0-9-]+$/, 'Slug deve conter apenas letras minúsculas, números e hífens'),
  fields: z.array(FormFieldSchema).min(1).max(50),
})

// Payload de submissão de formulário público
export const FormSubmissionSchema = z.object({
  form_slug: z.string(),
  data: z.record(z.string(), z.unknown()),
})

// --------------------------------------------------------------------------
// TIPOS INFERIDOS
// --------------------------------------------------------------------------
export type CreateOrganizationInput = z.infer<typeof CreateOrganizationSchema>
export type CreateSpaceInput = z.infer<typeof CreateSpaceSchema>
export type CreateFolderInput = z.infer<typeof CreateFolderSchema>
export type CreateListInput = z.infer<typeof CreateListSchema>
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>
export type CreateWebhookInput = z.infer<typeof CreateWebhookSchema>
export type CreateFormInput = z.infer<typeof CreateFormSchema>
export type FormSubmissionInput = z.infer<typeof FormSubmissionSchema>
