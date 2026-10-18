import type { UserIntegration, Project, DoorOpening } from "@shared/schema";
import { decryptToken } from "./encryption";

// ============================================================================
// JIRA INTEGRATION SERVICE
// ============================================================================

interface JiraIssue {
  id: string;
  key: string;
  fields: {
    summary: string;
    description?: string;
    status: {
      name: string;
    };
  };
}

export class JiraService {
  private integration: UserIntegration;

  constructor(integration: UserIntegration) {
    if (integration.service !== 'jira') {
      throw new Error('Invalid integration type for Jira service');
    }
    if (!integration.atlassianDomain || !integration.atlassianEmail || !integration.atlassianApiToken) {
      throw new Error('Jira integration missing required credentials');
    }
    this.integration = integration;
  }

  private getAuthHeader(): string {
    // Decrypt token before using
    const decryptedToken = this.integration.atlassianApiToken 
      ? decryptToken(this.integration.atlassianApiToken)
      : '';
    const token = Buffer.from(
      `${this.integration.atlassianEmail}:${decryptedToken}`
    ).toString('base64');
    return `Basic ${token}`;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `https://${this.integration.atlassianDomain}/rest/api/3${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': this.getAuthHeader(),
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Jira API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async createProjectIssue(project: Project, openingsCount: number): Promise<JiraIssue> {
    const description = `
Installation project for ${project.name}

**Details:**
- Location: ${project.location || 'N/A'}
- Building Type: ${project.buildingType || 'N/A'}
- Openings: ${openingsCount}
- Status: ${project.status}

Synced from DoorSurvey Pro
    `.trim();

    const issue = await this.request('/issue', {
      method: 'POST',
      body: JSON.stringify({
        fields: {
          project: {
            key: await this.getDefaultProjectKey(),
          },
          summary: `[Installation] ${project.name}`,
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: description,
                  },
                ],
              },
            ],
          },
          issuetype: {
            name: 'Task',
          },
          labels: ['doorsurvey', 'installation'],
        },
      }),
    });

    return issue;
  }

  async updateProjectIssue(issueKey: string, project: Project, openingsCount: number): Promise<void> {
    const description = `
Installation project for ${project.name}

**Details:**
- Location: ${project.location || 'N/A'}
- Building Type: ${project.buildingType || 'N/A'}
- Openings: ${openingsCount}
- Status: ${project.status}

Last synced: ${new Date().toISOString()}
    `.trim();

    await this.request(`/issue/${issueKey}`, {
      method: 'PUT',
      body: JSON.stringify({
        fields: {
          summary: `[Installation] ${project.name}`,
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: description,
                  },
                ],
              },
            ],
          },
        },
      }),
    });
  }

  private async getDefaultProjectKey(): Promise<string> {
    // Get the first available project
    const projects = await this.request('/project');
    if (!projects || projects.length === 0) {
      throw new Error('No Jira projects found. Please create a project in Jira first.');
    }
    return projects[0].key;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.request('/myself');
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// CONFLUENCE INTEGRATION SERVICE
// ============================================================================

interface ConfluencePage {
  id: string;
  title: string;
  _links: {
    webui: string;
  };
}

export class ConfluenceService {
  private integration: UserIntegration;

  constructor(integration: UserIntegration) {
    if (integration.service !== 'confluence') {
      throw new Error('Invalid integration type for Confluence service');
    }
    if (!integration.atlassianDomain || !integration.atlassianEmail || !integration.atlassianApiToken) {
      throw new Error('Confluence integration missing required credentials');
    }
    this.integration = integration;
  }

  private getAuthHeader(): string {
    // Decrypt token before using
    const decryptedToken = this.integration.atlassianApiToken 
      ? decryptToken(this.integration.atlassianApiToken)
      : '';
    const token = Buffer.from(
      `${this.integration.atlassianEmail}:${decryptedToken}`
    ).toString('base64');
    return `Basic ${token}`;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `https://${this.integration.atlassianDomain}/wiki/rest/api${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': this.getAuthHeader(),
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Confluence API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async createProjectPage(project: Project, openings: DoorOpening[]): Promise<ConfluencePage> {
    const content = this.generateProjectContent(project, openings);
    
    const page = await this.request('/content', {
      method: 'POST',
      body: JSON.stringify({
        type: 'page',
        title: `Installation Project: ${project.name}`,
        space: {
          key: await this.getDefaultSpaceKey(),
        },
        body: {
          storage: {
            value: content,
            representation: 'storage',
          },
        },
      }),
    });

    return page;
  }

  async updateProjectPage(pageId: string, project: Project, openings: DoorOpening[]): Promise<void> {
    const content = this.generateProjectContent(project, openings);
    
    // Get current version
    const currentPage = await this.request(`/content/${pageId}`);
    
    await this.request(`/content/${pageId}`, {
      method: 'PUT',
      body: JSON.stringify({
        version: {
          number: currentPage.version.number + 1,
        },
        title: `Installation Project: ${project.name}`,
        type: 'page',
        body: {
          storage: {
            value: content,
            representation: 'storage',
          },
        },
      }),
    });
  }

  private generateProjectContent(project: Project, openings: DoorOpening[]): string {
    let html = `
<h2>Project Overview</h2>
<table>
  <tr><th>Field</th><th>Value</th></tr>
  <tr><td>Project Name</td><td>${this.escapeHtml(project.name)}</td></tr>
  <tr><td>Location</td><td>${this.escapeHtml(project.location || 'N/A')}</td></tr>
  <tr><td>Building Type</td><td>${this.escapeHtml(project.buildingType || 'N/A')}</td></tr>
  <tr><td>Status</td><td>${this.escapeHtml(project.status)}</td></tr>
  <tr><td>Total Openings</td><td>${openings.length}</td></tr>
</table>

<h2>Door Openings</h2>
<table>
  <tr>
    <th>Opening #</th>
    <th>Location</th>
    <th>Size</th>
    <th>Type</th>
    <th>Frame Rating</th>
  </tr>
`;

    for (const opening of openings) {
      html += `
  <tr>
    <td>${this.escapeHtml(opening.openingNumber || 'N/A')}</td>
    <td>${this.escapeHtml(opening.roomNumber || 'N/A')}</td>
    <td>${opening.doorWidth || '?'} x ${opening.doorHeight || '?'}</td>
    <td>${this.escapeHtml(opening.doorType || 'N/A')}</td>
    <td>${this.escapeHtml(opening.frameFireRating || 'None')}</td>
  </tr>
`;
    }

    html += `
</table>
<p><em>Last synced: ${new Date().toISOString()}</em></p>
`;

    return html;
  }

  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  private async getDefaultSpaceKey(): Promise<string> {
    // Get the first available space
    const spaces = await this.request('/space');
    if (!spaces || !spaces.results || spaces.results.length === 0) {
      throw new Error('No Confluence spaces found. Please create a space in Confluence first.');
    }
    return spaces.results[0].key;
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.request('/space');
      return true;
    } catch {
      return false;
    }
  }
}

// ============================================================================
// NOTION INTEGRATION SERVICE
// ============================================================================

interface NotionPage {
  id: string;
  url: string;
}

export class NotionService {
  private integration: UserIntegration;

  constructor(integration: UserIntegration) {
    if (integration.service !== 'notion') {
      throw new Error('Invalid integration type for Notion service');
    }
    if (!integration.notionApiKey || !integration.notionDatabaseId) {
      throw new Error('Notion integration missing required credentials');
    }
    this.integration = integration;
  }

  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    const url = `https://api.notion.com/v1${endpoint}`;
    
    // Decrypt API key before using
    const decryptedApiKey = this.integration.notionApiKey 
      ? decryptToken(this.integration.notionApiKey)
      : '';
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${decryptedApiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Notion API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async createProjectPage(project: Project, openingsCount: number): Promise<NotionPage> {
    const page = await this.request('/pages', {
      method: 'POST',
      body: JSON.stringify({
        parent: {
          database_id: this.integration.notionDatabaseId,
        },
        properties: {
          Name: {
            title: [
              {
                text: {
                  content: project.name,
                },
              },
            ],
          },
          Status: {
            select: {
              name: this.mapStatus(project.status),
            },
          },
          Location: {
            rich_text: [
              {
                text: {
                  content: project.location || 'N/A',
                },
              },
            ],
          },
          'Building Type': {
            rich_text: [
              {
                text: {
                  content: project.buildingType || 'N/A',
                },
              },
            ],
          },
          Openings: {
            number: openingsCount,
          },
        },
      }),
    });

    return page;
  }

  async updateProjectPage(pageId: string, project: Project, openingsCount: number): Promise<void> {
    await this.request(`/pages/${pageId}`, {
      method: 'PATCH',
      body: JSON.stringify({
        properties: {
          Name: {
            title: [
              {
                text: {
                  content: project.name,
                },
              },
            ],
          },
          Status: {
            select: {
              name: this.mapStatus(project.status),
            },
          },
          Location: {
            rich_text: [
              {
                text: {
                  content: project.location || 'N/A',
                },
              },
            ],
          },
          'Building Type': {
            rich_text: [
              {
                text: {
                  content: project.buildingType || 'N/A',
                },
              },
            ],
          },
          Openings: {
            number: openingsCount,
          },
        },
      }),
    });
  }

  private mapStatus(status: string): string {
    const statusMap: Record<string, string> = {
      'draft': 'Planning',
      'in-progress': 'In Progress',
      'completed': 'Completed',
      'on-hold': 'On Hold',
    };
    return statusMap[status] || 'Planning';
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.request(`/databases/${this.integration.notionDatabaseId}`);
      return true;
    } catch {
      return false;
    }
  }
}
