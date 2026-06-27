import type { APIRoute } from 'astro';
import { createAcompte } from '@emela/shared/data';

export const prerender = false;

/** Dépôt d'une demande d'acompte par le salarié connecté.
 *  Le navigateur POSTe ici ; le handler SSR (session scopée par le middleware)
 *  appelle le back avec le `sid` + jeton CSRF. L'`employee` est résolu serveur. */
export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Corps de requête invalide.' }, 400);
  }
  if (!body?.amount || !body?.request_date || !body?.repayment_month || !body?.repayment_year) {
    return json({ error: 'Montant, date, mois et année de remboursement sont requis.' }, 400);
  }
  try {
    const res = await createAcompte({
      amount: Number(body.amount),
      request_date: String(body.request_date),
      repayment_month: String(body.repayment_month),
      repayment_year: String(body.repayment_year),
      reason: body.reason ? String(body.reason) : undefined,
    });
    return json(res, 200);
  } catch (e) {
    console.error('[api/requests/acompte]', e);
    const denied = e instanceof Error && e.message.includes('403');
    return json({ error: denied ? 'Non autorisé.' : 'Échec du dépôt de la demande.' }, denied ? 403 : 400);
  }
};

const json = (data: unknown, status: number) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
