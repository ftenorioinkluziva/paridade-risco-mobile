/**
 * @fileoverview Linear GraphQL API Adapter
 *
 * Synchronizes AIOX stories with Linear issues using the public GraphQL API.
 */

const fs = require('fs');
const https = require('https');
const yaml = require('js-yaml');
const { PMAdapter } = require('../../scripts/pm-adapter');

const GRAPHQL_ENDPOINT = 'https://api.linear.app/graphql';

function looksLikeUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value.trim());
}

function resolveConfigValue(envKey, configValue) {
  if (process.env[envKey]) {
    return process.env[envKey];
  }

  if (typeof configValue !== 'string') {
    return configValue;
  }

  if (/^\$\{.+\}$/.test(configValue.trim())) {
    return undefined;
  }

  return configValue;
}

function resolveBoolean(envKey, configValue, defaultValue = false) {
  const rawValue = process.env[envKey];
  if (typeof rawValue === 'string') {
    return ['1', 'true', 'yes', 'on'].includes(rawValue.toLowerCase());
  }

  if (typeof configValue === 'boolean') {
    return configValue;
  }

  return defaultValue;
}

function normalizeStatus(status) {
  if (!status) {
    return 'Draft';
  }

  const normalized = String(status)
    .replace(/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

  if (normalized.includes('done') || normalized.includes('completed')) {
    return 'Done';
  }

  if (normalized.includes('review') || normalized.includes('qa')) {
    return 'Review';
  }

  if (normalized.includes('progress') || normalized.includes('started') || normalized.includes('doing')) {
    return 'InProgress';
  }

  if (normalized.includes('blocked')) {
    return 'Blocked';
  }

  return 'Draft';
}

function extractFrontmatter(content) {
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterMatch) {
    return {};
  }

  try {
    return yaml.load(frontmatterMatch[1]) || {};
  } catch (_error) {
    return {};
  }
}

function buildTitleFromContent(content, frontmatter) {
  const headingMatch = content.match(/^#\s+Story\s+([^:]+):\s+(.+)$/m);
  if (headingMatch) {
    return `Story ${headingMatch[1].trim()}: ${headingMatch[2].trim()}`;
  }

  if (frontmatter.id && frontmatter.title) {
    return `Story ${frontmatter.id}: ${frontmatter.title}`;
  }

  return frontmatter.title || 'Untitled Story';
}

function extractStoryId(content, frontmatter) {
  if (frontmatter.id) {
    return String(frontmatter.id).trim();
  }

  const storyIdLine = content.match(/\*\*Story ID:\*\*\s+(.+)/);
  if (storyIdLine) {
    return storyIdLine[1].trim();
  }

  const headingMatch = content.match(/^#\s+Story\s+([^:]+):/m);
  if (headingMatch) {
    return headingMatch[1].trim();
  }

  return undefined;
}

function extractStatus(content, frontmatter) {
  if (frontmatter.status) {
    return normalizeStatus(frontmatter.status);
  }

  const statusMatch = content.match(/\*\*Status:\*\*\s+(.+)/);
  if (statusMatch) {
    return normalizeStatus(statusMatch[1]);
  }

  return 'Draft';
}

function extractBody(content) {
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  return frontmatterMatch ? content.slice(frontmatterMatch[0].length).trim() : content.trim();
}

class LinearAdapter extends PMAdapter {
  constructor(config = {}) {
    super(config);

    this.apiToken = resolveConfigValue('LINEAR_API_KEY', config.api_key);
    this.teamId = resolveConfigValue('LINEAR_TEAM_ID', config.team_id);
    this.teamKey = resolveConfigValue('LINEAR_TEAM_KEY', config.team_key);
    this.teamName = resolveConfigValue('LINEAR_TEAM_NAME', config.team_name);
    this.projectId = resolveConfigValue('LINEAR_PROJECT_ID', config.project_id);
    this.projectName = resolveConfigValue('LINEAR_PROJECT_NAME', config.project_name);
    this.projectUrl = resolveConfigValue('LINEAR_PROJECT_URL', config.project_url);
    this.autoAssignActiveCycle = resolveBoolean(
      'LINEAR_AUTO_ASSIGN_ACTIVE_CYCLE',
      config.auto_assign_active_cycle,
      true,
    );
    this.stateMapping = config.state_mapping || {};
    this.stateCache = null;

    if (!this.apiToken) {
      console.warn('⚠️  LINEAR_API_KEY not set - Linear operations will fail');
    }
  }

  async syncStory(storyPath) {
    try {
      if (!fs.existsSync(storyPath)) {
        return { success: false, error: `Story file not found: ${storyPath}` };
      }

      const story = this._parseStoryFile(storyPath);
      if (!story.id) {
        return { success: false, error: 'Invalid story file: could not determine story id' };
      }

      const issue = await this._findIssueByStoryId(story.id);
      const projectId = await this._resolveProjectId();
      const stateId = await this._resolveStateId(story.status);
      const cycleId = await this._resolveActiveCycleId();

      const result = issue
        ? await this._updateIssue(issue.id, story, { projectId, stateId, cycleId })
        : await this._createIssue(story, { projectId, stateId, cycleId });

      return {
        success: true,
        url: result.url,
        metadata: this._buildResultMetadata(result),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async pullStory(storyId) {
    try {
      const issue = await this._findIssueByStoryId(storyId);
      if (!issue) {
        return {
          success: false,
          error: `Linear issue not found for story ${storyId}`,
        };
      }

      return {
        success: true,
        updates: {
          status: this._mapLinearStateToStoryStatus(issue.state),
          url: issue.url,
          cycle: issue.cycle ? issue.cycle.name : null,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async createStory(storyData) {
    try {
      if (!storyData || !storyData.id) {
        return {
          success: false,
          error: 'Story data missing required field: id',
        };
      }

      const story = this._normalizeStoryData(storyData);
      const createdIssue = await this._createIssue(story, {
        projectId: await this._resolveProjectId(),
        stateId: await this._resolveStateId(story.status),
        cycleId: await this._resolveActiveCycleId(),
      });

      return {
        success: true,
        url: createdIssue.url,
        metadata: this._buildResultMetadata(createdIssue),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async updateStatus(storyId, status) {
    try {
      const issue = await this._findIssueByStoryId(storyId);
      if (!issue) {
        return {
          success: false,
          error: `Linear issue not found for story ${storyId}`,
        };
      }

      const stateId = await this._resolveStateId(status);
      if (!stateId) {
        return {
          success: false,
          error: `Could not map story status '${status}' to a Linear workflow state`,
        };
      }

      await this._graphql(
        `mutation UpdateIssueStatus($id: String!, $input: IssueUpdateInput!) {
          issueUpdate(id: $id, input: $input) {
            success
            issue {
              id
              identifier
              url
              state {
                id
                name
                type
              }
              cycle {
                id
                name
              }
              project {
                id
                name
              }
              team {
                id
                key
                name
              }
            }
          }
        }`,
        {
          id: issue.id,
          input: { stateId },
        },
      );

      const refreshedIssue = await this._findIssueByStoryId(storyId);

      return {
        success: true,
        url: refreshedIssue ? refreshedIssue.url : undefined,
        metadata: refreshedIssue ? this._buildResultMetadata(refreshedIssue) : undefined,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  async testConnection() {
    try {
      await this._graphql(
        `query ViewerAndTeams {
          viewer {
            id
          }
          teams {
            nodes {
              id
              key
              name
            }
          }
        }`,
      );

      await this._resolveTeamId();
      await this._resolveProjectId();

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  getName() {
    return 'Linear';
  }

  _parseStoryFile(storyPath) {
    const fileContent = fs.readFileSync(storyPath, 'utf8');
    const frontmatter = extractFrontmatter(fileContent);
    const id = extractStoryId(fileContent, frontmatter);
    const title = buildTitleFromContent(fileContent, frontmatter);
    const status = extractStatus(fileContent, frontmatter);
    const markdownBody = extractBody(fileContent);

    return {
      id,
      title,
      status,
      path: storyPath,
      fullMarkdown: markdownBody,
      description: this._buildIssueDescription({
        id,
        path: storyPath,
        fullMarkdown: markdownBody,
      }),
    };
  }

  _normalizeStoryData(storyData) {
    const title = storyData.title ? `Story ${storyData.id}: ${storyData.title}` : `Story ${storyData.id}`;
    const body = storyData.fullMarkdown || storyData.description || '';

    return {
      id: String(storyData.id),
      title,
      status: normalizeStatus(storyData.status || 'Draft'),
      path: storyData.path,
      fullMarkdown: body,
      description: this._buildIssueDescription({
        id: String(storyData.id),
        path: storyData.path,
        fullMarkdown: body,
      }),
    };
  }

  _buildIssueDescription(story) {
    const metadataBlock = [
      '<!-- AIOX-LINEAR-SYNC:START -->',
      `AIOX Story ID: ${story.id}`,
      story.path ? `Story Path: ${story.path}` : null,
      '<!-- AIOX-LINEAR-SYNC:END -->',
      '',
    ].filter(Boolean).join('\n');

    return `${metadataBlock}${story.fullMarkdown || ''}`.trim();
  }

  _storyMarker(storyId) {
    return `AIOX Story ID: ${storyId}`;
  }

  async _resolveTeamId() {
    if (looksLikeUuid(this.teamId)) {
      return this.teamId;
    }

    if (this.teamId && !this.teamKey && !this.teamName) {
      this.teamKey = this.teamId;
      this.teamName = this.teamId;
      this.teamId = undefined;
    }

    if (!this.teamKey && !this.teamName) {
      throw new Error('Linear team is not configured. Set LINEAR_TEAM_ID or team_key/team_name.');
    }

    const data = await this._graphql(
      `query Teams {
        teams {
          nodes {
            id
            key
            name
          }
        }
      }`,
    );

    const team = data.teams.nodes.find(node => {
      if (this.teamKey && String(node.key).toLowerCase() === String(this.teamKey).toLowerCase()) {
        return true;
      }

      if (this.teamName && String(node.name).toLowerCase() === String(this.teamName).toLowerCase()) {
        return true;
      }

      return false;
    });

    if (!team) {
      throw new Error('Could not resolve configured Linear team');
    }

    this.teamId = team.id;
    return this.teamId;
  }

  async _resolveProjectId() {
    if (this.projectId) {
      return this.projectId;
    }

    if (!this.projectName && !this.projectUrl) {
      return undefined;
    }

    const data = await this._graphql(
      `query Projects {
        projects(first: 100) {
          nodes {
            id
            name
            url
          }
        }
      }`,
    );

    const project = data.projects.nodes.find(node => {
      if (this.projectUrl && node.url === this.projectUrl) {
        return true;
      }

      if (this.projectName && String(node.name).toLowerCase() === String(this.projectName).toLowerCase()) {
        return true;
      }

      return false;
    });

    if (!project) {
      throw new Error('Could not resolve configured Linear project');
    }

    this.projectId = project.id;
    return this.projectId;
  }

  async _resolveActiveCycleId() {
    if (!this.autoAssignActiveCycle) {
      return undefined;
    }

    try {
      const teamId = await this._resolveTeamId();
      const data = await this._graphql(
        `query ActiveCycles($teamId: ID!) {
          cycles(filter: { team: { id: { eq: $teamId } }, isActive: { eq: true } }) {
            nodes {
              id
            }
          }
        }`,
        { teamId },
      );

      return data.cycles.nodes[0] ? data.cycles.nodes[0].id : undefined;
    } catch (_error) {
      return undefined;
    }
  }

  async _resolveStateId(status) {
    const normalizedStatus = normalizeStatus(status);
    const teamId = await this._resolveTeamId();

    if (!this.stateCache) {
      const data = await this._graphql(
        `query WorkflowStates {
          workflowStates {
            nodes {
              id
              name
              type
              team {
                id
              }
            }
          }
        }`,
      );

      this.stateCache = data.workflowStates.nodes.filter(state => state.team && state.team.id === teamId);
    }

    const configuredName = this.stateMapping[normalizedStatus];
    if (configuredName) {
      const configuredState = this.stateCache.find(state => state.name.toLowerCase() === configuredName.toLowerCase());
      if (configuredState) {
        return configuredState.id;
      }
    }

    const preferredNames = {
      Draft: ['Backlog', 'Todo', 'Triage'],
      InProgress: ['In Progress', 'Doing', 'Started'],
      Review: ['In Review', 'Review', 'Ready for QA', 'QA'],
      Done: ['Done', 'Completed'],
      Blocked: ['Blocked'],
    };

    const preferredState = this.stateCache.find(state =>
      (preferredNames[normalizedStatus] || []).some(name => state.name.toLowerCase() === name.toLowerCase()),
    );

    if (preferredState) {
      return preferredState.id;
    }

    const fallbackType = {
      Draft: ['backlog', 'unstarted', 'triage'],
      InProgress: ['started'],
      Review: ['started'],
      Done: ['completed'],
      Blocked: ['started'],
    };

    const fallbackState = this.stateCache.find(state =>
      (fallbackType[normalizedStatus] || []).includes(String(state.type).toLowerCase()),
    );

    return fallbackState ? fallbackState.id : undefined;
  }

  _mapLinearStateToStoryStatus(state) {
    const name = state && state.name ? state.name.toLowerCase() : '';
    const type = state && state.type ? String(state.type).toLowerCase() : '';

    if (type === 'completed' || name.includes('done')) {
      return 'Done';
    }

    if (name.includes('review') || name.includes('qa')) {
      return 'Review';
    }

    if (type === 'started' || name.includes('progress')) {
      return 'InProgress';
    }

    return 'Draft';
  }

  async _findIssueByStoryId(storyId) {
    const teamId = await this._resolveTeamId();
    const projectId = await this._resolveProjectId();
    const marker = this._storyMarker(storyId);

    const query = projectId
      ? `query FindIssue($teamId: ID!, $projectId: ID!, $marker: String!) {
          issues(first: 10, filter: {
            team: { id: { eq: $teamId } }
            project: { id: { eq: $projectId } }
            description: { contains: $marker }
          }) {
            nodes {
              id
              identifier
              title
              url
              state { id name type }
              cycle { id name }
              project { id name }
              team { id key name }
            }
          }
        }`
      : `query FindIssue($teamId: ID!, $marker: String!) {
          issues(first: 10, filter: {
            team: { id: { eq: $teamId } }
            description: { contains: $marker }
          }) {
            nodes {
              id
              identifier
              title
              url
              state { id name type }
              cycle { id name }
              project { id name }
              team { id key name }
            }
          }
        }`;

    const data = await this._graphql(query, projectId ? { teamId, projectId, marker } : { teamId, marker });
    return data.issues.nodes[0] || null;
  }

  async _createIssue(story, { projectId, stateId, cycleId }) {
    const teamId = await this._resolveTeamId();
    const input = {
      teamId,
      title: story.title,
      description: story.description,
    };

    if (projectId) {
      input.projectId = projectId;
    }
    if (stateId) {
      input.stateId = stateId;
    }
    if (cycleId) {
      input.cycleId = cycleId;
    }

    const data = await this._graphql(
      `mutation CreateIssue($input: IssueCreateInput!) {
        issueCreate(input: $input) {
          success
          issue {
            id
            identifier
            title
            url
            state {
              id
              name
              type
            }
            cycle {
              id
              name
            }
            project {
              id
              name
            }
            team {
              id
              key
              name
            }
          }
        }
      }`,
      { input },
    );

    return data.issueCreate.issue;
  }

  async _updateIssue(issueId, story, { projectId, stateId, cycleId }) {
    const input = {
      title: story.title,
      description: story.description,
    };

    if (projectId) {
      input.projectId = projectId;
    }
    if (stateId) {
      input.stateId = stateId;
    }
    if (cycleId) {
      input.cycleId = cycleId;
    }

    const data = await this._graphql(
      `mutation UpdateIssue($id: String!, $input: IssueUpdateInput!) {
        issueUpdate(id: $id, input: $input) {
          success
          issue {
            id
            identifier
            title
            url
            state {
              id
              name
              type
            }
            cycle {
              id
              name
            }
            project {
              id
              name
            }
            team {
              id
              key
              name
            }
          }
        }
      }`,
      {
        id: issueId,
        input,
      },
    );

    return data.issueUpdate.issue;
  }

  async _graphql(query, variables = {}) {
    if (!this.apiToken) {
      throw new Error('LINEAR_API_KEY is required');
    }

    const payload = JSON.stringify({ query, variables });

    return new Promise((resolve, reject) => {
      const request = https.request(
        GRAPHQL_ENDPOINT,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            Authorization: this.apiToken,
          },
        },
        response => {
          let raw = '';
          response.on('data', chunk => {
            raw += chunk;
          });
          response.on('end', () => {
            try {
              const parsed = JSON.parse(raw || '{}');
              if (response.statusCode >= 400) {
                reject(new Error(parsed.message || `Linear API request failed with status ${response.statusCode}`));
                return;
              }

              if (parsed.errors && parsed.errors.length > 0) {
                reject(new Error(parsed.errors.map(error => error.message).join('; ')));
                return;
              }

              resolve(parsed.data);
            } catch (error) {
              reject(error);
            }
          });
        },
      );

      request.on('error', reject);
      request.write(payload);
      request.end();
    });
  }

  _buildResultMetadata(issue) {
    return {
      provider: 'linear',
      issue_id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      url: issue.url,
      state_id: issue.state ? issue.state.id : undefined,
      state_name: issue.state ? issue.state.name : undefined,
      cycle_id: issue.cycle ? issue.cycle.id : undefined,
      cycle_name: issue.cycle ? issue.cycle.name : undefined,
      project_id: issue.project ? issue.project.id : undefined,
      project_name: issue.project ? issue.project.name : undefined,
      team_id: issue.team ? issue.team.id : this.teamId,
      team_key: issue.team ? issue.team.key : this.teamKey,
      team_name: issue.team ? issue.team.name : this.teamName,
      last_sync: new Date().toISOString(),
    };
  }
}

module.exports = { LinearAdapter };
