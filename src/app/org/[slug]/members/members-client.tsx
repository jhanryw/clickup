'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { inviteMember, deleteInvitation } from '@/app/actions/hierarchy'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog'
import { UserPlus, Shield, ShieldCheck, Eye, Crown, Mail, Clock, X, Users, Copy, Check, Trash2, Link2 } from 'lucide-react'

interface Member {
  userId: string
  role: string
  joinedAt: string
  displayName: string
  email: string
  avatarUrl: string | null
}

interface PendingInvite {
  id: string
  email: string
  role: string
  createdAt: string
  token: string
}

interface MembersClientProps {
  members: Member[]
  orgId: string
  currentUserRole: string
  pendingInvites?: PendingInvite[]
}

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  owner:  { label: 'Dono',          color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',   icon: Crown },
  admin:  { label: 'Admin',         color: 'bg-purple-500/10 text-purple-400 border-purple-500/20', icon: ShieldCheck },
  member: { label: 'Membro',        color: 'bg-blue-500/10 text-blue-400 border-blue-500/20',       icon: Shield },
  viewer: { label: 'Visualizador',  color: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',       icon: Eye },
}

type Tab = 'members' | 'invites'

export function MembersClient({ members, orgId, currentUserRole, pendingInvites = [] }: MembersClientProps) {
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState(false)
  const [newInviteToken, setNewInviteToken] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('members')
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [, startTransition] = useTransition()
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
        // Guarda o token para exibir o link imediatamente
        if (result.data && 'token' in result.data) {
          setNewInviteToken(result.data.token as string)
        }
        router.refresh()
      }
    } catch (err: any) {
      setInviteError(err.message || 'Erro ao convidar membro')
    } finally {
      setInviteLoading(false)
    }
  }

  function handleDeleteInvite(inviteId: string) {
    setDeletingId(inviteId)
    startTransition(async () => {
      const result = await deleteInvitation(inviteId)
      if ('error' in result && result.error) {
        alert(result.error as string)
      } else {
        router.refresh()
      }
      setDeletingId(null)
    })
  }

  function getInviteLink(token: string) {
    const origin = typeof window !== 'undefined' ? window.location.origin : ''
    return `${origin}/accept-invite?token=${token}`
  }

  function handleCopyLink(inviteId: string, token: string) {
    navigator.clipboard.writeText(getInviteLink(token)).then(() => {
      setCopiedId(inviteId)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }

  return (
    <div className="space-y-5">
      {/* Tabs */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div className="flex gap-1">
          <button
            onClick={() => setActiveTab('members')}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'members'
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            <Users className="h-4 w-4" />
            Membros
            <span className="bg-zinc-700 text-zinc-400 text-[10px] font-bold rounded-full px-1.5 py-0.5">
              {members.length}
            </span>
          </button>
          <button
            onClick={() => setActiveTab('invites')}
            className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === 'invites'
                ? 'bg-zinc-800 text-zinc-100'
                : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
            }`}
          >
            <Clock className="h-4 w-4" />
            Convites Pendentes
            {pendingInvites.length > 0 && (
              <span className="bg-indigo-600/20 text-indigo-400 text-[10px] font-bold rounded-full px-1.5 py-0.5">
                {pendingInvites.length}
              </span>
            )}
          </button>
        </div>

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
                {inviteSuccess && newInviteToken && (
                  <div className="space-y-2">
                    <p className="text-sm text-green-400 bg-green-950/30 px-3 py-2 rounded">
                      ✓ Convite criado! Copie o link abaixo e envie ao convidado.
                    </p>
                    <div className="flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2">
                      <p className="flex-1 text-xs text-zinc-400 truncate font-mono">
                        {getInviteLink(newInviteToken)}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleCopyLink('new', newInviteToken)}
                        className="shrink-0 rounded p-1 text-zinc-400 hover:text-indigo-300 hover:bg-zinc-800"
                      >
                        {copiedId === 'new' ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                )}
                {inviteSuccess && !newInviteToken && (
                  <p className="text-sm text-green-400 bg-green-950/30 px-3 py-2 rounded">
                    ✓ Usuário adicionado diretamente (já tinha perfil)!
                  </p>
                )}
                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => { setInviteOpen(false); setInviteSuccess(false); setNewInviteToken(null) }}
                    className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                  >
                    {inviteSuccess ? 'Fechar' : 'Cancelar'}
                  </Button>
                  {!inviteSuccess && (
                    <Button type="submit" disabled={inviteLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
                      {inviteLoading ? 'Criando...' : 'Criar Convite'}
                    </Button>
                  )}
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Members Tab */}
      {activeTab === 'members' && (
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
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium text-zinc-300">
                    {member.avatarUrl ? (
                      <img src={member.avatarUrl} alt="" className="h-9 w-9 rounded-full object-cover" />
                    ) : initials}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-zinc-200 truncate">{member.displayName}</p>
                    <p className="text-xs text-zinc-500 truncate flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {member.email}
                    </p>
                  </div>
                </div>

                <div className="w-32 flex justify-center">
                  <Badge variant="outline" className={`${roleConfig.color} text-xs font-medium px-2.5 py-0.5`}>
                    <RoleIcon className="h-3 w-3 mr-1" />
                    {roleConfig.label}
                  </Badge>
                </div>

                <div className="w-32 text-right">
                  <span className="text-xs text-zinc-500">
                    {new Date(member.joinedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </span>
                </div>
              </div>
            )
          })}

          {members.length === 0 && (
            <div className="px-5 py-12 text-center text-zinc-500">Nenhum membro encontrado.</div>
          )}
        </div>
      )}

      {/* Pending Invites Tab */}
      {activeTab === 'invites' && (
        <div className="rounded-lg border border-zinc-800 bg-zinc-900 overflow-hidden">
          {pendingInvites.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <Clock className="h-10 w-10 text-zinc-700 mx-auto mb-3" />
              <p className="text-sm text-zinc-500">Nenhum convite pendente.</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-[1fr_auto_auto_auto] gap-3 px-5 py-3 border-b border-zinc-800 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                <span>Email</span>
                <span className="w-24 text-center">Cargo</span>
                <span className="w-24 text-right">Enviado em</span>
                {canInvite && <span className="w-24" />}
              </div>

              {pendingInvites.map((invite) => {
                const roleConfig = ROLE_CONFIG[invite.role] || ROLE_CONFIG.member
                const RoleIcon = roleConfig.icon
                const isCopied = copiedId === invite.id
                return (
                  <div
                    key={invite.id}
                    className="grid grid-cols-[1fr_auto_auto_auto] gap-3 items-center px-5 py-3 border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors last:border-b-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800/80 border border-dashed border-zinc-700">
                        <Mail className="h-3.5 w-3.5 text-zinc-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm text-zinc-300 truncate">{invite.email}</p>
                        <p className="text-[10px] text-zinc-600">Aguardando aceitação</p>
                      </div>
                    </div>

                    <div className="w-24 flex justify-center">
                      <Badge variant="outline" className={`${roleConfig.color} text-xs font-medium px-2 py-0.5`}>
                        <RoleIcon className="h-3 w-3 mr-1" />
                        {roleConfig.label}
                      </Badge>
                    </div>

                    <div className="w-24 text-right">
                      <span className="text-xs text-zinc-500">
                        {new Date(invite.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </span>
                    </div>

                    {canInvite && (
                      <div className="w-24 flex items-center justify-end gap-1">
                        {/* Copiar Link */}
                        <button
                          onClick={() => handleCopyLink(invite.id, invite.token)}
                          className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
                            isCopied
                              ? 'text-green-400 bg-green-950/30'
                              : 'text-zinc-500 hover:text-indigo-300 hover:bg-indigo-950/30'
                          }`}
                          title="Copiar link de convite"
                        >
                          {isCopied ? <Check className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
                          {isCopied ? 'Copiado' : 'Copiar'}
                        </button>
                        {/* Excluir */}
                        <button
                          onClick={() => handleDeleteInvite(invite.id)}
                          disabled={deletingId === invite.id}
                          className="flex items-center justify-center rounded p-1.5 text-zinc-600 hover:text-red-400 hover:bg-red-950/30 transition-colors disabled:opacity-40"
                          title="Excluir convite"
                        >
                          {deletingId === invite.id
                            ? <span className="text-[10px]">...</span>
                            : <Trash2 className="h-3.5 w-3.5" />
                          }
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}
    </div>
  )
}
