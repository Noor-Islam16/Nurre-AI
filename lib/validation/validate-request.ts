import { NextRequest, NextResponse } from 'next/server'
import { ZodSchema, ZodError } from 'zod'

export async function validateRequest<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<{ data: T; error: null } | { data: null; error: NextResponse }> {
  try {
    const body = await request.json()
    const data = schema.parse(body)
    return { data, error: null }
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        data: null,
        error: NextResponse.json(
          {
            error: 'Validation failed',
            details: error.errors.map(e => ({
              path: e.path.join('.'),
              message: e.message
            }))
          },
          { status: 400 }
        )
      }
    }
    
    // Handle JSON parsing errors
    if (error instanceof SyntaxError) {
      return {
        data: null,
        error: NextResponse.json(
          { error: 'Invalid JSON in request body' },
          { status: 400 }
        )
      }
    }
    
    return {
      data: null,
      error: NextResponse.json(
        { error: 'Invalid request body' },
        { status: 400 }
      )
    }
  }
}

export function validateQuery<T>(
  searchParams: URLSearchParams,
  schema: ZodSchema<T>
): { data: T; error: null } | { data: null; error: NextResponse } {
  try {
    // Convert URLSearchParams to plain object
    const params: Record<string, any> = {}
    searchParams.forEach((value, key) => {
      params[key] = value || undefined
    })
    
    // Also handle null values by converting to undefined
    for (const key in params) {
      if (params[key] === null || params[key] === '') {
        params[key] = undefined
      }
    }
    
    const data = schema.parse(params)
    return { data, error: null }
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        data: null,
        error: NextResponse.json(
          {
            error: 'Invalid query parameters',
            details: error.errors.map(e => ({
              path: e.path.join('.'),
              message: e.message
            }))
          },
          { status: 400 }
        )
      }
    }
    
    return {
      data: null,
      error: NextResponse.json(
        { error: 'Invalid query parameters' },
        { status: 400 }
      )
    }
  }
}

// Helper for validating partial updates
export function validatePartialUpdate<T>(
  data: unknown,
  schema: ZodSchema<T>
): { data: T; error: null } | { data: null; error: string } {
  try {
    const validated = schema.parse(data)
    return { data: validated, error: null }
  } catch (error) {
    if (error instanceof ZodError) {
      const errors = error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')
      return { data: null, error: errors }
    }
    return { data: null, error: 'Invalid data' }
  }
}