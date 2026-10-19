import { createWorker } from 'tesseract.js';

export interface OCRProgress {
  status: string;
  progress: number;
}

export async function extractTextFromImage(
  imageUrl: string,
  onProgress?: (progress: OCRProgress) => void
): Promise<string> {
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (onProgress) {
        onProgress({
          status: m.status,
          progress: m.progress || 0,
        });
      }
    },
  });

  try {
    const { data: { text } } = await worker.recognize(imageUrl);
    return text.trim();
  } finally {
    await worker.terminate();
  }
}

export async function extractTextWithBoundingBoxes(
  imageUrl: string,
  onProgress?: (progress: OCRProgress) => void
) {
  const worker = await createWorker('eng', 1, {
    logger: (m) => {
      if (onProgress) {
        onProgress({
          status: m.status,
          progress: m.progress || 0,
        });
      }
    },
  });

  try {
    const result = await worker.recognize(imageUrl);
    return {
      text: result.data.text.trim(),
      confidence: result.data.confidence,
    };
  } finally {
    await worker.terminate();
  }
}
