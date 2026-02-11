import { sandboxService } from '../sandbox';
import { createUserClient } from '../lib/supabase';
import { AppError } from '../lib/errors';
import type { ExecutionResult, ExecutionHistoryEntry } from '@shared/types';

export class ExecutionService {
  /** Execute a query in the sandbox and record history */
  async execute(
    userId: string,
    projectId: string,
    sql: string,
    dialect: string,
    accessToken: string,
  ): Promise<ExecutionResult> {
    if (!sql || !sql.trim()) {
      throw AppError.badRequest('SQL query cannot be empty');
    }

    const result = await sandboxService.execute(sql, dialect);

    /* Record execution in history */
    await this.recordExecution(userId, projectId, sql, dialect, result, accessToken);

    return result;
  }

  /** Get execution history for a project */
  async getHistory(
    _userId: string,
    projectId: string,
    accessToken: string,
    limit = 50,
  ): Promise<ExecutionHistoryEntry[]> {
    const client = createUserClient(accessToken);
    const { data, error } = await client
      .from('bubble_execution_history')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw AppError.internal(`Failed to fetch execution history: ${error.message}`);
    return (data ?? []).map(mapHistoryRow);
  }

  private async recordExecution(
    userId: string,
    projectId: string,
    sql: string,
    dialect: string,
    result: ExecutionResult,
    accessToken: string,
  ): Promise<void> {
    const client = createUserClient(accessToken);

    const summaryParts: string[] = [];
    if (result.data) {
      summaryParts.push(`${result.data.rowCount} rows`);
      summaryParts.push(`${result.data.executionTimeMs}ms`);
    }

    const { error } = await client.from('bubble_execution_history').insert({
      project_id: projectId,
      user_id: userId,
      sql,
      dialect,
      status: result.status,
      result_summary: summaryParts.join(', ') || null,
      error: result.error,
      execution_time_ms: result.data?.executionTimeMs ?? null,
    });

    if (error) {
      /* Non-critical — log but don't fail the execution */
      console.error('[ExecutionService] Failed to record history:', error.message);
    }
  }
}

function mapHistoryRow(row: Record<string, unknown>): ExecutionHistoryEntry {
  return {
    id: row['id'] as string,
    projectId: row['project_id'] as string,
    sql: row['sql'] as string,
    dialect: row['dialect'] as string,
    status: row['status'] as ExecutionHistoryEntry['status'],
    resultSummary: (row['result_summary'] as string) ?? null,
    error: (row['error'] as string) ?? null,
    executionTimeMs: (row['execution_time_ms'] as number) ?? null,
    createdAt: row['created_at'] as string,
  };
}

export const executionService = new ExecutionService();
