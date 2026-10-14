import assert from "node:assert/strict";
import {
  suite,
  test,
} from "node:test";

import type {
  RegexDesigner,
  RegexTemplate,
} from "@regex-designer/core";
import createJS from "@regex-designer/js";
import createRE2 from "@regex-designer/re2";

type TemplateBuilder = <TRegex>(r$: RegexDesigner<TRegex>) => RegexTemplate<TRegex>;

interface Matcher {
  exec(input: string): RegExpExecArray | null;
  [Symbol.matchAll](input: string): IterableIterator<RegExpMatchArray>;
}

function snapshot(match: RegExpMatchArray | null) {
  return match && {
    values: [...match],
    index: match.index,
    groups: match.groups && { ...match.groups },
  };
}

function matches(regex: Matcher, input: string, global: boolean) {
  return global ? [...regex[Symbol.matchAll](input)].map(snapshot) : [snapshot(regex.exec(input))];
}

function compare(name: string, build: TemplateBuilder, flags: string, inputs: string[]): void {
  suite(name, () => {
    const js: Matcher = build(createJS())(flags);
    const re2: Matcher = build(createRE2())(flags);
    const global = flags.includes("g");

    for (const input of inputs) {
      test(`matches ${JSON.stringify(input)} identically`, () => {
        assert.deepEqual(matches(re2, input, global), matches(js, input, global));
      });
    }
  });
}

compare("concatenation", r$ => r$.tpl("a", "[0-9]", "c"), "", [
  "a1c",
  "xa9cx",
  "abc",
  "",
]);

compare("raw literal text", r$ => r$.whole(r$.raw("a.b*", "(c)")), "", [
  "a.b*(c)",
  "axb*(c)",
  "a.bbb(c)",
  "a.b*c",
]);

compare("anchors", r$ => r$.tpl(r$.start("foo"), "-", r$.end("bar")), "", [
  "foo-bar",
  "xfoo-bar",
  "foo-barx",
  "foo-baz",
]);

compare("multiline anchors", r$ => r$.whole(r$.qty([1, Infinity], "[a-z]")), "gm", [
  "abc\ndef\nghi",
  "abc\n123\nxyz",
  "",
  "\n\n",
]);

compare("alternation", r$ => r$.whole(r$.qty([1, Infinity], r$.or("cat", "dog"))), "i", [
  "cat",
  "CATdog",
  "dogdogCat",
  "cat!",
  "bird",
  "",
]);

compare("capturing and non-capturing groups", r$ => r$.tpl(
  r$.group(true, "[a-z]+"),
  r$.group(false, "-"),
  r$.group({ capture: true }, "[0-9]+"),
  r$.group({ capture: false }, "!"),
), "", [
  "abc-123!",
  "x-1!",
  "abc-123",
  "ABC-123!",
]);

compare("named groups", r$ => r$.tpl(
  r$.named("key", "[a-z]+"),
  "=",
  r$.group({ name: "value" }, "[^;]*"),
), "g", [
  "a=1;b=2;c=",
  "key=value",
  "=value",
  "",
]);

compare("optional parts", r$ => r$.whole(
  r$.named("major", "[0-9]+"),
  r$.opt("\\.", r$.named("minor", "[0-9]+")),
  r$.opt("-", r$.named("tag", "[a-z]+")),
), "", [
  "1",
  "1.2",
  "1-beta",
  "1.2-beta",
  "1.",
  "1.2-",
]);

compare("exact quantity", r$ => r$.whole(r$.qty(3, "ab")), "", [
  "ababab",
  "abab",
  "abababab",
]);

compare("bounded quantity", r$ => r$.qty([2, 4], "[0-9]"), "g", [
  "1 12 123 1234 12345 123456789",
  "",
]);

compare("named quantity options", r$ => r$.tpl(
  r$.qty({ min: 1 }, "a"),
  r$.qty({ exact: 2 }, "b"),
  r$.qty({ min: 0, max: 2 }, "c"),
), "g", [
  "abb abbc abbcc abbccc",
  "bb aabb",
]);

compare("lazy quantity", r$ => r$.tpl("<", r$.named("tag", r$.qty({ min: 1, greedy: false }, ".")), ">"), "g", [
  "<a><b>",
  "<abc> text <def>",
  "<>",
]);

compare("variables", r$ => {
  r$.set("number", r$.qty([1, Infinity], "[0-9]"));
  r$.set("identifier", r$.qty([1, Infinity], "[a-z0-9-]"));
  return r$.named(
    "version",
    r$.var("number"), "\\.", r$.var("number"), "\\.", r$.var("number"),
    r$.opt("-", r$.named("prerelease", r$.var("identifier"))),
  );
}, "i", [
  "12.3.4",
  "12.3.4-beta-1",
  "v1.2.3-RC1 released",
  "1.2",
  "a.b.c",
]);

compare("dot all", r$ => r$.whole("a", r$.qty({ min: 0 }, "."), "b"), "s", [
  "ab",
  "a\nb",
  "a\r\n\tb",
  "a\nc",
]);

compare("unicode", r$ => r$.whole(r$.qty([1, Infinity], "\\p{L}"), r$.raw("é")), "u", [
  "café",
  "日本é",
  "123é",
  "cafe",
]);
