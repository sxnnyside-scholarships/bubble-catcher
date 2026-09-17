import type { ExplainNode, ExplainPlanResult, SupportedDialect } from '@shared/types';

export class ExplainParserService {
  /**
   * Parse raw output from an EXPLAIN query into a normalized, hierarchical ExplainPlanResult.
   */
  parse(raw: string, dialect: SupportedDialect, fallbackExecutionTimeMs: number): ExplainPlanResult {
    const trimmed = raw.trim();

    try {
      if (dialect === 'postgresql') {
        return this.parsePostgres(trimmed, fallbackExecutionTimeMs);
      }
      if (dialect === 'mysql' || dialect === 'mariadb') {
        return this.parseMysql(trimmed, fallbackExecutionTimeMs);
      }
      if (dialect === 'sqlite' || dialect === 'libsql') {
        return this.parseSqlite(trimmed, fallbackExecutionTimeMs);
      }
    } catch {
      // Fallback to text parsing if structured parsing encountered unexpected format
    }

    return this.parseRawFallback(trimmed, fallbackExecutionTimeMs);
  }

  /* ── PostgreSQL Parser ────────────────────────────────────────── */
  private parsePostgres(raw: string, fallbackExecutionTimeMs: number): ExplainPlanResult {
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Sometimes Postgres outputs array with surrounding quotes or whitespace
      const match = raw.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (match) parsed = JSON.parse(match[0]);
      else throw new Error('Invalid Postgres JSON');
    }

    const report = Array.isArray(parsed) ? parsed[0] : parsed;
    const plan = report.Plan;
    if (!plan) throw new Error('Missing Plan object in Postgres output');

    let counter = 0;
    const totalCost = Number(plan['Total Cost']) || 0;
    const executionTimeMs = Number(report['Execution Time']) || fallbackExecutionTimeMs;
    const planningTimeMs = Number(report['Planning Time']) || 0;

    function buildNode(p: any): ExplainNode {
      const id = `pg-node-${++counter}`;
      const children = Array.isArray(p.Plans) ? p.Plans.map(buildNode) : [];

      const nodeType = p['Node Type'] || 'Operation';
      const actualTotalTime = Number(p['Actual Total Time']) || 0;
      const loops = Number(p['Actual Loops']) || 1;
      const actualRows = Number(p['Actual Rows']) || 0;
      const planRows = Number(p['Plan Rows']) || 0;
      const cost = Number(p['Startup Cost']) || 0;
      const nodeTotalCost = Number(p['Total Cost']) || 0;

      // Exclusive time = this node's total time * loops minus children's total time * loops
      const childrenTime = children.reduce(
        (acc: number, c: ExplainNode) => acc + (c.actualTotalTimeMs ?? 0) * c.loops,
        0,
      );
      const actualTimeMs = Math.max(0, actualTotalTime * loops - childrenTime);

      const relationName = p['Relation Name'] || p['Alias'] || undefined;
      const indexName = p['Index Name'] || undefined;
      const filter = p['Filter'] ? String(p['Filter']) : undefined;
      const condition =
        p['Hash Cond'] || p['Join Filter'] || p['Index Cond']
          ? String(p['Hash Cond'] || p['Join Filter'] || p['Index Cond'])
          : undefined;

      const buffersHit = Number(p['Shared Hit Blocks']) || 0;
      const buffersRead = Number(p['Shared Read Blocks']) || 0;

      return {
        id,
        nodeType,
        relationName,
        indexName,
        cost,
        totalCost: nodeTotalCost,
        actualTimeMs: Number(actualTimeMs.toFixed(3)),
        actualTotalTimeMs: actualTotalTime,
        actualRows,
        planRows,
        loops,
        buffersHit,
        buffersRead,
        costPercent: 0, // Computed in second pass
        filter,
        condition,
        children,
      };
    }

    const root = buildNode(plan);

    // Compute cost / time percentages and find bottleneck
    let maxMetric = 0;
    let bottleneckNodeId = root.id;

    function annotatePercentages(node: ExplainNode) {
      // Use actual time if available, otherwise total cost
      const metric = executionTimeMs > 0 ? node.actualTimeMs || node.actualTotalTimeMs : node.totalCost;
      const totalBase = executionTimeMs > 0 ? executionTimeMs : totalCost || 1;
      node.costPercent = Math.min(100, Math.max(0, Math.round((metric / totalBase) * 100)));

      if (metric > maxMetric) {
        maxMetric = metric;
        bottleneckNodeId = node.id;
      }

      for (const child of node.children) {
        annotatePercentages(child);
      }
    }

    annotatePercentages(root);

    return {
      root,
      planningTimeMs,
      executionTimeMs,
      totalCost,
      bottleneckNodeId,
      rawOutput: raw,
    };
  }

  /* ── MySQL / MariaDB Parser ───────────────────────────────────── */
  private parseMysql(raw: string, fallbackExecutionTimeMs: number): ExplainPlanResult {
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return this.parseMysqlText(raw, fallbackExecutionTimeMs);
    }

    const qBlock = parsed.query_block;
    if (!qBlock) return this.parseMysqlText(raw, fallbackExecutionTimeMs);

    let counter = 0;
    const totalCost = Number(qBlock.cost_info?.query_cost) || 0;

    function parseBlock(block: any): ExplainNode[] {
      const nodes: ExplainNode[] = [];

      if (block.table) {
        const t = block.table;
        const accessType = t.access_type || 'ALL';
        const isScan = accessType === 'ALL';
        const nodeType = isScan ? 'Seq Scan (Table Scan)' : `Index Access (${accessType})`;
        const cost = Number(t.cost_info?.prefix_cost || t.cost_info?.read_cost) || 0;

        nodes.push({
          id: `mysql-node-${++counter}`,
          nodeType,
          relationName: t.table_name,
          indexName: t.key,
          cost,
          totalCost: cost,
          actualTimeMs: 0,
          actualTotalTimeMs: 0,
          actualRows: Number(t.rows_produced_per_join) || 0,
          planRows: Number(t.rows_examined_per_scan) || 0,
          loops: 1,
          costPercent: totalCost > 0 ? Math.min(100, Math.round((cost / totalCost) * 100)) : 100,
          condition: t.attached_condition,
          children: [],
        });
      }

      if (Array.isArray(block.nested_loop)) {
        for (const loopItem of block.nested_loop) {
          nodes.push(...parseBlock(loopItem));
        }
      }

      if (block.ordering_operation) {
        const childNodes = parseBlock(block.ordering_operation);
        nodes.push({
          id: `mysql-node-${++counter}`,
          nodeType: 'Sort (ORDER BY)',
          cost: 0,
          totalCost: totalCost,
          actualTimeMs: 0,
          actualTotalTimeMs: 0,
          actualRows: 0,
          planRows: 0,
          loops: 1,
          costPercent: 10,
          children: childNodes,
        });
      }

      if (block.grouping_operation) {
        const childNodes = parseBlock(block.grouping_operation);
        nodes.push({
          id: `mysql-node-${++counter}`,
          nodeType: 'Aggregate (GROUP BY)',
          cost: 0,
          totalCost: totalCost,
          actualTimeMs: 0,
          actualTotalTimeMs: 0,
          actualRows: 0,
          planRows: 0,
          loops: 1,
          costPercent: 10,
          children: childNodes,
        });
      }

      return nodes;
    }

    const childNodes = parseBlock(qBlock);
    const root: ExplainNode =
      childNodes.length === 1
        ? childNodes[0]!
        : {
            id: `mysql-root-${++counter}`,
            nodeType: 'Query Block',
            cost: totalCost,
            totalCost,
            actualTimeMs: fallbackExecutionTimeMs,
            actualTotalTimeMs: fallbackExecutionTimeMs,
            actualRows: 0,
            planRows: 0,
            loops: 1,
            costPercent: 100,
            children: childNodes,
          };

    return {
      root,
      executionTimeMs: fallbackExecutionTimeMs,
      totalCost,
      bottleneckNodeId: root.id,
      rawOutput: raw,
    };
  }

  /* ── MySQL Text Parser (e.g. EXPLAIN ANALYZE) ─────────────────── */
  private parseMysqlText(raw: string, fallbackExecutionTimeMs: number): ExplainPlanResult {
    const lines = raw.split('\n').filter((l) => l.trim().length > 0);
    let counter = 0;

    interface StackItem {
      indent: number;
      node: ExplainNode;
    }
    const stack: StackItem[] = [];
    let rootNode: ExplainNode | null = null;

    for (const line of lines) {
      const matchIndent = line.match(/^(\s*)(?:->)?\s*(.*)$/);
      if (!matchIndent) continue;

      const indent = matchIndent[1]?.length || 0;
      const text = matchIndent[2] || '';

      let nodeType = text.split('(')[0]?.trim() || 'Operation';
      if (nodeType.endsWith(':')) nodeType = nodeType.slice(0, -1).trim();

      const costMatch = text.match(/cost=([\d.]+)/);
      const cost = costMatch ? Number(costMatch[1]) : 0;

      const planRowsMatch = text.match(/rows=([\d.]+)/);
      const planRows = planRowsMatch ? Number(planRowsMatch[1]) : 0;

      const actualTimeMatch = text.match(/actual time=([\d.]+)\.\.([\d.]+)/);
      const actualTotalTime = actualTimeMatch ? Number(actualTimeMatch[2]) : 0;

      const actualRowsMatch = text.match(/actual time=[\d.]+\.\.[\d.]+\s+rows=(\d+)/);
      const actualRows = actualRowsMatch ? Number(actualRowsMatch[1]) : 0;

      const loopsMatch = text.match(/loops=(\d+)/);
      const loops = loopsMatch ? Number(loopsMatch[1]) : 1;

      let relationName: string | undefined;
      const scanMatch = text.match(/(?:scan on|Table scan on)\s+([a-zA-Z0-9_]+)/i);
      if (scanMatch) {
        relationName = scanMatch[1];
        if (!nodeType.toLowerCase().includes('scan')) nodeType = `Table Scan (${relationName})`;
      }

      const node: ExplainNode = {
        id: `mysql-txt-${++counter}`,
        nodeType,
        relationName,
        cost,
        totalCost: cost,
        actualTimeMs: Number((actualTotalTime * loops).toFixed(3)),
        actualTotalTimeMs: actualTotalTime,
        actualRows,
        planRows,
        loops,
        costPercent: 0,
        children: [],
      };

      while (stack.length > 0 && stack[stack.length - 1]!.indent >= indent) {
        stack.pop();
      }

      if (stack.length > 0) {
        stack[stack.length - 1]!.node.children.push(node);
      } else if (!rootNode) {
        rootNode = node;
      }

      stack.push({ indent, node });
    }

    const root = rootNode || {
      id: `mysql-txt-1`,
      nodeType: 'Execution Root',
      cost: 0,
      totalCost: 0,
      actualTimeMs: fallbackExecutionTimeMs,
      actualTotalTimeMs: fallbackExecutionTimeMs,
      actualRows: 0,
      planRows: 0,
      loops: 1,
      costPercent: 100,
      children: [],
    };

    return {
      root,
      executionTimeMs: fallbackExecutionTimeMs,
      totalCost: root.totalCost,
      bottleneckNodeId: root.id,
      rawOutput: raw,
    };
  }

  /* ── SQLite Parser (EXPLAIN QUERY PLAN) ────────────────────────── */
  private parseSqlite(raw: string, fallbackExecutionTimeMs: number): ExplainPlanResult {
    let rows: any[] = [];
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) rows = parsed;
    } catch {
      const lines = raw.split('\n').filter((l) => l.trim().length > 0);
      for (const line of lines) {
        const parts = line.split('|').map((p) => p.trim());
        if (parts.length >= 4 && !isNaN(Number(parts[0]))) {
          rows.push({
            id: Number(parts[0]),
            parent: Number(parts[1]),
            notused: Number(parts[2]),
            detail: parts.slice(3).join('|'),
          });
        }
      }
    }

    if (rows.length === 0) return this.parseRawFallback(raw, fallbackExecutionTimeMs);

    const nodeMap = new Map<number, ExplainNode>();

    for (const r of rows) {
      const idNum = Number(r.id);
      const detail = String(r.detail || '');

      let nodeType = 'Query Step';
      let relationName: string | undefined;
      let indexName: string | undefined;

      if (/SCAN\s+TABLE\s+(\w+)/i.test(detail)) {
        const m = detail.match(/SCAN\s+TABLE\s+(\w+)/i);
        relationName = m?.[1];
        nodeType = 'Seq Scan (Table Scan)';
      } else if (/SEARCH\s+TABLE\s+(\w+)\s+USING\s+(?:INDEX\s+(\w+)|INTEGER\s+PRIMARY\s+KEY)/i.test(detail)) {
        const m = detail.match(/SEARCH\s+TABLE\s+(\w+)\s+USING\s+(?:INDEX\s+(\w+)|(INTEGER\s+PRIMARY\s+KEY))/i);
        relationName = m?.[1];
        indexName = m?.[2] || m?.[3] || 'PK';
        nodeType = 'Index Seek / Scan';
      } else if (/USE\s+TEMP\s+B-TREE\s+FOR\s+(.*)/i.test(detail)) {
        const m = detail.match(/USE\s+TEMP\s+B-TREE\s+FOR\s+(.*)/i);
        nodeType = `Temporary B-Tree (${m?.[1] || 'ORDER/GROUP'})`;
      } else if (/COMPOUND\s+SUBQUERIES/i.test(detail)) {
        nodeType = 'Compound Subqueries (UNION/INTERSECT)';
      }

      nodeMap.set(idNum, {
        id: `sqlite-node-${idNum}`,
        nodeType,
        relationName,
        indexName,
        cost: 0,
        totalCost: 0,
        actualTimeMs: 0,
        actualTotalTimeMs: 0,
        actualRows: 0,
        planRows: 0,
        loops: 1,
        costPercent: 0,
        condition: detail,
        children: [],
      });
    }

    const roots: ExplainNode[] = [];

    for (const r of rows) {
      const idNum = Number(r.id);
      const parentNum = Number(r.parent);
      const currentNode = nodeMap.get(idNum)!;

      if (parentNum === 0 || parentNum === idNum || !nodeMap.has(parentNum)) {
        roots.push(currentNode);
      } else {
        nodeMap.get(parentNum)!.children.push(currentNode);
      }
    }

    const root: ExplainNode =
      roots.length === 1
        ? roots[0]!
        : {
            id: 'sqlite-root',
            nodeType: 'Execution Plan',
            cost: 0,
            totalCost: 0,
            actualTimeMs: fallbackExecutionTimeMs,
            actualTotalTimeMs: fallbackExecutionTimeMs,
            actualRows: 0,
            planRows: 0,
            loops: 1,
            costPercent: 100,
            children: roots,
          };

    return {
      root,
      executionTimeMs: fallbackExecutionTimeMs,
      totalCost: 0,
      bottleneckNodeId: root.id,
      rawOutput: raw,
    };
  }

  /* ── Raw Fallback Parser ───────────────────────────────────────── */
  private parseRawFallback(raw: string, fallbackExecutionTimeMs: number): ExplainPlanResult {
    const root: ExplainNode = {
      id: 'fallback-root-1',
      nodeType: 'Execution Plan (Summary)',
      cost: 0,
      totalCost: 0,
      actualTimeMs: fallbackExecutionTimeMs,
      actualTotalTimeMs: fallbackExecutionTimeMs,
      actualRows: 0,
      planRows: 0,
      loops: 1,
      costPercent: 100,
      condition: raw.slice(0, 200),
      children: [],
    };

    return {
      root,
      executionTimeMs: fallbackExecutionTimeMs,
      totalCost: 0,
      bottleneckNodeId: root.id,
      rawOutput: raw,
    };
  }
}

export const explainParserService = new ExplainParserService();
