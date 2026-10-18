// HubSpot CRM Integration Service
// Syncs projects, contacts, and quotes to HubSpot CRM
// Organization-specific integration with encrypted API key storage

import { logger, logError } from "./logger";
import { db } from "./db";
import { organizations } from "@shared/schema";
import { eq } from "drizzle-orm";
import { decryptApiKey } from "./utils/encryption";
import { SyncTrackingService } from "./syncTracking";

interface HubSpotContact {
  email: string;
  firstname?: string;
  lastname?: string;
  company?: string;
  phone?: string;
  website?: string;
}

interface HubSpotDeal {
  dealname: string;
  amount?: number;
  dealstage: string;
  pipeline: string;
  closedate?: string;
  project_id?: string;
}

interface HubSpotNote {
  hs_note_body: string;
  hs_timestamp: number;
}

interface HubSpotCompany {
  name: string;
  domain?: string;
  city?: string;
  state?: string;
  zip?: string;
  country?: string;
  phone?: string;
  industry?: string;
  customer_id?: string; // Custom property to track our customer ID
}

export class HubSpotService {
  private baseUrl: string = 'https://api.hubapi.com';
  private organizationId: string | null = null;
  private apiKey: string | null = null;
  private syncTracking: SyncTrackingService | null = null;

  /**
   * Initialize HubSpot service for a specific organization
   */
  async initialize(organizationId: string): Promise<void> {
    this.organizationId = organizationId;
    this.syncTracking = new SyncTrackingService(organizationId);
    
    const org = await db
      .select()
      .from(organizations)
      .where(eq(organizations.id, organizationId))
      .limit(1);
    
    if (org.length === 0) {
      throw new Error('Organization not found');
    }
    
    const organization = org[0];
    
    if (organization.hubspotEnabled !== 'yes' || !organization.hubspotApiKey) {
      this.apiKey = null;
      return;
    }
    
    try {
      this.apiKey = decryptApiKey(organization.hubspotApiKey);
    } catch (error) {
      logger.error('Failed to decrypt HubSpot API key', {
        organizationId,
        error
      });
      this.apiKey = null;
    }
  }

  /**
   * Check if HubSpot is configured for this organization
   */
  isConfigured(): boolean {
    return !!this.apiKey;
  }

  /**
   * Ensure sync tracking is initialized
   */
  private ensureSyncTracking(): SyncTrackingService {
    if (!this.syncTracking) {
      throw new Error('HubSpot service not initialized. Call initialize() first.');
    }
    return this.syncTracking;
  }

  /**
   * Make authenticated request to HubSpot API
   */
  private async request(endpoint: string, options: RequestInit = {}): Promise<any> {
    if (!this.isConfigured()) {
      throw new Error('HubSpot integration not configured for this organization. Please configure HubSpot API key in organization settings.');
    }

    const url = `${this.baseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HubSpot API error: ${response.status} - ${error}`);
    }

    // Handle 204 No Content responses (e.g., from association endpoints)
    if (response.status === 204 || response.headers.get('content-length') === '0') {
      return null;
    }

    // Only parse JSON if there's content
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      return response.json();
    }

    return null;
  }

  /**
   * Create or update a contact in HubSpot
   */
  async syncContact(contact: HubSpotContact): Promise<any> {
    try {
      // Search for existing contact by email
      const searchResponse = await this.request('/crm/v3/objects/contacts/search', {
        method: 'POST',
        body: JSON.stringify({
          filterGroups: [{
            filters: [{
              propertyName: 'email',
              operator: 'EQ',
              value: contact.email,
            }]
          }]
        })
      });

      const properties = {
        email: contact.email,
        firstname: contact.firstname || '',
        lastname: contact.lastname || '',
        company: contact.company || '',
        phone: contact.phone || '',
        website: contact.website || '',
      };

      if (searchResponse.results && searchResponse.results.length > 0) {
        // Update existing contact
        const contactId = searchResponse.results[0].id;
        return await this.request(`/crm/v3/objects/contacts/${contactId}`, {
          method: 'PATCH',
          body: JSON.stringify({ properties })
        });
      } else {
        // Create new contact
        return await this.request('/crm/v3/objects/contacts', {
          method: 'POST',
          body: JSON.stringify({ properties })
        });
      }
    } catch (error) {
      logError(error as Error, { context: 'hubspot-sync-contact', email: contact.email });
      throw error;
    }
  }

  /**
   * Create or update a deal in HubSpot
   */
  async syncDeal(deal: HubSpotDeal, associatedContactEmail?: string): Promise<any> {
    try {
      // Search for existing deal by project_id custom property
      let dealId: string | null = null;
      
      if (deal.project_id) {
        try {
          const searchResponse = await this.request('/crm/v3/objects/deals/search', {
            method: 'POST',
            body: JSON.stringify({
              filterGroups: [{
                filters: [{
                  propertyName: 'project_id',
                  operator: 'EQ',
                  value: deal.project_id,
                }]
              }]
            })
          });
          
          if (searchResponse.results && searchResponse.results.length > 0) {
            dealId = searchResponse.results[0].id;
          }
        } catch (error) {
          // project_id property might not exist yet - that's ok, we'll create a new deal
          logger.info('Note: project_id custom property may need to be created in HubSpot');
        }
      }

      const properties = {
        dealname: deal.dealname,
        amount: deal.amount?.toString() || '0',
        dealstage: deal.dealstage,
        pipeline: deal.pipeline,
        closedate: deal.closedate || '',
        project_id: deal.project_id || '',
      };

      let dealResponse;
      if (dealId) {
        // Update existing deal
        dealResponse = await this.request(`/crm/v3/objects/deals/${dealId}`, {
          method: 'PATCH',
          body: JSON.stringify({ properties })
        });
      } else {
        // Create new deal
        dealResponse = await this.request('/crm/v3/objects/deals', {
          method: 'POST',
          body: JSON.stringify({ properties })
        });
      }

      // Associate with contact if email provided
      if (associatedContactEmail && dealResponse.id) {
        try {
          // Find contact by email
          const contactSearch = await this.request('/crm/v3/objects/contacts/search', {
            method: 'POST',
            body: JSON.stringify({
              filterGroups: [{
                filters: [{
                  propertyName: 'email',
                  operator: 'EQ',
                  value: associatedContactEmail,
                }]
              }]
            })
          });

          if (contactSearch.results && contactSearch.results.length > 0) {
            const contactId = contactSearch.results[0].id;
            // Associate deal with contact
            await this.request(`/crm/v3/objects/deals/${dealResponse.id}/associations/contacts/${contactId}/3`, {
              method: 'PUT',
            });
          }
        } catch (error) {
          logError(error as Error, { context: 'hubspot-associate-deal-contact', dealId: dealResponse.id, contactEmail: associatedContactEmail });
        }
      }

      return dealResponse;
    } catch (error) {
      logError(error as Error, { context: 'hubspot-sync-deal', dealName: deal.dealname });
      throw error;
    }
  }

  /**
   * Create a note in HubSpot
   */
  async createNote(note: HubSpotNote, associations?: { contactId?: string; dealId?: string }): Promise<any> {
    try {
      const noteResponse = await this.request('/crm/v3/objects/notes', {
        method: 'POST',
        body: JSON.stringify({
          properties: {
            hs_note_body: note.hs_note_body,
            hs_timestamp: note.hs_timestamp,
          }
        })
      });

      // Associate note with contact or deal
      if (noteResponse.id) {
        if (associations?.contactId) {
          await this.request(`/crm/v3/objects/notes/${noteResponse.id}/associations/contacts/${associations.contactId}/202`, {
            method: 'PUT',
          });
        }
        if (associations?.dealId) {
          await this.request(`/crm/v3/objects/notes/${noteResponse.id}/associations/deals/${associations.dealId}/214`, {
            method: 'PUT',
          });
        }
      }

      return noteResponse;
    } catch (error) {
      logError(error as Error, { context: 'hubspot-create-note' });
      throw error;
    }
  }

  /**
   * Get all deals from HubSpot
   */
  async getDeals(limit: number = 100): Promise<any> {
    try {
      return await this.request(`/crm/v3/objects/deals?limit=${limit}&properties=dealname,amount,dealstage,project_id,closedate`);
    } catch (error) {
      logError(error as Error, { context: 'hubspot-get-deals', limit });
      throw error;
    }
  }

  /**
   * Get all contacts from HubSpot
   */
  async getContacts(limit: number = 100): Promise<any> {
    try {
      return await this.request(`/crm/v3/objects/contacts?limit=${limit}&properties=email,firstname,lastname,company,phone`);
    } catch (error) {
      logError(error as Error, { context: 'hubspot-get-contacts', limit });
      throw error;
    }
  }

  /**
   * Sync a project to HubSpot as a deal with link tracking
   */
  async syncProject(project: {
    id: string;
    name: string;
    buildingName?: string | null;
    status: string;
    totalCost?: number;
  }): Promise<any> {
    // Ensure sync tracking is initialized
    const syncTracking = this.ensureSyncTracking();
    
    // Hoist link and target HubSpot ID outside try/catch for error handling
    let link;
    let targetHubSpotId: string | undefined;
    
    try {
      // 1. Get or create sync link for this project → deal mapping
      link = await syncTracking.getOrCreateLink({
        localObjectType: 'project',
        localObjectId: project.id,
        hubspotObjectType: 'deal'
      }, 'push');

      // 2. Prepare deal properties
      const dealname = `${project.name}${project.buildingName ? ` - ${project.buildingName}` : ''}`;
      
      const stageMap: Record<string, string> = {
        'planning': 'qualifiedtobuy',
        'active': 'presentationscheduled',
        'completed': 'closedwon',
        'on-hold': 'decisionmakerboughtin',
      };

      const properties = {
        dealname,
        amount: (project.totalCost || 0).toString(),
        dealstage: stageMap[project.status] || 'appointmentscheduled',
        pipeline: 'default',
        project_id: project.id,
      };

      // 3. Use existing HubSpot deal ID if available, otherwise create/update via API
      let dealResponse;
      let isUpdate = false;
      
      if (link.hubspotObjectId && link.hubspotObjectId !== '') {
        // Update existing deal
        targetHubSpotId = link.hubspotObjectId;
        dealResponse = await this.request(`/crm/v3/objects/deals/${link.hubspotObjectId}`, {
          method: 'PATCH',
          body: JSON.stringify({ properties })
        });
        isUpdate = true;
      } else {
        // Search for existing deal by project_id (legacy fallback)
        try {
          const searchResponse = await this.request('/crm/v3/objects/deals/search', {
            method: 'POST',
            body: JSON.stringify({
              filterGroups: [{
                filters: [{
                  propertyName: 'project_id',
                  operator: 'EQ',
                  value: project.id,
                }]
              }]
            })
          });
          
          if (searchResponse.results && searchResponse.results.length > 0) {
            // Update found deal
            const dealId = searchResponse.results[0].id;
            targetHubSpotId = dealId;
            dealResponse = await this.request(`/crm/v3/objects/deals/${dealId}`, {
              method: 'PATCH',
              body: JSON.stringify({ properties })
            });
            isUpdate = true;
          } else {
            // Create new deal
            dealResponse = await this.request('/crm/v3/objects/deals', {
              method: 'POST',
              body: JSON.stringify({ properties })
            });
            isUpdate = false;
          }
        } catch (searchError) {
          // If search fails, create new deal
          logger.info('Note: project_id custom property may need to be created in HubSpot');
          dealResponse = await this.request('/crm/v3/objects/deals', {
            method: 'POST',
            body: JSON.stringify({ properties })
          });
          isUpdate = false;
        }
      }

      // Capture HubSpot object ID immediately after successful API call
      // This ensures we have the ID even if local persistence fails
      targetHubSpotId = dealResponse.id;

      // 4. Update link on success
      await syncTracking.updateLinkOnSuccess(
        link.id,
        dealResponse.id,
        dealResponse.properties?.hs_lastmodifieddate // Use as ETag
      );

      // 5. Record sync event
      await syncTracking.recordEvent(link.id, {
        localObjectType: 'project',
        localObjectId: project.id,
        hubspotObjectType: 'deal',
        hubspotObjectId: dealResponse.id
      }, {
        eventType: isUpdate ? 'update' : 'create',
        syncDirection: 'push',
        outcome: 'success',
        metadata: { dealname, amount: project.totalCost }
      });

      logger.info('Successfully synced project to HubSpot', {
        projectId: project.id,
        dealId: dealResponse.id,
        isUpdate
      });

      return dealResponse;
    } catch (error) {
      // Mark link as failed if it was created
      if (link) {
        // Determine event type based on intended HubSpot target (not link state)
        const failedEventType = targetHubSpotId ? 'update' : 'create';
        
        // Persist HubSpot ID even on failure (critical for retry/recovery)
        await syncTracking.markLinkFailure(
          link.id,
          'SYNC_ERROR',
          (error as Error).message,
          targetHubSpotId
        );
        
        // Record failure event with accurate metadata
        await syncTracking.recordEvent(link.id, {
          localObjectType: 'project',
          localObjectId: project.id,
          hubspotObjectType: 'deal',
          hubspotObjectId: targetHubSpotId
        }, {
          eventType: failedEventType,
          syncDirection: 'push',
          outcome: 'failure',
          errorCode: 'SYNC_ERROR',
          errorMessage: (error as Error).message
        });
      }

      logError(error as Error, { context: 'hubspot-sync-project', projectId: project.id });
      throw error;
    }
  }

  /**
   * Sync a manufacturer contact to HubSpot
   */
  async syncManufacturerContact(manufacturer: {
    manufacturerName: string;
    contactName?: string | null;
    email?: string | null;
    phone?: string | null;
  }): Promise<any> {
    if (!manufacturer.email) {
      throw new Error('Email is required to sync contact to HubSpot');
    }

    const nameParts = manufacturer.contactName?.split(' ') || [];
    const contact: HubSpotContact = {
      email: manufacturer.email,
      firstname: nameParts[0] || '',
      lastname: nameParts.slice(1).join(' ') || '',
      company: manufacturer.manufacturerName,
      phone: manufacturer.phone || '',
    };

    return await this.syncContact(contact);
  }

  /**
   * Create or update a company in HubSpot
   */
  async syncCompany(company: HubSpotCompany): Promise<any> {
    try {
      // Search for existing company by customer_id custom property
      let companyId: string | null = null;
      
      if (company.customer_id) {
        try {
          const searchResponse = await this.request('/crm/v3/objects/companies/search', {
            method: 'POST',
            body: JSON.stringify({
              filterGroups: [{
                filters: [{
                  propertyName: 'customer_id',
                  operator: 'EQ',
                  value: company.customer_id,
                }]
              }]
            })
          });
          
          if (searchResponse.results && searchResponse.results.length > 0) {
            companyId = searchResponse.results[0].id;
          }
        } catch (error) {
          // customer_id property might not exist yet - that's ok, we'll create a new company
          logger.info('Note: customer_id custom property may need to be created in HubSpot');
        }
      }

      const properties = {
        name: company.name,
        domain: company.domain || '',
        city: company.city || '',
        state: company.state || '',
        zip: company.zip || '',
        country: company.country || '',
        phone: company.phone || '',
        industry: company.industry || '',
        customer_id: company.customer_id || '',
      };

      if (companyId) {
        // Update existing company
        return await this.request(`/crm/v3/objects/companies/${companyId}`, {
          method: 'PATCH',
          body: JSON.stringify({ properties })
        });
      } else {
        // Create new company
        return await this.request('/crm/v3/objects/companies', {
          method: 'POST',
          body: JSON.stringify({ properties })
        });
      }
    } catch (error) {
      logError(error as Error, { context: 'hubspot-sync-company', companyName: company.name });
      throw error;
    }
  }

  /**
   * Sync a customer to HubSpot as a company
   */
  async syncCustomer(customer: {
    id: string;
    name: string;
    type?: string | null;
    contactPhone?: string | null;
  }, locations?: Array<{
    locationName: string;
    city?: string | null;
    state?: string | null;
    zip?: string | null;
    country?: string | null;
  }>): Promise<any> {
    // Use the first location for company address if available
    const primaryLocation = locations && locations.length > 0 ? locations[0] : null;
    
    const company: HubSpotCompany = {
      name: customer.name,
      city: primaryLocation?.city || '',
      state: primaryLocation?.state || '',
      zip: primaryLocation?.zip || '',
      country: primaryLocation?.country || 'USA',
      phone: customer.contactPhone || '',
      industry: customer.type || '',
      customer_id: customer.id,
    };

    const companyResponse = await this.syncCompany(company);

    // If there are multiple locations, create notes for them
    if (locations && locations.length > 1 && companyResponse.id) {
      const locationsList = locations.map((loc, idx) => 
        `Location ${idx + 1}: ${loc.locationName}${loc.city ? `, ${loc.city}` : ''}${loc.state ? `, ${loc.state}` : ''}`
      ).join('\n');

      const note: HubSpotNote = {
        hs_note_body: `Additional Locations:\n${locationsList}`,
        hs_timestamp: Date.now(),
      };

      try {
        await this.createNote(note, { contactId: undefined, dealId: undefined });
        // Associate note with company (requires company association type 190)
        // Note: This may need additional HubSpot API setup
      } catch (error) {
        logError(error as Error, { context: 'hubspot-create-location-notes', customerName: customer.name });
      }
    }

    return companyResponse;
  }

  /**
   * Associate a deal with a company
   */
  async associateDealWithCompany(dealId: string, companyId: string): Promise<any> {
    try {
      // Association type ID 2 is for deal-to-company associations
      await this.request(`/crm/v3/objects/deals/${dealId}/associations/companies/${companyId}/2`, {
        method: 'PUT',
      });
    } catch (error) {
      logError(error as Error, { context: 'hubspot-associate-deal-company', dealId, companyId });
      throw error;
    }
  }

  /**
   * Create a note for a quote request
   */
  async createQuoteRequestNote(quoteRequest: {
    openingNumber?: string;
    manufacturerName: string;
    status: string;
    notes?: string | null;
  }, dealId?: string): Promise<any> {
    const noteBody = `
Quote Request: ${quoteRequest.openingNumber || 'N/A'}
Manufacturer: ${quoteRequest.manufacturerName}
Status: ${quoteRequest.status}
${quoteRequest.notes ? `\nNotes: ${quoteRequest.notes}` : ''}
    `.trim();

    const note: HubSpotNote = {
      hs_note_body: noteBody,
      hs_timestamp: Date.now(),
    };

    return await this.createNote(note, dealId ? { dealId } : undefined);
  }

  /**
   * Calculate total project cost from cost record
   */
  calculateTotalCost(cost: {
    pmHours: number | null;
    pmHourlyRate: number | null;
    engineeringHours: number | null;
    engineeringHourlyRate: number | null;
    surveyHours: number | null;
    surveyHourlyRate: number | null;
    travelHours: number | null;
    travelHourlyRate: number | null;
    overheadCost: number | null;
    initialVisitCost: number | null;
    expeditedDeliveryCost: number | null;
    subcontractorCost: number | null;
    marginPercent: number | null;
    discountPercent: number | null;
    surchargePercent: number | null;
    materialFuelCharge: number | null;
    handlingFee: number | null;
    programmingTestingLabelingFee: number | null;
    firePreventionInspectionFee: number | null;
    fireRelabelingInspectionFee: number | null;
    disposalFee: number | null;
    consumableAllowance: number | null;
  }): number {
    const laborCost = 
      ((cost.pmHours || 0) * (cost.pmHourlyRate || 0)) +
      ((cost.engineeringHours || 0) * (cost.engineeringHourlyRate || 0)) +
      ((cost.surveyHours || 0) * (cost.surveyHourlyRate || 0));
    
    const travelCost = (cost.travelHours || 0) * (cost.travelHourlyRate || 0);
    
    const fixedCosts = 
      (cost.overheadCost || 0) +
      (cost.initialVisitCost || 0) +
      (cost.expeditedDeliveryCost || 0) +
      (cost.subcontractorCost || 0);
    
    const fees = 
      (cost.materialFuelCharge || 0) +
      (cost.handlingFee || 0) +
      (cost.programmingTestingLabelingFee || 0) +
      (cost.firePreventionInspectionFee || 0) +
      (cost.fireRelabelingInspectionFee || 0) +
      (cost.disposalFee || 0) +
      (cost.consumableAllowance || 0);
    
    const subtotal = laborCost + travelCost + fixedCosts;
    const discount = subtotal * ((cost.discountPercent || 0) / 100);
    const margin = subtotal * ((cost.marginPercent || 0) / 100);
    const surcharge = subtotal * ((cost.surchargePercent || 0) / 100);
    
    return subtotal - discount + margin + surcharge + fees;
  }

  /**
   * Create or update a lead/contact in HubSpot Marketing with lifecycle stage
   * Used for marketing campaigns, prelaunch signups, and lead gen forms
   */
  async createMarketingLead(lead: {
    email: string;
    firstname?: string;
    lastname?: string;
    company?: string;
    phone?: string;
    website?: string;
    lifecyclestage?: string; // subscriber, lead, marketingqualifiedlead, salesqualifiedlead, opportunity, customer, evangelist, other
    hs_lead_status?: string; // NEW, OPEN, IN_PROGRESS, OPEN_DEAL, UNQUALIFIED, ATTEMPTED_TO_CONTACT, CONNECTED, BAD_TIMING
    lead_source?: string; // Source of the lead (e.g., 'Prelaunch Waitlist', 'Contact Form', 'Demo Request')
    utm_source?: string;
    utm_campaign?: string;
    utm_medium?: string;
    utm_content?: string;
    utm_term?: string;
  }): Promise<any> {
    try {
      // Search for existing contact by email
      // Request lifecyclestage property to check current stage before updating
      const searchResponse = await this.request('/crm/v3/objects/contacts/search', {
        method: 'POST',
        body: JSON.stringify({
          filterGroups: [{
            filters: [{
              propertyName: 'email',
              operator: 'EQ',
              value: lead.email,
            }]
          }],
          properties: ['lifecyclestage', 'hs_lead_status'], // Request current lifecycle stage
        })
      });

      // Build properties object - only include fields with actual values
      // This prevents overwriting existing data with empty strings
      const properties: Record<string, string> = {
        email: lead.email,
      };

      // Only add optional fields if they have values
      if (lead.firstname) properties.firstname = lead.firstname;
      if (lead.lastname) properties.lastname = lead.lastname;
      if (lead.company) properties.company = lead.company;
      if (lead.phone) properties.phone = lead.phone;
      if (lead.website) properties.website = lead.website;
      // Note: hs_lead_status is only set for NEW contacts, not updates
      // This preserves sales team's status changes (CONNECTED, OPEN_DEAL, etc.)

      // NOTE: Custom marketing properties (lead_source, utm_*) must be created in HubSpot first
      // If you need these, create them as custom contact properties in your HubSpot account:
      // Settings > Properties > Create Property > Contact properties
      // For now, we skip these to ensure contacts are always created successfully
      // Future enhancement: Add them once custom properties are configured

      if (searchResponse.results && searchResponse.results.length > 0) {
        // Update existing contact
        const contactId = searchResponse.results[0].id;
        const existingContact = searchResponse.results[0];
        
        // Handle lifecycle stage - only advance, never downgrade
        const lifecycleStages = ['subscriber', 'lead', 'marketingqualifiedlead', 'salesqualifiedlead', 'opportunity', 'customer', 'evangelist'];
        const existingStage = existingContact.properties?.lifecyclestage || '';
        const newStage = lead.lifecyclestage || 'lead';
        
        const existingStageIndex = lifecycleStages.indexOf(existingStage);
        const newStageIndex = lifecycleStages.indexOf(newStage);
        
        // Only set lifecycle stage if it's an advancement or if it doesn't exist yet
        if (existingStageIndex === -1) {
          // Contact has no lifecycle stage yet, set it
          properties.lifecyclestage = newStage;
        } else if (newStageIndex > existingStageIndex) {
          // Only advance the lifecycle stage, never downgrade
          properties.lifecyclestage = newStage;
        }
        // Otherwise, omit lifecyclestage to preserve the existing higher stage
        
        logger.info('Updating existing HubSpot contact', {
          contactId,
          email: lead.email,
          existingStage,
          newStage: properties.lifecyclestage || '(preserved)',
        });
        
        return await this.request(`/crm/v3/objects/contacts/${contactId}`, {
          method: 'PATCH',
          body: JSON.stringify({ properties })
        });
      } else {
        // Create new contact - include lifecycle stage for new contacts
        properties.lifecyclestage = lead.lifecyclestage || 'lead';
        properties.hs_lead_status = properties.hs_lead_status || 'NEW';
        
        logger.info('Creating new HubSpot marketing lead', {
          email: lead.email,
          lifecyclestage: properties.lifecyclestage,
        });
        
        return await this.request('/crm/v3/objects/contacts', {
          method: 'POST',
          body: JSON.stringify({ properties })
        });
      }
    } catch (error) {
      logError(error as Error, { 
        context: 'hubspot-create-marketing-lead', 
        email: lead.email,
        source: lead.lead_source,
      });
      throw error;
    }
  }

  /**
   * Add a contact to a HubSpot list by email
   * Useful for managing waitlists, nurture campaigns, etc.
   */
  async addContactToList(email: string, listId: string): Promise<any> {
    try {
      // First, find the contact by email
      const searchResponse = await this.request('/crm/v3/objects/contacts/search', {
        method: 'POST',
        body: JSON.stringify({
          filterGroups: [{
            filters: [{
              propertyName: 'email',
              operator: 'EQ',
              value: email,
            }]
          }]
        })
      });

      if (!searchResponse.results || searchResponse.results.length === 0) {
        throw new Error(`Contact not found with email: ${email}`);
      }

      const contactId = searchResponse.results[0].id;

      // Add contact to list
      logger.info('Adding contact to HubSpot list', {
        contactId,
        email,
        listId,
      });

      return await this.request(`/contacts/v1/lists/${listId}/add`, {
        method: 'POST',
        body: JSON.stringify({
          vids: [parseInt(contactId)]
        })
      });
    } catch (error) {
      logError(error as Error, { 
        context: 'hubspot-add-to-list', 
        email,
        listId,
      });
      throw error;
    }
  }
}

/**
 * Create a new HubSpot service instance for an organization
 */
export async function createHubSpotService(organizationId: string): Promise<HubSpotService> {
  const service = new HubSpotService();
  await service.initialize(organizationId);
  return service;
}
