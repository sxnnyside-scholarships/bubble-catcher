/** Generates realistic fake rows for a table via @faker-js/faker, guessing a generator from the
 * column name first (e.g. "email" -> an email address) and falling back to the column's type. */

import { faker } from '@faker-js/faker';
import type { TableColumn } from '@shared/types';

type Generator = () => unknown;

/** Column-name patterns checked in order — first match wins. Keep patterns specific before generic. */
const NAME_PATTERNS: [RegExp, Generator][] = [
  [/email/i, () => faker.internet.email().toLowerCase()],
  [/^(first[_-]?name)$/i, () => faker.person.firstName()],
  [/^(last[_-]?name)$/i, () => faker.person.lastName()],
  [/(full[_-]?name|^name$)/i, () => faker.person.fullName()],
  [/username/i, () => faker.internet.username()],
  [/phone/i, () => faker.phone.number()],
  [/(street|address_line)/i, () => faker.location.streetAddress()],
  [/city/i, () => faker.location.city()],
  [/country/i, () => faker.location.country()],
  [/zip|postal/i, () => faker.location.zipCode()],
  [/company/i, () => faker.company.name()],
  [/job[_-]?title|position/i, () => faker.person.jobTitle()],
  [/url|website|link/i, () => faker.internet.url()],
  [/avatar|image|photo/i, () => faker.image.avatar()],
  [/price|amount|cost/i, () => faker.commerce.price()],
  [/product/i, () => faker.commerce.productName()],
  [/description|summary|bio/i, () => faker.lorem.sentence()],
  [/title/i, () => faker.lorem.words({ min: 2, max: 5 })],
  [/color/i, () => faker.color.human()],
  [/uuid|^guid$/i, () => faker.string.uuid()],
  [/slug/i, () => faker.lorem.slug()],
];

function generatorForColumn(column: TableColumn): Generator {
  for (const [pattern, generator] of NAME_PATTERNS) {
    if (pattern.test(column.name)) return generator;
  }

  switch (column.type) {
    case 'integer':
      return () => faker.number.int({ min: 1, max: 100_000 });
    case 'decimal':
      return () => faker.number.float({ min: 0, max: 10_000, fractionDigits: 2 });
    case 'boolean':
      return () => faker.datatype.boolean();
    case 'date':
      return () => faker.date.past().toISOString().slice(0, 10);
    case 'datetime':
      return () => faker.date.past().toISOString();
    default:
      return () => faker.lorem.words({ min: 1, max: 4 });
  }
}

/** Generates `count` fake rows, keyed by column name. Auto-increment primary keys are left out of the
 * row (the engine assigns them) — foreign-key columns get a random small integer as a best-effort
 * reference, since the sandbox doesn't validate FK existence against real row counts. */
export function generateFakeRows(columns: TableColumn[], count: number): Record<string, unknown>[] {
  const generators = columns
    .filter((c) => !(c.primaryKey && c.type === 'integer'))
    .map((c) => ({
      column: c,
      generate: c.references ? () => faker.number.int({ min: 1, max: 100 }) : generatorForColumn(c),
    }));

  const rows: Record<string, unknown>[] = [];
  for (let i = 0; i < count; i++) {
    const row: Record<string, unknown> = {};
    for (const { column, generate } of generators) {
      row[column.name] = column.nullable && faker.datatype.boolean({ probability: 0.05 }) ? null : generate();
    }
    rows.push(row);
  }
  return rows;
}
