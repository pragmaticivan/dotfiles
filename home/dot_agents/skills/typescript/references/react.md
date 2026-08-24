# React and TypeScript

Companion to `SKILL.md`. Check the project's `@types/react` major version before applying anything here —
React 19 changed several typings in ways that break React 18 patterns and vice versa.

- [Component props](#component-props)
- [Generic and polymorphic components](#generic-and-polymorphic-components)
- [Hooks](#hooks)
- [Events and forms](#events-and-forms)
- [Context](#context)
- [Reducers and state machines](#reducers-and-state-machines)
- [Async data and Server Components](#async-data-and-server-components)
- [React 19 typing changes](#react-19-typing-changes)

## Component props

Declare the props type and annotate the parameter. Skip `React.FC`.

```tsx
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: "primary" | "secondary";
}

export function Button({ label, onClick, variant = "primary" }: ButtonProps) {
  return <button className={variant} onClick={onClick}>{label}</button>;
}
```

`React.FC` adds nothing and costs something: it fixes the return type, blocks a generic component, and in
React 18 typings silently added `children` you had not declared. The plain function declaration is what
the ecosystem converged on.

Declare `children` when you accept it:

```tsx
interface CardProps {
  title: string;
  children: React.ReactNode;
}
```

`React.ReactNode` for anything renderable (the usual choice). `React.ReactElement` only when you need a
single element to clone or inspect.

Extend the underlying element's props instead of re-declaring them, so a wrapper accepts everything the
native element does:

```tsx
interface InputProps extends React.ComponentProps<"input"> {
  label: string;
  error?: string;
}

export function Input({ label, error, ...rest }: InputProps) {
  return (
    <label>
      {label}
      <input aria-invalid={error !== undefined} {...rest} />
      {error !== undefined && <span role="alert">{error}</span>}
    </label>
  );
}
```

`React.ComponentProps<"input">` includes `ref` in React 19 typings. `ComponentPropsWithoutRef<"input">` is
the React 18 spelling when you are not forwarding.

Model variants as a discriminated union so contradictory props cannot be passed:

```tsx
type AlertProps =
  | { kind: "info"; message: string }
  | { kind: "error"; message: string; onRetry: () => void };
```

That is stronger than `{ kind: string; onRetry?: () => void }`, which lets a caller build an error alert
with no retry handler and no compiler complaint.

## Generic and polymorphic components

A generic component keeps the relationship between the data and the callbacks:

```tsx
interface ListProps<T> {
  items: readonly T[];
  renderItem: (item: T) => React.ReactNode;
  keyOf: (item: T) => string;
}

export function List<T,>({ items, renderItem, keyOf }: ListProps<T>) {
  return <ul>{items.map((i) => <li key={keyOf(i)}>{renderItem(i)}</li>)}</ul>;
}
```

The trailing comma in `<T,>` is needed in `.tsx` files, where `<T>` parses as JSX.

Polymorphic components (`as` prop) are genuinely hard to type well and produce error messages users
cannot read. Before reaching for one, check whether two named components would do. If you need it:

```tsx
type PolymorphicProps<E extends React.ElementType> = {
  as?: E;
} & Omit<React.ComponentProps<E>, "as">;

export function Box<E extends React.ElementType = "div">({ as, ...rest }: PolymorphicProps<E>) {
  const Component = as ?? "div";
  return <Component {...rest} />;
}
```

## Hooks

```tsx
const [count, setCount] = useState(0);                    // inferred number — leave it
const [user, setUser] = useState<User | null>(null);      // annotate: inference gives null
const [items, setItems] = useState<Item[]>([]);           // annotate: inference gives never[]
```

Annotate `useState` when the initial value is narrower than the states the value will hold. That is the
whole rule.

Refs, and the React 19 change that trips people up:

```tsx
const inputRef = useRef<HTMLInputElement>(null);   // DOM ref: RefObject, .current may be null
const timer = useRef<number | undefined>(undefined); // mutable value: pass the initial value explicitly
```

`@types/react` 19 requires an argument to `useRef`. `useRef<number>()` with no argument is now an error,
which is a good change — it forces you to say whether the initial state is `undefined`.

Custom hooks: annotate the return type, or return a tuple `as const`.

```tsx
function useToggle(initial = false) {
  const [on, setOn] = useState(initial);
  const toggle = useCallback(() => setOn((v) => !v), []);
  return [on, toggle] as const;   // [boolean, () => void], not (boolean | (() => void))[]
}
```

Without `as const` the tuple widens to an array union and destructuring loses both types.

## Events and forms

```tsx
function Form() {
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const parsed = LoginSchema.safeParse(Object.fromEntries(data));
    if (!parsed.success) { ...; return; }
    void submit(parsed.data);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) { ... }
}
```

`FormData` entries are `string | File`, so form input is external input. Parse it — this is the same
boundary rule as an HTTP body, and it is the one people skip because the data "came from our own form".

Prefer `e.currentTarget` over `e.target`. `currentTarget` is typed as the element the handler is attached
to; `target` is whatever was clicked, and its type is a guess.

Common handler types: `React.MouseEvent<HTMLButtonElement>`, `React.KeyboardEvent<HTMLInputElement>`,
`React.ChangeEvent<HTMLSelectElement>`, `React.FocusEvent<HTMLInputElement>`.

Never pass an `async` function where React expects `() => void` without a `void` marker — an async
`onClick` that rejects fails silently:

```tsx
<button onClick={() => void save()}>Save</button>
```

## Context

Type the context by its value, and make the missing-provider case impossible to ignore:

```tsx
interface AuthContextValue {
  user: User | null;
  signOut: () => void;
}

const AuthContext = React.createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const ctx = React.useContext(AuthContext);
  if (ctx === undefined) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
```

The `undefined` default plus the throwing hook is the pattern worth copying. A fake default object
(`{ user: null, signOut: () => {} }`) type-checks everywhere and turns a missing provider into a silent
no-op that surfaces as a bug report weeks later.

Export the hook, not the context, so consumers cannot bypass the check.

## Reducers and state machines

`useReducer` with two discriminated unions is where TypeScript pays off most in React:

```tsx
type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ready"; items: Item[] }
  | { kind: "error"; message: string };

type Action =
  | { type: "fetch" }
  | { type: "resolved"; items: Item[] }
  | { type: "rejected"; message: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "fetch":    return { kind: "loading" };
    case "resolved": return { kind: "ready", items: action.items };
    case "rejected": return { kind: "error", message: action.message };
    default: {
      const _exhaustive: never = action;
      return _exhaustive;
    }
  }
}
```

The payoff in the component: `state.items` exists only in the `ready` branch, so the render cannot read a
field that is not there. That deletes the whole class of `loading && data && !error` bugs.

## Async data and Server Components

An `async` component is a Server Component. Its return type is `Promise<React.ReactNode>`, and calling a
hook inside it is an error the types will not always catch — the boundary is a framework rule, not a type
rule.

```tsx
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getUser(toUserId(id));
  return <Profile user={user} />;
}
```

In recent Next.js, `params` and `searchParams` are promises. A route param is a string from a URL — an
untrusted value. Parse or brand it before it reaches a query.

The props of a Client Component receiving data from a Server Component must be serializable. A type can
describe a `Date` or a function crossing that boundary; the runtime cannot carry it. Types do not enforce
serializability, so check it deliberately.

## React 19 typing changes

Worth knowing because they turn working React 18 code into compile errors and vice versa:

| Change | Effect |
|---|---|
| `ref` is a normal prop on function components | `forwardRef` is no longer needed; a `ComponentProps<"input">` spread now includes `ref` |
| `useRef` requires an argument | `useRef<T>()` is an error — pass `null` or `undefined` explicitly |
| `JSX` global namespace removed | Use `React.JSX.Element` instead of the bare global `JSX.Element` |
| `React.FC` no longer implies `children` | Declare `children` in the props type |
| `useActionState` replaces `useFormState` | Returns `[state, action, isPending]` |
| `use(promise)` and `use(context)` | Reads a promise or context; only legal inside a component or hook |

When a third-party library's types lag a React major, `@ts-expect-error` with the reason and the removal
condition is the honest suppression. `any` on the component is not.
