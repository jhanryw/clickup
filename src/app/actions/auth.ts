'use server';

import { signIn as logtoSignIn, signOut as logtoSignOut } from '@logto/next/server-actions';
import { logtoConfig } from '@/app/logto';

export async function signInAction() {
    await logtoSignIn(logtoConfig);
}

export async function signOutAction() {
    await logtoSignOut(logtoConfig);
}
