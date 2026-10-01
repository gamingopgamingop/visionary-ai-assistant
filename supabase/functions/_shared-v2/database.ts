import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

export async function executeQuery<T>(
    query: () => Promise<{ data: T | null; error: any }>
): Promise<T | null> {
    const { data, error } = await query();
    if (error) {
        throw new Error(`Database error: ${error.message}`);
    }
    return data;
}

export async function executeQuerySingle<T>(
    query: () => Promise<{ data: T | null; error: any }>
): Promise<T | null> {
    return executeQuery(query);
}

export async function executeQueryMaybeSingle<T>(
    query: () => Promise<{ data: T | null; error: any }>
): Promise<T | null> {
    const { data, error } = await query();
    if (error) {
        if (error.code === 'PGRST116') {
            return null;
        }
        throw new Error(`Database error: ${error.message}`);
    }
    return data;
}

export async function executeInsert<T>(
    table: string,
    data: Record<string, unknown>,
    options?: { returning?: boolean }
): Promise<T | null> {
    const query = supabase.from(table).insert(data);
    if (options?.returning) {
        const { data: result, error } = await query.select().single();
        if (error) throw new Error(`Insert error: ${error.message}`);
        return result as T;
    }
    const { error } = await query;
    if (error) throw new Error(`Insert error: ${error.message}`);
    return null;
}

export async function executeUpdate<T>(
    table: string,
    data: Record<string, unknown>,
    match: Record<string, unknown>,
    options?: { returning?: boolean }
): Promise<T | null> {
    let query = supabase.from(table).update(data);
    for (const [key, value] of Object.entries(match)) {
        query = query.eq(key, value);
    }
    if (options?.returning) {
        const { data: result, error } = await query.select().single();
        if (error) throw new Error(`Update error: ${error.message}`);
        return result as T;
    }
    const { error } = await query;
    if (error) throw new Error(`Update error: ${error.message}`);
    return null;
}

export async function executeDelete(
    table: string,
    match: Record<string, unknown>
): Promise<boolean> {
    let query = supabase.from(table).delete();
    for (const [key, value] of Object.entries(match)) {
        query = query.eq(key, value);
    }
    const { error } = await query;
    if (error) throw new Error(`Delete error: ${error.message}`);
    return true;
}

export async function executeSelect<T>(
    table: string,
    options: {
        select?: string;
        match?: Record<string, unknown>;
        orderBy?: { column: string; ascending?: boolean };
        limit?: number;
        offset?: number;
        range?: [number, number];
    } = {}
): Promise<T[]> {
    let query = supabase.from(table).select(options.select || '*');
    
    if (options.match) {
        for (const [key, value] of Object.entries(options.match)) {
            query = query.eq(key, value);
        }
    }
    
    if (options.orderBy) {
        query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true });
    }
    
    if (options.limit) {
        query = query.limit(options.limit);
    }
    
    if (options.offset) {
        query = query.range(options.offset, options.offset + (options.limit || 100) - 1);
    } else if (options.range) {
        query = query.range(options.range[0], options.range[1]);
    }
    
    const { data, error } = await query;
    if (error) throw new Error(`Select error: ${error.message}`);
    return (data || []) as T[];
}

export async function executeCount(
    table: string,
    match?: Record<string, unknown>
): Promise<number> {
    let query = supabase.from(table).select('*', { count: 'exact', head: true });
    
    if (match) {
        for (const [key, value] of Object.entries(match)) {
            query = query.eq(key, value);
        }
    }
    
    const { count, error } = await query;
    if (error) throw new Error(`Count error: ${error.message}`);
    return count || 0;
}

export async function executeRpc<T>(
    functionName: string,
    params: Record<string, unknown>
): Promise<T | null> {
    const { data, error } = await supabase.rpc(functionName, params);
    if (error) throw new Error(`RPC error: ${error.message}`);
    return data as T;
}

export { supabase };