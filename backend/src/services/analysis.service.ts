import { analysisEngine } from '../analysis';
import { isSupportedDialect, isEnterpriseDialect } from '@shared/types';
import type { AnalysisResult } from '@shared/types';
import type { PlanTier } from '../analysis/rule.interface';
import { AppError } from '../lib/errors';

export class AnalysisService {
  analyze(sql: string, dialect: string, userPlan: PlanTier = 'free'): AnalysisResult {
    if (!sql || !sql.trim()) {
      throw AppError.badRequest('EMPTY_QUERY');
    }

    if (isEnterpriseDialect(dialect)) {
      /* Allow analysis for enterprise dialects, just not execution */
      return analysisEngine.analyze(sql, dialect, userPlan);
    }

    if (!isSupportedDialect(dialect)) {
      throw AppError.badRequest('UNSUPPORTED_DIALECT', { dialect });
    }

    return analysisEngine.analyze(sql, dialect, userPlan);
  }
}

export const analysisService = new AnalysisService();
