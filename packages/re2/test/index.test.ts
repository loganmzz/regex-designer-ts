import assert from "node:assert/strict";
import {
  suite,
  test,
} from "node:test";

import RE2 from "re2";

import create, { RE2RegexDesigner } from "@regex-designer/re2";

suite("RE2 templates", () => {
  test("does not expose unsupported backreferences or lookarounds", () => {
    const r$ = create();

    assert.equal(r$.ref, undefined);
    assert.equal(r$.ahead, undefined);
    assert.equal(r$.ahead_pos, undefined);
    assert.equal(r$.ahead_neg, undefined);
    assert.equal(r$.behind, undefined);
    assert.equal(r$.behind_pos, undefined);
    assert.equal(r$.behind_neg, undefined);
  });

  test("compiles patterns to RE2 and matches input", () => {
    const r$ = create();
    const regex = r$.whole(r$.qty([1, Infinity], r$.or("cat", "dog")))("i");

    assert.ok(regex instanceof RE2);
    assert.equal(regex.test("CATdog"), true);
    assert.equal(regex.test("cat!"), false);
  });

  test("renders common composition and escapes raw text", () => {
    const r$ = create();
    assert.equal(r$.whole(r$.raw("a.b*")).toString(), "^(?:\\x61\\.b\\*)$");
    assert.equal(r$.named("word", "cat").toString(), "(?P<word>cat)");
  });

  test("supports named captures and scoped flags", () => {
    const r$ = create();
    const regex = r$.tpl(r$.named("word", new RE2("cat", "i")), "-", new RE2("dog", "m"))();

    assert.equal(regex.test("CAT-dog"), true);
    assert.deepEqual({ ...regex.exec("CAT-dog")?.groups }, { word: "CAT" });
  });

  test("keeps variables lazy and isolated per designer", () => {
    const first = new RE2RegexDesigner().set("word", "cat");
    const second = new RE2RegexDesigner().set("word", "dog");

    assert.equal(first.var("word").toString(), "cat");
    assert.equal(second.var("word").toString(), "dog");
    assert.equal(first.var("word")().test("cat"), true);
  });
});
