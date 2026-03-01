'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { inviteMember } from '@/app/actions/hierarchy'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { UserPlus, Shield, ShieldCheck, Eye, Crown, Mail } from 'lucide-react'

interface Member {
  userId: string
  role: string
  joinedAt: string
  displayName: string
  email: string
  avatarUrl: string | null
}

interface MembersClientProps {
  members: Member[]
  orgId: string
  currentUserRole: string
}

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  owner: { label: 'Dono', color: 'bg-amber-500/10 text-amber-400 border-amber-500/20', icon: Crown },
  admin: { label: 'Admin', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: ShieldCheck },
  member: { label: 'Membro', color: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: Shield },
  viewer: { label: 'Visualizador', color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20', icon: Eye },
}

export function MembersClient({ members, orgId, currentUserRole }: MembersClientProps) {
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const router = useRouter()

  const canInvite = currentUserRole === 'owner' || currentUserRole === 'admin'

  async function handleInvite(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setInviteLoading(true)
    setInviteError(null)
    setInviteSuccess(false)

    const form = new FormData(e.currentTarget)
    const email = form.get('email') as string
    const role = form.get('role') as string

    try {
      const result = await inviteMember(orgId, email, role as any)

      if ('error' in result && result.error) {
        setInviteError(result.error as string)
      } else {
        setInviteSuccess(true)
        router.refresh()
        setTimeout(() => {
          setInviteOpen(false)
          setInviteSuccess(false)
        }, 1500)
      }
    } catch (err: any) {
      setInviteError(err.message || 'Erro ao convidar membro')
    } finally {
      setInviteLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Invite Button */}
      {canInvite && (
        <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
          <DialogTrigger asChild>
            <Button className="bg-indigo-600 hover:bg-indigo-700 text-white">
              <UserPlus className="h-4 w-4 mr-2" />
              Convidar Membro
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100 sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Convidar Membro</DialogTitle>
            </DialogHeader>

            <form onSubmit={handleInvite} className="space-y-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="invite-email" className="text-zinc-300">Email *</Label>
                <Input
                  id="invite-email"
                  name="email"
                  type="email"
                  required
                  placeholder="email@exemplo.com"
                  className="bg-zinc-950 border-zinc-700 text-zinc-200 placeholder:text-zinc-600"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="invite-role" className="text-zinc-300">Cargo</Label>
                <select
                  id="invite-role"
                  name="role"
                  defaultValue="member"
                  className="flex h-10 w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-200"
                >
                  <option value="viewer">Visualizador</option>
                  <option value="member">Membro</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              {inviteError && (
                <p className="text-sm text-red-400 bg-red-950/30 px-3 py-2 rounded">{inviteError}</p>
              )}

              {inviteSuccess && (
                <p className="text-sm text-green-400 bg-green-950/30 px-3 py-2 rounded">
                  Membro convidado com sucesso!
                </p>
              )}

              <div className="flex justify-end gap-3 pt-2">
                <Button type="button" variant="ghost" onClick={() => setInviteOpen(false)} className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800">
                  Cancelar
                </Button>
                <Button type="submit" disabled={inviteLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                  {inviteLoading ? 'Convidando...' : 'Convidar'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* Members List */}
      <div className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
        <div className="grid grid-cols-[1fr_auto_auto] gap-4 px-5 py-3 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
          <span>Membro</span>
          <span className="w-32 text-center">Cargo</span>
          <span className="w-32 text-right">Entrou em</span>
        </div>

        {members.map((member) => {
          const roleConfig = ROLE_CONFIG[member.role] || ROLE_CONFIG.member
          const RoleIcon = roleConfig.icon
          const initials = member.displayName.substring(0, 2).toUpperCase()

          return (
            <div
              key={member.userId}
              className="grid grid-cols-[1fr_auto_auto] gap-4 items-center px-5 py-3 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors last:border-b-0"
            >
              {/* User Info */}
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-zinc-300">
                  {member.avatarUrl ? (
                    <img src={member.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                  ) : (
                    initials
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-zinc-200 truncate">
                    {member.displayName}
                  </p>
                  <p className="text-xs text-zinc-500 truncate flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {member.email}
                  </p>
                </div>
              </div>

              {/* Role Badge */}
              <div className="w-32 flex justify-center">
                <Badge
                  variant="outline"
                  className={`${roleConfig.color} text-xs font-medium px-2.5 py-0.5`}
                >
                  <RoleIcon className="h-3 w-3 mr-1" />
                  {roleConfig.label}
                </Badge>
              </div>

              {/* Joined Date */}
              <div className="w-32 text-right">
                <span className="text-xs text-zinc-500">
                  {new Date(member.joinedAt).toLocaleDateString('pt-BR', {
                    day: '2-digit',
                    month: 'short',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          )
        })}

        {members.length === 0 && (
          <div className="px-5 py-12 text-center text-zinc-500">
            Nenhum membro encontrado.
          </div>
        )}
      </div>
    </div>
  )
}
