'use server'

/**
 * Integração com Resend via HTTP REST API.
 * Variáveis de ambiente necessárias:
 *   RESEND_API_KEY   — chave de API do Resend
 *   RESEND_FROM_EMAIL — remetente, ex: "Qarvon <noreply@seudominio.com>"
 *   NEXT_PUBLIC_APP_URL — URL base da aplicação, ex: https://app.qarvon.com
 */

const ROLE_LABELS: Record<string, string> = {
  admin:  'Administrador',
  member: 'Membro',
  viewer: 'Visualizador',
}

interface SendInviteEmailParams {
  to: string
  inviteLink: string
  orgName: string
  role: string
}

export async function sendInviteEmail({
  to,
  inviteLink,
  orgName,
  role,
}: SendInviteEmailParams): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    console.warn('[Resend] RESEND_API_KEY não configurada — email de convite não enviado.')
    return { success: false, error: 'RESEND_API_KEY não configurada' }
  }

  const from = process.env.RESEND_FROM_EMAIL || 'Qarvon <jhanry@qarvon.com>'
  const roleLabel = ROLE_LABELS[role] ?? role

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>
<body style="margin:0;padding:0;background:#09090b;font-family:system-ui,-apple-system,sans-serif;">
  <div style="max-width:560px;margin:48px auto;background:#18181b;border-radius:12px;border:1px solid #27272a;padding:40px 36px;">
    <div style="margin-bottom:28px;">
      <div style="display:inline-block;background:#312e81;border-radius:8px;padding:10px 14px;font-size:18px;font-weight:700;color:#c7d2fe;letter-spacing:-0.5px;">
        Qarvon
      </div>
    </div>

    <h1 style="color:#f4f4f5;font-size:22px;font-weight:700;margin:0 0 12px;">
      Você foi convidado!
    </h1>
    <p style="color:#a1a1aa;font-size:15px;line-height:1.6;margin:0 0 28px;">
      Você recebeu um convite para entrar na organização
      <strong style="color:#e4e4e7;">${orgName}</strong>
      como <strong style="color:#e4e4e7;">${roleLabel}</strong>.
      Clique no botão abaixo para aceitar.
    </p>

    <a href="${inviteLink}"
       style="display:inline-block;background:#4f46e5;color:#ffffff;padding:13px 28px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;letter-spacing:0.2px;">
      Aceitar Convite →
    </a>

    <div style="margin-top:32px;padding-top:24px;border-top:1px solid #27272a;">
      <p style="color:#52525b;font-size:12px;margin:0 0 6px;">
        Se o botão não funcionar, copie e cole este link no navegador:
      </p>
      <a href="${inviteLink}" style="color:#818cf8;font-size:12px;word-break:break-all;">
        ${inviteLink}
      </a>
    </div>

    <p style="color:#3f3f46;font-size:11px;margin:24px 0 0;">
      Se você não esperava este convite, pode ignorar este email com segurança.
    </p>
  </div>
</body>
</html>`

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: `Convite para ${orgName} — Qarvon`,
        html,
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({})) as Record<string, any>
      const msg = body?.message ?? body?.name ?? `HTTP ${res.status}`
      console.error('[Resend] Falha ao enviar email:', msg)
      return { success: false, error: msg }
    }

    return { success: true }
  } catch (err: any) {
    console.error('[Resend] Erro de rede:', err?.message)
    return { success: false, error: err?.message ?? 'Erro de rede' }
  }
}
