import * as core from '@actions/core';
import getConfig, { Config } from '../src/getConfig';
import { describe, expect, jest, beforeEach, it, afterEach } from '@jest/globals';

describe('getConfig', () => {
  it('should return the correct config values', () => {
    jest.spyOn(core, 'getInput').mockImplementation((name) => {
      switch (name) {
        case 'rules':
          return 'test-rules-path';
        case 'data':
          return 'test-data-path';
        case 'token':
          return 'test-token';
        case 'checkout':
          return 'true';
        case 'analyze':
          return 'true';
        case 'create-review':
          return 'false';
        default:
          return '';
      }
    });

    jest.spyOn(core, 'getBooleanInput').mockImplementation((name) => {
      switch (name) {
        case 'checkout':
          return true;
        case 'analyze':
          return true;
        case 'create-review':
          return false;
        default:
          return false;
      }
    });

    const config: Config = getConfig();

    expect(core.getInput).toHaveBeenCalledWith('rules');
    expect(core.getInput).toHaveBeenCalledWith('data');
    expect(core.getInput).toHaveBeenCalledWith('token');
    expect(core.getBooleanInput).toHaveBeenCalledWith('checkout');
    expect(core.getBooleanInput).toHaveBeenCalledWith('analyze');
    expect(core.getBooleanInput).toHaveBeenCalledWith('create-review');

    expect(config).toEqual({
      rulesPath: 'test-rules-path',
      dataPath: 'test-data-path',
      token: 'test-token',
      checkout: true,
      analyze: true,
      createReview: false,
    });
  });
});
