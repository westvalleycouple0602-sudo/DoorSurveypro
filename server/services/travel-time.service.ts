import { db } from "../db";
import * as schema from "@shared/schema";
import { eq, and, gte, lte } from "drizzle-orm";
import { logger, logError } from "../logger";

interface TravelTimeResult {
  durationMinutes: number;
  distanceMiles?: number;
  source: "cache" | "google" | "fallback";
}

interface AddressComponents {
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
}

/**
 * Travel Time Calculation Service
 * Uses Google Distance Matrix API with fallback to distance-based estimation
 */
export class TravelTimeService {
  private readonly CACHE_DURATION_HOURS = 24;
  private readonly AVERAGE_SPEED_MPH = 30;
  private readonly BUFFER_MINUTES = 10;
  
  /**
   * Format address components into a single string
   */
  formatAddress(components: AddressComponents): string {
    return [
      components.address,
      components.city,
      components.state,
      components.zip,
    ].filter(Boolean).join(", ");
  }
  
  /**
   * Get cached travel time if available (organization-scoped)
   */
  async getCachedTravelTime(
    organizationId: string,
    originAddress: string,
    destinationAddress: string
  ): Promise<TravelTimeResult | null> {
    const cached = await db.query.travelTimeCache.findFirst({
      where: and(
        eq(schema.travelTimeCache.organizationId, organizationId),
        eq(schema.travelTimeCache.originAddress, originAddress),
        eq(schema.travelTimeCache.destinationAddress, destinationAddress),
        gte(schema.travelTimeCache.expiresAt, new Date())
      ),
    });
    
    if (cached) {
      return {
        durationMinutes: cached.durationMinutes,
        distanceMiles: cached.distanceMiles ?? undefined,
        source: "cache",
      };
    }
    
    return null;
  }
  
  /**
   * Save travel time to cache (organization-scoped)
   */
  async cacheTravelTime(
    organizationId: string,
    originAddress: string,
    destinationAddress: string,
    durationMinutes: number,
    distanceMiles?: number,
    provider: string = "google"
  ): Promise<void> {
    const expiresAt = new Date(Date.now() + this.CACHE_DURATION_HOURS * 60 * 60 * 1000);
    
    await db.insert(schema.travelTimeCache).values({
      organizationId,
      originAddress,
      destinationAddress,
      durationMinutes,
      distanceMiles,
      expiresAt,
      provider,
    });
  }
  
  /**
   * Calculate travel time using Google Distance Matrix API
   */
  async calculateWithGoogle(
    organizationId: string,
    originAddress: string,
    destinationAddress: string
  ): Promise<TravelTimeResult | null> {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      logger.warn("Google Maps API key not configured - using fallback travel time estimation");
      return null;
    }
    
    try {
      const params = new URLSearchParams({
        origins: originAddress,
        destinations: destinationAddress,
        mode: "driving",
        units: "imperial",
        key: apiKey,
      });
      
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/distancematrix/json?${params}`,
        { signal: AbortSignal.timeout(10000) }
      );
      
      if (!response.ok) {
        throw new Error(`Google Distance Matrix API error: ${response.status}`);
      }
      
      const data = await response.json();
      
      if (data.status !== "OK") {
        throw new Error(`Google Distance Matrix API status: ${data.status}`);
      }
      
      const element = data.rows?.[0]?.elements?.[0];
      if (!element || element.status !== "OK") {
        throw new Error(`Route not found: ${element?.status || "unknown"}`);
      }
      
      const durationSeconds = element.duration.value;
      const durationMinutes = Math.ceil(durationSeconds / 60) + this.BUFFER_MINUTES;
      
      const distanceMeters = element.distance?.value;
      const distanceMiles = distanceMeters 
        ? Math.round(distanceMeters * 0.000621371)
        : undefined;
      
      await this.cacheTravelTime(
        organizationId,
        originAddress,
        destinationAddress,
        durationMinutes,
        distanceMiles,
        "google"
      );
      
      return {
        durationMinutes,
        distanceMiles,
        source: "google",
      };
    } catch (error) {
      logError(error as Error, { context: "travel-time-google" });
      return null;
    }
  }
  
  /**
   * Estimate travel time based on approximate distance
   * Uses a simple heuristic based on ZIP code proximity
   */
  estimateFallback(
    origin: AddressComponents,
    destination: AddressComponents
  ): TravelTimeResult {
    const originZip = origin.zip?.substring(0, 3);
    const destZip = destination.zip?.substring(0, 3);
    
    let estimatedMiles = 15;
    
    if (originZip && destZip) {
      if (originZip === destZip) {
        estimatedMiles = 5;
      } else {
        const zipDiff = Math.abs(parseInt(originZip) - parseInt(destZip));
        
        if (zipDiff <= 1) {
          estimatedMiles = 10;
        } else if (zipDiff <= 5) {
          estimatedMiles = 20;
        } else if (zipDiff <= 10) {
          estimatedMiles = 35;
        } else if (zipDiff <= 50) {
          estimatedMiles = 60;
        } else {
          estimatedMiles = 100;
        }
      }
    }
    
    if (origin.city && destination.city) {
      if (origin.city.toLowerCase() === destination.city.toLowerCase()) {
        estimatedMiles = Math.min(estimatedMiles, 8);
      } else if (origin.state && destination.state && 
                 origin.state.toLowerCase() !== destination.state.toLowerCase()) {
        estimatedMiles = Math.max(estimatedMiles, 50);
      }
    }
    
    const durationMinutes = Math.ceil((estimatedMiles / this.AVERAGE_SPEED_MPH) * 60) + this.BUFFER_MINUTES;
    
    return {
      durationMinutes: Math.max(15, durationMinutes),
      distanceMiles: estimatedMiles,
      source: "fallback",
    };
  }
  
  /**
   * Calculate travel time between two locations
   * Uses cache, then Google API, then fallback estimation
   * Organization-scoped for multi-tenant isolation
   */
  async calculateTravelTime(
    organizationId: string,
    origin: AddressComponents,
    destination: AddressComponents
  ): Promise<TravelTimeResult> {
    const originAddress = this.formatAddress(origin);
    const destinationAddress = this.formatAddress(destination);
    
    if (!originAddress || !destinationAddress) {
      return {
        durationMinutes: 30,
        source: "fallback",
      };
    }
    
    const cached = await this.getCachedTravelTime(organizationId, originAddress, destinationAddress);
    if (cached) {
      return cached;
    }
    
    const googleResult = await this.calculateWithGoogle(organizationId, originAddress, destinationAddress);
    if (googleResult) {
      return googleResult;
    }
    
    const fallbackResult = this.estimateFallback(origin, destination);
    
    await this.cacheTravelTime(
      organizationId,
      originAddress,
      destinationAddress,
      fallbackResult.durationMinutes,
      fallbackResult.distanceMiles,
      "fallback"
    );
    
    return fallbackResult;
  }
  
  /**
   * Get travel time for a site walk from organization's home base
   */
  async getTravelTimeToLocation(
    organizationId: string,
    destination: AddressComponents
  ): Promise<TravelTimeResult> {
    const integration = await db.query.calendarIntegrations.findFirst({
      where: and(
        eq(schema.calendarIntegrations.organizationId, organizationId),
        eq(schema.calendarIntegrations.isActive, true),
        eq(schema.calendarIntegrations.isPrimary, true)
      ),
    });
    
    if (integration?.homeBaseAddress) {
      const origin: AddressComponents = {
        address: integration.homeBaseAddress,
        city: integration.homeBaseCity ?? undefined,
        state: integration.homeBaseState ?? undefined,
        zip: integration.homeBaseZip ?? undefined,
      };
      
      return this.calculateTravelTime(organizationId, origin, destination);
    }
    
    return {
      durationMinutes: 30,
      source: "fallback",
    };
  }
  
  /**
   * Clean up expired cache entries
   */
  async cleanupExpiredCache(): Promise<number> {
    const expired = await db.query.travelTimeCache.findMany({
      where: lte(schema.travelTimeCache.expiresAt, new Date()),
      columns: { id: true },
    });
    
    if (expired.length > 0) {
      await db.delete(schema.travelTimeCache)
        .where(lte(schema.travelTimeCache.expiresAt, new Date()));
    }
    
    return expired.length;
  }
}

export const travelTimeService = new TravelTimeService();
