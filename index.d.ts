export interface ValidationDetail { field: string; type: string; message: string }
export interface ValidationResult<T = unknown> {
  valid: boolean;
  value: T;
  /** First message per field, e.g. { email: 'email must be a valid email address' }. Form-level errors use "_form". */
  errors: Record<string, string>;
  details: ValidationDetail[];
  locale: string;
}
export interface ValidatorOptions {
  locale?: string;
  fallbackLocale?: string;
  /** Display names per locale and field: { fr: { email: 'E-mail' } } */
  labels?: Record<string, Record<string, string>>;
  joiOptions?: Record<string, unknown>;
}
export function createValidator<T = unknown>(
  schema: { validate(data: unknown, options?: any): { error?: any; value: T } },
  options?: ValidatorOptions,
): (data: unknown, locale?: string) => ValidationResult<T>;
export function registerLocale(code: string, messages: Record<string, string>): void;
export function supportedLocales(): string[];
export function isRtl(locale: string): boolean;
