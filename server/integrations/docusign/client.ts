import axios, { AxiosInstance } from "axios";
import type { IntegrationCredential } from "@shared/schema";
import { decryptToken } from "../../encryption";
import { credentialService } from "../credential-service";
import { logger } from "../../logger";

interface DocuSignEnvelope {
  emailSubject: string;
  status: "created" | "sent";
  documents: Array<{
    documentBase64: string;
    name: string;
    fileExtension: string;
    documentId: string;
  }>;
  recipients: {
    signers: Array<{
      email: string;
      name: string;
      recipientId: string;
      routingOrder: string;
      tabs?: {
        signHereTabs?: Array<{
          documentId: string;
          pageNumber: string;
          xPosition: string;
          yPosition: string;
        }>;
      };
    }>;
  };
}

interface DocuSignEnvelopeResponse {
  envelopeId: string;
  status: string;
  statusDateTime: string;
  uri: string;
}

export class DocuSignClient {
  private credential: IntegrationCredential;
  private accountId: string;
  private baseUri: string;
  private client: AxiosInstance;

  constructor(credential: IntegrationCredential) {
    if (credential.service !== "docusign") {
      throw new Error("Invalid credential type for DocuSign client");
    }

    if (!credential.metadata || typeof credential.metadata !== 'object' || 
        !('accountId' in credential.metadata) || !('baseUri' in credential.metadata)) {
      throw new Error("DocuSign accountId or baseUri not found in credential metadata");
    }

    this.credential = credential;
    const metadata = credential.metadata as { accountId: string; baseUri: string };
    this.accountId = metadata.accountId;
    this.baseUri = metadata.baseUri;

    const accessToken = decryptToken(credential.accessToken || "");

    this.client = axios.create({
      baseURL: `${this.baseUri}/restapi/v2.1/accounts/${this.accountId}`,
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      }
    });
  }

  async createEnvelope(data: {
    emailSubject: string;
    documentBase64: string;
    documentName: string;
    fileExtension: string;
    signers: Array<{
      email: string;
      name: string;
      recipientId: string;
    }>;
    status?: "created" | "sent";
  }): Promise<DocuSignEnvelopeResponse> {
    try {
      const envelope: DocuSignEnvelope = {
        emailSubject: data.emailSubject,
        status: data.status || "sent",
        documents: [
          {
            documentBase64: data.documentBase64,
            name: data.documentName,
            fileExtension: data.fileExtension,
            documentId: "1"
          }
        ],
        recipients: {
          signers: data.signers.map((signer, index) => ({
            email: signer.email,
            name: signer.name,
            recipientId: signer.recipientId,
            routingOrder: (index + 1).toString(),
            tabs: {
              signHereTabs: [
                {
                  documentId: "1",
                  pageNumber: "1",
                  xPosition: "100",
                  yPosition: "150"
                }
              ]
            }
          }))
        }
      };

      const response = await this.client.post<DocuSignEnvelopeResponse>("/envelopes", envelope);
      logger.info(`DocuSign envelope created: ${response.data.envelopeId}`);
      return response.data;
    } catch (error: any) {
      logger.error("DocuSign create envelope error:", error.response?.data || error.message);
      throw new Error(`Failed to create DocuSign envelope: ${error.message}`);
    }
  }

  async getEnvelopeStatus(envelopeId: string): Promise<any> {
    try {
      const response = await this.client.get(`/envelopes/${envelopeId}`);
      return response.data;
    } catch (error: any) {
      logger.error("DocuSign get envelope error:", error.response?.data || error.message);
      throw new Error(`Failed to get DocuSign envelope: ${error.message}`);
    }
  }

  async voidEnvelope(envelopeId: string, reason: string): Promise<void> {
    try {
      await this.client.put(`/envelopes/${envelopeId}`, {
        status: "voided",
        voidedReason: reason
      });
      logger.info(`DocuSign envelope voided: ${envelopeId}`);
    } catch (error: any) {
      logger.error("DocuSign void envelope error:", error.response?.data || error.message);
      throw new Error(`Failed to void DocuSign envelope: ${error.message}`);
    }
  }

  async listEnvelopes(options?: {
    fromDate?: string;
    status?: string;
  }): Promise<any> {
    try {
      const params: Record<string, string> = {};
      
      if (options?.fromDate) {
        params.from_date = options.fromDate;
      }
      
      if (options?.status) {
        params.status = options.status;
      }

      const response = await this.client.get("/envelopes", { params });
      return response.data.envelopes || [];
    } catch (error: any) {
      logger.error("DocuSign list envelopes error:", error.response?.data || error.message);
      throw new Error(`Failed to list DocuSign envelopes: ${error.message}`);
    }
  }

  async getRecipientView(envelopeId: string, recipientEmail: string, recipientName: string, returnUrl: string): Promise<string> {
    try {
      const response = await this.client.post(`/envelopes/${envelopeId}/views/recipient`, {
        returnUrl,
        authenticationMethod: "none",
        email: recipientEmail,
        userName: recipientName
      });
      return response.data.url;
    } catch (error: any) {
      logger.error("DocuSign get recipient view error:", error.response?.data || error.message);
      throw new Error(`Failed to get DocuSign recipient view: ${error.message}`);
    }
  }

  static async forOrganization(organizationId: string): Promise<DocuSignClient> {
    const credential = await credentialService.getValidCredential(organizationId, "docusign");
    return new DocuSignClient(credential);
  }
}
