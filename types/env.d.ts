declare namespace NodeJS {
  interface ProcessEnv {
    // OpenAI
    OPENAI_API_KEY: string;
    OPENAI_CHAT_MODEL?: string;
    OPENAI_PLANNER_MODEL?: string;
    OPENAI_EMBEDDING_MODEL?: string;
    OPENAI_MAX_COMPLETION_TOKENS?: string;
    OPENAI_TEMPERATURE?: string;
    OPENAI_VERBOSITY?: string;
    
    // Supabase
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    SUPABASE_SERVICE_ROLE_KEY: string;
    
    // Cron Security
    CRON_SECRET: string;
    
    // Migration Settings (for Responses API)
    USE_RESPONSES_API?: string;
    DEFAULT_REASONING_EFFORT?: string;
    DEFAULT_VERBOSITY?: string;
    RESPONSES_API_ENDPOINTS?: string;
    
    // Rate Limiting (Optional - uses in-memory if not provided)
    UPSTASH_REDIS_REST_URL?: string;
    UPSTASH_REDIS_REST_TOKEN?: string;
    RATE_LIMIT_CHAT_REQUESTS?: string;
    RATE_LIMIT_CHAT_WINDOW?: string;
    RATE_LIMIT_BRAIN_REQUESTS?: string;
    RATE_LIMIT_BRAIN_WINDOW?: string;
    RATE_LIMIT_INTERVENTION_REQUESTS?: string;
    RATE_LIMIT_INTERVENTION_WINDOW?: string;
    RATE_LIMIT_WELCOME_REQUESTS?: string;
    RATE_LIMIT_WELCOME_WINDOW?: string;
    RATE_LIMIT_EMBEDDING_REQUESTS?: string;
    RATE_LIMIT_EMBEDDING_WINDOW?: string;
    RATE_LIMIT_DEFAULT_REQUESTS?: string;
    RATE_LIMIT_DEFAULT_WINDOW?: string;
    
    // Data Retention Settings
    DATA_RETENTION_USER_EVENTS?: string;
    DATA_RETENTION_CHAT_MESSAGES?: string;
    DATA_RETENTION_AI_ERRORS?: string;
    DATA_RETENTION_PATTERN_EVENTS?: string;
    DATA_RETENTION_USER_PATTERNS?: string;
    
    // Cleanup Schedule
    CLEANUP_SCHEDULE?: string;
    ENABLE_AUTO_CLEANUP?: string;
    
    // Application
    NEXT_PUBLIC_APP_URL?: string;
    NODE_ENV?: 'development' | 'production' | 'test';

    // Vector pipeline
    ENABLE_VECTOR_CONTEXT?: string;
    NEXT_PUBLIC_ENABLE_VECTOR_CONTEXT?: string;
    EMBEDDING_JOB_SECRET?: string;
    VECTOR_HEALTH_TOKEN?: string;
    HEALTH_CHECK_TOKEN?: string;
    INTERNAL_JOB_ENDPOINT?: string;
  }
}
