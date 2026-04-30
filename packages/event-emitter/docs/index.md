# index

## class EventEmitter

**Implements:** [TypedEventTarget](#interface-typedeventtarget)&lt;Events&gt;

### constructor

```typescript
new EventEmitter()
```


### addEventListener()

```typescript
addEventListener(eventName: K, callback: object): void
```


**Parameters:**

- `eventName`: K
- `callback`: object

### getEventListeners()

```typescript
getEventListeners(eventName: K): Set<object>
```


**Parameters:**

- `eventName`: K

### removeEventListener()

```typescript
removeEventListener(eventName: K, callback: object): void
```


**Parameters:**

- `eventName`: K
- `callback`: object


---

## interface TypedEventTarget

### addEventListener()

```typescript
addEventListener(eventName: K, callback: object): void
```


**Parameters:**

- `eventName`: K
- `callback`: object

### removeEventListener()

```typescript
removeEventListener(eventName: K, callback: object): void
```


**Parameters:**

- `eventName`: K
- `callback`: object

### __events

```typescript
__events: Events
```


---

## type EventsOn

Get the event map of a TypedEventTarget.

```typescript
type EventsOn = unknown
```


