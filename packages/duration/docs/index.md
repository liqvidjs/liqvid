# index

## class Duration

Interval between two points in time, agnostic of units.

### constructor

```typescript
new Duration()
```


### Duration.betweenDates()

```typescript
betweenDates(start: Date, end: Date): [Duration](#class-duration)
```


**Parameters:**

- `start`: Date
- `end`: Date

### Duration.from()

```typescript
from(val: [DurationLike](#type-durationlike) | Date): [Duration](#class-duration)
```

Coerce a DurationLike into a Duration


**Parameters:**

- `val`: [DurationLike](#type-durationlike) | Date

### Duration.fromJSON()

```typescript
fromJSON(val: [SerializedDuration](#type-serializedduration)): [Duration](#class-duration)
```

Hydrate a Duration value


**Parameters:**

- `val`: [SerializedDuration](#type-serializedduration)

### Duration.withSetter()

```typescript
withSetter(options?: [DurationOptions](#type-durationoptions)): [[Duration](#class-duration), [DurationSetter](#interface-durationsetter)]
```

Create a new `Duration` object and receive a callback
to imperatively set its value. You can use this instead of
a `MutableDuration` when you don't want the value to
be mutable to consumers.


**Parameters:**

- `options`: [DurationOptions](#type-durationoptions) (optional)

### between()

```typescript
between(lower: [DurationLike](#type-durationlike), upper: [DurationLike](#type-durationlike)): boolean
```

whether `lower <= this < upper`


**Parameters:**

- `lower`: [DurationLike](#type-durationlike)
- `upper`: [DurationLike](#type-durationlike)

### dividedBy()

```typescript
dividedBy(other: [DurationLike](#type-durationlike)): number
```


**Parameters:**

- `other`: [DurationLike](#type-durationlike)

### equals()

```typescript
equals(other: [DurationLike](#type-durationlike)): boolean
```

compare two Durations


**Parameters:**

- `other`: [DurationLike](#type-durationlike) - duration to compare this one to

### greaterThan()

```typescript
greaterThan(other: [DurationLike](#type-durationlike)): boolean
```


**Parameters:**

- `other`: [DurationLike](#type-durationlike)

### greaterThanOrEqual()

```typescript
greaterThanOrEqual(other: [DurationLike](#type-durationlike)): boolean
```


**Parameters:**

- `other`: [DurationLike](#type-durationlike)

### inDays()

```typescript
inDays(): number
```


### inHours()

```typescript
inHours(): number
```


### inMilliseconds()

```typescript
inMilliseconds(): number
```


### inMinutes()

```typescript
inMinutes(): number
```


### inSeconds()

```typescript
inSeconds(): number
```


### inWeeks()

```typescript
inWeeks(): number
```


### lessThan()

```typescript
lessThan(other: [DurationLike](#type-durationlike)): boolean
```


**Parameters:**

- `other`: [DurationLike](#type-durationlike)

### lessThanOrEqual()

```typescript
lessThanOrEqual(other: [DurationLike](#type-durationlike)): boolean
```


**Parameters:**

- `other`: [DurationLike](#type-durationlike)

### minus()

```typescript
minus(other: [DurationLike](#type-durationlike)): [Duration](#class-duration)
```


**Parameters:**

- `other`: [DurationLike](#type-durationlike)

### plus()

```typescript
plus(other: Date): Date
```


**Parameters:**

- `other`: Date
```typescript
plus(other: [DurationLike](#type-durationlike)): [Duration](#class-duration)
```


**Parameters:**

- `other`: [DurationLike](#type-durationlike)

### times()

```typescript
times(factor: number): [Duration](#class-duration)
```


**Parameters:**

- `factor`: number

### toJSON()

```typescript
toJSON(): [SerializedDuration](#type-serializedduration)
```



---

## class MutableDuration

Duration with options to imperatively set the inner value.
This is mostly for frequently-changing values where we want
to avoid the cost of allocating lots of new objects; in most situations,
it should be fine to just use a new Duration.

**Extends:** [Duration](#class-duration)

**Implements:** [DurationSetter](#interface-durationsetter)

### constructor

```typescript
new MutableDuration()
```


### add()

```typescript
add(other: [DurationLike](#type-durationlike)): void
```


**Parameters:**

- `other`: [DurationLike](#type-durationlike)

### set()

```typescript
set(): void
```


### setMilliseconds()

```typescript
setMilliseconds(ms: number): void
```


**Parameters:**

- `ms`: number

### setSeconds()

```typescript
setSeconds(s: number): void
```


**Parameters:**

- `s`: number

### setToZero()

```typescript
setToZero(): void
```


### subtract()

```typescript
subtract(other: [DurationLike](#type-durationlike)): void
```


**Parameters:**

- `other`: [DurationLike](#type-durationlike)


---

## interface DurationSetter

### add()

```typescript
add(other: [DurationOptions](#type-durationoptions)): void
```


**Parameters:**

- `other`: [DurationOptions](#type-durationoptions)

### set()

```typescript
set(options: [DurationOptions](#type-durationoptions)): void
```


**Parameters:**

- `options`: [DurationOptions](#type-durationoptions)

### setMilliseconds()

```typescript
setMilliseconds(ms: number): void
```


**Parameters:**

- `ms`: number

### setSeconds()

```typescript
setSeconds(s: number): void
```


**Parameters:**

- `s`: number

### setToZero()

```typescript
setToZero(): void
```


### subtract()

```typescript
subtract(other: [DurationOptions](#type-durationoptions)): void
```


**Parameters:**

- `other`: [DurationOptions](#type-durationoptions)


---

## type DurationLike

Convenience type representing either a `Duration`
or creation options for one

```typescript
type DurationLike = [Duration](#class-duration) | [DurationOptions](#type-durationoptions)
```


---

## type DurationOptions

Object for creating or specifying Durations.
These are additive, e.g. passing `{seconds: 20, minutes: 5}` is
equivalent to passing `{seconds: 320}`.

```typescript
type DurationOptions = {
  d?: number;
  days?: number;
  h?: number;
  hours?: number;
  m?: number;
  milliseconds?: number;
  minutes?: number;
  ms?: number;
  s?: number;
  seconds?: number;
  w?: number;
  weeks?: number;
}
```

### d?

- **Type:** `number`
- shortcut for days

### days?

- **Type:** `number`

### h?

- **Type:** `number`
- shortcut for hours

### hours?

- **Type:** `number`

### m?

- **Type:** `number`
- shortcut for minutes

### milliseconds?

- **Type:** `number`

### minutes?

- **Type:** `number`

### ms?

- **Type:** `number`
- shortcut for milliseconds

### s?

- **Type:** `number`
- shortcut for seconds

### seconds?

- **Type:** `number`

### w?

- **Type:** `number`
- shortcut for weeks

### weeks?

- **Type:** `number`


---

## type SerializedDuration

```typescript
type SerializedDuration = [DurationOptions](#type-durationoptions) & SerializedValue<typeof serializationKey>
```


