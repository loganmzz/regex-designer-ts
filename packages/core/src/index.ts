/**
 * The `RegexDesigner` creates lazy and reusable `RegexTemplate` values. A template
 * renders pattern text when stringified and compiles to a regular expression implementation when
 * called.
 *
 * As opposed to classic regular expressions, designer relies on a structural
 * (block) approach instead of a stream one. So it might add several
 * (non-capturing) groups, to ensure operator precedence (e.g. [quantifiers](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Quantifier)).
 */

/** A lazy regex template that can render pattern text or compile to an implementation-specific value. */
export interface RegexTemplate<TRegex = unknown> {
  /** Compile the rendered pattern with the supplied flags. */
  (flags?: string): TRegex;
  /** Render the pattern; when compiling, validates embedded Unicode flags. */
  render(flags?: string, compiling?: boolean): string;
  /** Render the pattern text without compiling it. */
  toString(): string;
}

/** Check whether a value is a regex template. */
export function isRegexTemplate(value: unknown): value is RegexTemplate {
  return typeof value === "function" && "render" in value && typeof value.render === "function";
}

/**
 * A regex source string, implementation-specific regex value, or lazy regex template.
 * Strings are regex syntax, not escaped literals. Embedded regex values scope
 * their i, m, and s flags locally, require u or v when compiling, and do not
 * carry over d, g, or y.
 */
export type RegexValue<TRegex = unknown> = string | TRegex | RegexTemplate<TRegex>;

/** Mutually exclusive settings for a named capturing group or an unnamed group. */
export type GroupNamedOptions =
  | { name: string; capture?: never }
  | { name?: never; capture?: boolean };

/** Configure a group with a capture boolean or named-group options. */
export type GroupOptions = GroupNamedOptions | boolean;

/** Repetition bounds; specify either an exact count or a minimum and optional maximum. */
export type QuantityNamedOptions = (
  | { exact: number; min?: never; max?: never }
  | { exact?: never; min: number; max?: number }
) & { greedy?: boolean };

/** Repetition count, [minimum, maximum] tuple, or named bounds. */
export type QuantityOptions = number | [min: number, max?: number] | QuantityNamedOptions;

/**
 * The `RegexDesigner` creates lazy and reusable `RegexTemplate` values. A template
 * renders pattern text when stringified and compiles to a regular expression implementation when
 * called.
 **/
export abstract class RegexDesigner<TRegex = unknown> {
  private readonly variables = new Map<string, RegexTemplate<TRegex>>();
  private readonly resolvingVariables: string[] = [];

  /**
   * Define or replace a lazy pattern variable on this designer.
   * @readme set / var
   */
  set(name: string, ...patterns: RegexValue<TRegex>[]): this {
    this.variables.set(name, this.tpl(...patterns));
    return this;
  }

  /**
   * Reference a reusable lazy variable when composing a pattern. It resolves
   * when the template is rendered. Rendering an unset variable or circular
   * dependencies between variables throws an error.
   * @readme set / var
   */
  var(name: string): RegexTemplate<TRegex> {
    return this.createTemplate((flags, compiling) => this.resolveVariable(name, flags, compiling));
  }

  /**
   * Concatenate patterns without adding groups or escaping.
   * @readme tpl
   */
  abstract tpl(...patterns: RegexValue<TRegex>[]): RegexTemplate<TRegex>;

  /**
   * Escape literal text for use in a regex pattern.
   * @readme raw
   */
  abstract raw(...patterns: string[]): RegexTemplate<TRegex>;

  /**
  * Choose whether the concatenated patterns must match at the [start, end, or
  * across the whole input](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Input_boundary_assertion).
   * @readme start / end / whole
   */
  abstract start(...patterns: RegexValue<TRegex>[]): RegexTemplate<TRegex>;

  /**
  * Choose whether the concatenated patterns must match at the [start, end, or
  * across the whole input](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Input_boundary_assertion).
   * @readme start / end / whole
   */
  abstract end(...patterns: RegexValue<TRegex>[]): RegexTemplate<TRegex>;

  /**
  * Choose whether the concatenated patterns must match at the [start, end, or
  * across the whole input](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Input_boundary_assertion).
   * @readme start / end / whole
   */
  abstract whole(...patterns: RegexValue<TRegex>[]): RegexTemplate<TRegex>;

  /**
   * Group patterns using [capturing](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Capturing_group)
   * or [non-capturing groups](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Non-capturing_group),
   * optionally assigning a [capture name](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Named_capturing_group).
   * @readme group
   */
  abstract group(options: GroupOptions, ...patterns: RegexValue<TRegex>[]): RegexTemplate<TRegex>;

  /**
   * Create a [named capturing group](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Named_capturing_group)
   * around the concatenated patterns.
   * @readme named
   */
  abstract named(name: string, ...patterns: RegexValue<TRegex>[]): RegexTemplate<TRegex>;

  /**
   * Create a [numeric](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Backreference)
   * or [named](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Named_backreference) backreference.
   * @readme ref
   */
  abstract ref(reference: number | string): RegexTemplate<TRegex>;

  /**
   * Make the concatenated patterns [optional](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Quantifier)
   * using a non-capturing group.
   * @readme opt
   */
  abstract opt(...patterns: RegexValue<TRegex>[]): RegexTemplate<TRegex>;

  /**
   * [Repeat](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Quantifier)
   * the concatenated patterns according to the supplied bounds.
   * @readme qty
   */
  abstract qty(quantity: QuantityOptions, ...patterns: RegexValue<TRegex>[]): RegexTemplate<TRegex>;

  /**
   * Join patterns with [disjunction](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Disjunction)
   * without adding groups.
   * @readme or
   */
  abstract or(...patterns: RegexValue<TRegex>[]): RegexTemplate<TRegex>;

  /**
  * Use a [lookahead assertion](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Lookahead_assertion)
  * to test whether the concatenated patterns match next without consuming input.
  * Choose the assertion polarity with `ahead()` or use a fixed-polarity method.
   * @readme ahead / ahead_pos / ahead_neg
   */
  abstract ahead(positive: boolean, ...patterns: RegexValue<TRegex>[]): RegexTemplate<TRegex>;

  /**
   * Use a [lookahead assertion](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Lookahead_assertion)
   * to test whether the concatenated patterns match next without consuming input.
   * Choose the assertion polarity with `ahead()` or use a fixed-polarity method.
   * @readme ahead / ahead_pos / ahead_neg
   */
  abstract ahead_pos(...patterns: RegexValue<TRegex>[]): RegexTemplate<TRegex>;

  /**
   * Use a [lookahead assertion](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Lookahead_assertion)
   * to test whether the concatenated patterns match next without consuming input.
   * Choose the assertion polarity with `ahead()` or use a fixed-polarity method.
   * @readme ahead / ahead_pos / ahead_neg
   */
  abstract ahead_neg(...patterns: RegexValue<TRegex>[]): RegexTemplate<TRegex>;

  /**
  * Use a [lookbehind assertion](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Lookbehind_assertion)
  * to test whether the concatenated patterns match before the current position
  * without consuming input. Choose the assertion polarity with `behind()` or use a
  * fixed-polarity method.
   * @readme behind / behind_pos / behind_neg
   */
  abstract behind(positive: boolean, ...patterns: RegexValue<TRegex>[]): RegexTemplate<TRegex>;

  /**
   * Use a [lookbehind assertion](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Lookbehind_assertion)
   * to test whether the concatenated patterns match before the current position
   * without consuming input. Choose the assertion polarity with `behind()` or use a
   * fixed-polarity method.
   * @readme behind / behind_pos / behind_neg
   */
  abstract behind_pos(...patterns: RegexValue<TRegex>[]): RegexTemplate<TRegex>;

  /**
   * Use a [lookbehind assertion](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Regular_expressions/Lookbehind_assertion)
   * to test whether the concatenated patterns match before the current position
   * without consuming input. Choose the assertion polarity with `behind()` or use a
   * fixed-polarity method.
   * @readme behind / behind_pos / behind_neg
   */
  abstract behind_neg(...patterns: RegexValue<TRegex>[]): RegexTemplate<TRegex>;

  protected abstract createTemplate(
    render: (flags: string | undefined, compiling: boolean) => string,
  ): RegexTemplate<TRegex>;

  private resolveVariable(name: string, flags: string | undefined, compiling: boolean): string {
    const cycleStart = this.resolvingVariables.indexOf(name);
    if (cycleStart !== -1) {
      const cycle = [...this.resolvingVariables.slice(cycleStart), name];
      throw new Error(`Circular variable dependency: ${cycle.join(" -> ")}`);
    }

    const pattern = this.variables.get(name);
    if (pattern === undefined) {
      throw new Error(`Variable "${name}" is not set`);
    }

    this.resolvingVariables.push(name);
    try {
      return pattern.render(flags, compiling);
    } finally {
      this.resolvingVariables.pop();
    }
  }
}
