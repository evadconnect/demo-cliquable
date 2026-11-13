// Génère supabase/seed/demo.sql à partir de data/demo.json (la même source que le mode exemple du site).
// À relancer après toute modification de demo.json :  node le-commun/tools/build-seed.mjs
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const D = JSON.parse(readFileSync(join(root, "data/demo.json"), "utf8"));
const q = (v) => (v === null || v === undefined ? "null" : typeof v === "number" ? String(v) : typeof v === "boolean" ? String(v) : "'" + String(v).replace(/'/g, "''") + "'");
const out = [];
out.push("-- Le Commun d'EVAD : jeu de données de démonstration.");
out.push("-- Généré par le-commun/tools/build-seed.mjs depuis data/demo.json. Ne pas modifier à la main.");
out.push("-- Rejouable : les solutions sont mises à jour par leur slug, leurs étapes, ressources et « oups » sont réécrits.");
out.push("begin;");
out.push("");
out.push("insert into referentiel.categorie (slug, nom, couleur, picto, ordre) values");
out.push(D.categories.map((c) => `  (${q(c.slug)}, ${q(c.nom)}, ${q(c.couleur)}, ${q(c.picto)}, ${c.ordre})`).join(",\n"));
out.push("on conflict (slug) do update set nom = excluded.nom, couleur = excluded.couleur, picto = excluded.picto, ordre = excluded.ordre;");
out.push("");
out.push("insert into referentiel.type_projet (slug, nom, picto, ordre) values");
out.push(D.types_projet.map((t) => `  (${q(t.slug)}, ${q(t.nom)}, ${q(t.picto)}, ${t.ordre})`).join(",\n"));
out.push("on conflict (slug) do update set nom = excluded.nom, picto = excluded.picto, ordre = excluded.ordre;");
out.push("");
const cols = ["slug", "titre", "description_courte", "niveau_techno", "biomimetique", "mise_en_place", "impact_ecologie", "impact_social", "impact_economie_locale", "pourquoi", "point_vigilance", "credits", "source"];
for (const s of D.solutions) {
  out.push(`-- ${s.titre}`);
  out.push(`insert into referentiel.solution (${cols.join(", ")}, categorie_id, statut, propose_par)`);
  out.push(`select ${cols.map((c) => (c === "niveau_techno" ? q(s[c]) + "::referentiel.niveau_techno" : q(s[c]))).join(", ")}, c.id, 'publiee', null`);
  out.push(`from referentiel.categorie c where c.slug = ${q(s.categorie)}`);
  out.push(`on conflict (slug) do update set ${cols.filter((c) => c !== "slug").map((c) => `${c} = excluded.${c}`).join(", ")}, categorie_id = excluded.categorie_id, statut = 'publiee';`);
  const sid = `(select id from referentiel.solution where slug = ${q(s.slug)})`;
  out.push(`delete from referentiel.solution_type_projet where solution_id = ${sid};`);
  if (s.types.length) out.push(`insert into referentiel.solution_type_projet (solution_id, type_projet_id) select ${sid}, t.id from referentiel.type_projet t where t.slug in (${s.types.map(q).join(", ")});`);
  out.push(`delete from referentiel.solution_etape where solution_id = ${sid};`);
  if (s.etapes.length) out.push(`insert into referentiel.solution_etape (solution_id, ordre, texte) values\n${s.etapes.map((e, n) => `  (${sid}, ${n + 1}, ${q(e)})`).join(",\n")};`);
  out.push(`delete from referentiel.solution_ressource where solution_id = ${sid};`);
  if (s.ressources.length) out.push(`insert into referentiel.solution_ressource (solution_id, nom, cout_installation_min, cout_installation_max, cout_entretien_min, cout_entretien_max, unite) values\n${s.ressources.map((r) => `  (${sid}, ${q(r.nom)}, ${q(r.cout_installation_min)}, ${q(r.cout_installation_max)}, ${q(r.cout_entretien_min)}, ${q(r.cout_entretien_max)}, ${q(r.unite)})`).join(",\n")};`);
  out.push(`delete from referentiel.solution_oups where solution_id = ${sid};`);
  if (s.oups.length) out.push(`insert into referentiel.solution_oups (solution_id, ordre, probleme, rattrapage) values\n${s.oups.map((o, n) => `  (${sid}, ${n + 1}, ${q(o.probleme)}, ${q(o.rattrapage)})`).join(",\n")};`);
  out.push("");
}
out.push("-- Solutions complémentaires (une ligne par paire, lue dans les deux sens par la vue)");
const slugsDemo = D.solutions.map((s) => q(s.slug)).join(", ");
out.push(`delete from referentiel.solution_complementaire where solution_id in (select id from referentiel.solution where slug in (${slugsDemo})) and complementaire_id in (select id from referentiel.solution where slug in (${slugsDemo}));`);
const paires = [];
for (const s of D.solutions) for (const c of s.complementaires) paires.push(`  ((select id from referentiel.solution where slug = ${q(s.slug)}), (select id from referentiel.solution where slug = ${q(c)}))`);
if (paires.length) out.push(`insert into referentiel.solution_complementaire (solution_id, complementaire_id) values\n${paires.join(",\n")};`);
out.push("");
out.push("commit;");
writeFileSync(join(root, "supabase/seed/demo.sql"), out.join("\n") + "\n");
console.log("supabase/seed/demo.sql écrit :", D.solutions.length, "solutions,", paires.length, "liens");
