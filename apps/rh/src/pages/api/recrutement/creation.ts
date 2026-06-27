import type { APIRoute } from 'astro';
import { createEmployeeFromRequest } from '@emela/shared/rh-data';

export const prerender = false;

/** Création du dossier Employee depuis une demande validée (back : RH, créateur ≠ validateur). */
export const POST: APIRoute = async ({ request, cookies }) => {
  if (!cookies.get('sid')?.value) return json({ error: 'Non authentifié.' }, 401);
  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'Requête invalide.' }, 400); }
  if (!body?.name || !body?.person_id || !body?.gender || !body?.date_of_birth) {
    return json({ error: 'Demande, matricule, genre et date de naissance requis.' }, 400);
  }
  try {
    return json(await createEmployeeFromRequest({
      name: String(body.name),
      person_id: String(body.person_id).trim(),
      gender: String(body.gender),
      date_of_birth: String(body.date_of_birth),
      date_of_joining: body.date_of_joining ? String(body.date_of_joining) : undefined,
      company: body.company ? String(body.company) : undefined,
    }), 200);
  } catch (e) {
    console.error('[api/recrutement/creation]', e);
    const denied = e instanceof Error && e.message.includes('403');
    return json({ error: denied ? 'Non autorisé (séparation des tâches).' : 'Échec de la création.' }, denied ? 403 : 400);
  }
};
const json = (d: unknown, s: number) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } });
