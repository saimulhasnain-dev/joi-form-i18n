import { locales, rtlLocales } from './locales.js';

const registry = new Map(Object.entries(locales).map(([code, msgs]) => [code, { ...msgs }]));

/** Locale codes currently available. */
export const supportedLocales = () => [...registry.keys()];

/** True for right-to-left languages (Arabic, Urdu, Hebrew, Persian): use it to set `dir` on your form. */
export const isRtl = (locale) => rtlLocales.has(String(locale ?? '').toLowerCase().split(/[-_]/)[0]);

/** Add a language or override messages. `messages` maps Joi error types to templates with {label} {limit} {valids}. */
export function registerLocale(code, messages) {
  if (typeof code !== 'string' || !code.trim()) throw new TypeError('registerLocale needs a locale code like "it"');
  if (!messages || typeof messages !== 'object') throw new TypeError('registerLocale needs a messages object');
  const key = code.toLowerCase();
  registry.set(key, { ...(registry.get(key) ?? {}), ...messages });
}

function pickLocale(requested, fallback) {
  const wanted = String(requested ?? '').toLowerCase().replace('_', '-');
  for (const c of [wanted, wanted.split('-')[0], String(fallback ?? '').toLowerCase(), 'en']) if (c && registry.has(c)) return c;
  return 'en';
}

const fill = (template, vars) => template.replace(/\{(\w+)\}/g, (m, k) => (vars[k] === undefined ? m : String(vars[k])));

/**
 * Build a validator for a Joi schema.
 * options: { locale = 'en', fallbackLocale = 'en', labels = { fr: { email: 'E-mail' } }, joiOptions = {} }
 * Returns (data, locale?) => { valid, value, errors: { field: message }, details: [{ field, type, message }], locale }
 */
export function createValidator(schema, options = {}) {
  if (!schema || typeof schema.validate !== 'function') throw new TypeError('createValidator expects a Joi schema');
  const { locale: defaultLocale = 'en', fallbackLocale = 'en', labels = {}, joiOptions = {} } = options;

  return (data, locale = defaultLocale) => {
    const used = pickLocale(locale, fallbackLocale);
    const { error, value } = schema.validate(data, { abortEarly: false, ...joiOptions });
    if (!error) return { valid: true, value, errors: {}, details: [], locale: used };

    const dict = registry.get(used) ?? {};
    const details = (error.details ?? []).map((d) => {
      const field = d.path.length ? d.path.join('.') : '_form';
      const label = labels[used]?.[field] ?? labels[used.split('-')[0]]?.[field] ?? field;
      const c = d.context ?? {};
      const template = dict[d.type];
      const message = template
        ? fill(template, { label, limit: c.limit, valids: Array.isArray(c.valids) ? c.valids.join(', ') : c.valids })
        : d.message; // no translation for this Joi error type: keep Joi's own message
      return { field, type: d.type, message };
    });
    const errors = {};
    for (const d of details) if (!(d.field in errors)) errors[d.field] = d.message;
    return { valid: false, value, errors, details, locale: used };
  };
}
