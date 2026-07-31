import pdf from 'pdf-parse';

class PDFService {
  async extractText(buffer: Buffer): Promise<string> {
    try {
      const data = await pdf(buffer);
      return data.text || '';
    } catch (err) {
      console.error('Error parsing PDF content:', err);
      throw new Error('Failed to parse PDF document. Ensure it is a valid, readable PDF file.');
    }
  }
}

export const pdfService = new PDFService();
