const OpenAI = require('openai')
require('dotenv').config({ path: '.env.local' })

async function testAI() {
  console.log('🤖 Testing OpenAI Integration...\n')
  
  const apiKey = process.env.OPENAI_API_KEY
  
  if (!apiKey) {
    console.error('❌ Missing OPENAI_API_KEY in .env.local')
    process.exit(1)
  }
  
  console.log('✅ API Key found')
  console.log(`   Key starts with: ${apiKey.substring(0, 10)}...`)
  
  const openai = new OpenAI({
    apiKey: apiKey,
  })
  
  try {
    console.log('\n📝 Testing chat completion...')
    const completion = await openai.chat.completions.create({
      model: 'gpt-5-mini',
      messages: [
        {
          role: 'system',
          content: 'You are a helpful ADHD coach. Keep responses brief.'
        },
        {
          role: 'user',
          content: 'Give me one quick tip for starting a difficult task with ADHD.'
        }
      ],
      max_completion_tokens: 100,
    })
    
    console.log('✅ Chat completion successful!')
    console.log('   Response:', completion.choices[0].message.content)
    
    console.log('\n🔢 Testing embedding generation...')
    const embedding = await openai.embeddings.create({
      model: 'text-embedding-3-small',
      input: 'ADHD task management strategies',
    })
    
    console.log('✅ Embedding generation successful!')
    console.log('   Embedding dimensions:', embedding.data[0].embedding.length)
    
    console.log('\n🎉 All AI tests passed! Your OpenAI integration is working.')
    
  } catch (error) {
    console.error('❌ AI test failed:', error.message)
    if (error.status === 401) {
      console.error('   Invalid API key. Please check your OPENAI_API_KEY.')
    } else if (error.status === 429) {
      console.error('   Rate limit exceeded or quota issue.')
    }
    process.exit(1)
  }
}

testAI()