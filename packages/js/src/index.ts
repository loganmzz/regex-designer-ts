/**
 * The JavaScript package exposes a default factory and a `JSRegexDesigner` class. It extends the abstract `RegexDesigner` contract from `@regex-designer/core`. Templates are compiled to a native `RegExp`.
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

export type {
  GroupNamedOptions,
  GroupOptions,
  QuantityNamedOptions,
  QuantityOptions,
} from "@regex-designer/core";
export type RegexTemplate = CoreRegexTemplate<RegExp>;
export type RegexValue = CoreRegexValue<RegExp>;
export { isRegexTemplate } from "@regex-designer/core";

function patternString(pattern: RegexValue, flags: string | undefined, compiling: boolean): string {
  if (pattern instanceof RegExp) {
    const unicodeFlag = pattern.flags.includes("v") ? "v" : pattern.flags.includes("u") ? "u" : undefined;
    if (compiling && unicodeFlag !== undefined && !flags?.includes(unicodeFlag)) {
      throw new TypeError(`RegExp flag "${unicodeFlag}" must be passed when compiling the composed pattern`);
    }

    const scopedFlags = pattern.flags.replace(/[dgyuv]/g, "");
    return scopedFlags === "" ? pattern.source : `(?${scopedFlags}:${pattern.source})`;
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
    const prefix = name !== undefined ? `?<${name}>` : capture ? "" : "?:";
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

function look(prefix: string, positive: boolean, patterns: RegexValue[]): RegexTemplate {
  return template((flags, compiling) => `(${prefix}${positive ? "=" : "!"}${patterns.map(pattern => patternString(pattern, flags, compiling)).join("")})`);
}

function raw(...patterns: string[]): RegexTemplate {
  return template(() => patterns.map(p => RegExp.escape(p)).join(""));
}

/**
 * Create a new JavaScript regex designer with its own variable scope.
 * @readme default
 */
export default function create(): JSRegexDesigner {
  return new JSRegexDesigner();
}

/**
 * Templates are compiled to a native `RegExp`.
 */
export class JSRegexDesigner extends RegexDesigner<RegExp> {
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

  /** Create a numeric or named backreference. */
  override ref(reference: number | string): RegexTemplate {
    return template(() => typeof reference === "number" ? `\\${reference}` : `\\k<${reference}>`);
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

  /** Create a positive or negative lookahead assertion. */
  override ahead(positive: boolean, ...patterns: RegexValue[]): RegexTemplate {
    return look("?", positive, patterns);
  }

  /** Create a positive lookahead assertion. */
  override ahead_pos(...patterns: RegexValue[]): RegexTemplate {
    return look("?", true, patterns);
  }

  /** Create a negative lookahead assertion. */
  override ahead_neg(...patterns: RegexValue[]): RegexTemplate {
    return look("?", false, patterns);
  }

  /** Create a positive or negative lookbehind assertion. */
  override behind(positive: boolean, ...patterns: RegexValue[]): RegexTemplate {
    return look("?<", positive, patterns);
  }

  /** Create a positive lookbehind assertion. */
  override behind_pos(...patterns: RegexValue[]): RegexTemplate {
    return look("?<", true, patterns);
  }

  /** Create a negative lookbehind assertion. */
  override behind_neg(...patterns: RegexValue[]): RegexTemplate {
    return look("?<", false, patterns);
  }

}
