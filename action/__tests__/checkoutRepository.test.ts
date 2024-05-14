import * as exec from '@actions/exec';
import { context } from '@actions/github';
import { checkoutRepository } from '../src/checkoutRepository';
import { describe, expect, jest, it, afterEach } from '@jest/globals';

jest.mock('@actions/exec');
jest.mock('@actions/github');

describe('checkoutRepository', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should checkout the pull request ref', async () => {
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

    await checkoutRepository();

    expect(exec.exec).toHaveBeenCalledWith('git init');
    expect(exec.exec).toHaveBeenCalledWith('git remote add origin https://github.com/owner/repo.git');
    expect(exec.exec).toHaveBeenCalledWith('git fetch origin refs/pull/123/merge');
    expect(exec.exec).toHaveBeenCalledWith('git checkout -qf FETCH_HEAD');
  });

  it('should checkout the branch ref', async () => {
    context.eventName = 'push';
    context.payload = {
      ref: 'refs/heads/main',
      // @ts-ignore Don't need all of the extra props for a repo in this spec
      repository: {
        full_name: 'owner/repo',
      },
    };

    await checkoutRepository();

    expect(exec.exec).toHaveBeenCalledWith('git init');
    expect(exec.exec).toHaveBeenCalledWith('git remote add origin https://github.com/owner/repo.git');
    expect(exec.exec).toHaveBeenCalledWith('git fetch origin refs/heads/main');
    expect(exec.exec).toHaveBeenCalledWith('git checkout FETCH_HEAD');
  });

  it('should throw an error if the checkout fails', async () => {
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
    // @ts-ignore Don't need all of the extra props for a repo in this spec
    jest.spyOn(exec, 'exec').mockImplementation(() => {
      throw 'Failed to checkout repository';
    });
    await expect(checkoutRepository()).rejects.toThrow('Error checking out repository: Failed to checkout repository');
  });
});
