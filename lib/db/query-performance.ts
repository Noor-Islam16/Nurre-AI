export class QueryPerformance {
  static async explainQuery(
    supabase: any,
    query: string
  ): Promise<any> {
    try {
      const { data, error } = await supabase
        .rpc('explain_query', { query_text: query })
      
      if (error) throw error
      return data
    } catch (error) {
      console.error('Query explain error:', error)
      return null
    }
  }

  static async getSlowQueries(
    supabase: any,
    threshold = 100 // milliseconds
  ): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .rpc('get_slow_queries', { threshold_ms: threshold })
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Slow query fetch error:', error)
      return []
    }
  }

  static optimizeQuery(query: string): string {
    // Basic query optimization suggestions
    let optimized = query

    // Add LIMIT if not present for SELECT
    if (query.toLowerCase().includes('select') && 
        !query.toLowerCase().includes('limit')) {
      console.warn('Query missing LIMIT clause - consider adding one')
    }

    // Suggest index for WHERE clauses
    const whereMatch = query.match(/where\s+(\w+)\s*=/i)
    if (whereMatch) {
      console.info(`Consider index on column: ${whereMatch[1]}`)
    }

    // Warn about SELECT *
    if (query.includes('SELECT *') || query.includes('select *')) {
      console.warn('Avoid SELECT * - specify needed columns')
    }

    return optimized
  }

  static async getIndexUsage(supabase: any): Promise<any[]> {
    try {
      const { data, error } = await supabase.rpc('get_index_usage')
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Index usage fetch error:', error)
      return []
    }
  }

  static async getMissingIndexes(supabase: any): Promise<any[]> {
    try {
      const { data, error } = await supabase.rpc('suggest_missing_indexes')
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('Missing indexes fetch error:', error)
      return []
    }
  }

  static async analyzeTable(
    supabase: any,
    tableName: string
  ): Promise<boolean> {
    try {
      const { error } = await supabase
        .rpc('analyze_table', { table_name: tableName })
      
      if (error) throw error
      return true
    } catch (error) {
      console.error(`Failed to analyze table ${tableName}:`, error)
      return false
    }
  }

  static async getAllIndexes(supabase: any): Promise<any[]> {
    try {
      const { data, error } = await supabase.rpc('get_all_indexes')
      
      if (error) throw error
      return data || []
    } catch (error) {
      console.error('All indexes fetch error:', error)
      return []
    }
  }

  // Helper to format index recommendations
  static formatIndexRecommendation(
    tableName: string,
    columnName: string,
    queryPattern?: string
  ): string {
    let indexName = `idx_${tableName}_${columnName}`
    let sql = `CREATE INDEX CONCURRENTLY IF NOT EXISTS ${indexName}\n`
    sql += `ON ${tableName}(${columnName})`
    
    if (queryPattern) {
      sql += ` -- For queries like: ${queryPattern}`
    }
    
    return sql
  }

  // Check if an index exists
  static async indexExists(
    supabase: any,
    indexName: string
  ): Promise<boolean> {
    try {
      const indexes = await this.getAllIndexes(supabase)
      return indexes.some(idx => idx.index_name === indexName)
    } catch (error) {
      console.error('Index existence check error:', error)
      return false
    }
  }

  // Get query performance stats
  static getPerformanceStats(explainOutput: any[]): {
    cost: number
    rows: number
    width: number
    hasIndexScan: boolean
    hasSeqScan: boolean
  } {
    const stats = {
      cost: 0,
      rows: 0,
      width: 0,
      hasIndexScan: false,
      hasSeqScan: false
    }

    if (!explainOutput || !Array.isArray(explainOutput)) {
      return stats
    }

    // Parse EXPLAIN output
    const output = explainOutput.join('\n')
    
    // Extract cost
    const costMatch = output.match(/cost=(\d+\.?\d*)\.\./i)
    if (costMatch) {
      stats.cost = parseFloat(costMatch[1])
    }

    // Extract rows
    const rowsMatch = output.match(/rows=(\d+)/i)
    if (rowsMatch) {
      stats.rows = parseInt(rowsMatch[1])
    }

    // Extract width
    const widthMatch = output.match(/width=(\d+)/i)
    if (widthMatch) {
      stats.width = parseInt(widthMatch[1])
    }

    // Check for scan types
    stats.hasIndexScan = /Index Scan/i.test(output)
    stats.hasSeqScan = /Seq Scan/i.test(output)

    return stats
  }
}