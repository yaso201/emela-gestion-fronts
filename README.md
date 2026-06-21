# emela SIRH — Front (self-service + rh)

Bundle **prêt à brancher** de deux fronts Astro du SIRH emela, avec leur design system
et leur couche de données typée partagée. Conçu pour se connecter au back **`benin_hr`**
(Frappe/ERPNext).

```
emela-sirh/
├─ packages/
│  ├─ design-system/   → tokens CSS, base, composants .em-* (SOURCE UNIQUE du style)
│  └─ shared/          → types domaine + accès données (mock ↔ Frappe), 2 sous-domaines
├─ apps/
│  ├─ self-service/    → espace personnel du salarié (10 pages)
│  └─ rh/              → back-office RH & Paie multi-rôles (11 pages)
├─ .github/workflows/  → CI (install → check → build → format:check)
├─ pnpm-workspace.yaml
└─ package.json
```

---

## 1. Prérequis

- **Node 20+**
- **pnpm 9** (`corepack enable` puis `corepack prepare pnpm@9.12.0 --activate`)

## 2. Installation & lancement

```bash
pnpm install

pnpm dev:self-service   # espace salarié   → http://localhost:4321/
pnpm dev:rh             # back-office RH    → http://localhost:4321/cockpit

pnpm build              # build des 2 apps + packages
pnpm check              # typecheck Astro (astro check)
pnpm format             # Prettier
```

> Lancez les deux apps sur des ports distincts (`astro dev --port 4322`) si besoin simultané.

---

## 3. Architecture

### Principe directeur
**Une app par audience.** Le salarié (`self-service`) et l'équipe RH (`rh`) sont deux
produits distincts qui partagent le **style** (`@emela/design-system`) et les **données**
(`@emela/shared`). Aucun composant ni donnée n'est dupliqué entre apps.

### Châssis (layouts)
- La **barre latérale est rendue côté serveur** par le `Layout` de chaque app
  (`SelfServiceLayout.astro`, `RhLayout.astro`). Pas d'injection JS de la navigation.
- Le script `public/scripts/shell.js` ne porte que le **comportement** : menu mobile,
  tiroirs (focus-trap + scroll-lock + `inert`), toasts (`aria-live`), format FCFA.
- **`rh` uniquement** : sélecteur de **6 rôles** (manager, gestionnaire RH, responsable paie,
  finance, direction, admin). Chaque item de nav porte `data-roles` ; `shell.js` filtre
  nav + contenu (`[data-roles]`) selon le rôle actif (persistant), avec `ROLE_HOME` par profil.

### Composants locaux (par app, dans `src/components/`)
`Icon` · `Sprite` · `Card` · `Drawer` · `StatusBadge` · `PageHead`.
Markup Astro pur, consommant uniquement les tokens du design system.

### Pages
Chaque page est une route Astro (`src/pages/*.astro`). Le markup est porté fidèlement des
maquettes ; styles de page en `<style>` (scopé) ou `<style is:global>` quand un script
génère du DOM ; logique en `<script is:inline>`.

---

## 4. Données — le point de branchement

**Les pages ne contiennent aucune donnée en dur.** Elles consomment uniquement les getters de
`@emela/shared` :

```astro
---
import { getContracts, CONTRACT_STATUS, fcfa } from '@emela/shared/rh-data';
const contracts = await getContracts();
---
{contracts.map((c) => <tr>…</tr>)}
```

Deux sous-domaines, exportés par le `package.json` de `shared` :

| Sous-chemin              | App           | Contenu |
|--------------------------|---------------|---------|
| `@emela/shared/data`     | self-service  | salarié, congés, bulletins, demandes, contrats, documents, évaluations, calendrier |
| `@emela/shared/rh-data`  | rh            | annuaire, contrats, cycles de paie, bulletins, validations, déclarations, évaluations, séparations, modèles, paramètres |

### Brancher le back `benin_hr`

Chaque sous-domaine a **une source active** définie sur une seule ligne :

```ts
// packages/shared/src/rh/data/index.ts
const source: RhDataSource = mockSource;   // ← remplacer par frappeSource
```

1. Compléter les en-têtes d'auth/CSRF dans `packages/shared/src/{,rh/}client/frappe.ts`
   (les clients sont **RÉALIGNÉS sur le back réel** — voir ci-dessous).
2. Basculer `mockSource → frappeSource`.
3. **Aucune page à modifier** : tout le front suit.

> Les types sont **calqués sur les doctypes réels de `benin_hr`** : `Localized Contract`,
> `Payroll Run`, `Payroll Slip`, `Employee` — mêmes noms de champs et énumérations,
> **statuts sans accents** comme le back (`Preparation`, `Validee finance`, `Validee direction`,
> `Generee`, `Transmise ERPNext`…).

#### Surface back réellement ciblée (réalignement 2026-06-21)
Les clients `frappeSource` ne ciblent QUE des endpoints **existants** (vérifiés) :
- **Méthodes whitelistées** : `cockpit.get_hr_selfservice_summary` / `get_leave_summary` /
  `get_recent_requests` / `get_notifications_summary` / `get_team_pending` (MSS) ;
  `analytics.payroll_aggregates` / `headcount` (KPIs RH) ; `declarations.generate_*` ;
  `retirement_status` / `career_statement`.
- **REST `/api/resource/<Doctype>`** pour les listes/détails/créations — **déjà sécurisés** par nos
  `permission_query_conditions` côté back (Payroll Slip, Acompte, Note De Frais, Heures
  Supplementaires, Localized Contract, Employee, Payroll Run, Payroll Parameter, Public Holiday).

#### BACK-GAP — endpoints à ajouter côté `benin_hr` (marqués en TODO dans le code)
| Getter | Manque |
|---|---|
| `getColleagues` (ESS) | présence d'équipe (HRMS Attendance) — pas de méthode |
| `getDocuments` (ESS) | référentiel de documents téléchargeables (bulletins PDF, attestations) |
| `getEvaluations` (ESS/RH) | relève de `teaching_eval`, pas de `benin_hr` — décision de périmètre |
| `getDeclarations` (RH) | pas de suivi PERSISTANT (les déclarations se *génèrent* à la demande) |
| `getSeparations` (RH) | `separation.py` = fonctions sans whitelist — pas de liste |
| `getDocumentTemplates` (RH) | pas de modèles côté benin_hr |

Ces getters renvoient un **repli typé vide** (pas d'appel fictif). L'ancien stub visait des méthodes
INEXISTANTES (`get_rh_kpis`, `list_declarations`, `separation.list_separations`, `get_evaluations`…).

### Authentification
`window.hrLogout` (self-service) est un **point d'extension** à brancher sur votre flux d'auth
(`POST /logout` → redirection `/connexion`). Idem garde d'accès aux routes selon le rôle.

---

## 5. Couverture du câblage

| App | Pages | Câblées sur données typées |
|-----|-------|-----------------------------|
| self-service | 10 | **10 / 10** |
| rh | 11 | **11 / 11** |

Contenus restés statiques (signalés dans le code) : référentiels (barème ITS, jours fériés),
imputation comptable d'exemple, éditeurs interactifs pilotés par JS.

---

## 6. Qualité

- `pnpm check` — `astro check` (typecheck `.astro`, profite des types `@emela/shared`).
- `pnpm format` / `pnpm format:check` — Prettier + plugin Astro.
- `.github/workflows/ci.yml` — `install → check → build → format:check` sur push/PR.

---

## 7. Personnalisation du style

Tout le style vient de **`@emela/design-system`** (un seul endroit) :
`tokens.css` (couleurs, espacements, typo, z-index…), `base.css`, `components.css`
(`.em-*`), `palette-ext.css`. Modifier un token s'y répercute sur les deux apps.

---

## 8. Checklist d'intégration

- [ ] `pnpm install` puis `pnpm build` — valider la compilation des 2 apps.
- [ ] Compléter `frappe.ts` (URL de base, en-têtes, CSRF/token).
- [ ] Basculer `mockSource → frappeSource` dans `src/data/index.ts` et `src/rh/data/index.ts`.
- [ ] Brancher l'auth (`hrLogout`, garde de routes, mapping rôle ↔ utilisateur Frappe).
- [ ] Adapter le routage de production (reverse-proxy, base path) si les apps cohabitent.
- [ ] Vérifier les permissions par rôle côté back (le filtrage front est une commodité, **pas** une sécurité).
