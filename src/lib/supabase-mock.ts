/**
 * Mock Supabase client for local POC development.
 *
 * Implements the Supabase query builder chain pattern:
 *   supabase.from('table').select('*').eq('col', val).order(...).limit(n).single()
 *
 * Routes all queries to the in-memory mock-store.
 * Drop-in replacement for the real Supabase client — no API routes need to change.
 */

import {
  getTable,
  insertRow,
  updateRows,
  upsertRow,
} from './mock-store';

type DbRow = Record<string, any>;

// ─── Query builder ───

class MockQueryBuilder {
  private tableName: string;
  private operation: 'select' | 'insert' | 'update' | 'upsert' | 'delete' = 'select';
  private filters: { column: string; op: string; value: any }[] = [];
  private orderByCol?: string;
  private orderAsc: boolean = true;
  private limitCount?: number;
  private rangeFrom?: number;
  private rangeTo?: number;
  private isSingle: boolean = false;
  private insertData?: DbRow | DbRow[];
  private updateData?: DbRow;
  private upsertData?: DbRow | DbRow[];
  private upsertConflict?: string;
  private selectColumns: string = '*';
  private shouldSelect: boolean = false; // for insert().select() / update().select()

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns: string = '*'): this {
    if (this.operation === 'insert' || this.operation === 'update' || this.operation === 'upsert') {
      // chained .select() after insert/update — means "return the rows"
      this.shouldSelect = true;
      this.selectColumns = columns;
    } else {
      this.operation = 'select';
      this.selectColumns = columns;
    }
    return this;
  }

  insert(data: DbRow | DbRow[]): this {
    this.operation = 'insert';
    this.insertData = data;
    return this;
  }

  update(data: DbRow): this {
    this.operation = 'update';
    this.updateData = data;
    return this;
  }

  upsert(data: DbRow | DbRow[], options?: { onConflict?: string }): this {
    this.operation = 'upsert';
    this.upsertData = data;
    this.upsertConflict = options?.onConflict;
    return this;
  }

  delete(): this {
    this.operation = 'delete';
    return this;
  }

  eq(column: string, value: any): this {
    this.filters.push({ column, op: 'eq', value });
    return this;
  }

  neq(column: string, value: any): this {
    this.filters.push({ column, op: 'neq', value });
    return this;
  }

  gt(column: string, value: any): this {
    this.filters.push({ column, op: 'gt', value });
    return this;
  }

  gte(column: string, value: any): this {
    this.filters.push({ column, op: 'gte', value });
    return this;
  }

  lt(column: string, value: any): this {
    this.filters.push({ column, op: 'lt', value });
    return this;
  }

  lte(column: string, value: any): this {
    this.filters.push({ column, op: 'lte', value });
    return this;
  }

  in(column: string, values: any[]): this {
    this.filters.push({ column, op: 'in', value: values });
    return this;
  }

  order(column: string, options?: { ascending?: boolean }): this {
    this.orderByCol = column;
    this.orderAsc = options?.ascending ?? true;
    return this;
  }

  limit(count: number): this {
    this.limitCount = count;
    return this;
  }

  range(from: number, to: number): this {
    this.rangeFrom = from;
    this.rangeTo = to;
    return this;
  }

  single(): Promise<{ data: any; error: any }> {
    this.isSingle = true;
    return this.execute();
  }

  // Terminal — called when `await`ed or when .single() is not used
  then(
    resolve: (value: { data: any; error: any }) => any,
    reject?: (reason: any) => any
  ): Promise<any> {
    return this.execute().then(resolve, reject);
  }

  private applyFilters(rows: DbRow[]): DbRow[] {
    return rows.filter((row) =>
      this.filters.every((f) => {
        const val = row[f.column];
        switch (f.op) {
          case 'eq':
            return val === f.value;
          case 'neq':
            return val !== f.value;
          case 'gt':
            return val > f.value;
          case 'gte':
            return val >= f.value;
          case 'lt':
            return val < f.value;
          case 'lte':
            return val <= f.value;
          case 'in':
            return (f.value as any[]).includes(val);
          default:
            return true;
        }
      })
    );
  }

  private pickColumns(rows: DbRow[]): DbRow[] {
    if (this.selectColumns === '*') return rows.map((r) => ({ ...r }));
    const cols = this.selectColumns.split(',').map((c) => c.trim());
    return rows.map((row) => {
      const picked: DbRow = {};
      for (const col of cols) {
        if (col in row) picked[col] = row[col];
      }
      return picked;
    });
  }

  private async execute(): Promise<{ data: any; error: any }> {
    try {
      switch (this.operation) {
        case 'select': {
          let rows = [...getTable(this.tableName)];
          rows = this.applyFilters(rows);

          if (this.orderByCol) {
            rows.sort((a, b) => {
              const aVal = a[this.orderByCol!];
              const bVal = b[this.orderByCol!];
              if (aVal < bVal) return this.orderAsc ? -1 : 1;
              if (aVal > bVal) return this.orderAsc ? 1 : -1;
              return 0;
            });
          }

          if (this.rangeFrom !== undefined && this.rangeTo !== undefined) {
            rows = rows.slice(this.rangeFrom, this.rangeTo + 1);
          }

          if (this.limitCount !== undefined) {
            rows = rows.slice(0, this.limitCount);
          }

          rows = this.pickColumns(rows);

          if (this.isSingle) {
            if (rows.length === 0) {
              return { data: null, error: { code: 'PGRST116', message: 'No rows found' } };
            }
            return { data: rows[0], error: null };
          }

          return { data: rows, error: null };
        }

        case 'insert': {
          const items = Array.isArray(this.insertData) ? this.insertData : [this.insertData!];
          const inserted = items.map((item) => insertRow(this.tableName, item));
          if (this.shouldSelect) {
            let result = this.pickColumns(inserted);
            if (this.isSingle) {
              return { data: result[0] || null, error: null };
            }
            return { data: result, error: null };
          }
          if (this.isSingle) {
            return { data: inserted[0], error: null };
          }
          return { data: inserted, error: null };
        }

        case 'update': {
          const filterPairs = this.filters.map((f) => ({
            column: f.column,
            value: f.value,
          }));
          const updated = updateRows(this.tableName, this.updateData!, filterPairs);

          if (this.shouldSelect) {
            let result = this.pickColumns(updated);
            if (this.isSingle) {
              return { data: result[0] || null, error: null };
            }
            return { data: result, error: null };
          }
          if (this.isSingle) {
            return { data: updated[0] || null, error: null };
          }
          return { data: updated, error: null };
        }

        case 'upsert': {
          const items = Array.isArray(this.upsertData) ? this.upsertData : [this.upsertData!];
          const conflictCols = this.upsertConflict
            ? this.upsertConflict.split(',').map((c) => c.trim())
            : ['id'];
          const results = items.map((item) =>
            upsertRow(this.tableName, item, conflictCols)
          );

          if (this.shouldSelect) {
            let result = this.pickColumns(results);
            if (this.isSingle) {
              return { data: result[0] || null, error: null };
            }
            return { data: result, error: null };
          }
          return { data: results, error: null };
        }

        case 'delete': {
          const filterPairs = this.filters.map((f) => ({
            column: f.column,
            value: f.value,
          }));
          const table = getTable(this.tableName);
          const toRemove = this.applyFilters(table);
          // Actually remove from store
          const remaining = table.filter((row) => !toRemove.includes(row));
          // Replace in place
          table.length = 0;
          table.push(...remaining);
          return { data: toRemove, error: null };
        }

        default:
          return { data: null, error: { message: 'Unknown operation' } };
      }
    } catch (err: any) {
      return { data: null, error: { message: err.message } };
    }
  }
}

// ─── Mock client matching Supabase interface ───

class MockSupabaseClient {
  from(tableName: string): MockQueryBuilder {
    return new MockQueryBuilder(tableName);
  }

  // Realtime — no-op for mock
  channel(_name: string) {
    return {
      on: () => ({ on: () => ({ subscribe: () => {} }), subscribe: () => {} }),
      subscribe: () => {},
      unsubscribe: () => {},
    };
  }
}

// ─── Export ───

export function createMockServiceClient() {
  return new MockSupabaseClient() as any;
}

export function createMockBrowserClient() {
  return new MockSupabaseClient() as any;
}
