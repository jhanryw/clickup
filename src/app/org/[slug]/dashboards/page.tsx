import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { createServiceClient, withUserContext } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  BarChart2, CheckCircle2, Clock, AlertTriangle, LayoutList,
  Users, TrendingUp, Calendar, Layers,
} from 'lucide-react'

interface PageProps {
  params: { slug: string }
  searchParams: { spaceId?: string }
}

/** Barra horizontal CSS-only */
function HBar({ label, value, max, color = '#4f46e5', sublabel }: {
  label: string; value: number; max: number; color?: string; sublabel?: string
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-3">
      <div className="w-32 shrink-0 text-right">
        <span className="text-xs text-zinc-400 truncate block">{label}</span>
        {sublabel && <span className="text-[10px] text-zinc-600 block truncate">{sublabel}</span>}
      </div>
      <div className="flex-1 h-6 rounded-md bg-zinc-800/60 overflow-hidden relative">
        <div className="h-full rounded-md transition-all duration-500" style={{ width: `${pct}%`, backgroundColor: color }} />
        <span className="absolute inset-0 flex items-center px-2 text-[11px] font-medium text-zinc-300">{value}</span>
      </div>
      <span className="text-xs text-zinc-600 w-10 text-right shrink-0">{pct}%</span>
    </div>
  )
}

/** Card métrica */
function StatCard({ icon: Icon, label, value, sub, accent }: {
  icon: any; label: string; value: number | string; sub?: string; accent: string
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5 hover:border-zinc-700 transition-colors">
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg mb-3 ${accent}`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <p className="text-2xl font-bold text-zinc-100">{value}</p>
      <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
      {sub && <p className="text-[10px] text-zinc-600 mt-1">{sub}</p>}
    </div>
  )
}

export default async function DashboardsPage({ params, searchParams }: PageProps) {
  const headersList = headers()
  const userId = headersList.get('x-user-id')
  if (!userId) redirect('/login')

  const db = createServiceClient()

  const { data: org } = await db
    .from('organizations')
    .select('id, name')
    .eq('slug', params.slug)
    .single()

  if (!org) redirect('/')

  // Fetch all spaces (for the filter dropdown)
  const spaces = await withUserContext(userId, async (ctxDb) => {
    const { data } = await ctxDb
      .from('spaces')
      .select('id, name, color')
      .eq('organization_id', org.id)
      .order('name')
    return data ?? []
  })

  const selectedSpaceId = searchParams.spaceId ?? null
  const selectedSpace = spaces.find((s: any) => s.id === selectedSpaceId) ?? null

  // Fetch tasks — filter by space if selected
  const tasks = await withUserContext(userId, async (ctxDb) => {
    let q = ctxDb
      .from('tasks')
      .select(`
        id, title, priority, due_date, created_at, list_id,
        status_id,
        custom_statuses ( id, name, color, is_closed ),
        task_assignees ( user_id )
      `)

    if (selectedSpaceId) {
      // Get list IDs belonging to this space (direct and via folders)
      const { data: spaceLists } = await ctxDb
        .from('lists')
        .select('id, space_id, folder_id, folders(space_id)')
        .or(`space_id.eq.${selectedSpaceId},folders.space_id.eq.${selectedSpaceId}`)

      const listIds = (spaceLists ?? []).map((l: any) => l.id)
      if (listIds.length === 0) return []
      q = q.in('list_id', listIds)
    }

    const { data } = await q.order('created_at', { ascending: false })
    return data ?? []
  })

  // Fetch org members for assignee labels
  const { data: orgMembers } = await db
    .from('organization_members')
    .select('user_id, profiles(full_name, email)')
    .eq('organization_id', org.id)

  const memberMap = new Map(
    (orgMembers ?? []).map((m: any) => [
      m.user_id,
      m.profiles?.full_name || m.profiles?.email?.split('@')[0] || m.user_id.slice(0, 8),
    ])
  )

  // Fetch custom fields + their values for the selected space/org
  let customFieldStats: Array<{ fieldName: string; breakdown: Array<{ label: string; count: number; color?: string }> }> = []

  if (tasks.length > 0) {
    const taskIds = (tasks as any[]).map((t) => t.id)

    // Get list IDs from tasks
    const listIds = [...new Set((tasks as any[]).map((t) => t.list_id).filter(Boolean))]

    if (listIds.length > 0) {
      const { data: fieldDefs } = await db
        .from('custom_field_definitions')
        .select('id, name, type, options')
        .in('list_id', listIds)
        .order('position')

      if (fieldDefs && fieldDefs.length > 0) {
        const { data: fieldValues } = await db
          .from('task_custom_field_values')
          .select('task_id, field_id, value_text, value_number, value_bool, value_json')
          .in('task_id', taskIds)

        // For each field, build a breakdown
        for (const fd of fieldDefs as any[]) {
          if (fd.type !== 'select' && fd.type !== 'multiselect' && fd.type !== 'text') continue

          const valuesForField = (fieldValues ?? []).filter((v: any) => v.field_id === fd.id)
          const countMap = new Map<string, number>()
          const colorMap = new Map<string, string>()

          // Build color map from options
          for (const opt of fd.options ?? []) {
            colorMap.set(opt.label, opt.color || '#6366f1')
          }

          for (const v of valuesForField) {
            const raw = v.value_text || ''
            if (!raw) continue

            // For multiselect, split by comma
            const parts = fd.type === 'multiselect' ? raw.split(',').map((s: string) => s.trim()) : [raw]
            for (const p of parts) {
              if (p) countMap.set(p, (countMap.get(p) ?? 0) + 1)
            }
          }

          if (countMap.size > 0) {
            customFieldStats.push({
              fieldName: fd.name,
              breakdown: Array.from(countMap.entries())
                .map(([label, count]) => ({ label, count, color: colorMap.get(label) }))
                .sort((a, b) => b.count - a.count)
                .slice(0, 8),
            })
          }
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Aggregate stats
  // -------------------------------------------------------------------------
  const total   = tasks.length
  const done    = (tasks as any[]).filter((t) => t.custom_statuses?.is_closed).length
  const open    = total - done
  const urgent  = (tasks as any[]).filter((t) => t.priority === 'urgent' || t.priority === 'high').length
  const now     = new Date()
  const overdue = (tasks as any[]).filter((t) => {
    if (!t.due_date || t.custom_statuses?.is_closed) return false
    return new Date(t.due_date) < now
  }).length

  const endOfWeek = new Date(now)
  endOfWeek.setDate(now.getDate() + 7)
  const dueWeek = (tasks as any[]).filter((t) => {
    if (!t.due_date || t.custom_statuses?.is_closed) return false
    const d = new Date(t.due_date)
    return d >= now && d <= endOfWeek
  }).length

  // By status
  const byStatus = new Map<string, { name: string; color: string; count: number }>()
  for (const t of tasks as any[]) {
    const s = t.custom_statuses
    if (!s) continue
    const prev = byStatus.get(s.id) ?? { name: s.name, color: s.color, count: 0 }
    byStatus.set(s.id, { ...prev, count: prev.count + 1 })
  }
  const statusRows = Array.from(byStatus.values()).sort((a, b) => b.count - a.count)
  const maxStatus = Math.max(...statusRows.map((r) => r.count), 1)

  // By assignee
  const byAssignee = new Map<string, number>()
  for (const t of tasks as any[]) {
    for (const a of t.task_assignees ?? []) {
      byAssignee.set(a.user_id, (byAssignee.get(a.user_id) ?? 0) + 1)
    }
  }
  const assigneeRows = Array.from(byAssignee.entries())
    .map(([uid, count]) => ({ uid, name: memberMap.get(uid) ?? uid.slice(0, 8), count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 8)
  const maxAssignee = Math.max(...assigneeRows.map((r) => r.count), 1)

  // By priority
  const byPriority: Record<string, number> = { urgent: 0, high: 0, normal: 0, low: 0, none: 0 }
  for (const t of tasks as any[]) {
    const p = t.priority ?? 'none'
    byPriority[p] = (byPriority[p] ?? 0) + 1
  }
  const priorityColors: Record<string, string> = {
    urgent: '#ef4444', high: '#f97316', normal: '#3b82f6', low: '#6b7280', none: '#3f3f46',
  }
  const priorityLabels: Record<string, string> = {
    urgent: 'Urgente', high: 'Alta', normal: 'Normal', low: 'Baixa', none: 'Sem prioridade',
  }
  const maxPriority = Math.max(...Object.values(byPriority), 1)

  const completionPct = total > 0 ? Math.round((done / total) * 100) : 0

  const last7: number[] = Array(7).fill(0)
  for (const t of tasks as any[]) {
    const diffDays = Math.floor((now.getTime() - new Date(t.created_at).getTime()) / 86400000)
    if (diffDays >= 0 && diffDays < 7) last7[6 - diffDays]++
  }
  const maxLast7 = Math.max(...last7, 1)

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="max-w-6xl mx-auto px-8 py-8 space-y-8">

        {/* Header + Space filter */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10">
                <BarChart2 className="h-4 w-4 text-indigo-400" />
              </div>
              <h1 className="text-2xl font-bold text-zinc-100">Painéis</h1>
            </div>
            <p className="text-sm text-zinc-500">
              {selectedSpace
                ? `Espaço: ${selectedSpace.name}`
                : 'Visão analítica de todo o workspace'}
            </p>
          </div>

          {/* Space filter */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href={`/org/${params.slug}/dashboards`}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                !selectedSpaceId
                  ? 'bg-indigo-600 text-white'
                  : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Todos
            </Link>
            {(spaces as any[]).map((s) => (
              <Link
                key={s.id}
                href={`/org/${params.slug}/dashboards?spaceId=${s.id}`}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  selectedSpaceId === s.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full mr-1.5"
                  style={{ backgroundColor: s.color || '#4f46e5' }}
                />
                {s.name}
              </Link>
            ))}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard icon={LayoutList}    label="Total de tarefas"   value={total}   accent="bg-indigo-500/10 text-indigo-400" />
          <StatCard icon={CheckCircle2}  label="Concluídas"         value={done}    sub={`${completionPct}% do total`} accent="bg-emerald-500/10 text-emerald-400" />
          <StatCard icon={AlertTriangle} label="Urgentes / Altas"   value={urgent}  accent="bg-orange-500/10 text-orange-400" />
          <StatCard icon={Clock}         label="Atrasadas"          value={overdue} accent="bg-red-500/10 text-red-400" />
        </div>

        {/* Charts row 1 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Por Status */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              Tarefas por Status
            </h2>
            {statusRows.length === 0
              ? <p className="text-xs text-zinc-600 py-8 text-center">Nenhuma tarefa ainda</p>
              : <div className="space-y-3">{statusRows.map((r) => <HBar key={r.name} label={r.name} value={r.count} max={maxStatus} color={r.color} />)}</div>
            }
          </div>

          {/* Por Prioridade */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-orange-500" />
              Tarefas por Prioridade
            </h2>
            <div className="space-y-3">
              {(['urgent','high','normal','low','none'] as const).map((p) =>
                byPriority[p] > 0 && (
                  <HBar key={p} label={priorityLabels[p]} value={byPriority[p]} max={maxPriority} color={priorityColors[p]} />
                )
              )}
            </div>
          </div>

          {/* Por Responsável */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
              <Users className="h-3.5 w-3.5 text-zinc-500" />
              Distribuição por Responsável
            </h2>
            {assigneeRows.length === 0
              ? <p className="text-xs text-zinc-600 py-8 text-center">Nenhuma tarefa atribuída</p>
              : <div className="space-y-3">{assigneeRows.map((r) => <HBar key={r.uid} label={r.name} value={r.count} max={maxAssignee} color="#6366f1" />)}</div>
            }
          </div>

          {/* Indicadores rápidos */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-300 flex items-center gap-2">
              <TrendingUp className="h-3.5 w-3.5 text-zinc-500" />
              Indicadores Rápidos
            </h2>

            <div>
              <div className="flex justify-between mb-1.5">
                <span className="text-xs text-zinc-400">Taxa de Conclusão</span>
                <span className="text-xs font-semibold text-zinc-300">{completionPct}%</span>
              </div>
              <div className="h-3 rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-indigo-400 transition-all duration-700" style={{ width: `${completionPct}%` }} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-2">
              {[
                { v: open,    label: 'Em aberto',       cls: 'text-zinc-100' },
                { v: dueWeek, label: 'Vence em 7 dias', cls: 'text-amber-400' },
                { v: overdue, label: 'Atrasadas',        cls: 'text-red-400' },
                { v: done,    label: 'Concluídas',       cls: 'text-emerald-400' },
              ].map(({ v, label, cls }) => (
                <div key={label} className="rounded-lg bg-zinc-800/50 p-3">
                  <p className={`text-xl font-bold ${cls}`}>{v}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">{label}</p>
                </div>
              ))}
            </div>

            {/* Sparkline */}
            <div>
              <p className="text-[10px] text-zinc-600 mb-2 flex items-center gap-1">
                <Calendar className="h-3 w-3" /> Criadas (7 dias)
              </p>
              <div className="flex items-end gap-1 h-10">
                {last7.map((v, i) => {
                  const h = maxLast7 > 0 ? Math.max(4, Math.round((v / maxLast7) * 40)) : 4
                  return (
                    <div key={i} style={{ height: `${h}px` }} title={`${v} tarefa${v !== 1 ? 's' : ''}`}
                      className="flex-1 rounded-sm bg-indigo-500/60 hover:bg-indigo-400 transition-colors cursor-default" />
                  )
                })}
              </div>
              <div className="flex justify-between mt-1 text-[9px] text-zinc-700">
                <span>7 dias atrás</span><span>Hoje</span>
              </div>
            </div>
          </div>
        </div>

        {/* Campos Personalizados — breakdown por valor */}
        {customFieldStats.length > 0 && (
          <div>
            <h2 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
              <Layers className="h-3.5 w-3.5 text-indigo-400" />
              Campos Personalizados
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {customFieldStats.map((cfs) => {
                const maxCf = Math.max(...cfs.breakdown.map((b) => b.count), 1)
                return (
                  <div key={cfs.fieldName} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-5">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <Layers className="h-3 w-3 text-zinc-600" />
                      {cfs.fieldName}
                    </p>
                    <div className="space-y-2.5">
                      {cfs.breakdown.map((b) => (
                        <HBar key={b.label} label={b.label} value={b.count} max={maxCf} color={b.color || '#6366f1'} />
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Próximas a vencer */}
        {dueWeek > 0 && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-6">
            <h2 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 text-amber-400" />
              Próximas a Vencer (7 dias)
            </h2>
            <div className="divide-y divide-zinc-800/50 rounded-lg border border-zinc-800 overflow-hidden">
              {(tasks as any[])
                .filter((t) => {
                  if (!t.due_date || t.custom_statuses?.is_closed) return false
                  const d = new Date(t.due_date)
                  return d >= now && d <= endOfWeek
                })
                .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime())
                .slice(0, 10)
                .map((t) => {
                  const s = t.custom_statuses
                  const assignees = (t.task_assignees ?? []).map((a: any) => memberMap.get(a.user_id)).filter(Boolean)
                  const daysLeft = Math.ceil((new Date(t.due_date).getTime() - now.getTime()) / 86400000)
                  return (
                    <div key={t.id} className="flex items-center gap-4 px-4 py-2.5 bg-zinc-950/50 hover:bg-zinc-800/30 transition-colors">
                      <div className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: s?.color || '#6b7280' }} />
                      <span className="text-sm text-zinc-200 flex-1 truncate">{t.title}</span>
                      {assignees.length > 0 && (
                        <span className="text-[11px] text-zinc-500 shrink-0">{(assignees as string[]).slice(0, 2).join(', ')}</span>
                      )}
                      <span className={`text-[11px] font-medium shrink-0 ${daysLeft === 0 ? 'text-red-400' : daysLeft <= 2 ? 'text-orange-400' : 'text-zinc-500'}`}>
                        {daysLeft === 0 ? 'Hoje' : `${daysLeft}d`}
                      </span>
                    </div>
                  )
                })}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
