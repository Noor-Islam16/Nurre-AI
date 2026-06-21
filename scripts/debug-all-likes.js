const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

async function run() {
  const { data, error } = await supabase
    .from('user_liked_tracks')
    .select('id, user_id, track_id, created_at, music:music_tracks(title)')

  if (error) {
    console.error('Error fetching all liked tracks:', error)
    return
  }

  console.log(`Total rows in user_liked_tracks: ${data.length}`)
  console.log('Entries:')
  console.log(JSON.stringify(data, null, 2))
}

run()
