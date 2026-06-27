import type { APIRoute } from 'astro';
import { createOnboardingRequest } from '@emela/shared/rh-data';

export const prerender = false;

/** Demande d'embauche (le back gate les rôles demandeur + manager d'équipe). */
export const POST: APIRoute = async ({ request, cookies }) => {
  if (!cookies.get('sid')?.value) return json({ error: 'Non authentifié.' }, 401);
  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'Requête invalide.' }, 400); }
  if (!body?.candidate_name) return json({ error: 'Le nom du candidat est requis.' }, 400);
  try {
    return json(await createOnboardingRequest({
      candidate_name: String(body.candidate_name).trim(),
      candidate_email: body.candidate_email ? String(body.candidate_email).trim() : undefined,
      designation: body.designation ? String(body.designation).trim() : undefined,
      department: body.department ? String(body.department).trim() : undefined,
      reason: body.reason ? String(body.reason).trim() : undefined,
    }), 200);
  } catch (e) {
    console.error('[api/recrutement/demande]', e);
    const denied = e instanceof Error && e.message.includes('403');
    return json({ error: denied ? 'Non autorisé.' : 'Échec de la demande.' }, denied ? 403 : 400);
  }
};
const json = (d: unknown, s: number) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } });
