import assert from "node:assert/strict";
import {
  suite,
  test,
} from "node:test";

import createDesigner, { RegexDesigner } from "@regex-designer/js";

suite("README", () => {
  test("API example", () => {
    const r$ = createDesigner();
    r$.set("number", r$.qty([1, Infinity], /[0-9]/));
    r$.set("identifier", r$.qty([1, Infinity], /[a-z0-9-]/));

    const template = r$.named(
      "version",
      r$.var("number"), /\./, r$.var("number"), /\./, r$.var("number"),
      r$.opt("-", r$.named("prerelease", r$.var("identifier"))),
    );
    const regex = template("i");
    assert.strictEqual(regex.source, "(?<version>(?:[0-9]){1,}\\.(?:[0-9]){1,}\\.(?:[0-9]){1,}(?:-(?<prerelease>(?:[a-z0-9-]){1,}))?)");
    assert.strictEqual(regex.flags, "i");
    assert.deepStrictEqual(
      { ...regex.exec("12.3.4-beta-1")?.groups },
      {
        version: "12.3.4-beta-1",
        prerelease: "beta-1",
      },
    );
  });

  test("default", () => {
    assert.ok(createDesigner() instanceof RegexDesigner);
  });

  test("set / var", () => {
    const r$ = createDesigner();
    r$.set("word", r$.or("cat", "dog"));
    assert.strictEqual(r$.var("word").toString(), "cat|dog");
  });

  test("tpl", () => {
    const r$ = createDesigner();
    assert.strictEqual(r$.tpl("A", r$.raw("B.C")).toString(), `A${RegExp.escape("B.C")}`);
  });

  test("raw", () => {
    const r$ = createDesigner();
    assert.strictEqual(r$.raw("a.b", "*").toString(), RegExp.escape("a.b*"));
  });

  test("start / end / whole", () => {
    const r$ = createDesigner();
    assert.strictEqual(r$.start("A").toString(), "^(?:A)");
    assert.strictEqual(r$.end("A").toString(), "(?:A)$");
    assert.strictEqual(r$.whole("A").toString(), "^(?:A)$");
  });

  test("group", () => {
    const r$ = createDesigner();
    assert.strictEqual(r$.group(false, "A", "B").toString(), "(?:AB)");
    assert.strictEqual(r$.group({ name: "part" }, "A", "B").toString(), "(?<part>AB)");
    assert.strictEqual(r$.group({ capture: false }, "A", "B").toString(), "(?:AB)");
  });

  test("named", () => {
    const r$ = createDesigner();
    assert.strictEqual(r$.named("value", "A", "B").toString(), "(?<value>AB)");
    assert.strictEqual(r$.named("word", r$.or("cat", "dog")).toString(), "(?<word>cat|dog)");
  });

  test("ref", () => {
    const r$ = createDesigner();
    const numeric = r$.tpl(
      r$.group(true, "B"),
      r$.ref(1),
    );
    const named = r$.tpl(
      r$.named("name", "B"),
      r$.ref("name"),
    );
    assert.strictEqual(numeric.toString(), "(B)\\1");
    assert.strictEqual(named.toString(), "(?<name>B)\\k<name>");
  });

  test("opt", () => {
    const r$ = createDesigner();
    assert.strictEqual(r$.opt("C").toString(), "(?:C)?");
    assert.strictEqual(r$.opt(r$.named("value", "A", "B")).toString(), "(?:(?<value>AB))?");
  });

  test("qty", () => {
    const r$ = createDesigner();
    assert.strictEqual(r$.qty(3, "A", "B").toString(), "(?:AB){3}");
    assert.strictEqual(r$.qty([1, 3], "A", "B").toString(), "(?:AB){1,3}");
    assert.strictEqual(r$.qty({ min: 2, max: 5, greedy: false }, "A", "B").toString(), "(?:AB){2,5}?");
    assert.strictEqual(r$.qty({ exact: 2 }, "A", "B").toString(), "(?:AB){2}");
  });

  test("or", () => {
    const r$ = createDesigner();
    const alt1 = r$.or("A", "B");
    const alt2 = r$.or(/foo/, "bar", r$.raw("baz"));

    assert.strictEqual(alt1.toString(), "A|B");
    assert.strictEqual(alt2.toString(), `foo|bar|${RegExp.escape("baz")}`);
  });

  test("ahead", () => {
    const r$ = createDesigner();
    assert.strictEqual(r$.ahead_pos("foo").toString(), "(?=foo)");
    assert.strictEqual(r$.ahead_neg("bar").toString(), "(?!bar)");
  });

  test("behind", () => {
    const r$ = createDesigner();
    assert.strictEqual(r$.behind_pos("foo").toString(), "(?<=foo)");
    assert.strictEqual(r$.behind_neg("bar").toString(), "(?<!bar)");
  });
});
