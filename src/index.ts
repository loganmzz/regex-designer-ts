/** A lazy regex template that can render pattern text or compile to a native RegExp. */
export interface RegexTemplate {
  /** Compile the rendered pattern with the supplied flags. */
  (flags?: string): RegExp;
  /** Render the pattern; when compiling, validates embedded Unicode flags. */
  render(flags?: string, compiling?: boolean): string;
  /** Render the pattern text without compiling it. */
  toString(): string;
}

/** Check whether a value is a regex template. */
export function isRegexTemplate(value: unknown): value is RegexTemplate {
  return typeof value === 'function' && 'render' in value && typeof value.render === 'function';
}

/**
 * A regex source string, native RegExp, or lazy regex template.
 * Strings are regex syntax, not escaped literals. Embedded RegExp values scope
 * their i, m, and s flags locally, require u or v when compiling, and do not
 * carry over d, g, or y.
 */
export type RegexValue = string | RegExp | RegexTemplate;

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

function patternString(pattern: RegexValue, flags: string | undefined, compiling: boolean): string {
  if (pattern instanceof RegExp) {
    const unicodeFlag = pattern.flags.includes('v') ? 'v' : pattern.flags.includes('u') ? 'u' : undefined;
    if (compiling && unicodeFlag !== undefined && !flags?.includes(unicodeFlag)) {
      throw new TypeError(`RegExp flag "${unicodeFlag}" must be passed when compiling the composed pattern`);
    }

    const scopedFlags = pattern.flags.replace(/[dgyuv]/g, '');
    return scopedFlags === '' ? pattern.source : `(?${scopedFlags}:${pattern.source})`;
  }

  if (isRegexTemplate(pattern)) {
    return pattern.render(flags, compiling);
  }
  return pattern.toString();
}

function template(render: (flags: string | undefined, compiling: boolean) => string): RegexTemplate {
  const regex: RegexTemplate = (flags?: string) => new RegExp(regex.render(flags, true), flags);
  regex.render = (flags?: string, compiling = false) => render(flags, compiling);
  regex.toString = () => regex.render();
  return regex;
}

function tpl(...patterns: RegexValue[]): RegexTemplate {
  return template((flags, compiling) => patterns.map(pattern => patternString(pattern, flags, compiling)).join(''));
}

function or(...patterns: RegexValue[]): RegexTemplate {
  return template((flags, compiling) => patterns.map(pattern => patternString(pattern, flags, compiling)).join('|'));
}

function group(options: GroupOptions, ...patterns: RegexValue[]): RegexTemplate {
  if (typeof options !== 'boolean' && options.name !== undefined && options.capture !== undefined) {
    throw new TypeError('Group options "name" and "capture" are mutually exclusive');
  }

  return template((flags, compiling) => {
    const name = typeof options === 'boolean' ? undefined : options.name;
    const capture = typeof options === 'boolean' ? options : options.capture ?? true;
    const prefix = name !== undefined ? `?<${name}>` : capture ? '' : '?:';
    return `(${prefix}${patterns.map(pattern => patternString(pattern, flags, compiling)).join('')})`;
  });
}

function named(name: string, ...patterns: RegexValue[]): RegexTemplate {
  return group({ name }, ...patterns);
}

function opt(...patterns: RegexValue[]): RegexTemplate {
  return template((flags, compiling) => `${patternString(group(false, ...patterns), flags, compiling)}?`);
}

function qty(quantity: QuantityOptions, ...patterns: RegexValue[]): RegexTemplate {
  let min: number;
  let max: number | undefined;
  let greedy = true;

  if (typeof quantity === 'number') {
    min = quantity;
    max = quantity;
  } else if (Array.isArray(quantity)) {
    [min, max] = quantity;
  } else if ('exact' in quantity) {
    min = quantity.exact;
    max = quantity.exact;
    greedy = quantity.greedy ?? true;
  } else {
    min = quantity.min;
    max = quantity.max;
    greedy = quantity.greedy ?? true;
  }

  if (!Number.isInteger(min) || min < 0 || (max !== undefined && max !== Infinity && (!Number.isInteger(max) || max < min))) {
    throw new RangeError('Quantity bounds must be non-negative integers with max >= min');
  }

  return template((flags, compiling) => `${patternString(group(false, ...patterns), flags, compiling)}{${min}${max === undefined || max === Infinity ? ',' : max === min ? '' : `,${max}`}}${greedy ? '' : '?'}`);
}

function look(prefix: string, positive: boolean, patterns: RegexValue[]): RegexTemplate {
  return template((flags, compiling) => `(${prefix}${positive ? '=' : '!'}${patterns.map(pattern => patternString(pattern, flags, compiling)).join('')})`);
}

function raw(...patterns: string[]): RegexTemplate {
  return template(() => patterns.map(p => RegExp.escape(p)).join(''));
}

/** Compose lazy regex templates and resolve reusable variables in an isolated scope. */
export class RegexDesigner {
  private readonly variables = new Map<string, RegexValue>();
  private readonly resolvingVariables: string[] = [];

  /** Concatenate patterns without adding groups or escaping. */
  tpl(...patterns: RegexValue[]): RegexTemplate {
    return tpl(...patterns);
  }

  /** Join patterns with alternation without adding groups. */
  or(...patterns: RegexValue[]): RegexTemplate {
    return or(...patterns);
  }

  /** Create a named capturing group around the concatenated patterns. */
  named(name: string, ...patterns: RegexValue[]): RegexTemplate {
    return named(name, ...patterns);
  }

  /** Group patterns, optionally capturing them or assigning a capture name. */
  group(options: GroupOptions, ...patterns: RegexValue[]): RegexTemplate {
    return group(options, ...patterns);
  }

  /** Make the concatenated patterns optional using a non-capturing group. */
  opt(...patterns: RegexValue[]): RegexTemplate {
    return opt(...patterns);
  }

  /** Repeat the concatenated patterns according to the supplied bounds. */
  qty(quantity: QuantityOptions, ...patterns: RegexValue[]): RegexTemplate {
    return qty(quantity, ...patterns);
  }

  /** Escape literal text for use in a regex pattern. */
  raw(...patterns: string[]): RegexTemplate {
    return raw(...patterns);
  }

  /** Create a positive or negative lookahead assertion. */
  ahead(positive: boolean, ...patterns: RegexValue[]): RegexTemplate {
    return look('?', positive, patterns);
  }

  /** Create a positive lookahead assertion. */
  ahead_pos(...patterns: RegexValue[]): RegexTemplate {
    return look('?', true, patterns);
  }

  /** Create a negative lookahead assertion. */
  ahead_neg(...patterns: RegexValue[]): RegexTemplate {
    return look('?', false, patterns);
  }

  /** Create a positive or negative lookbehind assertion. */
  behind(positive: boolean, ...patterns: RegexValue[]): RegexTemplate {
    return look('?<', positive, patterns);
  }

  /** Create a positive lookbehind assertion. */
  behind_pos(...patterns: RegexValue[]): RegexTemplate {
    return look('?<', true, patterns);
  }

  /** Create a negative lookbehind assertion. */
  behind_neg(...patterns: RegexValue[]): RegexTemplate {
    return look('?<', false, patterns);
  }

  /** Create a numeric or named backreference. */
  ref(reference: number | string): RegexTemplate {
    return template(() => typeof reference === 'number' ? `\\${reference}` : `\\k<${reference}>`);
  }

  /** Define or replace a lazy pattern variable on this designer. */
  set(name: string, ...patterns: RegexValue[]): this {
    this.variables.set(name, tpl(...patterns));
    return this;
  }

  private resolveVariable(name: string, flags: string | undefined, compiling: boolean): string {
    const cycleStart = this.resolvingVariables.indexOf(name);
    if (cycleStart !== -1) {
      const cycle = [...this.resolvingVariables.slice(cycleStart), name];
      throw new Error(`Circular variable dependency: ${cycle.join(' -> ')}`);
    }

    const pattern = this.variables.get(name);
    if (pattern === undefined) {
      throw new Error(`Variable "${name}" is not set`);
    }

    this.resolvingVariables.push(name);
    try {
      return patternString(pattern, flags, compiling);
    } finally {
      this.resolvingVariables.pop();
    }
  }

  /** Reference a variable, resolving it when this template is rendered. */
  var(name: string): RegexTemplate {
    return template((flags, compiling) => this.resolveVariable(name, flags, compiling));
  }
}

/** Create a new regex designer with its own variable scope. */
export default function create(): RegexDesigner {
  return new RegexDesigner();
}