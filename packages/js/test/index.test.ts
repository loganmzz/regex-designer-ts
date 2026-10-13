import assert from "node:assert/strict";
import {
  suite,
  test,
} from "node:test";

import create, {
  JSRegexDesigner,
  isRegexTemplate,
} from "@regex-designer/js";
import type { GroupOptions } from "@regex-designer/js";

const r$ = create();

suite("isRegexTemplate()", () => {
  test("recognizes templates and rejects other values", () => {
    assert.strictEqual(isRegexTemplate(r$.tpl("A")), true);
    assert.strictEqual(isRegexTemplate(() => /A/), false);
    assert.strictEqual(isRegexTemplate("A"), false);
    assert.strictEqual(isRegexTemplate(/A/), false);
  });
});

suite("templates", () => {
  test("RegExp: flags i", () => {
    const regex = r$.or(/foo/i, "bar")();
    assert.strictEqual(regex.source, "(?i:foo)|bar");
    assert.strictEqual(regex.flags, "");
    assert.strictEqual(regex.test("FOO"), true);
    assert.strictEqual(regex.test("BAR"), false);
    assert.strictEqual(regex.test("bar"), true);
  });

  test("RegExp: flags m", () => {
    const regex = r$.tpl(/^foo$/m)();
    assert.strictEqual(regex.source, "(?m:^foo$)");
    assert.strictEqual(regex.flags, "");
    assert.strictEqual(regex.test("before\nfoo\nafter"), true);
  });

  test("RegExp: flags s", () => {
    const regex = r$.tpl(/foo.bar/s)();
    assert.strictEqual(regex.source, "(?s:foo.bar)");
    assert.strictEqual(regex.flags, "");
    assert.strictEqual(regex.test("foo\nbar"), true);
  });

  test("RegExp: flags dgy", () => {
    const regex = r$.tpl(/foo/dgy)();
    assert.strictEqual(regex.source, "foo");
    assert.strictEqual(regex.flags, "");
  });

  test("RegExp: flags u", () => {
    const standard = r$.tpl(new RegExp("\\u{61}"))();
    const unicode = r$.tpl(new RegExp("\\u{61}", "u"))("u");
    assert.strictEqual(standard.flags, "", "standard flags");
    assert.strictEqual(standard.source, "\\u{61}", "standard source");
    assert.strictEqual(unicode.flags, "u", "unicode flags");
    assert.strictEqual(unicode.source, "\\u{61}", "unicode source");

    assert.strictEqual(standard.test("a"), false, "standard [a]");
    assert.strictEqual(unicode.test("a"), true, "unicode [a]");
  });

  test("RegExp: flags v", () => {
    const standard = r$.tpl(new RegExp("\\u{61}"))();
    const unicode = r$.tpl(new RegExp("\\u{61}", "v"))("v");
    assert.strictEqual(standard.flags, "", "standard flags");
    assert.strictEqual(standard.source, "\\u{61}", "standard source");
    assert.strictEqual(unicode.flags, "v", "unicode flags");
    assert.strictEqual(unicode.source, "\\u{61}", "unicode source");

    assert.strictEqual(standard.test("a"), false, "standard [a]");
    assert.strictEqual(unicode.test("a"), true, "unicode [a]");
  });

  test("RegExp: flags u (required)", () => {
    assert.throws(() => r$.tpl(/[a-z]/u)(), {
      name: "TypeError",
      message: "RegExp flag \"u\" must be passed when compiling the composed pattern",
    });
  });

  test("RegExp: flags v (required)", () => {
    assert.throws(() => r$.tpl(/[a-z]/v)(), {
      name: "TypeError",
      message: "RegExp flag \"v\" must be passed when compiling the composed pattern",
    });
  });

  test("var(some): <some>", () => {
    const one = new JSRegexDesigner().set("some", "A");
    const regex = one.var("some");
    assert.strictEqual(regex.toString(), "A");
    assert.strictEqual(one.or(one.var("some"), one.var("some")).toString(), "A|A");
  });

  test("var: detects circular dependencies", () => {
    const direct = new JSRegexDesigner();
    direct.set("a", direct.var("a"));
    assert.throws(() => direct.var("a").toString(), {
      message: "Circular variable dependency: a -> a",
    });

    const indirect = new JSRegexDesigner();
    indirect.set("a", indirect.var("b"));
    indirect.set("b", indirect.var("c"));
    indirect.set("c", indirect.var("a"));
    assert.throws(() => indirect.var("a").toString(), {
      message: "Circular variable dependency: a -> b -> c -> a",
    });
  });

  test("var: keep variables isolated between builders", () => {
    const one = new JSRegexDesigner()
      .set("some", "A");
    const other = new JSRegexDesigner()
      .set("some", "B");
    ;
    assert.strictEqual(one.var("some").toString(), "A");
    assert.strictEqual(other.var("some").toString(), "B");
  });

  test("tpl: concatenates patterns without adding syntax", () => {
    const regex = r$.tpl("A", r$.raw("B.C"));
    assert.strictEqual(regex.toString(), "A\\x42\\.C");
  });

  test("raw: escapes literal string content", () => {
    const regex = r$.raw("a.b", "*");
    assert.strictEqual(regex.toString(), RegExp.escape("a.b*"));
  });

  test("start, end, and whole: anchor non-capturing patterns", () => {
    const start = r$.start(r$.or("A", "B"));
    const end = r$.end(r$.or("A", "B"));
    const whole = r$.whole(r$.or("A", "B"));

    assert.strictEqual(start.toString(), "^(?:A|B)");
    assert.strictEqual(end.toString(), "(?:A|B)$");
    assert.strictEqual(whole.toString(), "^(?:A|B)$");
    assert.strictEqual(start().test("B!"), true);
    assert.strictEqual(start().test("!B"), false);
    assert.strictEqual(end().test("!B"), true);
    assert.strictEqual(end().test("B!"), false);
    assert.strictEqual(whole().test("B"), true);
    assert.strictEqual(whole().test("!B"), false);
    assert.strictEqual(r$.start("A")("m").test("x\nA"), true);
    assert.strictEqual(r$.end("A")("m").test("A\nx"), true);
    assert.strictEqual(r$.whole("A")("m").test("x\nA"), true);
  });

  test("group: (?<name>A)", () => {
    const regex = r$.group({ name: "name" }, "A");
    assert.strictEqual(regex.toString(), "(?<name>A)");
  });
  test("group: (?<name>AB)", () => {
    const regex = r$.group({ name: "name" }, "A", "B");
    assert.strictEqual(regex.toString(), "(?<name>AB)");
  });
  test("group: (AB) (default)", () => {
    const regex = r$.group({}, "A", "B");
    assert.strictEqual(regex.toString(), "(AB)");
  });
  test("group: (AB) (boolean)", () => {
    const regex = r$.group(true, "A", "B");
    assert.strictEqual(regex.toString(), "(AB)");
  });
  test("group: (AB) (boolean)", () => {
    const regex = r$.group({ capture: true }, "A", "B");
    assert.strictEqual(regex.toString(), "(AB)");
  });
  test("group: (?:AB) (boolean)", () => {
    const regex = r$.group(false, "A", "B");
    assert.strictEqual(regex.toString(), "(?:AB)");
  });
  test("group: (?:AB) (capture)", () => {
    const regex = r$.group({ capture: false }, "A", "B");
    assert.strictEqual(regex.toString(), "(?:AB)");
  });
  test("group: name and capture are mutually exclusive", () => {
    const options = { name: "name", capture: false } as unknown as GroupOptions;
    assert.throws(() => r$.group(options, "A"), {
      message: "Group options \"name\" and \"capture\" are mutually exclusive",
    });
  });

  test("named: (?<name>A)", () => {
    const regex = r$.named("name", "A");
    assert.strictEqual(regex.toString(), "(?<name>A)");
  });
  test("named: (?<name>AB)", () => {
    const regex = r$.named("name", "A", "B");
    assert.strictEqual(regex.toString(), "(?<name>AB)");
  });

  test("ref: \\1", () => {
    const regex = r$.ref(1);
    assert.strictEqual(regex.toString(), "\\1");
  });
  test("ref: a (\\k<some>)", () => {
    const regex = r$.ref("some");
    assert.strictEqual(regex.toString(), "\\k<some>");
  });

  test("opt: (?:A)?", () => {
    const regex = r$.opt("A");
    assert.strictEqual(regex.toString(), "(?:A)?");
  });
  test("opt: (?:AB)?", () => {
    const regex = r$.opt("A", "B");
    assert.strictEqual(regex.toString(), "(?:AB)?");
  });

  test("qty: a{3}", () => {
    const regex = r$.qty(3, "A", "B");
    assert.strictEqual(regex.toString(), "(?:AB){3}");
  });
  test("qty: a{3,3}", () => {
    const regex = r$.qty([3, 3], "A", "B");
    assert.strictEqual(regex.toString(), "(?:AB){3}");
  });
  test("qty: a{4,}", () => {
    const regex = r$.qty([4], "A", "B");
    assert.strictEqual(regex.toString(), "(?:AB){4,}");
  });
  test("qty: a{4,∞}", () => {
    const regex = r$.qty([4, Infinity], "A", "B");
    assert.strictEqual(regex.toString(), "(?:AB){4,}");
  });
  test("qty: a{5,6}", () => {
    const regex = r$.qty([5, 6], "A", "B");
    assert.strictEqual(regex.toString(), "(?:AB){5,6}");
  });
  test("qty: a{7} (object)", () => {
    const regex = r$.qty({ exact: 7 }, "A", "B");
    assert.strictEqual(regex.toString(), "(?:AB){7}");
  });
  test("qty: a{7,7} (object)", () => {
    const regex = r$.qty({ min: 7, max: 7 }, "A", "B");
    assert.strictEqual(regex.toString(), "(?:AB){7}");
  });
  test("qty: a{8,} (object)", () => {
    const regex = r$.qty({ min: 8 }, "A", "B");
    assert.strictEqual(regex.toString(), "(?:AB){8,}");
  });
  test("qty: a{8,∞} (object)", () => {
    const regex = r$.qty({ min: 8, max: Infinity }, "A", "B");
    assert.strictEqual(regex.toString(), "(?:AB){8,}");
  });
  test("qty: a{9,10} (object)", () => {
    const regex = r$.qty({ min: 9, max: 10 }, "A", "B");
    assert.strictEqual(regex.toString(), "(?:AB){9,10}");
  });
  test("qty: a{2,5}? (non-greedy object)", () => {
    const regex = r$.qty({ min: 2, max: 5, greedy: false }, "A");
    assert.strictEqual(regex.toString(), "(?:A){2,5}?");
  });
  test("qty: a{3}? (non-greedy exact object)", () => {
    const regex = r$.qty({ exact: 3, greedy: false }, "A");
    assert.strictEqual(regex.toString(), "(?:A){3}?");
  });
  test("qty: rejects invalid bounds", () => {
    assert.throws(() => r$.qty([3, 2], "A"), {
      name: "RangeError",
      message: "Quantity bounds must be non-negative integers with max >= min",
    });
    assert.throws(() => r$.qty([Infinity], "A"), {
      name: "RangeError",
      message: "Quantity bounds must be non-negative integers with max >= min",
    });
    assert.throws(() => r$.qty([Infinity, 999], "A"), {
      name: "RangeError",
      message: "Quantity bounds must be non-negative integers with max >= min",
    });
    assert.throws(() => r$.qty({ min: 3, max: 2 }, "A"), {
      name: "RangeError",
      message: "Quantity bounds must be non-negative integers with max >= min",
    });
    assert.throws(() => r$.qty({ min: Infinity }, "A"), {
      name: "RangeError",
      message: "Quantity bounds must be non-negative integers with max >= min",
    });
    assert.throws(() => r$.qty({ min: Infinity, max: 999 }, "A"), {
      name: "RangeError",
      message: "Quantity bounds must be non-negative integers with max >= min",
    });
  });

  test("or: A|B", () => {
    const regex = r$.or("A", "B");
    assert.strictEqual(regex.toString(), "A|B");
  });
  test("or: A|B|C", () => {
    const regex = r$.or("A", "B", "C");
    assert.strictEqual(regex.toString(), "A|B|C");
  });

  test("ahead: (?=AB) (pos)", () => {
    const regex = r$.ahead_pos("A", "B");
    assert.strictEqual(regex.toString(), "(?=AB)");
  });
  test("ahead: (?=AB) (true)", () => {
    const regex = r$.ahead(true, "A", "B");
    assert.strictEqual(regex.toString(), "(?=AB)");
  });
  test("ahead: (?!AB) (neg)", () => {
    const regex = r$.ahead_neg("A", "B");
    assert.strictEqual(regex.toString(), "(?!AB)");
  });
  test("ahead: (?!AB) (false)", () => {
    const regex = r$.ahead(false, "A", "B");
    assert.strictEqual(regex.toString(), "(?!AB)");
  });

  test("behind: (?<=AB) (pos)", () => {
    const regex = r$.behind_pos("A", "B");
    assert.strictEqual(regex.toString(), "(?<=AB)");
  });
  test("behind: (?<=AB) (true)", () => {
    const regex = r$.behind(true, "A", "B");
    assert.strictEqual(regex.toString(), "(?<=AB)");
  });
  test("behind: (?<!AB) (neg)", () => {
    const regex = r$.behind_neg("A", "B");
    assert.strictEqual(regex.toString(), "(?<!AB)");
  });
  test("behind: (?<!AB) (false)", () => {
    const regex = r$.behind(false, "A", "B");
    assert.strictEqual(regex.toString(), "(?<!AB)");
  });
});
