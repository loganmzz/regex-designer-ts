# Regular Expression Designer | Core

Common API, types and abstractions to implement readable and composable regular
expressions.

Official implementations:

* [native JavaScript](https://www.npmjs.com/package/@regex-designer/js)

## API

- [set / var](#set--var)
- [tpl](#tpl)
- [raw](#raw)
- [start / end / whole](#start--end--whole)
- [group](#group)
- [named](#named)
- [ref](#ref)
- [opt](#opt)
- [qty](#qty)
- [or](#or)
- [ahead / ahead_pos / ahead_neg](#ahead--ahead_pos--ahead_neg)
- [behind / behind_pos / behind_neg](#behind--behind_pos--behind_neg)

The `RegexDesigner` creates lazy and reusable `RegexTemplate` values. A template
renders pattern text when stringified and compiles to a regular expression implementation when
called.

As opposed to classic regular expressions, designer relies on a structural
(block) approach instead of a stream one. So it might add several
(non-capturing) groups, to ensure operator precedence (e.g. [quantifiers](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Quantifier)).

```ts
function createVersionRegex<TRegex>(r$: RegexDesigner<TRegex>): RegexTemplate<TRegex> {
  r$.set("number", r$.qty([1, Infinity], "[0-9]"));
  r$.set("identifier", r$.qty([1, Infinity], "[a-z0-9-]"));

  const template = r$.named(
    "version",
    r$.var("number"), "\\.", r$.var("number"), "\\.", r$.var("number"),
    r$.opt("-", r$.named("prerelease", r$.var("identifier"))),
  );
  return template;
}

const template = createVersionRegex(r$);
template(""); // Compile to an implementation-specific value
```

### set / var

```ts
set(name: string, ...patterns: RegexValue<TRegex>[]): this
var(name: string): RegexTemplate<TRegex>
```

Define a reusable lazy variable on a designer, then reference it when composing
a pattern. The variable resolves when the template is rendered. Rendering an unset variable or circular dependencies between variables throws an error.

```ts
r$.set("word", r$.or("cat", "dog"));
r$.var("word");
```

### tpl

```ts
tpl(...patterns: RegexValue<TRegex>[]): RegexTemplate<TRegex>
```

Concatenate patterns without adding groups or escaping.

```ts
r$.tpl("A", "B");
```

### raw

```ts
raw(...patterns: string[]): RegexTemplate<TRegex>
```

Escape literal text for use in a regex pattern.

```ts
r$.raw("a.b", "*");
r$.raw("https://example.com");
```

### start / end / whole

```ts
start(...patterns: RegexValue<TRegex>[]): RegexTemplate<TRegex>
end(...patterns: RegexValue<TRegex>[]): RegexTemplate<TRegex>
whole(...patterns: RegexValue<TRegex>[]): RegexTemplate<TRegex>
```

Choose whether the concatenated patterns must match at the [start, end, or across the whole input](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Input_boundary_assertion).

```ts
r$.start("foo");
r$.end("bar");
r$.whole("baz");
```

### group

```ts
group(options: boolean, ...patterns: RegexValue<TRegex>[]): RegexTemplate<TRegex>
group(options: { name: string }, ...patterns: RegexValue<TRegex>[]): RegexTemplate<TRegex>
group(options: { capture?: boolean }, ...patterns: RegexValue<TRegex>[]): RegexTemplate<TRegex>
```

Group patterns using [capturing](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Capturing_group)
or [non-capturing groups](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Non-capturing_group),
optionally assigning a [capture name](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Named_capturing_group).

```ts
r$.group(true, "A");
r$.group(false, "A", "B");
r$.group({ name: "part" }, "A", "B");
r$.group({ capture: true }, "A");
r$.group({ capture: false }, "A", "B");
```

### named

```ts
named(name: string, ...patterns: RegexValue<TRegex>[]): RegexTemplate<TRegex>
```

Create a [named capturing group](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Named_capturing_group)
around the concatenated patterns.

```ts
r$.named("value", "A", "B");
r$.named("word", r$.or("cat", "dog"));
```

### ref

```ts
ref(reference: number | string): RegexTemplate<TRegex>
```

Create a [numeric](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Backreference) or [named](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Named_backreference) backreference.

```ts
r$.tpl(
  r$.group(true, "B"),
  r$.ref(1),
);

r$.tpl(
  r$.named("name", "B"),
  r$.ref("name"),
);
```

### opt

```ts
opt(...patterns: RegexValue<TRegex>[]): RegexTemplate<TRegex>
```

Make the concatenated patterns [optional](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Quantifier) using a non-capturing group.

```ts
r$.opt("C");
r$.opt(r$.named("value", "A", "B"));
```

### qty

```ts
qty(quantity: number, ...patterns: RegexValue<TRegex>[]): RegexTemplate<TRegex>
qty(quantity: [min: number, max?: number], ...patterns: RegexValue<TRegex>[]): RegexTemplate<TRegex>
qty(quantity: { exact: number; greedy?: boolean }, ...patterns: RegexValue<TRegex>[]): RegexTemplate<TRegex>
qty(quantity: { min: number; max?: number; greedy?: boolean }, ...patterns: RegexValue<TRegex>[]): RegexTemplate<TRegex>
```

[Repeat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Quantifier) the concatenated patterns according to the supplied bounds.

```ts
r$.qty(3, "A", "B");
r$.qty([3, 3], "A", "B");
r$.qty([1, 3], "A", "B");
r$.qty([1, Infinity], "A", "B");
r$.qty({ exact: 3 }, "A", "B");
r$.qty({ exact: 3, greedy: false }, "A", "B");
r$.qty({ min: 2 }, "A", "B");
r$.qty({ min: 2, max: 5 }, "A", "B");
r$.qty({ min: 2, max: 5, greedy: false }, "A", "B");
```

### or

```ts
or(...patterns: RegexValue<TRegex>[]): RegexTemplate<TRegex>
```

Join patterns with [disjunction](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Disjunction)
without adding groups.

```ts
r$.or("cat", "dog");
r$.or("bar", r$.raw("baz"));
```

### ahead / ahead_pos / ahead_neg

```ts
ahead(positive: boolean, ...patterns: RegexValue<TRegex>[]): RegexTemplate<TRegex>
ahead_pos(...patterns: RegexValue<TRegex>[]): RegexTemplate<TRegex>
ahead_neg(...patterns: RegexValue<TRegex>[]): RegexTemplate<TRegex>
```

Use a [lookahead assertion](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Lookahead_assertion)
to test whether the concatenated patterns match next without consuming input.
Choose the assertion polarity with `ahead()` or use a fixed-polarity method.

```ts
r$.ahead(true, "foo");
r$.ahead(false, "foo");
r$.ahead_pos("foo");
r$.ahead_neg("bar");
```

### behind / behind_pos / behind_neg

```ts
behind(positive: boolean, ...patterns: RegexValue<TRegex>[]): RegexTemplate<TRegex>
behind_pos(...patterns: RegexValue<TRegex>[]): RegexTemplate<TRegex>
behind_neg(...patterns: RegexValue<TRegex>[]): RegexTemplate<TRegex>
```

Use a [lookbehind assertion](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Lookbehind_assertion)
to test whether the concatenated patterns match before the current position
without consuming input. Choose the assertion polarity with `behind()` or use a
fixed-polarity method.

```ts
r$.behind(true, "foo");
r$.behind(false, "foo");
r$.behind_pos("foo");
r$.behind_neg("bar");
```
