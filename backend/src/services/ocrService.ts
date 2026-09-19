import fs from 'fs';
import path from 'path';
const pdfParse = require('pdf-parse');
import Tesseract from 'tesseract.js';
import { env } from '../config/env';

export class OCRService {
  /**
   * Extracts text from a document.
   * Uses pdf-parse for PDFs. Images/scanned PDFs fallback to tesseract if configured.
   */
  public async extractText(filePath: string): Promise<string> {
    const ext = path.extname(filePath).toLowerCase();

    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    if (ext === '.pdf') {
      return this.extractFromPDF(filePath);
    } else if (['.png', '.jpg', '.jpeg'].includes(ext)) {
      return this.extractFromImage(filePath);
    } else if (ext === '.txt') {
      return fs.promises.readFile(filePath, 'utf-8');
    }

    throw new Error(`Unsupported file type for OCR: ${ext}`);
  }

  private async extractFromPDF(filePath: string): Promise<string> {
    try {
      const dataBuffer = await fs.promises.readFile(filePath);
      const data = await pdfParse(dataBuffer);
      
      // If pdf-parse didn't find much text, it might be a scanned PDF.
      // In a full production scenario, we would use an OCR pipeline like Ghostscript + Tesseract here.
      // For now, we return what pdfParse got.
      if (data.text.trim().length < 50 && env.OCR_PROVIDER === 'tesseract') {
         console.warn('PDF appears to be scanned. OCR for scanned PDFs is currently limited.');
      }
      
      return data.text;
    } catch (error) {
      console.error('Error extracting text from PDF:', error);
      throw new Error('Failed to parse PDF document.');
    }
  }

  private async extractFromImage(filePath: string): Promise<string> {
    try {
      const { data: { text } } = await Tesseract.recognize(filePath, 'eng');
      return text;
    } catch (error) {
      console.error('Error extracting text from image:', error);
      throw new Error('Failed to run OCR on image.');
    }
  }
}

export const ocrService = new OCRService();
