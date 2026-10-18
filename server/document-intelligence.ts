import OpenAI from "openai";
import { logError } from "./logger";

const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY
});

// the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
const MODEL = "gpt-5";

interface ExtractedProductSpecs {
  manufacturer?: string;
  model?: string;
  category?: string; // door, frame, hardware, automation, access-control
  productName?: string;
  dimensions?: {
    width?: string;
    height?: string;
    thickness?: string;
    depth?: string;
  };
  materials?: string[];
  fireRating?: string;
  soundRating?: string;
  certifications?: string[]; // UL, ANSI, ADA, BHMA, etc.
  complianceCodes?: string[]; // IBC, NFPA, ADA codes met
  finishes?: string[];
  specifications?: string; // Full spec text
  features?: string[];
  applications?: string[];
  pricing?: {
    listPrice?: string;
    notes?: string;
  };
  partNumbers?: string[];
  confidence: number;
  extractionNotes?: string[];
}

interface DocumentIntelligenceResult {
  success: boolean;
  ocrText?: string;
  extractedSpecs?: ExtractedProductSpecs;
  suggestedCatalogEntry?: {
    category: string;
    manufacturer: string;
    model: string;
    specifications: string;
    notes: string;
  };
  error?: string;
  processingTimeMs?: number;
}

/**
 * Extract text from PDF or image using OCR (client-side processing via Tesseract.js)
 * This function expects pre-extracted OCR text from the client
 */
export async function processOCRText(
  ocrText: string,
  documentType?: string,
  manufacturerHint?: string
): Promise<ExtractedProductSpecs> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are an expert in commercial door hardware specifications and technical documentation. Extract structured product data from manufacturer spec sheets, cut sheets, and technical documents.

Extract all available information:
- Product identification (manufacturer, model, part numbers)
- Category classification (door, frame, hardware, automation, access-control)
- Physical dimensions and specifications
- Materials and construction details
- Fire ratings, sound ratings, security ratings
- Industry certifications (UL, ANSI, BHMA, ADA, etc.)
- Code compliance (IBC, NFPA, ADA standards)
- Available finishes and options
- Features, applications, and use cases
- Pricing information if present

Focus on accuracy and completeness. If information is unclear or ambiguous, note it in extractionNotes.
Return comprehensive structured data in JSON format with high confidence scores.`
        },
        {
          role: "user",
          content: `Extract product specifications from this ${documentType || 'technical document'}${manufacturerHint ? ` from ${manufacturerHint}` : ''}:

OCR TEXT:
${ocrText}

Extract all specifications, dimensions, ratings, certifications, and compliance information. Structure the data for catalog entry creation.`
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 3000
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      manufacturer: result.manufacturer || manufacturerHint,
      model: result.model,
      category: result.category,
      productName: result.productName,
      dimensions: result.dimensions || {},
      materials: result.materials || [],
      fireRating: result.fireRating,
      soundRating: result.soundRating,
      certifications: result.certifications || [],
      complianceCodes: result.complianceCodes || [],
      finishes: result.finishes || [],
      specifications: result.specifications || ocrText.substring(0, 500),
      features: result.features || [],
      applications: result.applications || [],
      pricing: result.pricing,
      partNumbers: result.partNumbers || [],
      confidence: result.confidence || 0.7,
      extractionNotes: result.extractionNotes || [],
    };
  } catch (error) {
    logError(error as Error, { context: 'document-intelligence-ocr-processing' });
    throw new Error('Failed to extract specifications from OCR text');
  }
}

/**
 * Analyze document image directly with Vision API
 * For PDFs converted to images or direct image uploads
 */
export async function analyzeDocumentImage(
  imageBase64: string,
  documentType?: string,
  manufacturerHint?: string
): Promise<ExtractedProductSpecs> {
  try {
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: "system",
          content: `You are an expert in commercial door hardware specifications and technical documentation. Analyze manufacturer spec sheets, cut sheets, and technical documents to extract structured product data.

Read and extract all visible information:
- Product identification (manufacturer, model numbers, part numbers)
- Category (door, frame, hardware, automation, access-control)
- Physical dimensions and measurements
- Materials and construction
- Ratings (fire, sound, security)
- Certifications (UL, ANSI, BHMA, ADA)
- Code compliance (IBC, NFPA, ADA)
- Finishes and options
- Features and applications
- Pricing if visible

Pay attention to tables, diagrams, specifications lists, and technical drawings.
Return comprehensive structured data in JSON format.`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze this ${documentType || 'technical document'}${manufacturerHint ? ` from ${manufacturerHint}` : ''} and extract all product specifications, dimensions, ratings, certifications, and compliance information.`
            },
            {
              type: "image_url",
              image_url: {
                url: imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" },
      max_completion_tokens: 3000
    });

    const result = JSON.parse(response.choices[0].message.content || '{}');
    
    return {
      manufacturer: result.manufacturer || manufacturerHint,
      model: result.model,
      category: result.category,
      productName: result.productName,
      dimensions: result.dimensions || {},
      materials: result.materials || [],
      fireRating: result.fireRating,
      soundRating: result.soundRating,
      certifications: result.certifications || [],
      complianceCodes: result.complianceCodes || [],
      finishes: result.finishes || [],
      specifications: result.specifications,
      features: result.features || [],
      applications: result.applications || [],
      pricing: result.pricing,
      partNumbers: result.partNumbers || [],
      confidence: result.confidence || 0.75,
      extractionNotes: result.extractionNotes || [],
    };
  } catch (error) {
    logError(error as Error, { context: 'document-intelligence-vision-analysis' });
    throw new Error('Failed to analyze document image with Vision API');
  }
}

/**
 * Generate catalog item suggestion from extracted specs
 */
export function generateCatalogSuggestion(specs: ExtractedProductSpecs): {
  category: string;
  manufacturer: string;
  model: string;
  specifications: string;
  notes: string;
} {
  const specsArray: string[] = [];
  
  if (specs.dimensions) {
    const dims = [];
    if (specs.dimensions.width) dims.push(`Width: ${specs.dimensions.width}`);
    if (specs.dimensions.height) dims.push(`Height: ${specs.dimensions.height}`);
    if (specs.dimensions.thickness) dims.push(`Thickness: ${specs.dimensions.thickness}`);
    if (specs.dimensions.depth) dims.push(`Depth: ${specs.dimensions.depth}`);
    if (dims.length > 0) specsArray.push(dims.join(', '));
  }
  
  if (specs.materials && specs.materials.length > 0) {
    specsArray.push(`Materials: ${specs.materials.join(', ')}`);
  }
  
  if (specs.fireRating) {
    specsArray.push(`Fire Rating: ${specs.fireRating}`);
  }
  
  if (specs.soundRating) {
    specsArray.push(`Sound Rating: ${specs.soundRating}`);
  }
  
  if (specs.certifications && specs.certifications.length > 0) {
    specsArray.push(`Certifications: ${specs.certifications.join(', ')}`);
  }
  
  if (specs.features && specs.features.length > 0) {
    specsArray.push(`Features: ${specs.features.join(', ')}`);
  }
  
  const notesArray: string[] = [];
  
  if (specs.complianceCodes && specs.complianceCodes.length > 0) {
    notesArray.push(`Complies with: ${specs.complianceCodes.join(', ')}`);
  }
  
  if (specs.applications && specs.applications.length > 0) {
    notesArray.push(`Applications: ${specs.applications.join(', ')}`);
  }
  
  if (specs.finishes && specs.finishes.length > 0) {
    notesArray.push(`Available finishes: ${specs.finishes.join(', ')}`);
  }
  
  if (specs.partNumbers && specs.partNumbers.length > 0) {
    notesArray.push(`Part numbers: ${specs.partNumbers.join(', ')}`);
  }
  
  if (specs.extractionNotes && specs.extractionNotes.length > 0) {
    notesArray.push(`Notes: ${specs.extractionNotes.join('; ')}`);
  }
  
  return {
    category: specs.category || 'hardware',
    manufacturer: specs.manufacturer || 'Unknown',
    model: specs.model || specs.productName || 'Unknown Model',
    specifications: specsArray.join('\n'),
    notes: notesArray.join('\n'),
  };
}
