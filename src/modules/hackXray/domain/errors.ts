export class HackXRayError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'HackXRayError';
    }
}

export class HackXRayValidationError extends HackXRayError {
    constructor(message: string) {
        super(message);
        this.name = 'HackXRayValidationError';
    }
}

export class HackXRayBusinessRuleError extends HackXRayError {
    constructor(message: string) {
        super(message);
        this.name = 'HackXRayBusinessRuleError';
    }
}

export class HackXRayLLMOutputError extends HackXRayError {
    constructor(message: string) {
        super(message);
        this.name = 'HackXRayLLMOutputError';
    }
}

// HU05: New validation errors
export class LLMOutputInvalidError extends HackXRayError {
    constructor(message: string) {
        super(message);
        this.name = 'LLMOutputInvalidError';
    }
}

export class LLMOutputIncoherentError extends HackXRayError {
    constructor(message: string) {
        super(message);
        this.name = 'LLMOutputIncoherentError';
    }
}

export class UnsafeOutputError extends HackXRayError {
    constructor(message: string) {
        super(message);
        this.name = 'UnsafeOutputError';
    }
}
