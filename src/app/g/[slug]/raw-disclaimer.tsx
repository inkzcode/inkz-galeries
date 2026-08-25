// Message affiché avant la galerie (brief — texte rédigé par Enzo,
// 2026-08-25, remplace le premier jet du 2026-08-22 sur la "philosophie
// de retouche"). Contrôlé par le même bascule `retouchPhilosophyEnabled`
// — même terrain conceptuel (expliquer la démarche avant que le client
// ne juge les photos), déplacé ici en tête de galerie plutôt que dans le
// panneau de remarques : c'est avant même de commencer à regarder les
// photos qu'il faut comprendre qu'elles sont encore en RAW.
export function RawDisclaimer() {
  return (
    <div className="mt-4 max-w-xl border-l-2 border-accent-tint pl-4 text-sm leading-relaxed text-ink-soft">
      <p className="font-serif text-base font-medium text-ink">Avant de découvrir vos photos</p>
      <p className="mt-2">
        Les images que vous allez voir ne sont <strong className="text-ink">pas encore terminées</strong>.
      </p>
      <p className="mt-2">
        Vous découvrez ici une première version issue des fichiers RAW de l&apos;appareil :
        les couleurs, la lumière, le contraste et certains détails n&apos;ont pas encore été
        travaillés. Une photo peut donc vous sembler un peu terne, trop claire ou trop sombre
        — <strong className="text-ink">c&apos;est normal à cette étape</strong>.
      </p>
      <p className="mt-2">
        La prise de vue n&apos;est qu&apos;une partie de mon travail. La post-production donnera
        ensuite aux photos sélectionnées leur rendu final, comme celles que vous avez pu voir
        dans mon portfolio.
      </p>
      <p className="mt-2">
        <strong className="text-ink">
          Pour l&apos;instant, ne cherchez donc pas la photo parfaite : cherchez celles dans
          lesquelles vous vous reconnaissez, l&apos;expression que vous aimez, le moment,
          l&apos;attitude… Je m&apos;occupe de la suite. 🤍
        </strong>
      </p>
    </div>
  );
}
