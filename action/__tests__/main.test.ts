import * as core from '@actions/core';
import { context } from '@actions/github';
import { run } from '../src/main'
import { describe, expect, it } from '@jest/globals';

describe('main', () => {
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
    expect(core.setOutput).toHaveBeenCalled()
  });
});
