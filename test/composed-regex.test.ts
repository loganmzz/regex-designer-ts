import assert from 'node:assert/strict';
import { suite, test } from 'node:test';
import create from '@regex-designer/js';

const r$ = create();

suite('built regular expressions', () => {
  test('matches valid IPv4 addresses only', () => {
    const octet = r$.or('25[0-5]', '2[0-4][0-9]', '1[0-9]{2}', '[1-9]?[0-9]');
    const ipv4 = r$.tpl('^', r$.group(false, octet), r$.qty(3, r$.raw('.'), r$.group(false, octet)), '$')();

    assert.strictEqual(ipv4.test('0.0.0.0'), true);
    assert.strictEqual(ipv4.test('192.168.1.255'), true);
    assert.strictEqual(ipv4.test('256.1.2.3'), false);
    assert.strictEqual(ipv4.test('01.2.3.4'), false);
    assert.strictEqual(ipv4.test('1.2.3.4.5'), false);
  });

  test('matches a repeated word, ignoring case', () => {
    const word = r$.qty([1, Infinity], /[a-z]/);
    const repeatedWord = r$.tpl('^\\b', r$.group(true, word), '\\s+', r$.ref(1), '\\b$')('i');

    assert.strictEqual(repeatedWord.test('echo ECHO'), true);
    assert.strictEqual(repeatedWord.test('echo echoing'), false);
    assert.strictEqual(repeatedWord.test('echo silence'), false);
  });

  test('matches hyphen-separated slugs without empty segments', () => {
    const segment = r$.qty([1, Infinity], /[a-z0-9]/);
    const slug = r$.tpl('^', segment, r$.qty([0, Infinity], '-', segment), '$')();

    assert.strictEqual(slug.test('regex-builder-2'), true);
    assert.strictEqual(slug.test('a'), true);
    assert.strictEqual(slug.test('-regex'), false);
    assert.strictEqual(slug.test('regex--builder'), false);
    assert.strictEqual(slug.test('regex-'), false);
  });
});