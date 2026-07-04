import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata = {
  title: "Notes — A notebook you actually own",
};

export default async function LandingPage() {
  const user = await getCurrentUser();

  return (
    <main className="min-h-svh bg-background text-foreground">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-6 py-6">
        <Link
          href="/"
          className="flex items-center gap-2 text-sm font-medium tracking-tight"
        >
          <span className="flex size-7 items-center justify-center rounded-md border border-border bg-card text-foreground">
            <NotesLogo />
          </span>
          Notes
        </Link>
        {user ? (
          <Button asChild size="sm" variant="ghost">
            <Link href="/dashboard">Open dashboard</Link>
          </Button>
        ) : (
          <Button asChild size="sm" variant="ghost">
            <Link href="/signin">Sign in</Link>
          </Button>
        )}
      </header>

      <article className="mx-auto w-full max-w-3xl px-6 pb-24 pt-8 sm:pt-16">
        <section className="space-y-6">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            For people who keep a notebook
          </p>
          <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
            A notebook that you actually own.
          </h1>
          <p className="max-w-2xl text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
            Sign in with Google, write notes in a block editor, organise them
            with tags, and let your AI tools read and write them too. Your
            notes live in your database, your account is your Google identity,
            and nothing here is built to keep you scrolling.
          </p>
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button asChild size="lg">
              <Link href="/signin">Sign in with Google</Link>
            </Button>
            <Button asChild size="lg" variant="ghost">
              <a
                href="https://github.com/atpaawej/notes-app"
                target="_blank"
                rel="noopener noreferrer"
              >
                Read the code
              </a>
            </Button>
          </div>
        </section>

        <Separator className="my-12" />

        <Section title="What it does for you">
          <p>
            Most notebooks are a list of files. This one is a list of{" "}
            <em>notes</em> — titled, searchable, organised by tags — that you
            and your AI clients can both reach. Here is what each part is for.
          </p>
          <Definition
            term="Sign-in"
            detail="One click with Google. No new password, no email confirmation, no profile to fill out. Your account is your Google identity, and the rest of the app treats you as that identity from then on."
          />
          <Definition
            term="Block editor"
            detail="Each note is one document. You write in paragraphs, headings, bullet lists, numbered lists, code blocks, quotes, and dividers. Press / to switch block types. There is no rich-text toolbar to learn — the keyboard and the slash menu cover it."
          />
          <Definition
            term="Tags"
            detail="Flat labels. A tag is a word you attach to notes so you can group them. One tag on a hundred notes, ten tags on one note. There is no hierarchy, no nesting, no smart folders. If you want to group, you make a tag."
          />
          <Definition
            term="Full-text search"
            detail="Every word you wrote is searchable. The search runs against an index of the plain text in your notes, so it finds what you remember writing, not just what the headings say."
          />
          <Definition
            term="API keys"
            detail="You can generate API keys from the settings page. Each key has a name you choose (e.g. “Claude Desktop”), a scope of read-only or read-write, and a prefix you can recognise in the UI. You can revoke any key at any time. The raw key is shown once at creation and never again."
          />
          <Definition
            term="MCP server"
            detail="The same API keys above work with an MCP server that ships with this app. Plug a key into Claude Desktop or Cursor and your notes become tools that your AI client can call: list notes, read a note, create a note, update a note, delete a note, list tags, list notes by tag. Your AI talks to your notes directly. No copy-paste round trip."
          />
        </Section>

        <Section title="What is not here, by design">
          <p>
            A list of features you will not find, and a reason for each, so you
            can decide whether the absence is fine or a deal-breaker.
          </p>
          <Definition
            term="No teams, no shared notes"
            detail="This is one person, one account. There are no workspaces, no collaborators, no permission systems, no share links. If you want to send a note to someone, you copy the text out and paste it somewhere else."
          />
          <Definition
            term="No mobile app"
            detail="There is no iOS or Android app. The web app works in a mobile browser. If you need a native app on your phone today, this app will frustrate you."
          />
          <Definition
            term="No offline mode"
            detail="If you have no connection, you cannot open the editor. The app does not cache your notes on the device."
          />
          <Definition
            term="No attachments, no image uploads"
            detail="Notes are text. You can paste images into the editor in the way the block editor supports, but there is no first-class file hosting, no PDF storage, no audio."
          />
          <Definition
            term="No versioning, no history"
            detail="When you save a note, the previous version is replaced. There is no “view edits”, no diff, no undo beyond the editor’s own undo while you are typing."
          />
          <Definition
            term="No light mode"
            detail="The interface is dark only. There is no toggle. This is not a roadmap item; it is a design choice."
          />
          <Definition
            term="No engagement features"
            detail="There are no notifications, no comment threads, no “daily streak”, no recommendations, no social graph, no suggested tags, no AI summarising your notes to show you a digest. The app does not try to bring you back. It is a tool, not a feed."
          />
        </Section>

        <Section title="How your data works">
          <p>
            You should be able to answer these questions before you put
            anything personal in.
          </p>
          <Definition
            term="Where are my notes stored?"
            detail="In a Postgres database hosted on Neon. The web app reads and writes through a typed schema. The MCP server reads and writes through the same schema. There is one source of truth."
          />
          <Definition
            term="How does sign-in work?"
            detail="Firebase Authentication verifies your Google account. Firebase issues a session cookie that the web app verifies on every server-rendered page and every server action. Sign-out clears the cookie and revokes the underlying refresh tokens."
          />
          <Definition
            term="How are API keys protected?"
            detail="Each raw key is generated once, shown once, and then stored only as a bcrypt hash. The prefix (the first few characters) is kept in plain text so you can recognise a key in the UI. Verification recomputes the hash and compares. There is no way to recover a raw key after creation."
          />
          <Definition
            term="Is anything I write used to train a model?"
            detail="No. The block editor is yours. The MCP server forwards your notes to your AI client and your AI client’s response back to your notes — those calls go through Anthropic or OpenAI or whoever your client is configured to use, and they happen inside your client, not here. Nothing you write is sent to this app’s author."
          />
          <Definition
            term="Can I leave?"
            detail="Yes. Export your notes as JSON from the settings page. Delete your account from the settings page. Account deletion removes your user, your notes, your tags, your note–tag links, and your API keys. There is no archive, no soft delete, no 30-day recovery window."
          />
        </Section>

        <Section title="What is not finished yet">
          <p>
            This is an early version. The auth flow and the dashboard shell
            are done. The following things are planned but not shipped:
          </p>
          <ul className="list-disc space-y-2 pl-6 text-pretty leading-relaxed text-muted-foreground">
            <li>Creating, editing, and deleting notes inside the editor.</li>
            <li>
              A non-empty notes list page, including search and tag filtering.
            </li>
            <li>API key management from the settings page.</li>
            <li>The MCP server itself (the keys work, the server is next).</li>
            <li>Mobile and offline support.</li>
            <li>Light mode (if ever).</li>
          </ul>
          <p>
            If any of those are blockers for you, this app is not ready for
            you yet, and you should use something else. If you are fine
            waiting for them, sign in.
          </p>
        </Section>

        <Separator className="my-12" />

        <section className="space-y-6 text-center">
          <h2 className="text-balance text-2xl font-semibold tracking-tight sm:text-3xl">
            That is the whole pitch.
          </h2>
          <p className="mx-auto max-w-xl text-pretty text-sm leading-relaxed text-muted-foreground">
            No testimonials, no usage stats, no “trusted by”, no comparison
            table against other apps. You sign in, you write, you leave when
            you want to.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Button asChild size="lg">
              <Link href="/signin">Sign in with Google</Link>
            </Button>
          </div>
        </section>
      </article>

      <footer className="mx-auto w-full max-w-3xl border-t border-border px-6 py-8">
        <div className="flex flex-col items-start justify-between gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center">
          <p>Notes · a personal notebook with an MCP server.</p>
          <div className="flex items-center gap-4">
            <Link
              href="https://github.com/atpaawej/notes-app"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground"
            >
              Source
            </Link>
            <Link href="/signin" className="hover:text-foreground">
              Sign in
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-6 py-10">
      <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {title}
      </h2>
      <div className="space-y-5 text-pretty text-[15px] leading-relaxed text-muted-foreground [&_p]:text-pretty">
        {children}
      </div>
    </section>
  );
}

function Definition({
  term,
  detail,
}: {
  term: string;
  detail: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card/40 p-5">
      <p className="text-sm font-medium text-foreground">{term}</p>
      <p className="mt-2 text-pretty text-[15px] leading-relaxed text-muted-foreground">
        {detail}
      </p>
    </div>
  );
}

function NotesLogo() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-4"
      aria-hidden="true"
    >
      <path d="M4 4h12l4 4v12a2 2 0 0 1-2 2H4Z" />
      <path d="M8 9h8" />
      <path d="M8 13h8" />
      <path d="M8 17h5" />
    </svg>
  );
}