import type { APIRoute } from 'astro';
import { createLeaveRequest } from '@emela/shared/data';

export const prerender = false;

/** Dépôt d'une demande de congé par le salarié connecté (employee résolu serveur). */
export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Corps de requête invalide.' }, 400);
  }
  if (!body?.leave_type || !body?.from_date || !body?.to_date) {
    return json({ error: 'Type de congé et dates sont requis.' }, 400);
  }
  try {
    const res = await createLeaveRequest({
      leave_type: String(body.leave_type),
      from_date: String(body.from_date),
      to_date: String(body.to_date),
      reason: body.reason ? String(body.reason) : undefined,
    });
    return json(res, 200);
  } catch (e) {
    console.error('[api/requests/conge]', e);
    const denied = e instanceof Error && e.message.includes('403');
    return json({ error: denied ? 'Non autorisé.' : 'Échec du dépôt de la demande de congé.' }, denied ? 403 : 400);
  }
};

const json = (data: unknown, status: number) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
