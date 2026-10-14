/**
 * The RE2 package exposes a default factory and a `RE2RegexDesigner` class. It extends the abstract `RegexDesigner` contract from `@regex-designer/core`. Templates are compiled to RE2 expressions.
 */

import type {
  GroupOptions,
  QuantityOptions,
  RegexTemplate as CoreRegexTemplate,
  RegexValue as CoreRegexValue,
} from "@regex-designer/core";
import {
  RegexDesigner,
  isRegexTemplate,
} from "@regex-designer/core";
import RE2 from "re2";

export type {
  GroupNamedOptions,
  GroupOptions,
  QuantityNamedOptions,
  QuantityOptions,
} from "@regex-designer/core";
export type RegexTemplate = CoreRegexTemplate<RE2>;
export type RegexValue = CoreRegexValue<RE2>;
export { isRegexTemplate } from "@regex-designer/core";

function patternString(pattern: RegexValue, flags: string | undefined, compiling: boolean): string {
  if (pattern instanceof RE2) {
    const scopedFlags = pattern.flags.replace(/[dgyuv]/g, "");
    return scopedFlags === "" ? pattern.source : `(?${scopedFlags}:${pattern.source})`;
  }

  if (isRegexTemplate(pattern)) {
    return pattern.render(flags, compiling);
  }
  return pattern.toString();
}

function template(render: (flags: string | undefined, compiling: boolean) => string): RegexTemplate {
  const regex: RegexTemplate = (flags?: string) => new RE2(regex.render(flags, true), flags);
  regex.render = (flags?: string, compiling = false) => render(flags, compiling);
  regex.toString = () => regex.render();
  return regex;
}

function tpl(...patterns: RegexValue[]): RegexTemplate {
  return template((flags, compiling) => patterns.map(pattern => patternString(pattern, flags, compiling)).join(""));
}

function or(...patterns: RegexValue[]): RegexTemplate {
  return template((flags, compiling) => patterns.map(pattern => patternString(pattern, flags, compiling)).join("|"));
}

function group(options: GroupOptions, ...patterns: RegexValue[]): RegexTemplate {
  if (typeof options !== "boolean" && options.name !== undefined && options.capture !== undefined) {
    throw new TypeError("Group options \"name\" and \"capture\" are mutually exclusive");
  }

  return template((flags, compiling) => {
    const name = typeof options === "boolean" ? undefined : options.name;
    const capture = typeof options === "boolean" ? options : options.capture ?? true;
    const prefix = name !== undefined ? `?P<${name}>` : capture ? "" : "?:";
    return `(${prefix}${patterns.map(pattern => patternString(pattern, flags, compiling)).join("")})`;
  });
}

function anchor(start: boolean, end: boolean, patterns: RegexValue[]): RegexTemplate {
  return template((flags, compiling) => `${start ? "^" : ""}${patternString(group(false, ...patterns), flags, compiling)}${end ? "$" : ""}`);
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

  if (typeof quantity === "number") {
    min = quantity;
    max = quantity;
  } else if (Array.isArray(quantity)) {
    [min, max] = quantity;
  } else if ("exact" in quantity) {
    min = quantity.exact;
    max = quantity.exact;
    greedy = quantity.greedy ?? true;
  } else {
    min = quantity.min;
    max = quantity.max;
    greedy = quantity.greedy ?? true;
  }

  if (!Number.isInteger(min) || min < 0 || (max !== undefined && max !== Infinity && (!Number.isInteger(max) || max < min))) {
    throw new RangeError("Quantity bounds must be non-negative integers with max >= min");
  }

  return template((flags, compiling) => `${patternString(group(false, ...patterns), flags, compiling)}{${min}${max === undefined || max === Infinity ? "," : max === min ? "" : `,${max}`}}${greedy ? "" : "?"}`);
}

function raw(...patterns: string[]): RegexTemplate {
  return template(() => patterns.map(pattern => RegExp.escape(pattern)).join(""));
}

/**
 * Create a new RE2 regex designer with its own variable scope.
 * @readme default
 */
export default function create(): RE2RegexDesigner {
  return new RE2RegexDesigner();
}

/**
 * Templates are compiled to RE2 expressions.
 */
export class RE2RegexDesigner extends RegexDesigner<RE2> {
  protected override createTemplate(render: (flags: string | undefined, compiling: boolean) => string): RegexTemplate {
    return template(render);
  }

  /** Concatenate patterns without adding groups or escaping. */
  override tpl(...patterns: RegexValue[]): RegexTemplate {
    return tpl(...patterns);
  }

  /** Escape literal text for use in a regex pattern. */
  override raw(...patterns: string[]): RegexTemplate {
    return raw(...patterns);
  }

  /** Match the concatenated patterns at the start of the input. */
  override start(...patterns: RegexValue[]): RegexTemplate {
    return anchor(true, false, patterns);
  }

  /** Match the concatenated patterns at the end of the input. */
  override end(...patterns: RegexValue[]): RegexTemplate {
    return anchor(false, true, patterns);
  }

  /** Match the concatenated patterns across the whole input. */
  override whole(...patterns: RegexValue[]): RegexTemplate {
    return anchor(true, true, patterns);
  }

  /** Group patterns, optionally capturing them or assigning a capture name. */
  override group(options: GroupOptions, ...patterns: RegexValue[]): RegexTemplate {
    return group(options, ...patterns);
  }

  /** Create a named capturing group around the concatenated patterns. */
  override named(name: string, ...patterns: RegexValue[]): RegexTemplate {
    return named(name, ...patterns);
  }

  /** Make the concatenated patterns optional using a non-capturing group. */
  override opt(...patterns: RegexValue[]): RegexTemplate {
    return opt(...patterns);
  }

  /** Repeat the concatenated patterns according to the supplied bounds. */
  override qty(quantity: QuantityOptions, ...patterns: RegexValue[]): RegexTemplate {
    return qty(quantity, ...patterns);
  }

  /** Join patterns with alternation without adding groups. */
  override or(...patterns: RegexValue[]): RegexTemplate {
    return or(...patterns);
  }
}
