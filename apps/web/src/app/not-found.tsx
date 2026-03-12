import Link from 'next/link'

export default function AppNotFound() {
  return (
    <div className="qa-shell flex min-h-screen items-center justify-center px-6">
      <div className="qa-glass-card max-w-lg rounded-[2rem] p-8 text-center">
        <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">
          404
        </p>
        <h1 className="mt-3 text-3xl font-semibold">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          The requested route does not exist in the migrated app.
        </p>
        <Link
          href="/"
          className="mt-6 inline-flex rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground"
        >
          Return home
        </Link>
      </div>
    </div>
  )
}
