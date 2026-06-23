import { createAdminClient } from './lib/supabase';

async function main() {
  try {
    const admin = createAdminClient();
    console.log('Admin client created successfully.');
    const { data: { users }, error } = await admin.auth.admin.listUsers();
    if (error) {
      console.error('Error fetching users:', error);
      return;
    }
    console.log(`Found ${users.length} users:`);
    users.forEach(u => {
      console.log(`User: ${u.email}, ID: ${u.id}, Metadata:`, JSON.stringify(u.user_metadata, null, 2));
    });
  } catch (err) {
    console.error('Fatal error in script:', err);
  }
}

main();
