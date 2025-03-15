// Mock implementations
const mockGetInput = jest.fn();
const mockSetOutput = jest.fn();
const mockSetFailed = jest.fn();
const mockInfo = jest.fn();
const mockError = jest.fn();
const mockWarning = jest.fn();

jest.mock('@actions/core', () => ({
  getInput: mockGetInput,
  setOutput: mockSetOutput,
  setFailed: mockSetFailed,
  info: mockInfo,
  error: mockError,
  warning: mockWarning
}));

const mockOctokit = {
  rest: {
    pulls: {
      get: jest.fn(),
      listCommits: jest.fn(),
      create: jest.fn()
    },
    git: {
      getRef: jest.fn(),
      createRef: jest.fn(),
      deleteRef: jest.fn()
    },
    repos: {
      merge: jest.fn()
    }
  }
};

jest.mock('@actions/github', () => ({
  context: {
    repo: {
      owner: 'test-owner',
      repo: 'test-repo'
    }
  },
  getOctokit: () => mockOctokit
}));

describe('Cherry Pick Action', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.resetModules();
    jest.clearAllMocks();

    // Setup mock implementations
    mockGetInput.mockImplementation((name: string) => {
      switch (name) {
        case 'pr_number':
          return '123';
        case 'target_branch':
          return 'main';
        case 'github_token':
          return 'fake-token';
        default:
          return '';
      }
    });

    mockOctokit.rest.pulls.get.mockResolvedValue({
      data: {
        html_url: 'https://github.com/test-owner/test-repo/pull/123'
      }
    });

    mockOctokit.rest.pulls.listCommits.mockResolvedValue({
      data: [
        {
          sha: 'abc123',
          commit: { message: 'Test commit' }
        }
      ]
    });

    mockOctokit.rest.pulls.create.mockResolvedValue({
      data: {
        number: 456,
        html_url: 'https://github.com/test-owner/test-repo/pull/456'
      }
    });

    mockOctokit.rest.git.getRef.mockResolvedValue({
      data: { object: { sha: 'base-sha' } }
    });

    mockOctokit.rest.git.createRef.mockResolvedValue({});
    mockOctokit.rest.git.deleteRef.mockResolvedValue({});
    mockOctokit.rest.repos.merge.mockResolvedValue({});
  });

  it('should successfully cherry-pick PR', async () => {
    const { run } = await import('./index');
    await run();

    expect(mockOctokit.rest.git.createRef).toHaveBeenCalled();
    expect(mockOctokit.rest.repos.merge).toHaveBeenCalled();
    expect(mockOctokit.rest.pulls.create).toHaveBeenCalled();

    expect(mockSetOutput).toHaveBeenCalledWith('cherry_pick_pr_url', 'https://github.com/test-owner/test-repo/pull/456');
    expect(mockSetOutput).toHaveBeenCalledWith('cherry_pick_pr_number', 456);
  });

  it('should handle cherry-pick conflicts', async () => {
    mockOctokit.rest.repos.merge.mockRejectedValue(new Error('Merge conflict'));

    const { run } = await import('./index');
    await run();

    expect(mockError).toHaveBeenCalledWith('Conflicts detected during cherry-pick');
    expect(mockOctokit.rest.git.deleteRef).toHaveBeenCalled();
  });
}); 
