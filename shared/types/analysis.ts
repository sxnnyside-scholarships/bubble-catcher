import type { Dialect } from './dialect';

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
  dialect: Dialect;
  originalQuery: string;
  issues: AnalysisIssue[];
  ast: unknown;
  parsedSuccessfully: boolean;
  parseError: string | null;
}

export interface AnalyzeQueryPayload {
  sql: string;
  dialect: Dialect;
}
