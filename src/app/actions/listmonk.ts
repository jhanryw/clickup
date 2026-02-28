"use server"

import { headers } from "next/headers"

/**
 * Server Action Segura para integrar com a API do Listmonk.
 * Executa APENAS no servidor. Credenciais seguras vindas do .env (.env.local)
 */
export async function sendTransactionalEmail(payload: {
    subscriberEmail: string
    subscriberName?: string
    templateId: number
    data?: Record<string, any>
}) {
    const url = process.env.LISTMONK_API_URL
    const username = process.env.LISTMONK_ADMIN_USERNAME
    const password = process.env.LISTMONK_ADMIN_PASSWORD

    if (!url || !username || !password) {
        console.warn("Credenciais do Listmonk ausentes. Ação ignorada.")
        return { success: false, error: "Missing Listmonk credentials" }
    }

    // Basic auth
    const authHeader = `Basic ${Buffer.from(`${username}:${password}`).toString("base64")}`

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
