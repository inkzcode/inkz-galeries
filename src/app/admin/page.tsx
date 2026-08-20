export default function AdminHome() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-4 px-6 py-24">
      <p className="text-sm tracking-wide text-muted uppercase">
        Espace photographe
      </p>
      <h1 className="font-serif text-3xl text-ink">
        L&apos;administration arrive au prochain jalon.
      </h1>
      <p className="text-ink-soft">
        Cette section sera protégée par une authentification dédiée (email +
        mot de passe, session sécurisée) — voir PROJECT_CONTEXT.md pour le
        détail de l&apos;architecture prévue. Aucune route de{" "}
        <code>/admin</code> n&apos;est accessible sans être connecté une fois
        l&apos;authentification en place.
      </p>
    </main>
  );
}
