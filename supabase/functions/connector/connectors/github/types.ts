export interface GitHubUser {
  login: string;
  id: number;
  node_id: string;
  avatar_url: string;
  gravatar_id: string;
  url: string;
  html_url: string;
  followers_url: string;
  following_url: string;
  gists_url: string;
  starred_url: string;
  subscriptions_url: string;
  organizations_url: string;
  repos_url: string;
  events_url: string;
  received_events_url: string;
  type: string;
  site_admin: boolean;
  name?: string;
  company?: string;
  blog?: string;
  location?: string;
  email?: string;
  hireable?: boolean;
  bio?: string;
  twitter_username?: string;
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
  created_at: string;
  updated_at: string;
}

export interface GitHubRepository {
  id: number;
  node_id: string;
  name: string;
  full_name: string;
  private: boolean;
  owner: GitHubUser;
  html_url: string;
  description?: string;
  fork: boolean;
  url: string;
  forks_url: string;
  keys_url: string;
  collaborators_url: string;
  teams_url: string;
  hooks_url: string;
  issue_events_url: string;
  events_url: string;
  assignees_url: string;
  branches_url: string;
  tags_url: string;
  blobs_url: string;
  git_tags_url: string;
  git_refs_url: string;
  trees_url: string;
  statuses_url: string;
  languages_url: string;
  stargazers_url: string;
  contributors_url: string;
  subscribers_url: string;
  subscription_url: string;
  commits_url: string;
  git_commits_url: string;
  comments_url: string;
  issue_comment_url: string;
  contents_url: string;
  compare_url: string;
  merges_url: string;
  archive_url: string;
  downloads_url: string;
  issues_url: string;
  pulls_url: string;
  milestones_url: string;
  notifications_url: string;
  labels_url: string;
  releases_url: string;
  deployments_url: string;
  created_at: string;
  updated_at: string;
  pushed_at: string;
  git_url: string;
  ssh_url: string;
  clone_url: string;
  svn_url: string;
  homepage?: string;
  size: number;
  stargazers_count: number;
  watchers_count: number;
  language?: string;
  has_issues: boolean;
  has_projects: boolean;
  has_downloads: boolean;
  has_wiki: boolean;
  has_pages: boolean;
  has_discussions: boolean;
  forks_count: number;
  mirror_url?: string;
  archived: boolean;
  disabled: boolean;
  open_issues_count: number;
  license?: {
    key: string;
    name: string;
    spdx_id: string;
    url?: string;
    node_id: string;
  };
  allow_forking: boolean;
  is_template: boolean;
  web_commit_signoff_required: boolean;
  topics: string[];
  visibility: string;
  forks: number;
  open_issues: number;
  watchers: number;
  default_branch: string;
}

export interface GitHubIssue {
  id: number;
  node_id: string;
  url: string;
  repository_url: string;
  labels_url: string;
  comments_url: string;
  events_url: string;
  html_url: string;
  number: number;
  state: "open" | "closed";
  title: string;
  body?: string;
  user: GitHubUser;
  labels: GitHubLabel[];
  assignee?: GitHubUser;
  assignees: GitHubUser[];
  milestone?: GitHubMilestone;
  locked: boolean;
  active_lock_reason?: string;
  comments: number;
  pull_request?: {
    url: string;
    html_url: string;
    diff_url: string;
    patch_url: string;
  };
  closed_at?: string;
  created_at: string;
  updated_at: string;
  closed_by?: GitHubUser;
  author_association: string;
  state_reason?: string;
}

export interface GitHubLabel {
  id: number;
  node_id: string;
  url: string;
  name: string;
  color: string;
  default: boolean;
  description?: string;
}

export interface GitHubMilestone {
  url: string;
  html_url: string;
  labels_url: string;
  id: number;
  node_id: string;
  number: number;
  state: "open" | "closed";
  title: string;
  description?: string;
  creator: GitHubUser;
  open_issues: number;
  closed_issues: number;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  due_on?: string;
}

export interface GitHubPullRequest {
  url: string;
  id: number;
  node_id: string;
  html_url: string;
  diff_url: string;
  patch_url: string;
  issue_url: string;
  commits_url: string;
  review_comments_url: string;
  review_comment_url: string;
  comments_url: string;
  statuses_url: string;
  number: number;
  state: "open" | "closed";
  locked: boolean;
  title: string;
  user: GitHubUser;
  body?: string;
  labels: GitHubLabel[];
  milestone?: GitHubMilestone;
  active_lock_reason?: string;
  created_at: string;
  updated_at: string;
  closed_at?: string;
  merged_at?: string;
  merge_commit_sha?: string;
  assignee?: GitHubUser;
  assignees: GitHubUser[];
  requested_reviewers: GitHubUser[];
  requested_teams: any[];
  head: GitHubPullRequestBranch;
  base: GitHubPullRequestBranch;
  _links: {
    self: { href: string };
    html: { href: string };
    issue: { href: string };
    comments: { href: string };
    review_comments: { href: string };
    review_comment: { href: string };
    commits: { href: string };
    statuses: { href: string };
  };
  author_association: string;
  draft: boolean;
  merged: boolean;
  mergeable?: boolean;
  rebaseable?: boolean;
  mergeable_state: string;
  merged_by?: GitHubUser;
  comments: number;
  review_comments: number;
  maintainer_can_modify: boolean;
  commits: number;
  additions: number;
  deletions: number;
  changed_files: number;
}

export interface GitHubPullRequestBranch {
  label: string;
  ref: string;
  sha: string;
  user: GitHubUser;
  repo: GitHubRepository;
}

export interface GitHubCommit {
  url: string;
  sha: string;
  node_id: string;
  html_url: string;
  comments_url: string;
  commit: {
    url: string;
    author: GitHubCommitAuthor;
    committer: GitHubCommitAuthor;
    message: string;
    tree: { sha: string; url: string };
    comment_count: number;
    verification: {
      verified: boolean;
      reason: string;
      signature?: string;
      payload?: string;
    };
  };
  author?: GitHubUser;
  committer?: GitHubUser;
  parents: { sha: string; url: string; html_url: string }[];
  stats?: {
    additions: number;
    deletions: number;
    total: number;
  };
  files?: GitHubCommitFile[];
}

export interface GitHubCommitAuthor {
  name: string;
  email: string;
  date: string;
}

export interface GitHubCommitFile {
  sha: string;
  filename: string;
  status: "added" | "removed" | "modified" | "renamed" | "copied" | "changed" | "unchanged";
  additions: number;
  deletions: number;
  changes: number;
  blob_url: string;
  raw_url: string;
  contents_url: string;
  patch?: string;
}

export interface GitHubWebhook {
  id: number;
  type: "Repository";
  name: "web";
  active: boolean;
  events: string[];
  config: {
    url: string;
    content_type: "json" | "form";
    insecure_ssl: "0" | "1";
    secret?: string;
  };
  updated_at: string;
  created_at: string;
  url: string;
  test_url: string;
  ping_url: string;
  last_response: {
    code: number;
    status: string;
    message: string;
  };
}

export interface GitHubWebhookPayload {
  action?: string;
  issue?: GitHubIssue;
  pull_request?: GitHubPullRequest;
  repository?: GitHubRepository;
  sender: GitHubUser;
  organization?: GitHubUser;
  installation?: { id: number };
}

export type GitHubWebhookEvent =
  | "push"
  | "pull_request"
  | "pull_request_review"
  | "pull_request_review_comment"
  | "issues"
  | "issue_comment"
  | "release"
  | "workflow_run"
  | "workflow_job"
  | "repository"
  | "star"
  | "fork"
  | "watch"
  | "create"
  | "delete"
  | "public"
  | "gollum"
  | "member"
  | "membership"
  | "team"
  | "team_add"
  | "label"
  | "milestone"
  | "project"
  | "project_card"
  | "project_column"
  | "check_run"
  | "check_suite"
  | "code_scanning_alert"
  | "dependabot_alert"
  | "secret_scanning_alert"
  | "discussion"
  | "discussion_comment";

export interface GitHubRateLimit {
  limit: number;
  remaining: number;
  reset: number;
  used: number;
  resource: string;
}