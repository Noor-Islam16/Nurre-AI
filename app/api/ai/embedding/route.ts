import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { createClient } from '@/lib/supabase/server'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
})

const AI_CONFIG = {
  embeddingModel: 'text-embedding-3-small',
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { text } = await request.json()
    
    const response = await openai.embeddings.create({
      model: AI_CONFIG.embeddingModel,
      input: text,
    })
    
    const embedding = response.data[0].embedding
    
    return NextResponse.json({ embedding })
  } catch (error) {
    console.error('Error generating embedding:', error)
    return NextResponse.json(
      { error: 'Failed to generate embedding' },
      { status: 500 }
    )
  }
}