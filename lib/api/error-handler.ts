import { NextResponse } from 'next/server';

/**
 * Standard error handler for API routes
 * Maps Supabase/PostgreSQL error codes to appropriate HTTP responses
 */
export function handleApiError(error: any) {
  console.error('API Error:', error);
  
  // PostgreSQL/Supabase error codes
  if (error.code === 'PGRST116') {
    // No rows found
    return NextResponse.json(
      { error: 'Resource not found' },
      { status: 404 }
    );
  }
  
  if (error.code === '23505') {
    // Unique constraint violation
    return NextResponse.json(
      { error: 'Duplicate entry' },
      { status: 409 }
    );
  }
  
  if (error.code === '23503') {
    // Foreign key constraint violation
    return NextResponse.json(
      { error: 'Invalid reference' },
      { status: 400 }
    );
  }
  
  if (error.code === '23502') {
    // Not null constraint violation
    return NextResponse.json(
      { error: 'Required field missing' },
      { status: 400 }
    );
  }
  
  if (error.code === '23514') {
    // Check constraint violation
    return NextResponse.json(
      { error: 'Validation failed' },
      { status: 400 }
    );
  }
  
  if (error.code === '42501') {
    // Insufficient privileges
    return NextResponse.json(
      { error: 'Insufficient permissions' },
      { status: 403 }
    );
  }
  
  if (error.code === '42P01') {
    // Undefined table
    return NextResponse.json(
      { error: 'Database configuration error' },
      { status: 500 }
    );
  }
  
  // Auth errors
  if (error.message?.includes('JWT')) {
    return NextResponse.json(
      { error: 'Authentication failed' },
      { status: 401 }
    );
  }
  
  if (error.message?.includes('refresh_token')) {
    return NextResponse.json(
      { error: 'Session expired' },
      { status: 401 }
    );
  }
  
  // Default error
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}

/**
 * Validate required fields are present
 */
export function validateRequiredFields(
  data: any,
  requiredFields: string[]
): { valid: boolean; missing?: string[] } {
  const missing = requiredFields.filter(field => !data[field]);
  
  if (missing.length > 0) {
    return { valid: false, missing };
  }
  
  return { valid: true };
}

/**
 * Safe JSON parse with error handling
 */
export function safeJsonParse(str: string): any {
  try {
    return JSON.parse(str);
  } catch {
    return str;
  }
}

/**
 * Format error message for client
 */
export function formatErrorMessage(error: any): string {
  if (typeof error === 'string') {
    return error;
  }
  
  if (error.message) {
    return error.message;
  }
  
  if (error.error) {
    return error.error;
  }
  
  return 'An unexpected error occurred';
}