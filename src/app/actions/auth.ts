'use server';

import { signIn as logtoSignIn, signOut as logtoSignOut } from '@logto/next/server-actions';
import { logtoConfig } from '@/app/logto';
import { cookies } from 'next/headers';

export async function signInAction() {
    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    const redirectUrl = `${baseUrl}/callback`;

    try {
        await logtoSignIn(logtoConfig, { redirectUri: redirectUrl });
    } catch (error: any) {
        if (error?.message === 'NEXT_REDIRECT') {
            // É esperado! O Next.js usa esse erro especial para redirecionar
            throw error;
        }

        console.error('[SignInAction Error]', error);
        // Em caso de erro local (ex: cookie corrompido ou configuração errada), 
        // limpa os cookies do logto antes de falhar silenciosamente (ou tentar de novo)
        const cookieStore = cookies();
        cookieStore.delete(`logto:${logtoConfig.appId}`);

        // Tenta de novo sem cookie antigo
        await logtoSignIn(logtoConfig, { redirectUri: redirectUrl });
    }
}

export async function signOutAction() {
    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    try {
        await logtoSignOut(logtoConfig, `${baseUrl}/login`);
    } catch (error: any) {
        if (error?.message === 'NEXT_REDIRECT') {
            throw error;
        }
        console.error('[SignOutAction Error]', error);
    }
}
