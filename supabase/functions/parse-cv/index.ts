import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Extract text from DOCX file
async function extractTextFromDocx(arrayBuffer: ArrayBuffer): Promise<string> {
  const bytes = new Uint8Array(arrayBuffer);
  
  // DOCX files are ZIP archives containing XML
  // We need to find and extract the document.xml content
  try {
    // Import JSZip dynamically
    const JSZip = (await import("https://esm.sh/jszip@3.10.1")).default;
    const zip = await JSZip.loadAsync(bytes);
    
    // Get the main document content
    const documentXml = await zip.file("word/document.xml")?.async("string");
    
    if (!documentXml) {
      console.log("No document.xml found in DOCX");
      return "";
    }
    
    // Parse XML and extract text content
    // Remove XML tags and decode entities
    let text = documentXml
      // Remove XML declaration
      .replace(/<\?xml[^>]*\?>/g, '')
      // Replace paragraph breaks with newlines
      .replace(/<w:p[^>]*>/g, '\n')
      // Replace line breaks
      .replace(/<w:br[^>]*>/g, '\n')
      // Remove all other XML tags
      .replace(/<[^>]+>/g, '')
      // Decode HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#x26;/g, '&')
      // Clean up whitespace
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
    
    console.log(`[DOCX] Extracted ${text.length} characters from document.xml`);
    return text;
  } catch (error) {
    console.error("[DOCX] Error extracting text:", error);
    return "";
  }
}

// Extract text from PDF using basic text layer extraction
async function extractTextFromPdf(arrayBuffer: ArrayBuffer): Promise<string> {
  try {
    const bytes = new Uint8Array(arrayBuffer);
    const content = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
    
    // Look for text objects in PDF stream
    const textMatches: string[] = [];
    
    // Match text between BT (begin text) and ET (end text) operators
    const btEtPattern = /BT\s*([\s\S]*?)\s*ET/g;
    let match;
    
    while ((match = btEtPattern.exec(content)) !== null) {
      const textBlock = match[1];
      // Extract text from Tj, TJ, ', " operators
      const tjPattern = /\(((?:[^()\\]|\\.)*)\)\s*Tj/g;
      const tjArrayPattern = /\[((?:[^\[\]]*?))\]\s*TJ/g;
      
      let textMatch;
      while ((textMatch = tjPattern.exec(textBlock)) !== null) {
        const decoded = textMatch[1]
          .replace(/\\n/g, '\n')
          .replace(/\\r/g, '')
          .replace(/\\t/g, '\t')
          .replace(/\\\(/g, '(')
          .replace(/\\\)/g, ')')
          .replace(/\\\\/g, '\\');
        if (decoded.trim()) {
          textMatches.push(decoded);
        }
      }
      
      while ((textMatch = tjArrayPattern.exec(textBlock)) !== null) {
        const arrayContent = textMatch[1];
        const stringPattern = /\(((?:[^()\\]|\\.)*)\)/g;
        let stringMatch;
        while ((stringMatch = stringPattern.exec(arrayContent)) !== null) {
          const decoded = stringMatch[1]
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '')
            .replace(/\\t/g, '\t')
            .replace(/\\\(/g, '(')
            .replace(/\\\)/g, ')')
            .replace(/\\\\/g, '\\');
          if (decoded.trim()) {
            textMatches.push(decoded);
          }
        }
      }
    }
    
    const extractedText = textMatches.join(' ').replace(/\s+/g, ' ').trim();
    console.log(`[PDF] Basic extraction found ${extractedText.length} characters`);
    
    return extractedText;
  } catch (error) {
    console.error("[PDF] Error in basic text extraction:", error);
    return "";
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const { cvFilePath } = await req.json();

    if (!cvFilePath) {
      throw new Error('CV file path is required');
    }

    console.log(`[PARSE-CV] Starting parse for file: ${cvFilePath}`);

    // Download the CV file from storage
    const { data: fileData, error: downloadError } = await supabaseClient.storage
      .from('cvs')
      .download(cvFilePath);

    if (downloadError || !fileData) {
      throw new Error('Failed to download CV file: ' + downloadError?.message);
    }

    // Convert file to array buffer
    const arrayBuffer = await fileData.arrayBuffer();
    
    // Determine file type
    const fileExtension = cvFilePath.split('.').pop()?.toLowerCase() || 'pdf';
    console.log(`[PARSE-CV] File extension: ${fileExtension}, Size: ${arrayBuffer.byteLength} bytes`);
    
    let extractedText = '';
    let mimeType = 'application/pdf';
    
    // Extract text based on file type
    if (fileExtension === 'docx') {
      mimeType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      extractedText = await extractTextFromDocx(arrayBuffer);
      console.log(`[PARSE-CV] DOCX text extraction: ${extractedText.length} chars`);
    } else if (fileExtension === 'doc') {
      mimeType = 'application/msword';
      // DOC files are binary, try basic extraction
      const bytes = new Uint8Array(arrayBuffer);
      const content = new TextDecoder("utf-8", { fatal: false }).decode(bytes);
      // Try to find readable text in DOC binary
      extractedText = content.replace(/[^\x20-\x7E\n\r\t]/g, ' ').replace(/\s+/g, ' ').trim();
      console.log(`[PARSE-CV] DOC text extraction: ${extractedText.length} chars`);
    } else {
      // PDF
      extractedText = await extractTextFromPdf(arrayBuffer);
      console.log(`[PARSE-CV] PDF text extraction: ${extractedText.length} chars`);
    }

    // DEBUG: Log snippet of extracted text
    const debugSnippet = extractedText.substring(0, 500);
    console.log(`[PARSE-CV] DEBUG - Extracted text length: ${extractedText.length}`);
    console.log(`[PARSE-CV] DEBUG - First 500 chars: ${debugSnippet}`);

    // Get user's OpenAI API key
    const { data: profileData } = await supabaseClient
      .from('profiles')
      .select('openai_api_key')
      .eq('user_id', user.id)
      .single();

    const openaiApiKey = profileData?.openai_api_key || Deno.env.get('OPENAI_API_KEY');
    
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured. Please add your API key in the profile settings.');
    }

    // If we have extracted text, use it. Otherwise, fall back to base64 for AI vision
    let aiContent = '';
    if (extractedText.length > 100) {
      // Use extracted text directly
      aiContent = `Parse this CV/Resume text and extract structured information:\n\n${extractedText}`;
      console.log(`[PARSE-CV] Using extracted text for AI parsing (${extractedText.length} chars)`);
    } else {
      // Fall back to base64 encoding for AI vision
      const base64Content = btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
      aiContent = `Parse this CV document (base64 encoded ${mimeType}). Extract all the information you can find:\n\n${base64Content.substring(0, 50000)}`;
      console.log(`[PARSE-CV] Using base64 fallback for AI parsing`);
    }

    // Use OpenAI to extract structured data from CV text
    const extractionResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are an expert CV/Resume parser. Extract structured information from the provided CV content and return it as a JSON object. 

Extract the following fields (use null if not found):
- first_name: string
- last_name: string  
- email: string
- phone: string
- city: string
- country: string
- linkedin: string (full URL)
- github: string (full URL)
- portfolio: string (full URL)
- total_experience: string (e.g., "5+ years")
- highest_education: string (e.g., "Master's in Computer Science")
- current_salary: string (if mentioned)
- expected_salary: string (if mentioned)
- skills: array of objects with {name: string, years: number, category: "technical" | "soft"}
- certifications: array of strings
- work_experience: array of objects with {company: string, title: string, startDate: string, endDate: string, description: string, bullets: array of strings}

CRITICAL FOR work_experience:
- Extract the EXACT bullet points from the CV text - do not summarize or modify them
- Each bullet should be a separate string in the bullets array
- Preserve the original wording exactly as written
- Include ALL bullets for each position

- education: array of objects with {institution: string, degree: string, field: string, startDate: string, endDate: string}
- languages: array of objects with {language: string, proficiency: "native" | "fluent" | "conversational" | "basic"}
- cover_letter: string (a brief professional summary if available)

Return ONLY valid JSON, no markdown or explanation.`
          },
          {
            role: 'user',
            content: aiContent
          }
        ],
        temperature: 0.1, // Lower temperature for more accurate extraction
        max_tokens: 4000,
      }),
    });

    if (!extractionResponse.ok) {
      const errorText = await extractionResponse.text();
      console.error('[PARSE-CV] OpenAI extraction error:', errorText);
      throw new Error('Failed to parse CV with AI');
    }

    const extractionData = await extractionResponse.json();
    const extractedContent = extractionData.choices?.[0]?.message?.content || '';
    
    // Parse the JSON response
    let parsedData;
    try {
      // Clean up the response - remove markdown code blocks if present
      let cleanedText = extractedContent.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/^```json\n?/, '').replace(/\n?```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/^```\n?/, '').replace(/\n?```$/, '');
      }
      parsedData = JSON.parse(cleanedText);
      
      console.log(`[PARSE-CV] Successfully parsed CV data`);
      console.log(`[PARSE-CV] Work experience entries: ${parsedData.work_experience?.length || 0}`);
      
      // Log first work experience for debugging
      if (parsedData.work_experience?.[0]) {
        console.log(`[PARSE-CV] First company: ${parsedData.work_experience[0].company}`);
        console.log(`[PARSE-CV] First title: ${parsedData.work_experience[0].title}`);
        console.log(`[PARSE-CV] First bullets count: ${parsedData.work_experience[0].bullets?.length || 0}`);
      }
    } catch (parseError) {
      console.error('[PARSE-CV] JSON parse error:', parseError, 'Raw text:', extractedContent);
      throw new Error('Failed to parse extracted CV data');
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: parsedData,
        debug: {
          extractedTextLength: extractedText.length,
          snippet: debugSnippet,
          fileType: fileExtension,
          fileSize: arrayBuffer.byteLength
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[PARSE-CV] Error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    );
  }
});
