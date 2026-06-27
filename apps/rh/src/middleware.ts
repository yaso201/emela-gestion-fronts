import { defineMiddleware } from 'astro:middleware';
import { sessionStore, frappeProfile } from '@emela/shared/session';

// Routes publiques (avant authentification).
const PUBLIC = ['/connexion', '/api/login', '/api/logout'];
const isAsset = (p: string) => p.startsWith('/_astro/') || /\.[a-z0-9]+$/i.test(p);

// Gate par page : profils autorisés à charger chaque route (miroir du nav RhLayout).
// Empêche l'URL-hacking ET les 500 du back ; les /api/* restent gardées par le back.
// `'*'` = toute personne avec accès RH (is_rh). Toute page NON listée est refusée
// (default-deny) : l'ajout d'une page sans entrée ici ne crée pas de faille.
const ROUTE_PROFILES: Record<string, string[]> = {
  '/': ['*'], // index → redirige vers /cockpit (qui est gardé)
  '/cockpit': ['manager', 'gest_rh', 'dir', 'admin'],
  '/personnel': ['gest_rh', 'manager', 'dir', 'admin'],
  '/fiche': ['gest_rh', 'manager', 'dir', 'admin'],
  '/demandes': ['manager', 'gest_rh', 'dir', 'admin'],
  '/contrats': ['gest_rh', 'paie', 'dir', 'admin'],
  '/recrutement': ['manager', 'gest_rh', 'dir', 'admin'],
  '/separations': ['gest_rh', 'dir', 'admin'],
  '/evaluations': ['gest_rh', 'dir', 'admin'],
  '/paie': ['paie', 'finance', 'dir', 'admin'],
  '/validation': ['manager', 'finance', 'dir', 'admin'],
  '/declarations': ['paie', 'gest_rh', 'dir', 'admin'],
  '/modeles': ['gest_rh', 'paie', 'dir', 'admin', 'gestion_sm'],
  '/onboarding': ['admin', 'gestion_sm'],
  '/parametres': ['admin', 'gestion_sm'],
  '/audit-acces': ['admin', 'dir'],
};

// Défense en profondeur pour les routes API d'ÉCRITURE sensibles : le back gate
// déjà le rôle (403), mais on refuse aussi en amont au middleware pour ne pas
// dépendre uniquement du back. Miroir du gate de page correspondant.
const API_PROFILES: Record<string, string[]> = {
  '/api/parametres': ['admin', 'gestion_sm'],
  // Recrutement : gate grossier au middleware ; le back fait le four-eyes fin
  // (Directeur valide ≠ demandeur, RH crée ≠ validateur).
  '/api/recrutement/demande': ['manager', 'gest_rh', 'dir', 'admin'],
  '/api/recrutement/validation': ['dir', 'admin'],
  '/api/recrutement/creation': ['gest_rh', 'admin'],
  '/api/audit-acces/revue': ['admin', 'dir'],
};

export const onRequest = defineMiddleware(async (context, next) => {
  const sid = context.cookies.get('sid')?.value;
  const path = context.url.pathname;
  const isPublic = isAsset(path) || PUBLIC.some((p) => path === p || path.startsWith(p + '/'));

  if (isPublic) return sessionStore.run({ sid }, () => next());

  // Pas de session → connexion.
  if (!sid) return context.redirect('/connexion');

  // Profil = vrais rôles back ; sert aussi de validation (null = sid invalide).
  const prof = await frappeProfile(sid);
  if (!prof) {
    context.cookies.delete('sid', { path: '/' });
    return context.redirect('/connexion');
  }

  // Gate d'accès à l'app RH. Pages : gate complet par profil. Routes API : le back
  // reste l'autorité (403), mais les écritures sensibles déclarées dans API_PROFILES
  // sont aussi refusées ici (défense en profondeur).
  const isApi = path.startsWith('/api/');
  if (isApi) {
    const apiAllowed = API_PROFILES[path];
    if (apiAllowed && (!prof.is_rh || !apiAllowed.some((p) => prof.profiles.includes(p)))) {
      return new Response(JSON.stringify({ error: 'Non autorisé.' }), {
        status: 403, headers: { 'Content-Type': 'application/json' },
      });
    }
  } else if (path !== '/acces-refuse') {
    if (!prof.is_rh) return context.redirect('/acces-refuse');
    const allowed = ROUTE_PROFILES[path];
    // default-deny : page non déclarée OU aucun profil autorisé → refus.
    if (!allowed || (allowed[0] !== '*' && !allowed.some((p) => prof.profiles.includes(p)))) {
      return context.redirect('/acces-refuse');
    }
  }

  // Session + profils scopés à la requête (le layout filtre le nav avec).
  return sessionStore.run({ sid, profiles: prof.profiles, fullName: prof.fullName }, () => next());
});
