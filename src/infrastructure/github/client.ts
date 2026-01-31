import { Octokit } from '@octokit/rest';

/**
 * GitHub API client using Octokit
 * Supports repository operations, PR fetching, and webhook management
 */

export interface GitHubClientOptions {
  token: string;
}

export class GitHubClient {
  private octokit: Octokit;

  constructor(options: GitHubClientOptions) {
    this.octokit = new Octokit({
      auth: options.token,
    });
  }

  /**
   * List repositories accessible to the authenticated user
   */
  async listRepositories(): Promise<Array<{
    id: number;
    name: string;
    full_name: string;
    owner: { login: string };
    private: boolean;
  }>> {
    const { data } = await this.octokit.repos.listForAuthenticatedUser({
      per_page: 100,
    });

    return data.map((repo) => ({
      id: repo.id,
      name: repo.name,
      full_name: repo.full_name,
      owner: { login: repo.owner.login },
      private: repo.private,
    }));
  }

  /**
   * Get Pull Request details
   */
  async getPullRequest(owner: string, repo: string, prNumber: number): Promise<{
    number: number;
    title: string;
    body: string | null;
    user: { login: string };
    html_url: string;
    state: string;
    merged: boolean;
  }> {
    const { data } = await this.octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
    });

    return {
      number: data.number,
      title: data.title,
      body: data.body,
      user: { login: data.user.login },
      html_url: data.html_url,
      state: data.state,
      merged: data.merged ?? false,
    };
  }

  /**
   * Get Pull Request diff
   */
  async getPullRequestDiff(owner: string, repo: string, prNumber: number): Promise<string> {
    const { data } = await this.octokit.pulls.get({
      owner,
      repo,
      pull_number: prNumber,
      mediaType: {
        format: 'diff',
      },
    });

    return data as unknown as string;
  }

  /**
   * Create a webhook for a repository
   */
  async createWebhook(owner: string, repo: string, webhookUrl: string, secret: string): Promise<number> {
    const { data } = await this.octokit.repos.createWebhook({
      owner,
      repo,
      name: 'web',
      config: {
        url: webhookUrl,
        content_type: 'json',
        secret,
      },
      events: ['pull_request'],
      active: true,
    });

    if (!data.id) {
      throw new Error('Failed to create webhook: no webhook ID returned');
    }

    return data.id;
  }

  /**
   * Delete a webhook for a repository
   */
  async deleteWebhook(owner: string, repo: string, webhookId: number): Promise<void> {
    await this.octokit.repos.deleteWebhook({
      owner,
      repo,
      hook_id: webhookId,
    });
  }
}

/**
 * Create a GitHub client instance
 */
export function createGitHubClient(token: string): GitHubClient {
  return new GitHubClient({ token });
}
