import type { APIRoute } from 'astro';
import { frappeLogin } from '@emela/shared/session';

export const prerender = false;

/** POST /api/login (usr, pwd) → login Frappe, pose le cookie `sid`, redirige. */
export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const form = await request.formData();
  const usr = String(form.get('usr') ?? '').trim();
  const pwd = String(form.get('pwd') ?? '');
  if (!usr || !pwd) return redirect('/connexion?error=missing');

  const sid = await frappeLogin(usr, pwd);
  if (!sid) return redirect('/connexion?error=auth');

  cookies.set('sid', sid, {
    path: '/', httpOnly: true, sameSite: 'lax',
    secure: Boolean((import.meta as any).env?.PROD),
  });
  return redirect('/');
};
