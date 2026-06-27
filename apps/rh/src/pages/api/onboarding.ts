import type { APIRoute } from 'astro';
import { provisionUser } from '@emela/shared/rh-data';

export const prerender = false;

/** Onboarding contraint : le back vérifie l'autorisation (Gestion-SM/SM), la
 *  liste blanche de rôles, l'anti-auto-élévation et l'exclusion Gestion-SM ⇄ données. */
export const POST: APIRoute = async ({ request, cookies }) => {
  // Défense en profondeur : pas de session → on n'appelle même pas le back.
  if (!cookies.get('sid')?.value) {
    return json({ error: 'Non authentifié.' }, 401);
  }
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Corps de requête invalide.' }, 400);
  }
  if (!body?.email || !body?.full_name || !Array.isArray(body?.roles) || body.roles.length === 0) {
    return json({ error: 'E-mail, nom et au moins un rôle sont requis.' }, 400);
  }
  try {
    const res = await provisionUser({
      email: String(body.email).trim(),
      full_name: String(body.full_name).trim(),
      roles: body.roles.map((r: unknown) => String(r)),
      employee: body.employee ? String(body.employee).trim() : undefined,
    });
    return json(res, 200);
  } catch (e) {
    console.error('[api/onboarding]', e);
    const denied = e instanceof Error && e.message.includes('403');
    return json({ error: denied ? 'Non autorisé pour ce provisioning.' : 'Échec du provisioning.' }, denied ? 403 : 400);
  }
};

const json = (data: unknown, status: number) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
