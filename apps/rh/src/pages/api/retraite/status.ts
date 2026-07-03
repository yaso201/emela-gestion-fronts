import type { APIRoute } from 'astro';
import { getRetirementStatus, getCareerStatement } from '@emela/shared/rh-data';

export const prerender = false;

/** Statut retraite + relevé de carrière d'un salarié (lecture). Le back gate
 *  `only_for(HR User / Payroll User / Director / System Manager)` ; ici on relaie
 *  avec la session. `retirement_status` renvoie `{employee, error}` (HTTP 200) si
 *  paramètres/date de naissance absents (pattern L6a) — transmis tel quel au front. */
export const POST: APIRoute = async ({ request, cookies }) => {
  if (!cookies.get('sid')?.value) return json({ error: 'Non authentifié.' }, 401);

  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'Requête invalide.' }, 400); }
  const employee = String(body?.employee ?? '').trim();
  if (!employee) return json({ error: 'employee est requis.' }, 400);
  const reference_date = body?.reference_date ? String(body.reference_date) : undefined;

  try {
    const [status, career] = await Promise.all([
      getRetirementStatus(employee, reference_date),
      getCareerStatement(employee),
    ]);
    return json({ status, career }, 200);
  } catch (e) {
    console.error('[api/retraite/status]', e);
    const denied = e instanceof Error && e.message.includes('403');
    return json({ error: denied ? 'Non autorisé.' : 'Échec de la lecture du statut retraite.' }, denied ? 403 : 400);
  }
};

const json = (d: unknown, s: number) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } });
