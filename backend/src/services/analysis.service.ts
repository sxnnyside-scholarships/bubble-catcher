import type { AnalysisResult, Dialect } from '@shared/types';
import { isSupportedDialect } from '@shared/types';
import { analysisEngine } from '../analysis';
import { AppError } from '../lib/errors';

export class AnalysisService {
  analyze(sql: string, dialect: Dialect): AnalysisResult {
    if (!sql?.trim()) {
      throw AppError.badRequest('EMPTY_QUERY');
    }

    if (!isSupportedDialect(dialect)) {
      throw AppError.badRequest('UNSUPPORTED_DIALECT', { dialect });
    }

    return analysisEngine.analyze(sql, dialect);
  }
}

export const analysisService = new AnalysisService();
