import type { APIRoute } from 'astro';
import { frappeLogout } from '@emela/shared/session';

export const prerender = false;

/** Déconnexion : logout Frappe (best-effort) + efface le cookie `sid`.
 *  POST uniquement (un GET exposerait une déconnexion CSRF via <img>/<a>). */
export const POST: APIRoute = async ({ cookies, redirect }) => {
  const sid = cookies.get('sid')?.value;
  await frappeLogout(sid);
  cookies.delete('sid', { path: '/' });
  return redirect('/connexion');
};
