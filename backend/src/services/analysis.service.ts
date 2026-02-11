import { analysisEngine } from '../analysis';
import { isSupportedDialect, isEnterpriseDialect } from '@shared/types';
import type { AnalysisResult } from '@shared/types';
import { AppError } from '../lib/errors';

export class AnalysisService {
  analyze(sql: string, dialect: string): AnalysisResult {
    if (!sql || !sql.trim()) {
      throw AppError.badRequest('SQL query cannot be empty');
    }

    if (isEnterpriseDialect(dialect)) {
      /* Allow analysis for enterprise dialects, just not execution */
      return analysisEngine.analyze(sql, dialect);
    }

    if (!isSupportedDialect(dialect)) {
      throw AppError.badRequest(`Unsupported dialect: ${dialect}`);
    }

    return analysisEngine.analyze(sql, dialect);
  }
}

export const analysisService = new AnalysisService();
