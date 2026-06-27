import type { APIRoute } from 'astro';
import { recordAccessReview } from '@emela/shared/rh-data';

export const prerender = false;

/** Enregistre une revue des accès (back : oversight Admin SI / Direction). */
export const POST: APIRoute = async ({ request, cookies }) => {
  if (!cookies.get('sid')?.value) return json({ error: 'Non authentifié.' }, 401);
  let body: any = {};
  try { body = await request.json(); } catch { /* notes optionnelles */ }
  try {
    return json(await recordAccessReview(body?.notes ? String(body.notes).trim() : undefined), 200);
  } catch (e) {
    console.error('[api/audit-acces/revue]', e);
    const denied = e instanceof Error && e.message.includes('403');
    return json({ error: denied ? 'Non autorisé.' : 'Échec de l’enregistrement.' }, denied ? 403 : 400);
  }
};
const json = (d: unknown, s: number) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } });
