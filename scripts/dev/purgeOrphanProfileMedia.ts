/**
 * Deletes profile photos whose account no longer exists (inactive-account
 * cleanup or a failed photo removal during self-deletion). SQL cannot delete
 * Storage files, so this runs with the service-role key.
 *
 *   node --import dotenv/config --import tsx scripts/dev/purgeOrphanProfileMedia.ts           # list only
 *   node --import dotenv/config --import tsx scripts/dev/purgeOrphanProfileMedia.ts --apply   # delete
 */
import { createClient } from '@supabase/supabase-js';

const BUCKET = 'profile-media';
const PAGE = 1000;

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

const supabase = createClient(requireEnv('VITE_SUPABASE_URL'), requireEnv('SUPABASE_SERVICE_ROLE_KEY'), {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function existingUserIds(): Promise<Set<string>> {
  const ids = new Set<string>();
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: PAGE });
    if (error) throw error;
    data.users.forEach((user) => ids.add(user.id));
    if (data.users.length < PAGE) return ids;
  }
}

async function ownerFolders(): Promise<string[]> {
  const folders: string[] = [];
  for (let offset = 0; ; offset += PAGE) {
    const { data, error } = await supabase.storage.from(BUCKET).list('', { limit: PAGE, offset });
    if (error) throw error;
    folders.push(...data.map((entry) => entry.name));
    if (data.length < PAGE) return folders;
  }
}

const apply = process.argv.includes('--apply');
const users = await existingUserIds();
// Photo folders are named by user id; anything else (e.g. Storage's placeholder file) is not a photo folder.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const orphans = (await ownerFolders()).filter((folder) => UUID.test(folder) && !users.has(folder));
const paths = orphans.flatMap((folder) => [`${folder}/avatar.webp`, `${folder}/cover.webp`]);

console.log(`${orphans.length} orphaned photo folder(s) of ${users.size} accounts.`);
orphans.forEach((folder) => console.log(`  ${folder}`));
if (apply && paths.length > 0) {
  const { error } = await supabase.storage.from(BUCKET).remove(paths);
  if (error) throw error;
  console.log('Deleted.');
} else if (paths.length > 0) {
  console.log('Dry run. Re-run with --apply to delete.');
}
