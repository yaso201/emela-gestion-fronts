import { defineMiddleware } from 'astro:middleware';
import { sessionStore, frappeEmployeeContext } from '@emela/shared/session';

// Routes publiques (avant authentification).
const PUBLIC = ['/connexion', '/api/login', '/api/logout'];
const isAsset = (p: string) => p.startsWith('/_astro/') || /\.[a-z0-9]+$/i.test(p);

export const onRequest = defineMiddleware(async (context, next) => {
  const sid = context.cookies.get('sid')?.value;
  const path = context.url.pathname;
  const isPublic = isAsset(path) || PUBLIC.some((p) => path === p || path.startsWith(p + '/'));
  const isApi = path.startsWith('/api/');

  let fullName = '';
  if (!isPublic) {
    // Garde de routes : pas de session → page de connexion.
    if (!sid) return isApi ? unauth() : context.redirect('/connexion');
    // Valide la session ET le statut salarié en un seul appel (allow_guest=False
    // → 403 si sid invalide). null = session invalide ; isEmployee=false = sans dossier.
    const ctx = await frappeEmployeeContext(sid);
    if (!ctx) {
      context.cookies.delete('sid', { path: '/' });
      return isApi ? unauth() : context.redirect('/connexion');
    }
    fullName = ctx.fullName;
    // Gate ESS : seul un salarié (dossier Employee actif) accède à l'espace perso.
    // En ESS, TOUTE route /api/* requiert un salarié (login/logout sont publics) →
    // on refuse aussi côté front (défense en profondeur, le back gate déjà chaque
    // endpoint via _get_current_employee / has_*_permission). Les pages → /acces-refuse.
    if (!ctx.isEmployee) {
      if (isApi) return unauth();
      if (path !== '/acces-refuse') return context.redirect('/acces-refuse');
    }
  }

  // Session scopée à la requête : frappeSource forwarde ce `sid` au back.
  return sessionStore.run({ sid, fullName }, () => next());
});

const unauth = () =>
  new Response(JSON.stringify({ error: 'Non authentifié.' }), {
    status: 401,
    headers: { 'Content-Type': 'application/json' },
  });
