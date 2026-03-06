import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { scoreAssessment, validateResponses } from '@/lib/assessment/onboarding-scoring';
import type { OnboardingResponse } from '@/lib/assessment/onboarding-scoring';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // Parse request body
    const body = await request.json();
    const { responses, results } = body;
    
    // Validate responses (20 questions for v2)
    if (!responses || !Array.isArray(responses)) {
      return NextResponse.json({ error: 'Invalid responses format' }, { status: 400 });
    }
    
    // Validate all 20 questions are answered
    if (!validateResponses(responses)) {
      return NextResponse.json({ error: 'Please answer all questions' }, { status: 400 });
    }
    
    // Calculate results if not provided
    const scoringResult = results || scoreAssessment(responses as OnboardingResponse[]);
    
    // Start transaction - delete old responses first
    const { error: deleteError } = await supabase
      .from('onboarding_responses')
      .delete()
      .eq('user_id', user.id);
    
    if (deleteError) {
      console.error('Error deleting old responses:', deleteError);
    }
    
    // Save individual responses
    const responseRecords = responses.map((r: OnboardingResponse) => ({
      user_id: user.id,
      question_number: r.questionNumber,
      response: typeof r.response === 'object' 
        ? JSON.stringify(r.response) 
        : String(r.response)
    }));
    
    const { error: responseError } = await supabase
      .from('onboarding_responses')
      .insert(responseRecords);
    
    if (responseError) {
      console.error('Error saving responses:', responseError);
      return NextResponse.json({ error: 'Failed to save responses' }, { status: 500 });
    }
    
    // Save or update results
    const { error: resultsError } = await supabase
      .from('onboarding_results')
      .upsert({
        user_id: user.id,
        inatt_endorsed: scoringResult.counts.inattEndorsed,
        hyper_endorsed: scoringResult.counts.hyperEndorsed,
        total_endorsed: scoringResult.counts.totalEndorsed,
        inatt_severity: scoringResult.severity.inatt,
        hyper_severity: scoringResult.severity.hyper,
        adhd_presentation: scoringResult.screen,
        onset_childhood: scoringResult.gates.onsetChildhood,
        impairment: scoringResult.gates.impairment,
        top_signals: scoringResult.routing.topSignals,
        assessment_version: 2,
        completed_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });
    
    if (resultsError) {
      console.error('Error saving results:', resultsError);
      return NextResponse.json({ error: 'Failed to save results' }, { status: 500 });
    }
    
    // Update user profile with new assessment data
    const { error: profileError } = await supabase
      .from('users')
      .update({
        adhd_presentation: scoringResult.screen,
        inatt_severity: scoringResult.severity.inatt,
        hyper_severity: scoringResult.severity.hyper,
        onboarding_version: 2
      })
      .eq('id', user.id);
    
    if (profileError) {
      console.error('Error updating profile:', profileError);
      // Don't fail the request if profile update fails
    }
    
    // Track completion event
    const startTime = request.headers.get('X-Start-Time');
    await supabase
      .from('events')
      .insert({
        user_id: user.id,
        type: 'onboarding_completed',
        data: {
          version: 2,
          presentation: scoringResult.screen,
          severity: {
            inatt: scoringResult.severity.inatt,
            hyper: scoringResult.severity.hyper
          },
          duration: startTime ? Date.now() - parseInt(startTime) : null
        }
      });
    
    // Return results for display
    return NextResponse.json({
      success: true,
      results: scoringResult,
      message: 'Assessment completed successfully'
    });
    
  } catch (error) {
    console.error('Error in onboarding submission:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
