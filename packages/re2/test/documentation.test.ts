import assert from "node:assert/strict";
import {
  suite,
  test,
} from "node:test";

import createDesigner, { RE2RegexDesigner } from "@regex-designer/re2";

suite("README", () => {
  test("API example", () => {
    const r$ = createDesigner();
    r$.set("number", r$.qty([1, Infinity], "[0-9]"));
    r$.set("identifier", r$.qty([1, Infinity], "[a-z0-9-]"));

    const template = r$.named(
      "version",
      r$.var("number"), "\\.", r$.var("number"), "\\.", r$.var("number"),
      r$.opt("-", r$.named("prerelease", r$.var("identifier"))),
    );
    assert.strictEqual(template.toString(), "(?P<version>(?:[0-9]){1,}\\.(?:[0-9]){1,}\\.(?:[0-9]){1,}(?:-(?P<prerelease>(?:[a-z0-9-]){1,}))?)");
    const regex = template("i");
    assert.strictEqual(regex.source, "(?P<version>(?:[0-9]){1,}\\.(?:[0-9]){1,}\\.(?:[0-9]){1,}(?:-(?P<prerelease>(?:[a-z0-9-]){1,}))?)");
    assert.strictEqual(regex.flags, "iu");
    assert.strictEqual(regex.test("12.3.4-beta-1"), true);
    assert.deepStrictEqual(
      { ...regex.exec("12.3.4-beta-1")?.groups },
      {
        version: "12.3.4-beta-1",
        prerelease: "beta-1",
      },
    );
  });

  test("default", () => {
    const r$: RE2RegexDesigner = createDesigner();
    assert.ok(r$ instanceof RE2RegexDesigner);

    const other = createDesigner().set("word", "B");
    r$.set("word", "A");
    assert.strictEqual(r$.var("word").toString(), "A");
    assert.strictEqual(other.var("word").toString(), "B");
  });

  test("set / var", () => {
    const r$ = createDesigner();
    r$.set("word", r$.or("cat", "dog"));
    assert.strictEqual(r$.var("word").toString(), "cat|dog");

    assert.throws(() => r$.var("missing").toString(), {
      message: "Variable \"missing\" is not set",
    });
    r$.set("loop", r$.var("loop"));
    assert.throws(() => r$.var("loop").toString(), {
      message: "Circular variable dependency: loop -> loop",
    });
  });

  test("tpl", () => {
    const r$ = createDesigner();
    assert.strictEqual(r$.tpl("A", "B").toString(), "AB");
    assert.strictEqual(r$.tpl("A", r$.raw("B.C")).toString(), "A\\x42\\.C");
  });

  test("raw", () => {
    const r$ = createDesigner();
    assert.strictEqual(r$.raw("a.b", "*").toString(), "\\x61\\.b\\*");
    assert.strictEqual(r$.raw("https://example.com").toString(), "\\x68ttps\\x3a\\/\\/example\\.com");
  });

  test("start / end / whole", () => {
    const r$ = createDesigner();
    assert.strictEqual(r$.start("foo").toString(), "^(?:foo)");
    assert.strictEqual(r$.end("bar").toString(), "(?:bar)$");
    assert.strictEqual(r$.whole("baz").toString(), "^(?:baz)$");
  });

  test("group", () => {
    const r$ = createDesigner();
    assert.strictEqual(r$.group(true, "A").toString(), "(A)");
    assert.strictEqual(r$.group(false, "A", "B").toString(), "(?:AB)");
    assert.strictEqual(r$.group({ name: "part" }, "A", "B").toString(), "(?P<part>AB)");
    assert.strictEqual(r$.group({ capture: true }, "A").toString(), "(A)");
    assert.strictEqual(r$.group({ capture: false }, "A", "B").toString(), "(?:AB)");
  });

  test("named", () => {
    const r$ = createDesigner();
    assert.strictEqual(r$.named("value", "A", "B").toString(), "(?P<value>AB)");
    assert.strictEqual(r$.named("word", r$.or("cat", "dog")).toString(), "(?P<word>cat|dog)");
    assert.strictEqual(r$.named("user", "[^@]+", "@", "[a-z]+").toString(), "(?P<user>[^@]+@[a-z]+)");
  });

  test("opt", () => {
    const r$ = createDesigner();
    assert.strictEqual(r$.opt("C").toString(), "(?:C)?");
    assert.strictEqual(r$.opt(r$.named("value", "A", "B")).toString(), "(?:(?P<value>AB))?");
  });

  test("qty", () => {
    const r$ = createDesigner();
    assert.strictEqual(r$.qty(3, "A", "B").toString(), "(?:AB){3}");
    assert.strictEqual(r$.qty([3, 3], "A", "B").toString(), "(?:AB){3}");
    assert.strictEqual(r$.qty([1, 3], "A", "B").toString(), "(?:AB){1,3}");
    assert.strictEqual(r$.qty([1, Infinity], "A", "B").toString(), "(?:AB){1,}");
    assert.strictEqual(r$.qty({ exact: 3 }, "A", "B").toString(), "(?:AB){3}");
    assert.strictEqual(r$.qty({ exact: 3, greedy: false }, "A", "B").toString(), "(?:AB){3}?");
    assert.strictEqual(r$.qty({ min: 2 }, "A", "B").toString(), "(?:AB){2,}");
    assert.strictEqual(r$.qty({ min: 2, max: 5 }, "A", "B").toString(), "(?:AB){2,5}");
    assert.strictEqual(r$.qty({ min: 2, max: 5, greedy: false }, "A", "B").toString(), "(?:AB){2,5}?");
  });

  test("or", () => {
    const r$ = createDesigner();
    assert.strictEqual(r$.or("cat", "dog").toString(), "cat|dog");
    assert.strictEqual(r$.or("A", "B").toString(), "A|B");
    assert.strictEqual(r$.or("foo", "bar", r$.raw("baz")).toString(), "foo|bar|\\x62az");
  });
});
