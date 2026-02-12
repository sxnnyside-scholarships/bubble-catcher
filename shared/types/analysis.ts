export type AnalysisSeverity = 'info' | 'warning' | 'error' | 'critical';

export interface AnalysisIssue {
  ruleId: string;
  severity: AnalysisSeverity;
  message: string;
  explanation: string;
  suggestedRewrite: string | null;
  line: number | null;
  column: number | null;
}

export interface AnalysisResult {
  success: boolean;
  dialect: string;
  originalQuery: string;
  issues: AnalysisIssue[];
  ast: unknown;
  parsedSuccessfully: boolean;
  parseError: string | null;
  /** Rule IDs that require a higher plan — frontend shows locked badges */
  lockedRuleIds?: string[];
}

export interface AnalyzeQueryPayload {
  sql: string;
  dialect: string;
}
