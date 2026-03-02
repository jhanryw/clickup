"use server"

/**
 * Server Action para integrar com a API do Listmonk.
 * Suporta autenticação por token (LISTMONK_TOKEN) ou Basic Auth
 * (LISTMONK_ADMIN_USERNAME + LISTMONK_ADMIN_PASSWORD).
 */
export async function sendTransactionalEmail(payload: {
  subscriberEmail: string
  subscriberName?: string
  templateId: number
  data?: Record<string, any>
}) {
  const url = process.env.LISTMONK_API_URL
  const token = process.env.LISTMONK_TOKEN
  const username = process.env.LISTMONK_ADMIN_USERNAME
  const password = process.env.LISTMONK_ADMIN_PASSWORD

  if (!url) {
    console.warn("[Listmonk] LISTMONK_API_URL não configurado. Ação ignorada.")
    return { success: false, error: "Missing LISTMONK_API_URL" }
  }

  // Prefere token (Bearer), fallback para Basic Auth
  let authHeader: string
  if (token) {
    authHeader = `token ${token}`
  } else if (username && password) {
    authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`
  } else {
    console.warn("[Listmonk] Credenciais ausentes. Configure LISTMONK_TOKEN ou LISTMONK_ADMIN_USERNAME+PASSWORD.")
    return { success: false, error: "Missing Listmonk credentials" }
  }

  try {
    const res = await fetch(`${url}/api/tx`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader,
      },
      body: JSON.stringify({
        subscriber_email: payload.subscriberEmail,
        subscriber_name: payload.subscriberName || payload.subscriberEmail.split("@")[0],
        template_id: payload.templateId,
        data: payload.data || {},
      }),
    })

    if (!res.ok) {
      const errorText = await res.text()
      console.error("[Listmonk] Erro ao enviar email:", errorText)
      return { success: false, error: errorText }
    }

    return { success: true }
  } catch (error: any) {
    console.error("[Listmonk] Exceção:", error.message)
    return { success: false, error: error.message }
  }
}
