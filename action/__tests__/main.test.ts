import * as core from '@actions/core';
import * as exec from '@actions/exec';
import * as getConfig from '../src/getConfig';
import { context } from '@actions/github';
import { run } from '../src/main'
import { describe, expect, jest, beforeEach, it, afterEach } from '@jest/globals';

jest.mock('@actions/core');
jest.mock('@actions/exec');

describe('main', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(core, 'getInput').mockImplementation((name) => {
      switch (name) {
        case 'rules':
          return '.';
        case 'data':
          return '.';
        case 'token':
          return 'test-token';
        case 'checkout':
          return 'true';
        case 'analyze':
          return 'false';
        case 'create-review':
          return 'true';
        default:
          return '';
      }
    });
    jest.spyOn(getConfig, 'getConfig').mockReturnValue({
      rulesPath: '.',
      dataPath: '.',
      token: 'test-token',
      checkout: true,
      analyze: false,
      createReview: true,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should checkout the repository with the correct inputs', async () => {
    context.eventName = 'pull_request';
    context.payload = {
      ref: 'refs/heads/main',
      pull_request: {
        number: 123,
      },
        // @ts-ignore Don't need all of the extra props for a repo in this spec
      repository: {
        full_name: 'owner/repo',
      },
    };

    await run();

    expect(core.getInput).toHaveBeenCalledWith('rules');
    expect(core.getInput).toHaveBeenCalledWith('data');
    expect(core.getInput).toHaveBeenCalledWith('token');
    expect(core.getBooleanInput).toHaveBeenCalledWith('checkout');
    expect(core.getBooleanInput).toHaveBeenCalledWith('analyze');
    expect(core.getBooleanInput).toHaveBeenCalledWith('create-review');
    // expect(exec.exec).toHaveBeenCalledWith('git init');
    // expect(exec.exec).toHaveBeenCalledWith('git remote add origin https://github.com/owner/repo.git');
    // expect(exec.exec).toHaveBeenCalledWith('git fetch origin refs/pull/123/merge');
    // expect(exec.exec).toHaveBeenCalledWith('git checkout -qf FETCH_HEAD');
  });
});
