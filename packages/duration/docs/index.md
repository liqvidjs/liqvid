# index

## class Duration

Interval between two points in time, agnostic of units.

### constructor

```typescript
new Duration()
```


### Duration.betweenDates()

```typescript
betweenDates(start: Date, end: Date): Duration
```


**Parameters:**

- `start`: Date
- `end`: Date

### Duration.from()

```typescript
from(val: DurationLike | Date): Duration
```

Coerce a DurationLike into a Duration


**Parameters:**

- `val`: DurationLike | Date

### Duration.fromJSON()

```typescript
fromJSON(val: SerializedDuration): Duration
```

Hydrate a Duration value


**Parameters:**

- `val`: SerializedDuration

### Duration.withSetter()

```typescript
withSetter(options?: DurationOptions): [Duration, DurationSetter]
```

Create a new `Duration` object and receive a callback
to imperatively set its value. You can use this instead of
a `MutableDuration` when you don't want the value to
be mutable to consumers.


**Parameters:**

- `options`: DurationOptions (optional)

### between()

```typescript
between(lower: DurationLike, upper: DurationLike): boolean
```

whether `lower <= this < upper`


**Parameters:**

- `lower`: DurationLike
- `upper`: DurationLike

### dividedBy()

```typescript
dividedBy(other: DurationLike): number
```


**Parameters:**

- `other`: DurationLike

### equals()

```typescript
equals(other: DurationLike): boolean
```

compare two Durations


**Parameters:**

- `other`: DurationLike - duration to compare this one to

### greaterThan()

```typescript
greaterThan(other: DurationLike): boolean
```


**Parameters:**

- `other`: DurationLike

### greaterThanOrEqual()

```typescript
greaterThanOrEqual(other: DurationLike): boolean
```


**Parameters:**

- `other`: DurationLike

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
lessThan(other: DurationLike): boolean
```


**Parameters:**

- `other`: DurationLike

### lessThanOrEqual()

```typescript
lessThanOrEqual(other: DurationLike): boolean
```


**Parameters:**

- `other`: DurationLike

### minus()

```typescript
minus(other: DurationLike): Duration
```


**Parameters:**

- `other`: DurationLike

### plus()

```typescript
plus(other: Date): Date
```


**Parameters:**

- `other`: Date
```typescript
plus(other: DurationLike): Duration
```


**Parameters:**

- `other`: DurationLike

### times()

```typescript
times(factor: number): Duration
```


**Parameters:**

- `factor`: number

### toJSON()

```typescript
toJSON(): SerializedDuration
```



---

## class MutableDuration

Duration with options to imperatively set the inner value.
This is mostly for frequently-changing values where we want
to avoid the cost of allocating lots of new objects; in most situations,
it should be fine to just use a new Duration.

**Extends:** Duration

**Implements:** DurationSetter

### constructor

```typescript
new MutableDuration()
```


### add()

```typescript
add(other: DurationLike): void
```


**Parameters:**

- `other`: DurationLike

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
subtract(other: DurationLike): void
```


**Parameters:**

- `other`: DurationLike


---

## interface DurationSetter

### add()

```typescript
add(other: DurationOptions): void
```


**Parameters:**

- `other`: DurationOptions

### set()

```typescript
set(options: DurationOptions): void
```


**Parameters:**

- `options`: DurationOptions

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
subtract(other: DurationOptions): void
```


**Parameters:**

- `other`: DurationOptions


---

## type DurationLike

Convenience type representing either a `Duration`
or creation options for one

```typescript
type DurationLike = Duration | DurationOptions
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
type SerializedDuration = DurationOptions & SerializedValue<typeof serializationKey>
```


