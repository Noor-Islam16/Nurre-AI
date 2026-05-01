import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function check() {
  const { data, error } = await supabase
    .from('users')
    .update({ selected_personality: 'nur' })
    .eq('id', '00000000-0000-0000-0000-000000000000')
    .select()

  console.log('Data:', data)
  console.log('Error:', error)
}

check()
