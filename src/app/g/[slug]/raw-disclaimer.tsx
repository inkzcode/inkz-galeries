// Message affiché avant la galerie (brief — texte rédigé par Enzo,
// 2026-08-25, remplace le premier jet du 2026-08-22 sur la "philosophie
// de retouche"). Contrôlé par le même bascule `retouchPhilosophyEnabled`
// — même terrain conceptuel (expliquer la démarche avant que le client
// ne juge les photos), affiché ici en tête de galerie plutôt que dans le
// panneau de remarques : c'est avant même de commencer à regarder les
// photos qu'il faut comprendre qu'elles sont encore en RAW.
//
// Mise en page refondue le 2026-08-27 (retour d'Enzo : "ne modifie pas
// mes textes [...] le problème est sa mise en scène") — TEXTE INTACT,
// mot pour mot, mêmes emphases `<strong>` : seuls les conteneurs/tailles/
// espacements changent, d'une notice en encadré (`border-l-2`, `text-sm`)
// vers une vraie colonne éditoriale (largeur de lecture, fine règle or
// plutôt qu'une bordure). Le décalage à droite (`lg:ml-[10%]`) essayé
// dans ce premier jet a été retiré le même jour (retour d'Enzo : il
// voulait ce bloc aligné verticalement avec le titre de gallery-header.tsx,
// pas décalé) — même conteneur `max-w-6xl px-4 sm:px-6` que le header,
// donc même bord gauche par défaut.
export function RawDisclaimer() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-20">
      <div className="max-w-2xl">
        <span aria-hidden className="block h-px w-12 bg-accent-soft" />
        <p className="mt-6 font-serif text-2xl font-semibold text-ink sm:text-3xl">
          Avant de découvrir vos photos
        </p>
        <p className="mt-5 text-base leading-relaxed text-ink-soft">
          Les images que vous allez voir ne sont <strong className="text-ink">pas encore terminées</strong>.
        </p>
        <p className="mt-4 text-base leading-relaxed text-ink-soft">
          Vous découvrez ici une première version issue des fichiers RAW de l&apos;appareil :
          les couleurs, la lumière, le contraste et certains détails n&apos;ont pas encore été
          travaillés. Une photo peut donc vous sembler un peu terne, trop claire ou trop sombre
          — <strong className="text-ink">c&apos;est normal à cette étape</strong>.
        </p>
        <p className="mt-4 text-base leading-relaxed text-ink-soft">
          La prise de vue n&apos;est qu&apos;une partie de mon travail. La post-production donnera
          ensuite aux photos sélectionnées leur rendu final, comme celles que vous avez pu voir
          dans mon portfolio.
        </p>
        <p className="mt-4 text-base leading-relaxed text-ink-soft">
          <strong className="text-ink">
            Pour l&apos;instant, ne cherchez donc pas la photo parfaite : cherchez celles dans
            lesquelles vous vous reconnaissez, l&apos;expression que vous aimez, le moment,
            l&apos;attitude… Je m&apos;occupe de la suite. 🤍
          </strong>
        </p>
      </div>
    </section>
  );
}
