'use server';

import { signIn as logtoSignIn, signOut as logtoSignOut } from '@logto/next/server-actions';
import { logtoConfig } from '@/app/logto';

export async function signInAction() {
    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    await logtoSignIn(logtoConfig, { redirectUri: `${baseUrl}/callback` });
}

export async function signOutAction() {
    const baseUrl = process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
    await logtoSignOut(logtoConfig, `${baseUrl}/login`);
}
