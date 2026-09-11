# Domain, hosting, and accounts — the plan so far

Summary of the 2026-09-10 conversation (James + Claude). This is the file to open when
James says "pull up the domain / hosting / Supabase discussion." Update it as decisions land.

## Where things stand

1. **elastic-space.net** was bought on GoDaddy 2026-07-19. Domain only, no hosting.
2. James dislikes GoDaddy. The 60-day transfer lock ends **2026-09-17**; he then transfers the
   domain to his existing **name.com** account.
3. Hosting research happens **after the transfer**, as a conversation with two or three options.
   Keep it light.
4. The site today is served locally by `server.mjs` on port 4174. GitHub Pages mirrors the repo
   at brooksie68.github.io/elastic-space, which is convenient but not the plan.

## Decisions James made

1. **GitHub Pages is NOT the host.** His words: "we're not going to use GitHub, okay? Just get
   that out of the plan." Reason: the repo is near the 1 GB Pages cap already (largest tracked
   file is a 74 MB GLB) and will only grow. He wants hundreds of pages and outside contributors.
   Never propose a Pages custom-domain flip again.
2. **GitHub stays the project repo and the contributor workflow.** Forks, pull requests, merges.
3. **The live site gets periodic big pushes**, roughly monthly or per major update, from the repo
   to the server. Not continuous deploy.
4. **Paying is fine.** Target scale he is unworried about: ~1,000 users, ~20 contributors. Past
   that is a good problem and a monetization conversation.
5. **Accounts and favorites are wanted.** A hosting plan's bundled database or Supabase, either
   is acceptable to him.
6. **Three tiers of people:**
   1. Admin: James alone, at `elastic-space.net/admin`, a login page with a password only he has.
   2. Creators: a lighter admin panel for people who contribute worlds.
   3. Users: sign up with an email and a chosen username, keep a favorites list.
   No user data beyond email and username is ever stored. No other personal information.

## Claude's recommended shape (not decided, for the hosting conversation)

1. **A small virtual machine we own** (Hetzner or DigitalOcean class, ~$6–12/month) rather than
   resold shared hosting. Name.com's and GoDaddy's hosting plans are shared PHP space and do not
   fit a Node server plus multi-gigabyte assets. A VM runs nginx for the static site and Node for
   the API, and the disk can grow.
2. **Large assets leave git eventually.** GLBs and MP3s move to object storage with a CDN in
   front (Cloudflare R2 or Bunny, pennies per GB). The repo stays code plus small assets so
   contributors can clone it. Later step, not a blocker.
3. **The monthly push is one script.** Tag a release in git, sync it to the server. Claude writes
   it, James runs it on his word.
4. **Cloudflare in front of the domain** (free, nameservers only, registrar stays name.com) for
   caching and, if wanted, Cloudflare Access as a second gate on `/admin`.
5. **Supabase for auth and the database** (free tier covers this scale for years), or Postgres
   on the same VM if James prefers owning it.

## Supabase work — level of effort, by piece

1. **Admin login at /admin.** Small. Supabase email + password sign-in, a session token. The
   real work is making every admin API route in `server.mjs` check the token and the role before
   acting — about twenty routes today, mechanical.
2. **Three roles.** Small. One `role` column on a `profiles` table, set only by James. Each
   route declares its minimum role; the panel shows or hides sections by role. The cost is the
   conversation about what creators may touch (their own worlds, drafts, presets, notes — not
   index.html or the drift registry).
3. **Users: email, username, favorites.** Small. Two tables (`profiles`, `favorites`) with
   row-level security so a user reads and writes only their own rows. A sign-in corner and a
   bookmark on every world page, living in the shared `dashboard-control.js` since every page
   already loads it.
4. **The medium piece: edits on the server vs. the repo.** The admin panel writes into the repo
   (drafts, presets, layouts, lab notes, and it rewrites index.html). Once it runs on a server
   with creators logged in, those edits land on the server's disk, not in git. Two honest
   options: (a) the admin panel stays a local tool and the public site is read-only, or (b) the
   server's copy becomes canonical and a "publish" step stages creator edits for James's review,
   then commits and pushes. This piece waits for the host decision, since where the server lives
   decides how commits get back to GitHub.
5. **Free to skip for a long time.** Password reset, email verification, OAuth sign-in all come
   from Supabase for nothing. Email + username only keeps us out of compliance questions.

Suggested order: pieces 1 and 3 first (contained, proves the stack), then 2, then 4 after the
host is chosen.

## Open, James's calls

1. Which host, after 2026-09-17 (Claude brings two or three VM options).
2. Option (a) or (b) in piece 4 above.
3. Whether the public front door shows the full worlds directory or only the Jerry welcome page,
   and whether In-progress worlds are reachable on the public domain.
4. What creators may and may not edit.
