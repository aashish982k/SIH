import fs from 'fs';
import path from 'path';
import { env } from '../config/env';

export class OCRService {
  public async extractTextWithMethod(filePath: string): Promise<{ text: string; method: 'native-pdf' | 'ocr' | 'text' }> {
    const ext = path.extname(filePath).toLowerCase();
    if (ext === '.txt') return { text: await fs.promises.readFile(filePath, 'utf-8'), method: 'text' };
    if (ext === '.pdf') {
      try {
        const nativeText = await this.extractNativePdf(filePath);
        if (nativeText.trim().length >= 50) return { text: nativeText, method: 'native-pdf' };
        console.log(`Native PDF extraction returned insufficient text for ${path.basename(filePath)}; falling back to OCR.`);
      } catch (error) {
        console.warn(`Native PDF extraction failed for ${path.basename(filePath)}; falling back to OCR:`, error);
      }
      return { text: await this.extractViaML(filePath, 'pdf'), method: 'ocr' };
    }
    if (['.png', '.jpg', '.jpeg'].includes(ext)) {
      return { text: await this.extractViaML(filePath, 'image'), method: 'ocr' };
    }
    throw new Error(`Unsupported file type for OCR: ${ext}`);
  }

  /**
   * Extracts text from a document.
   * Defers to the ML service /ocr endpoint for PaddleOCR processing.
   */
  public async extractText(filePath: string): Promise<string> {
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }
    return (await this.extractTextWithMethod(filePath)).text;
  }

  private async extractNativePdf(filePath: string): Promise<string> {
    const { PDFParse } = await import('pdf-parse');
    const parser = new PDFParse({ data: await fs.promises.readFile(filePath) });
    const result = await parser.getText();
    await parser.destroy();
    return result.text;
  }

  private async extractViaML(filePath: string, fileType: string): Promise<string> {
    try {
      const dataBuffer = await fs.promises.readFile(filePath);
      const base64Data = dataBuffer.toString('base64');
      
      const response = await fetch(`${env.ML_SERVICE_URL}/ocr`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_base64: base64Data,
          file_type: fileType,
          max_pages: 20
        }),
      });

      if (!response.ok) {
        throw new Error(`ML service returned ${response.status} ${response.statusText}`);
      }

      const result = (await response.json()) as { text: string };
      return result.text;
    } catch (error) {
      console.error(`Error extracting text from ${fileType} via ML service:`, error);
      throw new Error(`Failed to parse ${fileType} document.`);
    }
  }
}

export const ocrService = new OCRService();
