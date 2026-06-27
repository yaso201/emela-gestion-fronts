import type { APIRoute } from 'astro';
import { updatePayrollParameter } from '@emela/shared/rh-data';

export const prerender = false;

/** Édition d'un paramètre de paie (le back gate Gestion-SM/admin + journalise). */
export const POST: APIRoute = async ({ request, cookies }) => {
  if (!cookies.get('sid')?.value) return json({ error: 'Non authentifié.' }, 401);
  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'Requête invalide.' }, 400); }
  if (!body?.parameter_key || body?.parameter_value == null) return json({ error: 'Clé et valeur requises.' }, 400);
  try {
    return json(await updatePayrollParameter(String(body.parameter_key), String(body.parameter_value)), 200);
  } catch (e) {
    console.error('[api/parametres]', e);
    const denied = e instanceof Error && e.message.includes('403');
    return json({ error: denied ? 'Non autorisé.' : 'Échec de la mise à jour.' }, denied ? 403 : 400);
  }
};
const json = (d: unknown, s: number) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } });
