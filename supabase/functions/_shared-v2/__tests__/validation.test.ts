import { 
    validate, 
    validateRequired, 
    validateSchema, 
    sanitizeInput, 
    sanitizeObject 
} from '../validation.ts';

Deno.test("validate - required field missing", () => {
    const result = validate({}, [{ field: 'name', required: true }]);
    if (result.valid) throw new Error("Should be invalid");
    if (!result.errors.name) throw new Error("Should have name error");
    if (!result.errors.name.includes('required')) throw new Error("Should mention required");
});

Deno.test("validate - required field present", () => {
    const result = validate({ name: 'John' }, [{ field: 'name', required: true }]);
    if (!result.valid) throw new Error("Should be valid");
});

Deno.test("validate - string type validation", () => {
    const result = validate({ name: 123 }, [{ field: 'name', type: 'string' }]);
    if (result.valid) throw new Error("Should be invalid");
    if (!result.errors.name) throw new Error("Should have name error");
});

Deno.test("validate - number type validation", () => {
    const result = validate({ age: "twenty" }, [{ field: 'age', type: 'number' }]);
    if (result.valid) throw new Error("Should be invalid");
});

Deno.test("validate - boolean type validation", () => {
    const result = validate({ active: "yes" }, [{ field: 'active', type: 'boolean' }]);
    if (result.valid) throw new Error("Should be invalid");
});

Deno.test("validate - email validation", () => {
    const result = validate({ email: "invalid-email" }, [{ field: 'email', type: 'email' }]);
    if (result.valid) throw new Error("Should be invalid");
    
    const validResult = validate({ email: "test@example.com" }, [{ field: 'email', type: 'email' }]);
    if (!validResult.valid) throw new Error("Valid email should pass");
});

Deno.test("validate - URL validation", () => {
    const result = validate({ url: "not-a-url" }, [{ field: 'url', type: 'url' }]);
    if (result.valid) throw new Error("Should be invalid");
    
    const validResult = validate({ url: "https://example.com" }, [{ field: 'url', type: 'url' }]);
    if (!validResult.valid) throw new Error("Valid URL should pass");
});

Deno.test("validate - UUID validation", () => {
    const result = validate({ id: "not-a-uuid" }, [{ field: 'id', type: 'uuid' }]);
    if (result.valid) throw new Error("Should be invalid");
    
    const validResult = validate({ id: "550e8400-e29b-41d4-a716-446655440000" }, [{ field: 'id', type: 'uuid' }]);
    if (!validResult.valid) throw new Error("Valid UUID should pass");
});

Deno.test("validate - minLength", () => {
    const result = validate({ password: "123" }, [{ field: 'password', minLength: 8 }]);
    if (result.valid) throw new Error("Should be invalid");
    if (!result.errors.password?.includes('at least 8')) throw new Error("Should mention min length");
});

Deno.test("validate - maxLength", () => {
    const result = validate({ name: "a".repeat(101) }, [{ field: 'name', maxLength: 100 }]);
    if (result.valid) throw new Error("Should be invalid");
});

Deno.test("validate - min number", () => {
    const result = validate({ age: 10 }, [{ field: 'age', type: 'number', min: 18 }]);
    if (result.valid) throw new Error("Should be invalid");
});

Deno.test("validate - max number", () => {
    const result = validate({ age: 150 }, [{ field: 'age', type: 'number', max: 120 }]);
    if (result.valid) throw new Error("Should be invalid");
});

Deno.test("validate - pattern", () => {
    const result = validate({ username: "user@name" }, [{ field: 'username', pattern: /^[a-zA-Z0-9_]+$/ }]);
    if (result.valid) throw new Error("Should be invalid");
});

Deno.test("validate - enum", () => {
    const result = validate({ status: "invalid" }, [{ field: 'status', enum: ['active', 'inactive'] }]);
    if (result.valid) throw new Error("Should be invalid");
    
    const validResult = validate({ status: "active" }, [{ field: 'status', enum: ['active', 'inactive'] }]);
    if (!validResult.valid) throw new Error("Valid enum should pass");
});

Deno.test("validate - custom validator", () => {
    const result = validate({ password: "weak" }, [{ 
        field: 'password', 
        custom: (v) => v.length >= 8 || "Password too short" 
    }]);
    if (result.valid) throw new Error("Should be invalid");
    if (!result.errors.password?.includes('Password too short')) throw new Error("Should use custom message");
});

Deno.test("validateRequired - missing fields", () => {
    const result = validateRequired({}, ['name', 'email']);
    if (result.valid) throw new Error("Should be invalid");
    if (!result.errors.name || !result.errors.email) throw new Error("Should have both errors");
});

Deno.test("validateSchema - valid data", () => {
    const schema = {
        name: { field: 'name', required: true, type: 'string', minLength: 2 },
        email: { field: 'email', required: true, type: 'email' },
        age: { field: 'age', required: false, type: 'number', min: 18 }
    };
    
    const result = validateSchema({ 
        name: "John Doe", 
        email: "john@example.com", 
        age: 25 
    }, schema);
    
    if (!result.valid) throw new Error("Should be valid");
});

Deno.test("sanitizeInput - removes HTML tags", () => {
    const result = sanitizeInput("<script>alert('xss')</script>Hello");
    if (result.includes('<') || result.includes('>')) throw new Error("Should remove HTML tags");
    if (!result.includes('Hello')) throw new Error("Should keep text");
});

Deno.test("sanitizeInput - trims whitespace", () => {
    const result = sanitizeInput("  hello  ");
    if (result !== "hello") throw new Error("Should trim whitespace");
});

Deno.test("sanitizeObject - sanitizes string fields", () => {
    const obj = { 
        name: "<b>John</b>", 
        age: 30, 
        email: "john@example.com" 
    };
    const result = sanitizeObject(obj, ['name', 'email']);
    
    if (result.name.includes('<') || result.name.includes('>')) throw new Error("Should sanitize name");
    if (result.age !== 30) throw new Error("Should keep number");
    if (result.email !== "john@example.com") throw new Error("Should keep valid email");
});