import axios, { AxiosInstance } from "axios";
import type { IntegrationCredential } from "@shared/schema";
import { decryptToken } from "../../encryption";
import { credentialService } from "../credential-service";
import { logger } from "../../logger";

const QUICKBOOKS_API_BASE = "https://quickbooks.api.intuit.com/v3/company";

interface QuickBooksCustomer {
  DisplayName: string;
  PrimaryEmailAddr?: {
    Address: string;
  };
  PrimaryPhone?: {
    FreeFormNumber: string;
  };
  BillAddr?: {
    Line1?: string;
    City?: string;
    CountrySubDivisionCode?: string;
    PostalCode?: string;
  };
}

interface QuickBooksInvoice {
  Line: Array<{
    Description: string;
    Amount: number;
    DetailType: "SalesItemLineDetail";
    SalesItemLineDetail: {
      ItemRef: {
        value: string;
        name: string;
      };
      UnitPrice: number;
      Qty: number;
    };
  }>;
  CustomerRef: {
    value: string;
  };
  TxnDate?: string;
  DueDate?: string;
}

export class QuickBooksClient {
  private credential: IntegrationCredential;
  private realmId: string;
  private client: AxiosInstance;

  constructor(credential: IntegrationCredential) {
    if (credential.service !== "quickbooks") {
      throw new Error("Invalid credential type for QuickBooks client");
    }

    if (!credential.metadata || typeof credential.metadata !== 'object' || !('realmId' in credential.metadata)) {
      throw new Error("QuickBooks realmId not found in credential metadata");
    }

    this.credential = credential;
    this.realmId = (credential.metadata as { realmId: string }).realmId;

    const accessToken = decryptToken(credential.accessToken || "");

    this.client = axios.create({
      baseURL: `${QUICKBOOKS_API_BASE}/${this.realmId}`,
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Accept": "application/json",
        "Content-Type": "application/json"
      }
    });
  }

  async createCustomer(data: {
    displayName: string;
    email?: string;
    phone?: string;
    address?: {
      line1?: string;
      city?: string;
      state?: string;
      postalCode?: string;
    };
  }): Promise<any> {
    try {
      const customer: QuickBooksCustomer = {
        DisplayName: data.displayName
      };

      if (data.email) {
        customer.PrimaryEmailAddr = { Address: data.email };
      }

      if (data.phone) {
        customer.PrimaryPhone = { FreeFormNumber: data.phone };
      }

      if (data.address) {
        customer.BillAddr = {
          Line1: data.address.line1,
          City: data.address.city,
          CountrySubDivisionCode: data.address.state,
          PostalCode: data.address.postalCode
        };
      }

      const response = await this.client.post("/customer", customer);
      logger.info(`QuickBooks customer created: ${data.displayName}`);
      return response.data.Customer;
    } catch (error: any) {
      logger.error("QuickBooks create customer error:", error.response?.data || error.message);
      throw new Error(`Failed to create QuickBooks customer: ${error.message}`);
    }
  }

  async createInvoice(data: {
    customerId: string;
    lineItems: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      amount: number;
      itemName?: string;
    }>;
    txnDate?: string;
    dueDate?: string;
  }): Promise<any> {
    try {
      const invoice: QuickBooksInvoice = {
        CustomerRef: {
          value: data.customerId
        },
        Line: data.lineItems.map((item) => ({
          Description: item.description,
          Amount: item.amount,
          DetailType: "SalesItemLineDetail",
          SalesItemLineDetail: {
            ItemRef: {
              value: "1", // Default service item - should be configured
              name: item.itemName || "Services"
            },
            UnitPrice: item.unitPrice,
            Qty: item.quantity
          }
        }))
      };

      if (data.txnDate) {
        invoice.TxnDate = data.txnDate;
      }

      if (data.dueDate) {
        invoice.DueDate = data.dueDate;
      }

      const response = await this.client.post("/invoice", invoice);
      logger.info(`QuickBooks invoice created for customer ${data.customerId}`);
      return response.data.Invoice;
    } catch (error: any) {
      logger.error("QuickBooks create invoice error:", error.response?.data || error.message);
      throw new Error(`Failed to create QuickBooks invoice: ${error.message}`);
    }
  }

  async getCompanyInfo(): Promise<any> {
    try {
      const response = await this.client.get("/companyinfo/" + this.realmId);
      return response.data.CompanyInfo;
    } catch (error: any) {
      logger.error("QuickBooks get company info error:", error.response?.data || error.message);
      throw new Error(`Failed to get QuickBooks company info: ${error.message}`);
    }
  }

  async searchCustomers(displayName: string): Promise<any[]> {
    try {
      // Sanitize to prevent QuickBooks IQL injection — escape single quotes by doubling them
      const safeDisplayName = displayName.replace(/'/g, "''");
      const query = `SELECT * FROM Customer WHERE DisplayName LIKE '%${safeDisplayName}%'`;
      const response = await this.client.get("/query", {
        params: { query }
      });
      return response.data.QueryResponse?.Customer || [];
    } catch (error: any) {
      logger.error("QuickBooks search customers error:", error.response?.data || error.message);
      throw new Error(`Failed to search QuickBooks customers: ${error.message}`);
    }
  }

  static async forOrganization(organizationId: string): Promise<QuickBooksClient> {
    const credential = await credentialService.getValidCredential(organizationId, "quickbooks");
    return new QuickBooksClient(credential);
  }
}
