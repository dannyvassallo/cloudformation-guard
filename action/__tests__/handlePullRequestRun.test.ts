import { SarifRun } from 'cfn-guard';
import * as github from '@actions/github';
import * as getConfig from '../src/getConfig';
import { handlePullRequestRun } from '../src/handlePullRequestRun';
import { describe, expect, jest, beforeEach, it } from '@jest/globals'

jest.mock('../src/getConfig');

describe('handlePullRequestRun', () => {
  // @ts-ignore don't need a full report
  const mockSarifRun: SarifRun = {
    results: [
      {
        locations: [
          {
            physicalLocation: {
              artifactLocation: {
                uri: 'file1.yaml',
              },
              region: {
                startLine: 10,
                startColumn: 5,
              },
            },
          },
        ],
        message: {
          text: 'Violation message 1',
        },
        level: 'error',
        ruleId: 'rule1',
      },
      {
        locations: [
          {
            physicalLocation: {
              artifactLocation: {
                uri: 'file2.yaml',
              },
              region: {
                startLine: 15,
                startColumn: 8,
              },
            },
          },
        ],
        level: 'error',
        message: {
          text: 'Violation message 2',
        },
        ruleId: 'rule2',
      },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(getConfig, 'getConfig').mockReturnValue({
      token: 'test-token',
      createReview: true,
    } as getConfig.Config);
  });

  it('should throw an error if the pull request context is not found', async () => {
    await expect(handlePullRequestRun({ run: mockSarifRun })).rejects.toThrow(
      'Tried to handle pull request result but could not find PR context.'
    );
  });

  it('should handle the pull request run successfully', async () => {
    github.context.payload = { pull_request: { number: 123 } };
    jest.spyOn(github.context, 'repo', 'get').mockReturnValue({
      owner: 'owner',
      repo: 'repo',
    } as any)
    jest.spyOn(github, 'getOctokit').mockReturnValue({
      rest: {
        pulls: {
          // @ts-ignore
          listFiles: jest.fn().mockResolvedValue({
            data: [
              { filename: 'file1.yaml' },
              { filename: 'file2.yaml' },
              { filename: 'file3.yaml' },
            ],
          }),
          createReview: jest.fn(),
        },
      },
    } as any);

    const result = await handlePullRequestRun({ run: mockSarifRun });

    expect(getConfig.default).toHaveBeenCalled();
    expect(github.getOctokit).toHaveBeenCalledWith('test-token');
    expect(result).toEqual([
      [
        '❌ file1.yaml:L10,C5',
        'Violation message 1',
        'rule1',
      ],
      [
        '❌ file2.yaml:L15,C8',
        'Violation message 2',
        'rule2',
      ],
    ]);
  });
});
