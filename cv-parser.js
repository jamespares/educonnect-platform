const OpenAI = require('openai');
const pdfParse = require('pdf-parse');
const fs = require('fs');

/**
 * CV Parser using DeepSeek AI
 * Extracts structured information from CV/resume files
 */
class CVParser {
    constructor() {
        // DeepSeek uses OpenAI-compatible API
        // Base URL: https://api.deepseek.com
        const apiKey = process.env.DEEPSEEK_API_KEY;
        
        if (!apiKey) {
            console.warn('⚠️  DEEPSEEK_API_KEY not set. CV parsing will be disabled.');
            this.client = null;
        } else {
            this.client = new OpenAI({
                apiKey: apiKey,
                baseURL: 'https://api.deepseek.com', // DeepSeek API endpoint
            });
        }
    }

    /**
     * Parse CV file and extract structured information
     * @param {Buffer} fileBuffer - The CV file buffer (PDF, DOCX, or image)
     * @param {string} mimeType - MIME type of the file
     * @returns {Promise<Object>} Extracted CV data
     */
    async parseCV(fileBuffer, mimeType) {
        if (!this.client) {
            throw new Error('CV parsing is not configured. Please set DEEPSEEK_API_KEY.');
        }

        try {
            // Extract text from PDF if it's a PDF
            let cvText = '';
            if (mimeType === 'application/pdf') {
                const pdfData = await pdfParse(fileBuffer);
                cvText = pdfData.text;
            } else if (mimeType.startsWith('text/')) {
                cvText = fileBuffer.toString('utf-8');
            } else if (mimeType.startsWith('image/')) {
                // For images, we'll use vision API
                return await this.parseCVImage(fileBuffer, mimeType);
            } else {
                // Try to extract text anyway
                cvText = fileBuffer.toString('utf-8');
            }

            // Use DeepSeek to extract structured information
            const extractedData = await this.extractWithAI(cvText);
            return extractedData;
        } catch (error) {
            console.error('Error parsing CV:', error);
            throw new Error(`Failed to parse CV: ${error.message}`);
        }
    }

    /**
     * Parse CV from image using vision API
     * Note: DeepSeek may not support vision API directly, so we'll try text extraction first
     */
    async parseCVImage(imageBuffer, mimeType) {
        // For images, we'll use OCR-like approach by describing the image
        // DeepSeek doesn't have a dedicated vision API, so we'll convert to text description
        // In production, you might want to use a dedicated OCR service first
        
        // Convert buffer to base64
        const base64Image = imageBuffer.toString('base64');
        const dataUrl = `data:${mimeType};base64,${base64Image}`;

        try {
            // Try using DeepSeek's vision capabilities if available
            // If not, fall back to text extraction approach
            const response = await this.client.chat.completions.create({
                model: 'deepseek-chat', // DeepSeek's chat model
                messages: [
                    {
                        role: 'system',
                        content: `You are an expert CV/resume parser. I will provide you with text extracted from a CV/resume image. Extract all relevant information and return it as structured JSON. Focus on extracting:
- Personal information (name, email, phone)
- Nationality (if mentioned)
- Education background (degrees, institutions, dates)
- Work experience (especially teaching experience)
- Years of teaching experience (calculate total years)
- Subject specialties
- Skills and certifications
- Any other relevant professional information

Return ONLY valid JSON in this format:
{
  "firstName": "string or null",
  "lastName": "string or null",
  "email": "string or null",
  "phone": "string or null",
  "nationality": "string or null",
  "yearsExperience": "string (e.g., '0-1', '2-5', '6-10', '11-15', '16+') or null",
  "education": "string (full education background) or null",
  "teachingExperience": "string (detailed teaching experience) or null",
  "subjectSpecialty": "string (e.g., 'English', 'Mathematics', 'Science', 'ESL/TESOL') or null",
  "professionalExperience": "string (other professional experience if not teaching) or null",
  "additionalInfo": "string (skills, certifications, languages) or null"
}`
                    },
                    {
                        role: 'user',
                        content: `I'm uploading a CV/resume as an image. Please extract all text and information from it. The image data is: ${dataUrl.substring(0, 100)}... (base64 encoded)`
                    }
                ],
                temperature: 0.1,
                max_tokens: 2000
            });

            const content = response.choices[0].message.content;
            return this.parseAIResponse(content);
        } catch (error) {
            // If vision API fails, return empty structure with note
            console.warn('Image parsing not fully supported. Consider using PDF format for better results.');
            return {
                firstName: null,
                lastName: null,
                email: null,
                phone: null,
                nationality: null,
                yearsExperience: null,
                education: 'CV uploaded as image - manual review required',
                teachingExperience: null,
                subjectSpecialty: null,
                professionalExperience: null,
                additionalInfo: 'CV uploaded as image file. Please review manually or ask applicant to upload PDF version.'
            };
        }
    }

    /**
     * Extract structured data from CV text using AI
     */
    async extractWithAI(cvText) {
        const response = await this.client.chat.completions.create({
            model: 'deepseek-chat', // DeepSeek's chat model
            messages: [
                {
                    role: 'system',
                    content: `You are an expert CV/resume parser. Extract all relevant information from this CV/resume and return it as structured JSON. Focus on extracting:
- Personal information (name, email, phone)
- Nationality (if mentioned)
- Education background (degrees, institutions, dates)
- Work experience (especially teaching experience)
- Years of teaching experience (calculate total years)
- Subject specialties
- Skills and certifications
- Any other relevant professional information

Return ONLY valid JSON in this format:
{
  "firstName": "string or null",
  "lastName": "string or null",
  "email": "string or null",
  "phone": "string or null",
  "nationality": "string or null",
  "yearsExperience": "string (e.g., '0-1', '2-5', '6-10', '11-15', '16+') or null",
  "education": "string (full education background) or null",
  "teachingExperience": "string (detailed teaching experience) or null",
  "subjectSpecialty": "string (e.g., 'English', 'Mathematics', 'Science', 'ESL/TESOL') or null",
  "professionalExperience": "string (other professional experience if not teaching) or null",
  "additionalInfo": "string (skills, certifications, languages) or null"
}

Be thorough and extract as much information as possible. If information is not available, use null.`
                },
                {
                    role: 'user',
                    content: `Please extract information from this CV:\n\n${cvText.substring(0, 15000)}` // Limit to avoid token limits
                }
            ],
            temperature: 0.1, // Low temperature for more consistent extraction
            max_tokens: 2000
        });

        const content = response.choices[0].message.content;
        return this.parseAIResponse(content);
    }

    /**
     * Parse AI response and extract JSON
     */
    parseAIResponse(content) {
        try {
            // Try to extract JSON from the response (AI might wrap it in markdown)
            let jsonStr = content.trim();
            
            // Remove markdown code blocks if present
            jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            
            // Try to find JSON object
            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonStr = jsonMatch[0];
            }
            
            const parsed = JSON.parse(jsonStr);
            
            // Validate and clean the extracted data
            return {
                firstName: parsed.firstName || null,
                lastName: parsed.lastName || null,
                email: parsed.email || null,
                phone: parsed.phone || null,
                nationality: parsed.nationality || null,
                yearsExperience: parsed.yearsExperience || null,
                education: parsed.education || null,
                teachingExperience: parsed.teachingExperience || null,
                subjectSpecialty: parsed.subjectSpecialty || null,
                professionalExperience: parsed.professionalExperience || null,
                additionalInfo: parsed.additionalInfo || null
            };
        } catch (error) {
            console.error('Error parsing AI response:', error);
            console.error('Response content:', content);
            // Return empty structure if parsing fails
            return {
                firstName: null,
                lastName: null,
                email: null,
                phone: null,
                nationality: null,
                yearsExperience: null,
                education: null,
                teachingExperience: null,
                subjectSpecialty: null,
                professionalExperience: null,
                additionalInfo: null
            };
        }
    }

    /**
     * Parse LinkedIn profile URL (placeholder - would need LinkedIn API or scraping)
     * For now, we'll just store the URL and extract manually or use a service
     */
    async parseLinkedIn(linkedInUrl) {
        // LinkedIn doesn't allow easy scraping, so we'll just return the URL
        // In production, you might want to use a service like Apify or similar
        // For now, we'll extract what we can from the URL itself
        return {
            linkedin: linkedInUrl,
            // Other fields will need to be filled manually or via a LinkedIn API service
        };
    }
}

module.exports = CVParser;
