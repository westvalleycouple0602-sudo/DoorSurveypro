import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, gte, lte, or, not, desc } from "drizzle-orm";
import { logger, logError } from "../logger";

/**
 * Calendar event structure returned from providers
 */
interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  location?: string;
  attendees?: { email: string; name?: string }[];
  status?: string;
}

/**
 * Slot availability for scheduling
 */
interface TimeSlot {
  start: Date;
  end: Date;
  available: boolean;
  travelMinutes?: number;
  conflictReason?: string;
}

/**
 * Calendar provider interface
 */
interface CalendarProvider {
  listEvents(
    accessToken: string,
    calendarId: string | null,
    timeMin: Date,
    timeMax: Date
  ): Promise<CalendarEvent[]>;
  
  createEvent(
    accessToken: string,
    calendarId: string | null,
    event: {
      summary: string;
      description?: string;
      start: Date;
      end: Date;
      location?: string;
      attendees?: { email: string; name?: string }[];
    }
  ): Promise<{ eventId: string }>;
  
  deleteEvent(
    accessToken: string,
    calendarId: string | null,
    eventId: string
  ): Promise<void>;
  
  refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresAt: Date;
    refreshToken?: string;
  }>;
}

/**
 * Google Calendar Provider Implementation
 */
class GoogleCalendarProvider implements CalendarProvider {
  private readonly baseUrl = "https://www.googleapis.com/calendar/v3";
  
  async listEvents(
    accessToken: string,
    calendarId: string | null,
    timeMin: Date,
    timeMax: Date
  ): Promise<CalendarEvent[]> {
    const calendar = calendarId || "primary";
    const params = new URLSearchParams({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "250",
    });
    
    const response = await fetch(
      `${this.baseUrl}/calendars/${encodeURIComponent(calendar)}/events?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Calendar API error: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    return (data.items || []).map((item: any) => ({
      id: item.id,
      summary: item.summary || "(No title)",
      description: item.description,
      start: new Date(item.start?.dateTime || item.start?.date),
      end: new Date(item.end?.dateTime || item.end?.date),
      location: item.location,
      attendees: item.attendees?.map((a: any) => ({
        email: a.email,
        name: a.displayName,
      })),
      status: item.status,
    }));
  }
  
  async createEvent(
    accessToken: string,
    calendarId: string | null,
    event: {
      summary: string;
      description?: string;
      start: Date;
      end: Date;
      location?: string;
      attendees?: { email: string; name?: string }[];
    }
  ): Promise<{ eventId: string }> {
    const calendar = calendarId || "primary";
    
    const eventBody: any = {
      summary: event.summary,
      description: event.description,
      start: {
        dateTime: event.start.toISOString(),
        timeZone: "America/New_York",
      },
      end: {
        dateTime: event.end.toISOString(),
        timeZone: "America/New_York",
      },
      location: event.location,
      reminders: {
        useDefault: false,
        overrides: [
          { method: "email", minutes: 24 * 60 },
          { method: "popup", minutes: 30 },
        ],
      },
    };
    
    if (event.attendees?.length) {
      eventBody.attendees = event.attendees.map((a) => ({
        email: a.email,
        displayName: a.name,
      }));
    }
    
    const response = await fetch(
      `${this.baseUrl}/calendars/${encodeURIComponent(calendar)}/events`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventBody),
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google Calendar create event error: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    return { eventId: data.id };
  }
  
  async deleteEvent(
    accessToken: string,
    calendarId: string | null,
    eventId: string
  ): Promise<void> {
    const calendar = calendarId || "primary";
    
    const response = await fetch(
      `${this.baseUrl}/calendars/${encodeURIComponent(calendar)}/events/${eventId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    
    if (!response.ok && response.status !== 404) {
      const error = await response.text();
      throw new Error(`Google Calendar delete event error: ${response.status} - ${error}`);
    }
  }
  
  async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresAt: Date;
    refreshToken?: string;
  }> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error("Google OAuth credentials not configured");
    }
    
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: "refresh_token",
      }),
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Google token refresh error: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      refreshToken: data.refresh_token,
    };
  }
}

/**
 * Microsoft Outlook Calendar Provider Implementation
 */
class MicrosoftCalendarProvider implements CalendarProvider {
  private readonly baseUrl = "https://graph.microsoft.com/v1.0";
  
  async listEvents(
    accessToken: string,
    calendarId: string | null,
    timeMin: Date,
    timeMax: Date
  ): Promise<CalendarEvent[]> {
    const calendarPath = calendarId 
      ? `/me/calendars/${calendarId}/events`
      : "/me/events";
    
    const params = new URLSearchParams({
      $filter: `start/dateTime ge '${timeMin.toISOString()}' and end/dateTime le '${timeMax.toISOString()}'`,
      $orderby: "start/dateTime",
      $top: "250",
    });
    
    const response = await fetch(
      `${this.baseUrl}${calendarPath}?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Microsoft Graph API error: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    return (data.value || []).map((item: any) => ({
      id: item.id,
      summary: item.subject || "(No title)",
      description: item.bodyPreview,
      start: new Date(item.start?.dateTime + "Z"),
      end: new Date(item.end?.dateTime + "Z"),
      location: item.location?.displayName,
      attendees: item.attendees?.map((a: any) => ({
        email: a.emailAddress?.address,
        name: a.emailAddress?.name,
      })),
      status: item.showAs,
    }));
  }
  
  async createEvent(
    accessToken: string,
    calendarId: string | null,
    event: {
      summary: string;
      description?: string;
      start: Date;
      end: Date;
      location?: string;
      attendees?: { email: string; name?: string }[];
    }
  ): Promise<{ eventId: string }> {
    const calendarPath = calendarId 
      ? `/me/calendars/${calendarId}/events`
      : "/me/events";
    
    const eventBody: any = {
      subject: event.summary,
      body: event.description ? {
        contentType: "Text",
        content: event.description,
      } : undefined,
      start: {
        dateTime: event.start.toISOString().replace("Z", ""),
        timeZone: "America/New_York",
      },
      end: {
        dateTime: event.end.toISOString().replace("Z", ""),
        timeZone: "America/New_York",
      },
      location: event.location ? {
        displayName: event.location,
      } : undefined,
      reminderMinutesBeforeStart: 30,
      isReminderOn: true,
    };
    
    if (event.attendees?.length) {
      eventBody.attendees = event.attendees.map((a) => ({
        emailAddress: {
          address: a.email,
          name: a.name,
        },
        type: "required",
      }));
    }
    
    const response = await fetch(
      `${this.baseUrl}${calendarPath}`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(eventBody),
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Microsoft Graph create event error: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    return { eventId: data.id };
  }
  
  async deleteEvent(
    accessToken: string,
    calendarId: string | null,
    eventId: string
  ): Promise<void> {
    const response = await fetch(
      `${this.baseUrl}/me/events/${eventId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    
    if (!response.ok && response.status !== 404) {
      const error = await response.text();
      throw new Error(`Microsoft Graph delete event error: ${response.status} - ${error}`);
    }
  }
  
  async refreshToken(refreshToken: string): Promise<{
    accessToken: string;
    expiresAt: Date;
    refreshToken?: string;
  }> {
    const clientId = process.env.MICROSOFT_CLIENT_ID;
    const clientSecret = process.env.MICROSOFT_CLIENT_SECRET;
    
    if (!clientId || !clientSecret) {
      throw new Error("Microsoft OAuth credentials not configured");
    }
    
    const response = await fetch(
      "https://login.microsoftonline.com/common/oauth2/v2.0/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: refreshToken,
          grant_type: "refresh_token",
          scope: "Calendars.ReadWrite offline_access",
        }),
      }
    );
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Microsoft token refresh error: ${response.status} - ${error}`);
    }
    
    const data = await response.json();
    return {
      accessToken: data.access_token,
      expiresAt: new Date(Date.now() + data.expires_in * 1000),
      refreshToken: data.refresh_token,
    };
  }
}

/**
 * Main Calendar Service
 */
export class CalendarService {
  private googleProvider = new GoogleCalendarProvider();
  private microsoftProvider = new MicrosoftCalendarProvider();
  
  private getProvider(provider: string): CalendarProvider {
    switch (provider) {
      case "google":
        return this.googleProvider;
      case "microsoft":
        return this.microsoftProvider;
      default:
        throw new Error(`Unknown calendar provider: ${provider}`);
    }
  }
  
  /**
   * Get active calendar integration for organization
   */
  async getActiveIntegration(organizationId: string): Promise<typeof schema.calendarIntegrations.$inferSelect | null> {
    const integration = await db.query.calendarIntegrations.findFirst({
      where: and(
        eq(schema.calendarIntegrations.organizationId, organizationId),
        eq(schema.calendarIntegrations.isActive, true),
        eq(schema.calendarIntegrations.isPrimary, true)
      ),
    });
    
    if (!integration) {
      return (await db.query.calendarIntegrations.findFirst({
        where: and(
          eq(schema.calendarIntegrations.organizationId, organizationId),
          eq(schema.calendarIntegrations.isActive, true)
        ),
      })) ?? null;
    }
    
    return integration;
  }
  
  /**
   * Ensure access token is valid, refresh if needed
   */
  async ensureValidToken(integration: typeof schema.calendarIntegrations.$inferSelect): Promise<string> {
    const now = new Date();
    const bufferTime = 5 * 60 * 1000;
    
    if (integration.tokenExpiresAt && new Date(integration.tokenExpiresAt).getTime() > now.getTime() + bufferTime) {
      return integration.accessToken;
    }
    
    if (!integration.refreshToken) {
      throw new Error("Token expired and no refresh token available. Please reconnect calendar.");
    }
    
    const provider = this.getProvider(integration.provider);
    const newTokens = await provider.refreshToken(integration.refreshToken);
    
    await db.update(schema.calendarIntegrations)
      .set({
        accessToken: newTokens.accessToken,
        tokenExpiresAt: newTokens.expiresAt,
        refreshToken: newTokens.refreshToken || integration.refreshToken,
        updatedAt: new Date(),
      })
      .where(eq(schema.calendarIntegrations.id, integration.id));
    
    return newTokens.accessToken;
  }
  
  /**
   * List events from external calendar
   */
  async listExternalEvents(
    organizationId: string,
    timeMin: Date,
    timeMax: Date
  ): Promise<CalendarEvent[]> {
    const integration = await this.getActiveIntegration(organizationId);
    if (!integration) {
      return [];
    }
    
    try {
      const accessToken = await this.ensureValidToken(integration);
      const provider = this.getProvider(integration.provider);
      return await provider.listEvents(
        accessToken,
        integration.calendarId,
        timeMin,
        timeMax
      );
    } catch (error) {
      logError(error as Error, { context: "calendar-list-events", organizationId });
      return [];
    }
  }
  
  /**
   * Get availability blocks for organization
   */
  async getAvailabilityBlocks(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<typeof schema.availabilityBlocks.$inferSelect[]> {
    return await db.query.availabilityBlocks.findMany({
      where: and(
        eq(schema.availabilityBlocks.organizationId, organizationId),
        eq(schema.availabilityBlocks.isActive, true),
        lte(schema.availabilityBlocks.startAt, endDate),
        gte(schema.availabilityBlocks.endAt, startDate)
      ),
      orderBy: [desc(schema.availabilityBlocks.startAt)],
    });
  }
  
  /**
   * Get existing site walk appointments
   */
  async getExistingAppointments(
    organizationId: string,
    startDate: Date,
    endDate: Date
  ): Promise<typeof schema.siteWalkAppointments.$inferSelect[]> {
    return await db.query.siteWalkAppointments.findMany({
      where: and(
        eq(schema.siteWalkAppointments.organizationId, organizationId),
        not(eq(schema.siteWalkAppointments.status, "cancelled")),
        lte(schema.siteWalkAppointments.scheduledStart, endDate),
        gte(schema.siteWalkAppointments.scheduledEnd, startDate)
      ),
      orderBy: [desc(schema.siteWalkAppointments.scheduledStart)],
    });
  }
  
  /**
   * Check for conflicts at a specific time
   */
  async checkConflicts(
    organizationId: string,
    proposedStart: Date,
    proposedEnd: Date,
    travelBufferMinutes: number = 0,
    excludeAppointmentId?: string
  ): Promise<{
    hasConflict: boolean;
    reason?: string;
    conflictingEvent?: any;
  }> {
    const bufferStart = new Date(proposedStart.getTime() - travelBufferMinutes * 60 * 1000);
    const bufferEnd = new Date(proposedEnd.getTime() + 15 * 60 * 1000);
    
    const blocks = await this.getAvailabilityBlocks(organizationId, bufferStart, bufferEnd);
    for (const block of blocks) {
      if (
        new Date(block.startAt) < bufferEnd &&
        new Date(block.endAt) > bufferStart
      ) {
        return {
          hasConflict: true,
          reason: block.reason || "Time blocked",
          conflictingEvent: { type: "block", ...block },
        };
      }
    }
    
    const appointments = await this.getExistingAppointments(organizationId, bufferStart, bufferEnd);
    for (const appt of appointments) {
      if (excludeAppointmentId && appt.id === excludeAppointmentId) continue;
      
      const apptStart = new Date(new Date(appt.scheduledStart).getTime() - (appt.travelBufferBefore || 0) * 60 * 1000);
      const apptEnd = new Date(appt.scheduledEnd);
      
      if (apptStart < bufferEnd && apptEnd > bufferStart) {
        return {
          hasConflict: true,
          reason: `Existing appointment at ${appt.locationName || "another location"}`,
          conflictingEvent: { type: "appointment", ...appt },
        };
      }
    }
    
    const externalEvents = await this.listExternalEvents(organizationId, bufferStart, bufferEnd);
    for (const event of externalEvents) {
      if (event.status === "cancelled") continue;
      
      if (event.start < bufferEnd && event.end > bufferStart) {
        return {
          hasConflict: true,
          reason: `Calendar event: ${event.summary}`,
          conflictingEvent: { type: "external", ...event },
        };
      }
    }
    
    return { hasConflict: false };
  }
  
  /**
   * Get available time slots for scheduling
   */
  async getAvailableSlots(
    organizationId: string,
    locationId: string | null,
    startDate: Date,
    endDate: Date,
    slotDurationMinutes: number = 60,
    travelMinutes: number = 0
  ): Promise<TimeSlot[]> {
    const slots: TimeSlot[] = [];
    const businessHourStart = 8;
    const businessHourEnd = 18;
    
    const current = new Date(startDate);
    current.setHours(businessHourStart, 0, 0, 0);
    
    while (current < endDate) {
      if (current.getDay() === 0 || current.getDay() === 6) {
        current.setDate(current.getDate() + 1);
        current.setHours(businessHourStart, 0, 0, 0);
        continue;
      }
      
      while (current.getHours() < businessHourEnd) {
        const slotStart = new Date(current);
        const slotEnd = new Date(current.getTime() + slotDurationMinutes * 60 * 1000);
        
        if (slotEnd.getHours() > businessHourEnd || 
            (slotEnd.getHours() === businessHourEnd && slotEnd.getMinutes() > 0)) {
          break;
        }
        
        const conflict = await this.checkConflicts(
          organizationId,
          slotStart,
          slotEnd,
          travelMinutes
        );
        
        slots.push({
          start: slotStart,
          end: slotEnd,
          available: !conflict.hasConflict,
          travelMinutes,
          conflictReason: conflict.reason,
        });
        
        current.setTime(current.getTime() + 30 * 60 * 1000);
      }
      
      current.setDate(current.getDate() + 1);
      current.setHours(businessHourStart, 0, 0, 0);
    }
    
    return slots;
  }
  
  /**
   * Create a site walk appointment with external calendar sync
   */
  async createAppointment(
    data: {
      organizationId: string;
      projectId?: string;
      customerLocationId?: string;
      portalUserId?: string;
      scheduledStart: Date;
      scheduledEnd: Date;
      travelMinutes?: number;
      locationName?: string;
      locationAddress?: string;
      locationCity?: string;
      locationState?: string;
      locationZip?: string;
      clientName?: string;
      clientEmail?: string;
      clientPhone?: string;
      assignedUserId?: string;
      notes?: string;
      clientNotes?: string;
    }
  ): Promise<{ appointment: typeof schema.siteWalkAppointments.$inferSelect; eventId?: string }> {
    const conflict = await this.checkConflicts(
      data.organizationId,
      data.scheduledStart,
      data.scheduledEnd,
      data.travelMinutes || 0
    );
    
    if (conflict.hasConflict) {
      throw new Error(`Scheduling conflict: ${conflict.reason}`);
    }
    
    let externalEventId: string | undefined;
    let externalProvider: "google" | "microsoft" | undefined;
    let calendarIntegrationId: string | undefined;
    
    const integration = await this.getActiveIntegration(data.organizationId);
    if (integration) {
      try {
        const accessToken = await this.ensureValidToken(integration);
        const provider = this.getProvider(integration.provider);
        
        const fullAddress = [
          data.locationAddress,
          data.locationCity,
          data.locationState,
          data.locationZip,
        ].filter(Boolean).join(", ");
        
        const result = await provider.createEvent(accessToken, integration.calendarId, {
          summary: `Site Walk: ${data.locationName || "Customer Location"}`,
          description: [
            data.clientName ? `Client: ${data.clientName}` : null,
            data.clientEmail ? `Email: ${data.clientEmail}` : null,
            data.clientPhone ? `Phone: ${data.clientPhone}` : null,
            data.notes ? `\nNotes: ${data.notes}` : null,
            data.clientNotes ? `\nClient Notes: ${data.clientNotes}` : null,
          ].filter(Boolean).join("\n"),
          start: data.scheduledStart,
          end: data.scheduledEnd,
          location: fullAddress || undefined,
          attendees: data.clientEmail ? [{ email: data.clientEmail, name: data.clientName }] : undefined,
        });
        
        externalEventId = result.eventId;
        externalProvider = integration.provider as "google" | "microsoft";
        calendarIntegrationId = integration.id;
        
        logger.info("Site walk event created on external calendar", {
          organizationId: data.organizationId,
          provider: integration.provider,
          eventId: result.eventId,
        });
      } catch (error) {
        logError(error as Error, { context: "calendar-create-event", organizationId: data.organizationId });
      }
    }
    
    const [appointment] = await db.insert(schema.siteWalkAppointments)
      .values({
        organizationId: data.organizationId,
        projectId: data.projectId,
        customerLocationId: data.customerLocationId,
        portalUserId: data.portalUserId,
        scheduledStart: data.scheduledStart,
        scheduledEnd: data.scheduledEnd,
        travelMinutes: data.travelMinutes || 0,
        travelBufferBefore: Math.max(15, data.travelMinutes || 0),
        locationName: data.locationName,
        locationAddress: data.locationAddress,
        locationCity: data.locationCity,
        locationState: data.locationState,
        locationZip: data.locationZip,
        status: "confirmed",
        externalEventId,
        externalProvider,
        calendarIntegrationId,
        clientName: data.clientName,
        clientEmail: data.clientEmail,
        clientPhone: data.clientPhone,
        assignedUserId: data.assignedUserId,
        notes: data.notes,
        clientNotes: data.clientNotes,
        confirmedAt: new Date(),
        confirmedBy: "system",
      })
      .returning();
    
    return { appointment, eventId: externalEventId };
  }
  
  /**
   * Cancel an appointment and remove from external calendar
   */
  async cancelAppointment(appointmentId: string, organizationId: string): Promise<void> {
    const appointment = await db.query.siteWalkAppointments.findFirst({
      where: and(
        eq(schema.siteWalkAppointments.id, appointmentId),
        eq(schema.siteWalkAppointments.organizationId, organizationId)
      ),
    });
    
    if (!appointment) {
      throw new Error("Appointment not found");
    }
    
    if (appointment.externalEventId && appointment.calendarIntegrationId) {
      try {
        const integration = await db.query.calendarIntegrations.findFirst({
          where: eq(schema.calendarIntegrations.id, appointment.calendarIntegrationId),
        });
        
        if (integration) {
          const accessToken = await this.ensureValidToken(integration);
          const provider = this.getProvider(integration.provider);
          await provider.deleteEvent(accessToken, integration.calendarId, appointment.externalEventId);
          
          logger.info("Site walk event deleted from external calendar", {
            organizationId,
            provider: integration.provider,
            eventId: appointment.externalEventId,
          });
        }
      } catch (error) {
        logError(error as Error, { context: "calendar-delete-event", organizationId });
      }
    }
    
    await db.update(schema.siteWalkAppointments)
      .set({
        status: "cancelled",
        updatedAt: new Date(),
      })
      .where(eq(schema.siteWalkAppointments.id, appointmentId));
  }
}

export const calendarService = new CalendarService();
