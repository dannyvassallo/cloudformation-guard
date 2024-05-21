import path from 'path'

jest.mock('@actions/exec', () => {
  const originalModule = jest.requireActual('@actions/exec');

  return {
    __esModule: true,
    ...originalModule,
    exec: jest.fn(),
  };
});

jest.mock('@actions/github', () => {
  const originalModule = jest.requireActual('@actions/github');

  return {
    __esModule: true,
    ...originalModule,
    context: {
      eventName: 'pull_request',
      payload: {
        pull_request: {
          number: 123,
        },
      },
      repo: {
        owner: 'owner',
        repo: 'repo',
      },
    },
    getOctokit: jest.fn().mockReturnValue({
      rest: {
        pulls: {
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
    }),
  };
});

jest.mock('@actions/core', () => {
  const originalModule = jest.requireActual('@actions/core');

  return {
    __esModule: true,
    ...originalModule,
    getInput: jest.fn().mockImplementation((name) => {
      switch (name) {
        case 'rules':
          return path.resolve(__dirname, '../guard/resources/validate/rules-dir');
        case 'data':
          return path.resolve(__dirname, '../guard/resources/validate/data-dir');
        case 'token':
          return 'test-token';
        default:
          return '';
      }
    }),
    getBooleanInput: jest.fn().mockImplementation((name) => {
      switch (name) {
        case 'checkout':
          return 'true';
        case 'analyze':
          return 'false';
        case 'create-review':
          return 'true';
        default:
          return 'false';
      }
    }),
    setOutput: jest.fn(),
    setFailed: jest.fn(),
  };
});
