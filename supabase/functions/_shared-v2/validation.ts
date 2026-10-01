export interface ValidationRule<T = unknown> {
    field: string;
    required?: boolean;
    type?: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'email' | 'url' | 'uuid';
    minLength?: number;
    maxLength?: number;
    min?: number;
    max?: number;
    pattern?: RegExp;
    enum?: unknown[];
    custom?: (value: T) => boolean | string;
}

export interface ValidationResult {
    valid: boolean;
    errors: Record<string, string[]>;
}

export function validate(data: Record<string, unknown>, rules: ValidationRule[]): ValidationResult {
    const errors: Record<string, string[]> = {};

    for (const rule of rules) {
        const value = data[rule.field];
        const fieldErrors: string[] = [];

        if (rule.required && (value === undefined || value === null || value === '')) {
            fieldErrors.push(`${rule.field} is required`);
        }

        if (value !== undefined && value !== null) {
            if (rule.type) {
                const typeError = validateType(value, rule.type, rule.field);
                if (typeError) fieldErrors.push(typeError);
            }

            if (rule.minLength !== undefined && typeof value === 'string' && value.length < rule.minLength) {
                fieldErrors.push(`${rule.field} must be at least ${rule.minLength} characters`);
            }

            if (rule.maxLength !== undefined && typeof value === 'string' && value.length > rule.maxLength) {
                fieldErrors.push(`${rule.field} must be at most ${rule.maxLength} characters`);
            }

            if (rule.min !== undefined && typeof value === 'number' && value < rule.min) {
                fieldErrors.push(`${rule.field} must be at least ${rule.min}`);
            }

            if (rule.max !== undefined && typeof value === 'number' && value > rule.max) {
                fieldErrors.push(`${rule.field} must be at most ${rule.max}`);
            }

            if (rule.pattern && typeof value === 'string' && !rule.pattern.test(value)) {
                fieldErrors.push(`${rule.field} format is invalid`);
            }

            if (rule.enum && !rule.enum.includes(value)) {
                fieldErrors.push(`${rule.field} must be one of: ${rule.enum.join(', ')}`);
            }

            if (rule.custom) {
                const customResult = rule.custom(value);
                if (customResult !== true) {
                    fieldErrors.push(typeof customResult === 'string' ? customResult : `${rule.field} is invalid`);
                }
            }
        }

        if (fieldErrors.length > 0) {
            errors[rule.field] = fieldErrors;
        }
    }

    return {
        valid: Object.keys(errors).length === 0,
        errors,
    };
}

function validateType(value: unknown, type: string, field: string): string | null {
    switch (type) {
        case 'string':
            if (typeof value !== 'string') return `${field} must be a string`;
            break;
        case 'number':
            if (typeof value !== 'number' || isNaN(value)) return `${field} must be a number`;
            break;
        case 'boolean':
            if (typeof value !== 'boolean') return `${field} must be a boolean`;
            break;
        case 'object':
            if (typeof value !== 'object' || value === null || Array.isArray(value)) return `${field} must be an object`;
            break;
        case 'array':
            if (!Array.isArray(value)) return `${field} must be an array`;
            break;
        case 'email':
            if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `${field} must be a valid email`;
            break;
        case 'url':
            if (typeof value !== 'string' || !/^https?:\/\/.+/.test(value)) return `${field} must be a valid URL`;
            break;
        case 'uuid':
            if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
                return `${field} must be a valid UUID`;
            }
            break;
    }
    return null;
}

export function validateRequired(data: Record<string, unknown>, fields: string[]): ValidationResult {
    const rules = fields.map(field => ({ field, required: true }));
    return validate(data, rules);
}

export function validateSchema(data: Record<string, unknown>, schema: Record<string, ValidationRule>): ValidationResult {
    const rules = Object.entries(schema).map(([field, rule]) => ({ ...rule, field }));
    return validate(data, rules);
}

export function sanitizeInput(input: string): string {
    return input
        .replace(/[<>]/g, '')
        .trim();
}

export function sanitizeObject<T extends Record<string, unknown>>(obj: T, fields?: string[]): T {
    const result = { ...obj };
    const targetFields = fields || Object.keys(obj);
    
    for (const field of targetFields) {
        if (typeof result[field] === 'string') {
            result[field] = sanitizeInput(result[field]);
        }
    }
    
    return result;
}