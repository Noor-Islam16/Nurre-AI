import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createSecureApiResponse } from '@/lib/api/with-security-headers';
import { z } from 'zod';

const consentSchema = z.object({
  userId: z.string().uuid(),
  version: z.string(),
  preferences: z.object({
    necessary: z.boolean(),
    functional: z.boolean(),
    analytics: z.boolean(),
    marketing: z.boolean(),
  }),
  userAgent: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Parse and validate request body
    const body = await request.json();
    const validatedData = consentSchema.parse(body);
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return createSecureApiResponse(
        { error: 'Unauthorized' },
        401
      );
    }
    
    // Verify the userId matches the authenticated user
    if (user.id !== validatedData.userId) {
      return createSecureApiResponse(
        { error: 'Forbidden' },
        403
      );
    }
    
    // Get client IP address
    const ip = request.headers.get('x-forwarded-for') || 
                request.headers.get('x-real-ip') || 
                'unknown';
    
    // Store consent in database
    const { data: consent, error: insertError } = await supabase
      .from('user_consents')
      .insert({
        user_id: validatedData.userId,
        version: validatedData.version,
        necessary_consent: validatedData.preferences.necessary,
        functional_consent: validatedData.preferences.functional,
        analytics_consent: validatedData.preferences.analytics,
        marketing_consent: validatedData.preferences.marketing,
        ip_address: ip,
        user_agent: validatedData.userAgent || request.headers.get('user-agent'),
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('Failed to save consent:', insertError);
      return createSecureApiResponse(
        { error: 'Failed to save consent' },
        500
      );
    }
    
    // Log to privacy audit
    await supabase
      .from('privacy_audit_log')
      .insert({
        user_id: validatedData.userId,
        action: 'consent_given',
        details: {
          version: validatedData.version,
          preferences: validatedData.preferences,
          consent_id: consent.id,
        },
        ip_address: ip,
        user_agent: validatedData.userAgent || request.headers.get('user-agent'),
      });
    
    return createSecureApiResponse({ success: true, consent });
  } catch (error) {
    console.error('Consent API error:', error);
    
    if (error instanceof z.ZodError) {
      return createSecureApiResponse(
        { error: 'Invalid request data', details: error.errors },
        400
      );
    }
    
    return createSecureApiResponse(
      { error: 'Internal server error' },
      500
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return createSecureApiResponse(
        { error: 'Unauthorized' },
        401
      );
    }
    
    // Get the latest consent for the user
    const { data: consent, error } = await supabase
      .from('user_consents')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Failed to fetch consent:', error);
      return createSecureApiResponse(
        { error: 'Failed to fetch consent' },
        500
      );
    }
    
    if (!consent) {
      return createSecureApiResponse({ consent: null });
    }
    
    return createSecureApiResponse({
      consent: {
        version: consent.version,
        preferences: {
          necessary: consent.necessary_consent,
          functional: consent.functional_consent,
          analytics: consent.analytics_consent,
          marketing: consent.marketing_consent,
        },
        consentedAt: consent.consented_at,
      }
    });
  } catch (error) {
    console.error('Consent GET API error:', error);
    return createSecureApiResponse(
      { error: 'Internal server error' },
      500
    );
  }
}