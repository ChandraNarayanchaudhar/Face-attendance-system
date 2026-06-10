export default function Home() {
  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 items-center gap-10 p-6 lg:grid-cols-2">
        <div className="space-y-6">
          <div className="inline-flex items-center gap-2 rounded-2xl border bg-card px-4 py-2 shadow-sm">
            <div className="h-8 w-8 rounded-xl bg-primary/15" />
            <div className="leading-tight">
              <div className="text-sm font-semibold">Smart Attendance</div>
              <div className="text-xs text-muted-foreground">
                Premium dashboard prototype
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Sign in to continue
            </h1>
            <p className="max-w-xl text-sm text-muted-foreground sm:text-base">
              This is a frontend-only demo with realistic flows, responsive layouts,
              and mock data—built for portfolio use.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="text-sm font-semibold">Live monitoring</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Camera cards, recognized faces, incident alerts.
              </div>
            </div>
            <div className="rounded-2xl border bg-card p-5 shadow-sm">
              <div className="text-sm font-semibold">Reports & exports</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Charts, tables, filters, and export actions.
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-md">
          <div className="text-lg font-semibold">Welcome back</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose a role to explore the full dashboard experience.
          </p>

          <div className="mt-6 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <a
                href="/login"
                className="group rounded-2xl border bg-background p-4 shadow-sm transition-colors hover:bg-muted"
              >
                <div className="text-sm font-semibold">Admin / Teacher</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Manage sessions, students, reports.
                </div>
                <div className="mt-4 text-sm font-medium text-primary">
                  Sign In →
                </div>
              </a>
              <a
                href="/login"
                className="group rounded-2xl border bg-background p-4 shadow-sm transition-colors hover:bg-muted"
              >
                <div className="text-sm font-semibold">Student</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  View attendance, subjects, notifications.
                </div>
                <div className="mt-4 text-sm font-medium text-primary">
                  Sign In →
                </div>
              </a>
            </div>

            <div className="rounded-2xl border bg-muted/30 p-4">
              <div className="text-sm font-semibold">New to Smart Attendance?</div>
              <div className="mt-1 text-sm text-muted-foreground">
                Create an account as a student or teacher to get started.
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <a
                  href="/register"
                  className="rounded-xl bg-primary px-4 py-2 text-center text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  Register
                </a>
                <a
                  href="/login"
                  className="rounded-xl border bg-background px-4 py-2 text-center text-sm font-medium transition-colors hover:bg-muted"
                >
                  Sign In
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
