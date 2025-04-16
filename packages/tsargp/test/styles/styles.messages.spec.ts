import { afterEach, describe, expect, it } from 'bun:test';
import {
  ErrorItem,
  AnsiString,
  AnsiMessage,
  ErrorMessage,
  TextMessage,
  JsonMessage,
} from '../../src/library';

process.env['FORCE_WIDTH'] = '0'; // omit styles

const brightRedStr = '\x1b[91m';
const noColorStr = '\x1b[39m';

describe('AnsiMessage', () => {
  afterEach(() => {
    ['NO_COLOR', 'FORCE_COLOR'].forEach((key) => delete process.env[key]);
    process.env['FORCE_WIDTH'] = '0'; // omit styles
  });

  it('wrap the message while respecting the environment configuration', () => {
    const str = new AnsiString().split('type script');
    const msg = new AnsiMessage(str);
    expect(msg.wrap(0)).toEqual('type script');
    expect(msg.wrap(11)).toEqual('type script');
    process.env['NO_COLOR'] = '1';
    expect(msg.wrap(0)).toEqual('type script');
    expect(msg.wrap(11)).toEqual('type script');
    process.env['FORCE_COLOR'] = '1';
    expect(msg.wrap(0)).toEqual('type script');
    expect(msg.wrap(11)).toEqual('type script');
    process.env['FORCE_WIDTH'] = '10';
    expect(msg.message).toEqual('type\nscript');
  });

  it('produce a string message', () => {
    const str = new AnsiString().split('type script');
    const msg = new AnsiMessage(str);
    expect(msg.message).toEqual('type script');
  });
});

describe('ErrorMessage', () => {
  afterEach(() => {
    process.env['FORCE_WIDTH'] = '0'; // omit styles
  });

  it('wrap the message while respecting the environment configuration', () => {
    const str = new AnsiString().split('type script');
    const msg = new ErrorMessage(str);
    process.env['FORCE_WIDTH'] = '10';
    expect(msg.message).toEqual('type\nscript');
  });

  it('produce a string message', () => {
    const str = new AnsiString().split('type script');
    const msg = new ErrorMessage(str);
    expect(msg.message).toEqual('type script');
  });

  describe('add', () => {
    it('create an error message with an error phrase', () => {
      const msg = new ErrorMessage().add(ErrorItem.missingRequiredOption, {}, 'abc');
      expect(msg.message).toEqual(`Option 'abc' is required.\n`);
    });

    it('create an error message with a custom phrase', () => {
      const msg = new ErrorMessage().add('#0 #1 #2', {}, 0, 'abc', false);
      expect(msg.message).toEqual(`0 'abc' false\n`);
    });

    it('emit styles', () => {
      const msg = new ErrorMessage().add('type  script');
      process.env['FORCE_WIDTH'] = '100';
      expect(msg.message).toEqual(brightRedStr + 'type script\n' + noColorStr);
    });
  });
});

describe('JsonMessage', () => {
  it('produce a string message with serialized JSON', () => {
    const msg = new JsonMessage({ a: 'b', c: 1, d: [true, null] });
    expect(msg.message).toEqual(`[{"a":"b","c":1,"d":[true,null]}]`);
  });
});

describe('TextMessage', () => {
  it('produce a string message with line feeds', () => {
    const msg = new TextMessage('type', 'script');
    expect(msg.message).toEqual('type\nscript');
  });
});
