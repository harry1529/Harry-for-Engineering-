/* =====================================================
   js/config.js — the ONLY file you edit for settings.

   1. SUPABASE_URL      -> your Project URL
   2. SUPABASE_ANON_KEY -> your PUBLIC key
                           ("anon public" key, or "Publishable key"
                            on newer Supabase dashboards)

   Safe to be in this file (it is public by design):
     - Project URL
     - anon / publishable key
   NEVER paste here, never share, never upload:
     - service_role key  (also called "secret key")
     - your database password
   The public key is safe only because Row Level Security
   (set up in supabase/schema.sql) blocks everything except
   reading published notes.
   ===================================================== */
window.MH_CONFIG = {
  SUPABASE_URL: 'PASTE_YOUR_SUPABASE_URL_HERE',        // e.g. https://abcdxyz.supabase.co
  SUPABASE_ANON_KEY: 'PASTE_YOUR_PUBLIC_ANON_KEY_HERE', // the long public key

  BUCKET: 'notes',                       // storage bucket name (do not change)

  // Used on the About and Contact pages. Change to your real details.
  OWNER_NAME: 'Harshit Kumrawat',
  CONTACT_EMAIL: 'your-email@example.com',

  // Branches shown as "Coming soon" cards in the slider.
  // Delete this list once all your real branches are added.
  COMING_SOON: [
    { name: 'IT',     icon: '🌐' },
    { name: 'AI/ML',  icon: '🤖' },
    { name: 'ECE',    icon: '📡' },
    { name: 'EE',     icon: '⚡' },
    { name: 'ME',     icon: '⚙️' },
    { name: 'Civil',  icon: '🏗️' }
  ]
};
