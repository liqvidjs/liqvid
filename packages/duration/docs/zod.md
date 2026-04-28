# zod

## Variable: DurationOptions

These are additive, e.g. passing `{seconds: 20, minutes: 5}` is
equivalent to passing `{seconds: 320}`.

```typescript
const DurationOptions: ZodObject<{ d: ZodOptional<ZodNumber>; days: ZodOptional<ZodNumber>; h: ZodOptional<ZodNumber>; hours: ZodOptional<ZodNumber>; m: ZodOptional<ZodNumber>; milliseconds: ZodOptional<ZodNumber>; minutes: ZodOptional<ZodNumber>; ms: ZodOptional<ZodNumber>; s: ZodOptional<ZodNumber>; seconds: ZodOptional<ZodNumber>; w: ZodOptional<ZodNumber>; weeks: ZodOptional<ZodNumber> }, $strip>
```


---

## type DurationOptions

These are additive, e.g. passing `{seconds: 20, minutes: 5}` is
equivalent to passing `{seconds: 320}`.

```typescript
type DurationOptions = z.infer<typeof DurationOptions>
```


