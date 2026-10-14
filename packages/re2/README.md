# Regular Expression Designer | RE2

A small TypeScript library for composing RE2 regular expressions in a readable, reusable way.

## API

- [default](#default)
- [set / var](#set--var)
- [tpl](#tpl)
- [raw](#raw)
- [start / end / whole](#start--end--whole)
- [group](#group)
- [named](#named)
- [opt](#opt)
- [qty](#qty)
- [or](#or)

The RE2 package exposes a default factory and a `RE2RegexDesigner` class. It extends the abstract `RegexDesigner` contract from `@regex-designer/core`. Templates are compiled to RE2 expressions.

```ts
import createDesigner from "@regex-designer/re2";

const r$ = createDesigner();

r$.set("number", r$.qty([1, Infinity], "[0-9]"));
r$.set("identifier", r$.qty([1, Infinity], "[a-z0-9-]"));

// (?P<version>(?:[0-9]){1,}\.(?:[0-9]){1,}\.(?:[0-9]){1,}(?:-(?P<prerelease>(?:[a-z0-9-]){1,}))?)
const template = r$.named(
  "version",
  r$.var("number"), "\\.", r$.var("number"), "\\.", r$.var("number"),
  r$.opt("-", r$.named("prerelease", r$.var("identifier"))),
);
const regex = template("i"); // Compile the template to an RE2 expression

regex.test("12.3.4-beta-1"); // true
regex.exec("12.3.4-beta-1")?.groups; // { version: "12.3.4-beta-1", prerelease: "beta-1" }
```

RE2 does not support backreferences, lookahead, or lookbehind. `RE2RegexDesigner` does not implement `ref()`, `ahead()`, `behind()`, or their variants.

### default

```ts
default function(): RE2RegexDesigner
```

Create a new RE2 regex designer with its own variable scope.

```ts
import createDesigner from "@regex-designer/re2";

const r$: RE2RegexDesigner = createDesigner();
```

### set / var

```ts
set(name: string, ...patterns: RegexValue[]): this
var(name: string): RegexTemplate
```

Define a reusable lazy variable on a designer, then reference it when composing
a pattern. The variable resolves when the template is rendered. Rendering an unset variable or circular dependencies between variables throws an error.

```ts
r$.set("word", r$.or("cat", "dog"));
r$.var("word"); // cat|dog
```

### tpl

```ts
tpl(...patterns: RegexValue[]): RegexTemplate
```

Concatenate patterns without adding groups or escaping.

```ts
r$.tpl("A", "B"); // AB
```

### raw

```ts
raw(...patterns: string[]): RegexTemplate
```

Escape literal text for use in a regex pattern.

```ts
r$.raw("a.b", "*"); // \x61\.b\*
r$.raw("https://example.com"); // \x68ttps\x3a\/\/example\.com
```

### start / end / whole

```ts
start(...patterns: RegexValue[]): RegexTemplate
end(...patterns: RegexValue[]): RegexTemplate
whole(...patterns: RegexValue[]): RegexTemplate
```

Choose whether the concatenated patterns must match at the [start, end, or across the whole input](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Input_boundary_assertion).

```ts
r$.start("foo"); // ^(?:foo)
r$.end("bar"); // (?:bar)$
r$.whole("baz"); // ^(?:baz)$
```

### group

```ts
group(options: boolean, ...patterns: RegexValue[]): RegexTemplate
group(options: { name: string }, ...patterns: RegexValue[]): RegexTemplate
group(options: { capture?: boolean }, ...patterns: RegexValue[]): RegexTemplate
```

Group patterns using [capturing](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Capturing_group)
or [non-capturing groups](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Non-capturing_group),
optionally assigning a [capture name](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Named_capturing_group).

```ts
r$.group(true, "A"); // (A)
r$.group(false, "A", "B"); // (?:AB)
r$.group({ name: "part" }, "A", "B"); // (?P<part>AB)
r$.group({ capture: true }, "A"); // (A)
r$.group({ capture: false }, "A", "B"); // (?:AB)
```

### named

```ts
named(name: string, ...patterns: RegexValue[]): RegexTemplate
```

Create a [named capturing group](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Named_capturing_group)
around the concatenated patterns.

```ts
r$.named("value", "A", "B"); // (?P<value>AB)
r$.named("word", r$.or("cat", "dog")); // (?P<word>cat|dog)
```

### opt

```ts
opt(...patterns: RegexValue[]): RegexTemplate
```

Make the concatenated patterns [optional](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Quantifier) using a non-capturing group.

```ts
r$.opt("C"); // (?:C)?
r$.opt(r$.named("value", "A", "B")); // (?:(?P<value>AB))?
```

### qty

```ts
qty(quantity: number, ...patterns: RegexValue[]): RegexTemplate
qty(quantity: [min: number, max?: number], ...patterns: RegexValue[]): RegexTemplate
qty(quantity: { exact: number; greedy?: boolean }, ...patterns: RegexValue[]): RegexTemplate
qty(quantity: { min: number; max?: number; greedy?: boolean }, ...patterns: RegexValue[]): RegexTemplate
```

[Repeat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Quantifier) the concatenated patterns according to the supplied bounds.

```ts
r$.qty(3, "A", "B"); // (?:AB){3}
r$.qty([3, 3], "A", "B"); // (?:AB){3}
r$.qty([1, 3], "A", "B"); // (?:AB){1,3}
r$.qty([1, Infinity], "A", "B"); // (?:AB){1,}
r$.qty({ exact: 3 }, "A", "B"); // (?:AB){3}
r$.qty({ exact: 3, greedy: false }, "A", "B"); // (?:AB){3}?
r$.qty({ min: 2 }, "A", "B"); // (?:AB){2,}
r$.qty({ min: 2, max: 5 }, "A", "B"); // (?:AB){2,5}
r$.qty({ min: 2, max: 5, greedy: false }, "A", "B"); // (?:AB){2,5}?
```

### or

```ts
or(...patterns: RegexValue[]): RegexTemplate
```

Join patterns with [disjunction](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Disjunction)
without adding groups.

```ts
r$.or("cat", "dog"); // cat|dog
r$.or("foo", "bar", r$.raw("baz")); // foo|bar|\x62az
```
