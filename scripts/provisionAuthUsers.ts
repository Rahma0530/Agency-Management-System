/**
 * One-time provisioning script: create real Supabase Auth accounts for every
 * seed employee in src/data/initialData.ts, and link them to public.users.
 *
 * NOT part of the app bundle — run manually, once, from the terminal with
 * `npx tsx scripts/provisionAuthUsers.ts` (or `npm run provision-auth-users`).
 * Uses the Supabase service-role key, which bypasses RLS entirely — never
 * import or reference this script from anything that ships to the browser.
 *
 * WHY THIS UPSERTS public.users, NOT JUST auth_id
 * -------------------------------------------------
 * INITIAL_USERS has never actually been written to Supabase — App.tsx only
 * reads the `users` table and falls back to this local array in memory when
 * Supabase returns nothing, it never inserts INITIAL_USERS into the live
 * database. So public.users is confirmed empty right now. Each seed user's
 * placeholder auth_id ("auth-exec-1", etc.) also isn't a valid uuid, so it
 * could never have satisfied the canonical schema's
 * `auth_id uuid not null unique references auth.users(id)` constraint even
 * if something had tried to insert it. There is nothing to UPDATE — this
 * script INSERTs each employee's real row for the first time, with the
 * genuine auth_id from the Supabase Auth account it just created.
 *
 * WHY NO PASSWORD IS EVER PRINTED OR STORED
 * -------------------------------------------
 * Each account is created with a random, immediately-discarded password
 * (never logged, never written anywhere) and email_confirm: true so it can
 * sign in right away. Instead of handing that password to anyone, this
 * script also generates a one-time Supabase password-RECOVERY link per user
 * via admin.generateLink() and prints only that. Whoever owns each account
 * clicks their link once, sets their own real password, and the temporary
 * one is never used or seen by anyone.
 *
 * IDEMPOTENT / SAFE TO RE-RUN
 * ------------------------------
 * Each user is handled in its own try/catch so one failure doesn't abort the
 * run. Before doing anything, it checks whether a public.users row with that
 * id already exists — if so, that employee is already fully provisioned
 * (skipped). If an Auth account for the email already exists (e.g. a prior
 * run created the Auth account but failed before the public.users upsert),
 * it's looked up and reused instead of erroring out on "already registered".
 */

import { createClient, type User } from '@supabase/supabase-js';
import { randomBytes } from 'node:crypto';
import { INITIAL_USERS } from '../src/data/initialData';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    'Missing SUPABASE_URL (or VITE_SUPABASE_URL) and/or SUPABASE_SERVICE_ROLE_KEY.\n' +
      'See the terminal commands in the chat message for how to set these for this run only.'
  );
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// Every Supabase Auth account is created with a password this random -
// no one ever needs to know or use it; a recovery link is generated instead.
const randomDiscardedPassword = () => randomBytes(24).toString('base64url');

async function findAuthUserByEmail(email: string) {
  // supabase-js v2's admin API has no direct getUserByEmail; page through
  // listUsers() and match client-side. Fine at this seed-roster's scale.
  let page = 1;
  const perPage = 200;
  for (;;) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    // supabase-js's listUsers() return type isn't cleanly discriminated on
    // `error`, so `data.users` doesn't narrow past `never[]` here without
    // this cast — the runtime shape is correct regardless.
    const users = data.users as User[];
    const match = users.find((u) => u.email?.toLowerCase() === email.toLowerCase());
    if (match) return match;
    if (users.length < perPage) return null;
    page += 1;
  }
}

interface ResultRow {
  email: string;
  name: string;
  status: 'provisioned' | 'already_provisioned' | 'failed';
  recoveryLink?: string;
  error?: string;
}

async function provisionOne(seedUser: (typeof INITIAL_USERS)[number]): Promise<ResultRow> {
  const base: Omit<ResultRow, 'status'> = { email: seedUser.email!, name: seedUser.name };

  // Already fully provisioned? (public.users row present -> auth_id is a
  // real uuid already, since the schema's own constraint guarantees that.)
  const { data: existingRow, error: selectErr } = await supabaseAdmin
    .from('users')
    .select('id')
    .eq('id', seedUser.id)
    .maybeSingle();
  if (selectErr) throw selectErr;
  if (existingRow) {
    return { ...base, status: 'already_provisioned' };
  }

  // Find-or-create the Auth account.
  let authUser = await findAuthUserByEmail(seedUser.email!);
  if (!authUser) {
    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email: seedUser.email!,
      password: randomDiscardedPassword(),
      email_confirm: true,
      user_metadata: { app_user_id: seedUser.id, name: seedUser.name, role: seedUser.role },
    });
    if (createErr) throw createErr;
    authUser = created.user;
  }

  // One-time password-recovery link — this is what actually gets handed to
  // the employee, never a password.
  const { data: linkData, error: linkErr } = await supabaseAdmin.auth.admin.generateLink({
    type: 'recovery',
    email: seedUser.email!,
  });
  if (linkErr) throw linkErr;

  // Insert the real public.users row for the first time (see header).
  const { error: upsertErr } = await supabaseAdmin.from('users').upsert(
    {
      id: seedUser.id,
      name: seedUser.name,
      email: seedUser.email,
      role: seedUser.role,
      team: seedUser.team ?? null,
      manager_id: seedUser.manager_id ?? null,
      capacity_limit: seedUser.capacity_limit ?? null,
      auth_id: authUser.id,
      // password column is legacy/unused for real accounts — Supabase Auth
      // owns credentials now, so this is deliberately left unset.
    },
    { onConflict: 'id' }
  );
  if (upsertErr) throw upsertErr;

  return { ...base, status: 'provisioned', recoveryLink: linkData.properties.action_link };
}

async function main() {
  const results: ResultRow[] = [];

  for (const seedUser of INITIAL_USERS) {
    try {
      const result = await provisionOne(seedUser);
      results.push(result);
      console.log(`[${result.status}] ${result.email}`);
    } catch (err: any) {
      results.push({ email: seedUser.email!, name: seedUser.name, status: 'failed', error: err.message || String(err) });
      console.error(`[failed] ${seedUser.email}: ${err.message || err}`);
    }
  }

  console.log('\n=== Summary ===');
  console.table(
    results.map((r) => ({
      email: r.email,
      name: r.name,
      status: r.status,
      recovery_link: r.recoveryLink ?? '',
      error: r.error ?? '',
    }))
  );

  const failed = results.filter((r) => r.status === 'failed');
  if (failed.length > 0) {
    console.log(`\n${failed.length} user(s) failed — re-run this script to retry just those (everyone else will be skipped).`);
    process.exitCode = 1;
  }

  const provisioned = results.filter((r) => r.status === 'provisioned');
  if (provisioned.length > 0) {
    console.log(
      `\n${provisioned.length} account(s) newly provisioned. Send each person their own recovery_link above ` +
        `(each is single-use and lets them set their own real password) — none of them have a usable password yet.`
    );
  }
}

main();
