import type { APIRoute } from 'astro';
import { previewSeparation } from '@emela/shared/rh-data';

export const prerender = false;

/** Simulateur de séparation (lecture ; le back gate le rôle RH). */
export const POST: APIRoute = async ({ request, cookies }) => {
  if (!cookies.get('sid')?.value) return json({ error: 'Non authentifié.' }, 401);
  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'Requête invalide.' }, 400); }
  if (!body?.employee || !body?.separation_type) return json({ error: 'Salarié et type requis.' }, 400);
  try {
    return json(await previewSeparation(String(body.employee), String(body.separation_type), body.reason ? String(body.reason) : ''), 200);
  } catch (e) {
    console.error('[api/separations/preview]', e);
    const denied = e instanceof Error && e.message.includes('403');
    return json({ error: denied ? 'Non autorisé.' : 'Échec de la simulation.' }, denied ? 403 : 400);
  }
};
const json = (d: unknown, s: number) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } });
