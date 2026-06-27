import type { APIRoute } from 'astro';
import { createHeuresSup } from '@emela/shared/data';

export const prerender = false;

/** Saisie d'heures supplémentaires par le salarié connecté (employee résolu serveur). */
export const POST: APIRoute = async ({ request }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Corps de requête invalide.' }, 400);
  }
  if (!body?.period_month || !body?.period_year) {
    return json({ error: 'Mois et année de la période sont requis.' }, 400);
  }
  const n = (v: unknown) => (v == null || v === '' ? 0 : Number(v));
  const totalH = [body.h_41_48, body.h_beyond_48, body.night_weekday, body.day_sunday_holiday, body.night_sunday_holiday]
    .reduce((s: number, v: unknown) => s + n(v), 0);
  if (totalH <= 0) {
    return json({ error: 'Indiquez au moins une heure supplémentaire.' }, 400);
  }
  try {
    const res = await createHeuresSup({
      period_month: String(body.period_month),
      period_year: String(body.period_year),
      h_41_48: n(body.h_41_48),
      h_beyond_48: n(body.h_beyond_48),
      night_weekday: n(body.night_weekday),
      day_sunday_holiday: n(body.day_sunday_holiday),
      night_sunday_holiday: n(body.night_sunday_holiday),
      reason: body.reason ? String(body.reason) : undefined,
    });
    return json(res, 200);
  } catch (e) {
    console.error('[api/requests/heures-sup]', e);
    const denied = e instanceof Error && e.message.includes('403');
    return json({ error: denied ? 'Non autorisé.' : 'Échec de la saisie des heures.' }, denied ? 403 : 400);
  }
};

const json = (data: unknown, status: number) =>
  new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } });
