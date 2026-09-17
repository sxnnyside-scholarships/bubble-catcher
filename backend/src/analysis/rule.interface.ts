import type { AnalysisIssue } from '@shared/types';
import type { AST } from 'node-sql-parser';

/**
 * Base interface for all analysis rules.
 * Each rule inspects the parsed AST and returns issues found.
 */
export interface AnalysisRule {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  analyze(ast: AST, originalQuery: string): AnalysisIssue[];
}
