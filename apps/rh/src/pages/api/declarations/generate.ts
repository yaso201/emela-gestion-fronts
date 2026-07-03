import type { APIRoute } from 'astro';
import { generateDeclaration } from '@emela/shared/rh-data';

export const prerender = false;

const ALLOWED = new Set([
  'generate_cnss_declaration', 'generate_its_declaration', 'generate_vps_declaration',
  'generate_its_annual_recap', 'generate_cnss_annual_recap', 'generate_salary_register',
  'generate_nominative_declaration', 'generate_its_vps_declaration',
]);

/** Génération d'une déclaration/état social (lecture ; le back gate DECLARATION_ROLES). */
export const POST: APIRoute = async ({ request, cookies }) => {
  if (!cookies.get('sid')?.value) return json({ error: 'Non authentifié.' }, 401);
  let body: any;
  try { body = await request.json(); } catch { return json({ error: 'Requête invalide.' }, 400); }
  if (!ALLOWED.has(body?.method)) return json({ error: 'Méthode de génération invalide.' }, 400);
  try {
    const res = await generateDeclaration(String(body.method), body.params || {});
    return json(res, 200);
  } catch (e) {
    console.error('[api/declarations/generate]', e);
    const denied = e instanceof Error && e.message.includes('403');
    return json({ error: denied ? 'Non autorisé.' : 'Échec de la génération.' }, denied ? 403 : 400);
  }
};
const json = (d: unknown, s: number) => new Response(JSON.stringify(d), { status: s, headers: { 'Content-Type': 'application/json' } });
