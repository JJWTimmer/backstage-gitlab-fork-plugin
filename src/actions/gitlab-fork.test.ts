import { createGitlabForkAction } from './gitlab-fork';
import { ScmIntegrations } from '@backstage/integration';
import { ConfigReader } from '@backstage/config';
import { PassThrough } from 'stream';
import { Gitlab } from '@gitbeaker/rest';
import { InputError } from '@backstage/errors';

jest.mock('@gitbeaker/rest');

describe('createGitlabForkAction', () => {
  const mockGitlabInstance = {
    Projects: {
      fork: jest.fn(),
      show: jest.fn(),
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (Gitlab as jest.MockedClass<typeof Gitlab>).mockImplementation(() => mockGitlabInstance as any);
  });

  const mockContext = {
    input: {
      projectId: 'test-group/test-project',
      token: 'glpat-test-token',
      baseUrl: 'https://gitlab.com',
    },
    output: jest.fn(),
    logger: {
      info: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
      debug: jest.fn(),
    },
    logStream: new PassThrough(),
    workspacePath: '/tmp/test',
  };

  const integrations = ScmIntegrations.fromConfig(
    new ConfigReader({
      integrations: {
        gitlab: [
          {
            host: 'gitlab.com',
            token: 'test-token',
          },
        ],
      },
    })
  );

  it('should create a GitLab fork action', () => {
    const action = createGitlabForkAction({ integrations });
    expect(action.id).toBe('gitlab:project:fork');
  });

  it('should fork a project successfully', async () => {
    const mockForkedProject = {
      id: 123,
      path_with_namespace: 'user/forked-project',
      web_url: 'https://gitlab.com/user/forked-project',
      ssh_url_to_repo: 'git@gitlab.com:user/forked-project.git',
      http_url_to_repo: 'https://gitlab.com/user/forked-project.git',
      import_status: 'finished',
    };

    mockGitlabInstance.Projects.fork.mockResolvedValue(mockForkedProject);

    const action = createGitlabForkAction({ integrations });
    await action.handler(mockContext as any);

    expect(mockGitlabInstance.Projects.fork).toHaveBeenCalledWith(
      'test-group/test-project',
      {}
    );
    expect(mockContext.output).toHaveBeenCalledWith('projectId', 123);
    expect(mockContext.output).toHaveBeenCalledWith('projectPath', 'user/forked-project');
    expect(mockContext.output).toHaveBeenCalledWith('projectUrl', 'https://gitlab.com/user/forked-project');
  });

  it('should fork with all optional parameters', async () => {
    const mockForkedProject = {
      id: 456,
      path_with_namespace: 'team/custom-project',
      web_url: 'https://gitlab.com/team/custom-project',
      ssh_url_to_repo: 'git@gitlab.com:team/custom-project.git',
      http_url_to_repo: 'https://gitlab.com/team/custom-project.git',
      import_status: 'finished',
    };

    mockGitlabInstance.Projects.fork.mockResolvedValue(mockForkedProject);

    const action = createGitlabForkAction({ integrations });
    await action.handler({
      ...mockContext,
      input: {
        ...mockContext.input,
        namespace: 'team',
        name: 'custom-project',
        path: 'custom-project',
        description: 'Test description',
        visibility: 'private',
        defaultBranch: 'main',
      },
    } as any);

    expect(mockGitlabInstance.Projects.fork).toHaveBeenCalledWith(
      'test-group/test-project',
      {
        namespace_path: 'team',
        name: 'custom-project',
        path: 'custom-project',
        description: 'Test description',
        visibility: 'private',
        default_branch: 'main',
      }
    );
  });

  it('should use namespace_id for numeric namespace', async () => {
    const mockForkedProject = {
      id: 789,
      path_with_namespace: 'group/project',
      web_url: 'https://gitlab.com/group/project',
      ssh_url_to_repo: 'git@gitlab.com:group/project.git',
      http_url_to_repo: 'https://gitlab.com/group/project.git',
      import_status: 'finished',
    };

    mockGitlabInstance.Projects.fork.mockResolvedValue(mockForkedProject);

    const action = createGitlabForkAction({ integrations });
    await action.handler({
      ...mockContext,
      input: {
        ...mockContext.input,
        namespace: 42,
      },
    } as any);

    expect(mockGitlabInstance.Projects.fork).toHaveBeenCalledWith(
      'test-group/test-project',
      {
        namespace_id: 42,
      }
    );
  });

  it('should poll for fork completion', async () => {
    const mockForkedProject = {
      id: 123,
      path_with_namespace: 'user/forked-project',
      web_url: 'https://gitlab.com/user/forked-project',
      ssh_url_to_repo: 'git@gitlab.com:user/forked-project.git',
      http_url_to_repo: 'https://gitlab.com/user/forked-project.git',
      import_status: 'started',
    };

    const mockCompletedProject = {
      ...mockForkedProject,
      import_status: 'finished',
    };

    mockGitlabInstance.Projects.fork.mockResolvedValue(mockForkedProject);
    mockGitlabInstance.Projects.show
      .mockResolvedValueOnce({ ...mockForkedProject, import_status: 'started' })
      .mockResolvedValueOnce(mockCompletedProject);

    const action = createGitlabForkAction({
      integrations,
      pollingIntervalMs: 100,
      maxPollingAttempts: 5,
    });

    await action.handler(mockContext as any);

    expect(mockGitlabInstance.Projects.show).toHaveBeenCalledTimes(2);
    expect(mockContext.output).toHaveBeenCalledWith('projectId', 123);
  });

  it('should handle fork failure', async () => {
    const mockForkedProject = {
      id: 123,
      path_with_namespace: 'user/forked-project',
      web_url: 'https://gitlab.com/user/forked-project',
      ssh_url_to_repo: 'git@gitlab.com:user/forked-project.git',
      http_url_to_repo: 'https://gitlab.com/user/forked-project.git',
      import_status: 'failed',
      import_error: 'Fork failed due to size limit',
    };

    mockGitlabInstance.Projects.fork.mockResolvedValue(mockForkedProject);

    const action = createGitlabForkAction({ integrations });

    await expect(action.handler(mockContext as any)).rejects.toThrow(
      'Fork failed: Fork failed due to size limit'
    );
  });

  it('should handle 404 errors with helpful message', async () => {
    mockGitlabInstance.Projects.fork.mockRejectedValue(
      new Error('404 - Project not found')
    );

    const action = createGitlabForkAction({ integrations });

    await expect(action.handler(mockContext as any)).rejects.toThrow(
      /GitLab project not found.*Please verify the project ID\/path/
    );
  });

  it('should handle 401/403 errors with helpful message', async () => {
    mockGitlabInstance.Projects.fork.mockRejectedValue(
      new Error('401 Unauthorized')
    );

    const action = createGitlabForkAction({ integrations });

    await expect(action.handler(mockContext as any)).rejects.toThrow(
      /GitLab authentication failed.*verify your token/
    );
  });

  it('should handle timeout gracefully', async () => {
    const mockForkedProject = {
      id: 123,
      path_with_namespace: 'user/forked-project',
      web_url: 'https://gitlab.com/user/forked-project',
      ssh_url_to_repo: 'git@gitlab.com:user/forked-project.git',
      http_url_to_repo: 'https://gitlab.com/user/forked-project.git',
      import_status: 'started',
    };

    mockGitlabInstance.Projects.fork.mockResolvedValue(mockForkedProject);
    mockGitlabInstance.Projects.show.mockResolvedValue(mockForkedProject);

    const action = createGitlabForkAction({
      integrations,
      pollingIntervalMs: 10,
      maxPollingAttempts: 2,
    });

    await action.handler(mockContext as any);

    expect(mockContext.logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('Fork is still in progress')
    );
    // Should still output results even if polling times out
    expect(mockContext.output).toHaveBeenCalledWith('projectId', 123);
  });

  it('should throw InputError when no response from API', async () => {
    mockGitlabInstance.Projects.fork.mockResolvedValue(null);

    const action = createGitlabForkAction({ integrations });

    await expect(action.handler(mockContext as any)).rejects.toThrow(InputError);
    await expect(action.handler(mockContext as any)).rejects.toThrow(
      'Failed to fork project - no response from GitLab API'
    );
  });

  it('should use custom baseUrl', async () => {
    const mockForkedProject = {
      id: 123,
      path_with_namespace: 'user/forked-project',
      web_url: 'https://gitlab.custom.com/user/forked-project',
      ssh_url_to_repo: 'git@gitlab.custom.com:user/forked-project.git',
      http_url_to_repo: 'https://gitlab.custom.com/user/forked-project.git',
      import_status: 'finished',
    };

    mockGitlabInstance.Projects.fork.mockResolvedValue(mockForkedProject);

    const action = createGitlabForkAction({ integrations });
    await action.handler({
      ...mockContext,
      input: {
        ...mockContext.input,
        baseUrl: 'https://gitlab.custom.com',
      },
    } as any);

    expect(Gitlab).toHaveBeenCalledWith({
      host: 'https://gitlab.custom.com',
      token: 'glpat-test-token',
    });
  });
});
