import axios, { AxiosInstance, AxiosError } from "axios";
import { db } from "../db";
import { hrIntegrationCredentials, hrSyncLogs, type HRIntegrationCredential } from "@shared/schema";
import { eq } from "drizzle-orm";

export interface HREmployee {
  externalId: string;
  email: string;
  firstName: string;
  lastName: string;
  jobTitle?: string;
  department?: string;
  hireDate?: string;
  status: "active" | "inactive" | "pending";
}

export interface ConnectionTestResult {
  success: boolean;
  error?: string;
}

export interface SyncLogParams {
  organizationId: string;
  integrationId: string;
  eventType: "employee_sync" | "full_sync" | "webhook" | "manual_trigger";
  direction: "pull" | "push";
  status: "success" | "partial" | "failed";
  recordsProcessed: number;
  recordsCreated: number;
  recordsUpdated: number;
  recordsDeleted: number;
  recordsFailed: number;
  errorMessage?: string;
  errorDetails?: Record<string, unknown>;
  requestSummary?: Record<string, unknown>;
  responseSummary?: Record<string, unknown>;
  durationMs?: number;
}

const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 1000;

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function withExponentialBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = MAX_RETRIES,
  initialBackoff: number = INITIAL_BACKOFF_MS
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      const axiosError = error as AxiosError;
      if (axiosError.response?.status === 429) {
        const backoffTime = initialBackoff * Math.pow(2, attempt);
        const retryAfter = axiosError.response.headers["retry-after"];
        const waitTime = retryAfter ? parseInt(retryAfter as string, 10) * 1000 : backoffTime;
        console.warn(`Rate limited, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
        await sleep(waitTime);
      } else if (axiosError.response && axiosError.response.status >= 500) {
        const backoffTime = initialBackoff * Math.pow(2, attempt);
        console.warn(`Server error, waiting ${backoffTime}ms before retry ${attempt + 1}/${maxRetries}`);
        await sleep(backoffTime);
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

export abstract class HRConnector {
  protected credentials: HRIntegrationCredential;
  protected client: AxiosInstance;

  constructor(credentials: HRIntegrationCredential) {
    this.credentials = credentials;
    this.client = axios.create({
      timeout: 30000,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
  }

  abstract testConnection(): Promise<ConnectionTestResult>;
  abstract fetchEmployees(): Promise<HREmployee[]>;
  abstract syncEmployee(externalId: string): Promise<HREmployee>;
  abstract mapEmployeeFields(externalData: unknown): HREmployee;

  protected getProviderName(): string {
    return this.credentials.provider;
  }

  protected logError(context: string, error: unknown): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`[${this.getProviderName()}] ${context}: ${errorMessage}`);
  }

  protected async makeRequest<T>(
    method: "get" | "post" | "put" | "delete",
    url: string,
    data?: unknown,
    headers?: Record<string, string>
  ): Promise<T> {
    return withExponentialBackoff(async () => {
      const response = await this.client.request<T>({
        method,
        url,
        data,
        headers,
      });
      return response.data;
    });
  }
}

export class BambooHRConnector extends HRConnector {
  private baseUrl: string;

  constructor(credentials: HRIntegrationCredential) {
    super(credentials);
    const subdomain = credentials.subdomain || credentials.companyId;
    if (!subdomain) {
      throw new Error("BambooHR requires a subdomain configuration");
    }
    this.baseUrl = `https://api.bamboohr.com/api/gateway.php/${subdomain}/v1`;
    
    const apiKey = credentials.apiKey;
    if (!apiKey) {
      throw new Error("BambooHR requires an API key");
    }
    
    const authToken = Buffer.from(`${apiKey}:x`).toString("base64");
    this.client.defaults.headers.common["Authorization"] = `Basic ${authToken}`;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      await this.makeRequest("get", `${this.baseUrl}/employees/directory`);
      return { success: true };
    } catch (error) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      let errorMessage = "Connection failed";
      
      if (status === 401) {
        errorMessage = "Authentication failed: Invalid API key";
      } else if (status === 403) {
        errorMessage = "Access forbidden: Check API key permissions";
      } else if (status === 404) {
        errorMessage = "Subdomain not found: Check your BambooHR subdomain";
      } else if (axiosError.message) {
        errorMessage = axiosError.message;
      }
      
      this.logError("testConnection", error);
      return { success: false, error: errorMessage };
    }
  }

  async fetchEmployees(): Promise<HREmployee[]> {
    try {
      const response = await this.makeRequest<{ employees: unknown[] }>(
        "get",
        `${this.baseUrl}/employees/directory`
      );
      
      const employees = response.employees || [];
      return employees.map((emp) => this.mapEmployeeFields(emp));
    } catch (error) {
      this.logError("fetchEmployees", error);
      throw error;
    }
  }

  async syncEmployee(externalId: string): Promise<HREmployee> {
    try {
      const response = await this.makeRequest<unknown>(
        "get",
        `${this.baseUrl}/employees/${externalId}?fields=id,firstName,lastName,workEmail,jobTitle,department,hireDate,status`
      );
      return this.mapEmployeeFields(response);
    } catch (error) {
      this.logError("syncEmployee", error);
      throw error;
    }
  }

  mapEmployeeFields(externalData: unknown): HREmployee {
    const data = externalData as Record<string, unknown>;
    const statusMap: Record<string, "active" | "inactive" | "pending"> = {
      Active: "active",
      Inactive: "inactive",
      Pending: "pending",
    };
    
    return {
      externalId: String(data.id || ""),
      email: String(data.workEmail || data.email || ""),
      firstName: String(data.firstName || ""),
      lastName: String(data.lastName || ""),
      jobTitle: data.jobTitle ? String(data.jobTitle) : undefined,
      department: data.department ? String(data.department) : undefined,
      hireDate: data.hireDate ? new Date(String(data.hireDate)).toISOString() : undefined,
      status: statusMap[String(data.status)] || "active",
    };
  }
}

export class WorkdayConnector extends HRConnector {
  private baseUrl: string;

  constructor(credentials: HRIntegrationCredential) {
    super(credentials);
    if (!credentials.baseUrl) {
      throw new Error("Workday requires a tenant-specific base URL");
    }
    this.baseUrl = credentials.baseUrl.replace(/\/$/, "");
    
    if (!credentials.accessToken) {
      throw new Error("Workday requires an OAuth access token");
    }
    this.client.defaults.headers.common["Authorization"] = `Bearer ${credentials.accessToken}`;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      await this.makeRequest("get", `${this.baseUrl}/workers?limit=1`);
      return { success: true };
    } catch (error) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      let errorMessage = "Connection failed";
      
      if (status === 401) {
        errorMessage = "Authentication failed: Access token expired or invalid. Please re-authenticate.";
      } else if (status === 403) {
        errorMessage = "Access forbidden: Check OAuth scopes and permissions";
      } else if (axiosError.message) {
        errorMessage = axiosError.message;
      }
      
      this.logError("testConnection", error);
      return { success: false, error: errorMessage };
    }
  }

  async fetchEmployees(): Promise<HREmployee[]> {
    try {
      const employees: HREmployee[] = [];
      let offset = 0;
      const limit = 100;
      let hasMore = true;
      
      while (hasMore) {
        const response = await this.makeRequest<{ data: unknown[]; total: number }>(
          "get",
          `${this.baseUrl}/workers?limit=${limit}&offset=${offset}`
        );
        
        const workers = response.data || [];
        employees.push(...workers.map((w) => this.mapEmployeeFields(w)));
        
        offset += limit;
        hasMore = workers.length === limit && offset < response.total;
      }
      
      return employees;
    } catch (error) {
      this.logError("fetchEmployees", error);
      throw error;
    }
  }

  async syncEmployee(externalId: string): Promise<HREmployee> {
    try {
      const response = await this.makeRequest<{ data: unknown }>(
        "get",
        `${this.baseUrl}/workers/${externalId}`
      );
      return this.mapEmployeeFields(response.data || response);
    } catch (error) {
      this.logError("syncEmployee", error);
      throw error;
    }
  }

  mapEmployeeFields(externalData: unknown): HREmployee {
    const data = externalData as Record<string, unknown>;
    const worker = data.worker as Record<string, unknown> || data;
    const workerData = worker.workerData as Record<string, unknown> || worker;
    const personalData = workerData.personalData as Record<string, unknown> || {};
    const employmentData = workerData.employmentData as Record<string, unknown> || {};
    const contactData = (personalData.contactData as Record<string, unknown>) || {};
    const emailAddresses = (contactData.emailAddresses as unknown[]) || [];
    const primaryEmail = emailAddresses.find((e) => (e as Record<string, unknown>).primary) as Record<string, unknown> || emailAddresses[0] as Record<string, unknown> || {};
    
    const statusVal = String(employmentData.workerStatus || data.status || "active").toLowerCase();
    let status: "active" | "inactive" | "pending" = "active";
    if (statusVal.includes("inactive") || statusVal.includes("terminated")) {
      status = "inactive";
    } else if (statusVal.includes("pending") || statusVal.includes("hire")) {
      status = "pending";
    }
    
    const legalName = personalData.legalName as Record<string, unknown> || {};
    
    return {
      externalId: String(worker.id || data.workerId || data.id || ""),
      email: String(primaryEmail.emailAddress || data.email || ""),
      firstName: String(legalName.firstName || data.firstName || ""),
      lastName: String(legalName.lastName || data.lastName || ""),
      jobTitle: employmentData.jobTitle ? String(employmentData.jobTitle) : undefined,
      department: employmentData.department ? String(employmentData.department) : undefined,
      hireDate: employmentData.hireDate ? new Date(String(employmentData.hireDate)).toISOString() : undefined,
      status,
    };
  }
}

export class ADPConnector extends HRConnector {
  private baseUrl: string = "https://api.adp.com";

  constructor(credentials: HRIntegrationCredential) {
    super(credentials);
    
    if (credentials.baseUrl) {
      this.baseUrl = credentials.baseUrl.replace(/\/$/, "");
    }
    
    if (!credentials.accessToken) {
      throw new Error("ADP requires an OAuth access token");
    }
    this.client.defaults.headers.common["Authorization"] = `Bearer ${credentials.accessToken}`;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      await this.makeRequest("get", `${this.baseUrl}/hr/v2/workers?$top=1`);
      return { success: true };
    } catch (error) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      let errorMessage = "Connection failed";
      
      if (status === 401) {
        errorMessage = "Authentication failed: Access token expired or invalid. Please re-authenticate.";
      } else if (status === 403) {
        errorMessage = "Access forbidden: Check OAuth client credentials and scopes";
      } else if (axiosError.message) {
        errorMessage = axiosError.message;
      }
      
      this.logError("testConnection", error);
      return { success: false, error: errorMessage };
    }
  }

  async fetchEmployees(): Promise<HREmployee[]> {
    try {
      const employees: HREmployee[] = [];
      let skip = 0;
      const top = 100;
      let hasMore = true;
      
      while (hasMore) {
        const response = await this.makeRequest<{ workers: unknown[] }>(
          "get",
          `${this.baseUrl}/hr/v2/workers?$top=${top}&$skip=${skip}`
        );
        
        const workers = response.workers || [];
        employees.push(...workers.map((w) => this.mapEmployeeFields(w)));
        
        skip += top;
        hasMore = workers.length === top;
      }
      
      return employees;
    } catch (error) {
      this.logError("fetchEmployees", error);
      throw error;
    }
  }

  async syncEmployee(externalId: string): Promise<HREmployee> {
    try {
      const response = await this.makeRequest<{ workers: unknown[] }>(
        "get",
        `${this.baseUrl}/hr/v2/workers/${externalId}`
      );
      const worker = response.workers?.[0] || response;
      return this.mapEmployeeFields(worker);
    } catch (error) {
      this.logError("syncEmployee", error);
      throw error;
    }
  }

  mapEmployeeFields(externalData: unknown): HREmployee {
    const data = externalData as Record<string, unknown>;
    const person = data.person as Record<string, unknown> || {};
    const legalName = person.legalName as Record<string, unknown> || {};
    const communication = person.communication as Record<string, unknown> || {};
    const emails = (communication.emails as unknown[]) || [];
    const workEmail = emails.find((e) => {
      const labelCode = (e as Record<string, unknown>).labelCode as Record<string, unknown> || {};
      return labelCode.codeValue === "Work";
    }) as Record<string, unknown> || emails[0] as Record<string, unknown> || {};
    
    const workerStatus = data.workerStatus as Record<string, unknown> || {};
    const statusCodeObj = workerStatus.statusCode as Record<string, unknown> || {};
    const statusCode = String(statusCodeObj.codeValue || data.status || "Active").toLowerCase();
    let status: "active" | "inactive" | "pending" = "active";
    if (statusCode.includes("inactive") || statusCode.includes("terminated")) {
      status = "inactive";
    } else if (statusCode.includes("pending") || statusCode.includes("hire")) {
      status = "pending";
    }
    
    const workAssignments = (data.workAssignments as unknown[]) || [];
    const primaryAssignment = workAssignments.find((a) => (a as Record<string, unknown>).primaryIndicator) as Record<string, unknown> || workAssignments[0] as Record<string, unknown> || {};
    const jobCode = primaryAssignment.jobCode as Record<string, unknown> || {};
    const organizationalUnits = (primaryAssignment.organizationalUnits as unknown[]) || [];
    const department = organizationalUnits.find((o) => {
      const typeCode = (o as Record<string, unknown>).typeCode as Record<string, unknown> || {};
      return typeCode.codeValue === "Department";
    }) as Record<string, unknown> || {};
    const nameCode = department.nameCode as Record<string, unknown> || {};
    
    return {
      externalId: String(data.associateOID || data.workerId || ""),
      email: String(workEmail.emailUri || ""),
      firstName: String(legalName.givenName || ""),
      lastName: String(legalName.familyName1 || ""),
      jobTitle: jobCode.shortName ? String(jobCode.shortName) : undefined,
      department: nameCode.shortName ? String(nameCode.shortName) : undefined,
      hireDate: primaryAssignment.hireDate ? new Date(String(primaryAssignment.hireDate)).toISOString() : undefined,
      status,
    };
  }
}

export class GustoConnector extends HRConnector {
  private baseUrl: string = "https://api.gusto.com";
  private companyId: string;

  constructor(credentials: HRIntegrationCredential) {
    super(credentials);
    
    if (credentials.baseUrl) {
      this.baseUrl = credentials.baseUrl.replace(/\/$/, "");
    }
    
    if (!credentials.companyId) {
      throw new Error("Gusto requires a company ID");
    }
    this.companyId = credentials.companyId;
    
    if (!credentials.accessToken) {
      throw new Error("Gusto requires an OAuth access token");
    }
    this.client.defaults.headers.common["Authorization"] = `Bearer ${credentials.accessToken}`;
  }

  async testConnection(): Promise<ConnectionTestResult> {
    try {
      await this.makeRequest("get", `${this.baseUrl}/v1/companies/${this.companyId}`);
      return { success: true };
    } catch (error) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      let errorMessage = "Connection failed";
      
      if (status === 401) {
        errorMessage = "Authentication failed: Access token expired or invalid. Please re-authenticate.";
      } else if (status === 403) {
        errorMessage = "Access forbidden: Check OAuth scopes and company permissions";
      } else if (status === 404) {
        errorMessage = "Company not found: Check your company ID";
      } else if (axiosError.message) {
        errorMessage = axiosError.message;
      }
      
      this.logError("testConnection", error);
      return { success: false, error: errorMessage };
    }
  }

  async fetchEmployees(): Promise<HREmployee[]> {
    try {
      const response = await this.makeRequest<unknown[]>(
        "get",
        `${this.baseUrl}/v1/companies/${this.companyId}/employees`
      );
      
      const employees = response || [];
      return employees.map((emp) => this.mapEmployeeFields(emp));
    } catch (error) {
      this.logError("fetchEmployees", error);
      throw error;
    }
  }

  async syncEmployee(externalId: string): Promise<HREmployee> {
    try {
      const response = await this.makeRequest<unknown>(
        "get",
        `${this.baseUrl}/v1/employees/${externalId}`
      );
      return this.mapEmployeeFields(response);
    } catch (error) {
      this.logError("syncEmployee", error);
      throw error;
    }
  }

  mapEmployeeFields(externalData: unknown): HREmployee {
    const data = externalData as Record<string, unknown>;
    const jobs = (data.jobs as unknown[]) || [];
    const currentJob = jobs.find((j) => (j as Record<string, unknown>).current_job) as Record<string, unknown> || jobs[0] as Record<string, unknown> || {};
    const compensations = (currentJob.compensations as unknown[]) || [];
    const currentComp = compensations.find((c) => (c as Record<string, unknown>).effective_date) as Record<string, unknown> || {};
    
    const terminatedStr = String(data.terminated || "false").toLowerCase();
    const onboardedStr = String(data.onboarded || "true").toLowerCase();
    let status: "active" | "inactive" | "pending" = "active";
    if (terminatedStr === "true") {
      status = "inactive";
    } else if (onboardedStr === "false") {
      status = "pending";
    }
    
    return {
      externalId: String(data.uuid || data.id || ""),
      email: String(data.email || ""),
      firstName: String(data.first_name || ""),
      lastName: String(data.last_name || ""),
      jobTitle: currentJob.title ? String(currentJob.title) : undefined,
      department: data.department ? String(data.department) : undefined,
      hireDate: data.date_of_birth ? undefined : (currentComp.effective_date ? new Date(String(currentComp.effective_date)).toISOString() : undefined),
      status,
    };
  }
}

export function getHRConnector(provider: string, credentials: HRIntegrationCredential): HRConnector {
  switch (provider.toLowerCase()) {
    case "bamboohr":
      return new BambooHRConnector(credentials);
    case "workday":
      return new WorkdayConnector(credentials);
    case "adp":
      return new ADPConnector(credentials);
    case "gusto":
      return new GustoConnector(credentials);
    default:
      throw new Error(`Unsupported HR provider: ${provider}. Supported providers: bamboohr, workday, adp, gusto`);
  }
}

export async function refreshAccessToken(credentials: HRIntegrationCredential): Promise<string> {
  const provider = credentials.provider.toLowerCase();
  
  if (!credentials.refreshToken) {
    throw new Error("No refresh token available. Please re-authenticate with the HR provider.");
  }
  
  let tokenUrl: string;
  let clientId: string;
  let clientSecret: string;
  let additionalParams: Record<string, string> = {};
  
  switch (provider) {
    case "workday":
      if (!credentials.baseUrl) {
        throw new Error("Workday base URL is required for token refresh");
      }
      tokenUrl = `${credentials.baseUrl.replace(/\/$/, "")}/oauth2/token`;
      clientId = credentials.apiKey || "";
      clientSecret = credentials.apiSecret || "";
      break;
      
    case "adp":
      tokenUrl = "https://accounts.adp.com/auth/oauth/v2/token";
      clientId = credentials.apiKey || "";
      clientSecret = credentials.apiSecret || "";
      break;
      
    case "gusto":
      tokenUrl = "https://api.gusto.com/oauth/token";
      clientId = credentials.apiKey || "";
      clientSecret = credentials.apiSecret || "";
      break;
      
    default:
      throw new Error(`Token refresh not supported for provider: ${provider}`);
  }
  
  if (!clientId || !clientSecret) {
    throw new Error("Client ID and secret are required for token refresh");
  }
  
  try {
    const response = await axios.post<{ access_token: string; expires_in?: number; refresh_token?: string }>(
      tokenUrl,
      new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: credentials.refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        ...additionalParams,
      }),
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
    );
    
    const { access_token, expires_in, refresh_token } = response.data;
    
    const expiresAt = expires_in
      ? new Date(Date.now() + expires_in * 1000)
      : new Date(Date.now() + 3600 * 1000);
    
    await db
      .update(hrIntegrationCredentials)
      .set({
        accessToken: access_token,
        refreshToken: refresh_token || credentials.refreshToken,
        tokenExpiresAt: expiresAt,
        connectionStatus: "connected",
        updatedAt: new Date(),
      })
      .where(eq(hrIntegrationCredentials.id, credentials.id));
    
    return access_token;
  } catch (error) {
    const axiosError = error as AxiosError;
    console.error("Token refresh failed:", axiosError.message);
    
    await db
      .update(hrIntegrationCredentials)
      .set({
        connectionStatus: "error",
        lastSyncError: "Token refresh failed: " + axiosError.message,
        updatedAt: new Date(),
      })
      .where(eq(hrIntegrationCredentials.id, credentials.id));
    
    throw new Error(
      `Failed to refresh access token: ${axiosError.message}. Please re-authenticate with ${provider}.`
    );
  }
}

export async function createSyncLog(params: SyncLogParams): Promise<void> {
  try {
    await db.insert(hrSyncLogs).values({
      organizationId: params.organizationId,
      integrationId: params.integrationId,
      eventType: params.eventType,
      direction: params.direction,
      status: params.status,
      recordsProcessed: params.recordsProcessed,
      recordsCreated: params.recordsCreated,
      recordsUpdated: params.recordsUpdated,
      recordsDeleted: params.recordsDeleted,
      recordsFailed: params.recordsFailed,
      errorMessage: params.errorMessage,
      errorDetails: params.errorDetails,
      requestSummary: params.requestSummary,
      responseSummary: params.responseSummary,
      durationMs: params.durationMs,
    });
  } catch (error) {
    console.error("Failed to create sync log:", error);
  }
}

export async function isTokenExpired(credentials: HRIntegrationCredential): Promise<boolean> {
  if (!credentials.tokenExpiresAt) {
    return true;
  }
  const bufferMs = 5 * 60 * 1000;
  return new Date(credentials.tokenExpiresAt).getTime() - bufferMs < Date.now();
}

export async function getConnectorWithFreshToken(
  provider: string,
  credentials: HRIntegrationCredential
): Promise<HRConnector> {
  if (credentials.accessToken && (await isTokenExpired(credentials))) {
    const newToken = await refreshAccessToken(credentials);
    const updatedCredentials = { ...credentials, accessToken: newToken };
    return getHRConnector(provider, updatedCredentials);
  }
  return getHRConnector(provider, credentials);
}
