# joi-form-i18n

Joi validates your data, but its error messages are English-only and shaped like a developer log. `joi-form-i18n` turns a Joi result into one ready-to-show message per form field, in the visitor's language.

## What it does

Give it your Joi schema and a locale. It returns `{ valid, errors }` where `errors` maps each form field to a translated sentence, for example `{ email: "email doit être une adresse e-mail valide" }`. Built-in messages: English, Spanish, French, German, Portuguese, Arabic, Hindi and Urdu. You can add more languages and translate field names. No runtime dependency: it works with the Joi you already use (v17+).

## Install

```sh
npm install joi-form-i18n joi
```

## Usage

```js
import Joi from 'joi';
import { createValidator } from 'joi-form-i18n';

const validate = createValidator(Joi.object({
  email: Joi.string().email().required(),
  age: Joi.number().min(18),
}));

validate({ email: 'nope', age: 12 }, 'es').errors;
// { email: 'email debe ser un correo electrónico válido', age: 'age debe ser como mínimo 18' }
```

## API

- `createValidator(schema, options?)` returns `validate(data, locale?)`. Throws `TypeError` if `schema` is not a Joi schema.
  - `options.locale` default locale (`'en'`), `options.fallbackLocale` (`'en'`), `options.labels` display names per locale (`{ fr: { email: 'Adresse e-mail' } }`), `options.joiOptions` passed to `schema.validate` (`abortEarly` is false by default).
  - Result: `{ valid, value, errors, details, locale }`. `errors` holds the first message per field; nested fields use dotted paths (`address.zip`); form-level errors use `_form`. `details` lists every error as `{ field, type, message }`.
- `registerLocale(code, messages)` add a language or override messages. Keys are Joi error types (`any.required`, `string.min`, ...), values are templates with `{label}`, `{limit}`, `{valids}`.
- `supportedLocales()` lists available codes.
- `isRtl(locale)` is `true` for Arabic, Urdu, Hebrew and Persian so you can set `dir="rtl"`.
- Regional codes fall back to the base language (`pt-BR` -> `pt`), then to `fallbackLocale`, then English.

## Where to use it

- Sign-up, checkout and profile forms that serve users in several countries.
- API responses that must return messages in the language from the `Accept-Language` header.
- Admin tools and back offices with non-English staff.
- Mobile app back ends where the client only displays the message it receives.

## Integrate

```js
import express from 'express';
import Joi from 'joi';
import { createValidator } from 'joi-form-i18n';

const validateSignup = createValidator(
  Joi.object({ email: Joi.string().email().required(), password: Joi.string().min(8).required() }),
  { labels: { fr: { email: 'Adresse e-mail', password: 'Mot de passe' } } },
);

const app = express();
app.use(express.json());
app.post('/signup', (req, res) => {
  const locale = req.acceptsLanguages('en', 'fr', 'es', 'ar') || 'en';
  const result = validateSignup(req.body, locale);
  if (!result.valid) return res.status(422).json({ errors: result.errors, dir: locale === 'ar' ? 'rtl' : 'ltr' });
  res.json({ ok: true });
});
```

## Limitations

- Covers 19 common Joi error types. Other types (`string.guid`, `date.min`, ...) keep Joi's English message until you add them with `registerLocale`.
- Translations were written for common form wording; have a native speaker review them before using them with customers.
- It formats errors; it does not detect the user's language or render forms.
