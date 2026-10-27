import { test } from 'node:test';
import assert from 'node:assert/strict';
import Joi from 'joi';
import { createValidator, isRtl, registerLocale, supportedLocales } from './index.js';
import { locales } from './locales.js';

const schema = Joi.object({
  email: Joi.string().email().required(),
  name: Joi.string().min(3).required(),
  age: Joi.number().integer().min(18),
  plan: Joi.string().valid('free', 'pro'),
  address: Joi.object({ zip: Joi.string().required() }),
});
const bad = { email: 'nope', name: 'Al', age: 12, plan: 'gold', address: {} };

test('valid data passes and returns the value', () => {
  const r = createValidator(schema)({ email: 'a@b.co', name: 'Alice', address: { zip: '1' } });
  assert.equal(r.valid, true);
  assert.deepEqual(r.errors, {});
});

test('English messages for several rule types, one message per field', () => {
  const r = createValidator(schema)(bad);
  assert.equal(r.valid, false);
  assert.equal(r.errors.email, 'email must be a valid email address');
  assert.equal(r.errors.name, 'name must be at least 3 characters');
  assert.equal(r.errors.age, 'age must be at least 18');
  assert.equal(r.errors.plan, 'plan must be one of: free, pro');
});

test('nested fields use dotted paths', () => {
  assert.equal(createValidator(schema)(bad).errors['address.zip'], 'address.zip is required');
});

test('French, German and Spanish messages', () => {
  const v = createValidator(schema);
  assert.equal(v(bad, 'fr').errors.email, 'email doit être une adresse e-mail valide');
  assert.equal(v(bad, 'de').errors.name, 'name muss mindestens 3 Zeichen lang sein');
  assert.equal(v(bad, 'es').errors.age, 'age debe ser como mínimo 18');
});

test('Arabic, Hindi and Urdu return non-English text and flag RTL', () => {
  const v = createValidator(schema);
  for (const l of ['ar', 'hi', 'ur']) assert.notEqual(v(bad, l).errors.email, v(bad, 'en').errors.email);
  assert.equal(isRtl('ar'), true);
  assert.equal(isRtl('ur-PK'), true);
  assert.equal(isRtl('fr'), false);
});

test('regional codes fall back to the base language', () => {
  const v = createValidator(schema);
  assert.equal(v(bad, 'pt-BR').errors.email, v(bad, 'pt').errors.email);
  assert.equal(v(bad, 'fr_CA').locale, 'fr');
});

test('unknown locale falls back to fallbackLocale, then English', () => {
  assert.equal(createValidator(schema, { fallbackLocale: 'de' })(bad, 'xx').locale, 'de');
  assert.equal(createValidator(schema)(bad, 'xx').locale, 'en');
});

test('translated field labels per locale', () => {
  const v = createValidator(schema, { labels: { fr: { email: 'Adresse e-mail' }, en: { email: 'Email' } } });
  assert.equal(v(bad, 'fr').errors.email, 'Adresse e-mail doit être une adresse e-mail valide');
  assert.equal(v(bad, 'en').errors.email, 'Email must be a valid email address');
});

test('registerLocale adds a new language and overrides single messages', () => {
  registerLocale('it', { 'any.required': '{label} è obbligatorio' });
  assert.ok(supportedLocales().includes('it'));
  const r = createValidator(Joi.object({ nome: Joi.string().required() }))({}, 'it');
  assert.equal(r.errors.nome, 'nome è obbligatorio');
});

test('untranslated Joi error types keep Joi message instead of failing', () => {
  const r = createValidator(Joi.object({ id: Joi.string().guid() }))({ id: 'x' }, 'fr');
  assert.equal(r.valid, false);
  assert.match(r.errors.id, /guid/i);
});

test('every locale defines the same message keys as English', () => {
  const keys = Object.keys(locales.en).sort();
  for (const [code, msgs] of Object.entries(locales)) assert.deepEqual(Object.keys(msgs).sort(), keys, code);
});

test('every translation keeps its placeholders', () => {
  for (const [code, msgs] of Object.entries(locales)) {
    for (const [type, text] of Object.entries(msgs)) {
      const want = (locales.en[type].match(/\{\w+\}/g) ?? []).sort();
      assert.deepEqual((text.match(/\{\w+\}/g) ?? []).sort(), want, `${code} ${type}`);
    }
  }
});

test('rejects invalid arguments', () => {
  assert.throws(() => createValidator({}), TypeError);
  assert.throws(() => registerLocale('', {}), TypeError);
  assert.throws(() => registerLocale('it', null), TypeError);
});
