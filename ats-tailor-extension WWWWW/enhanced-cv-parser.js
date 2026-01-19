// enhanced-cv-parser.js - Enhanced CV parser with multi-page PDF/DOCX support
// FIXED: Implemented actual parsing functions instead of placeholders

class EnhancedCVParser {
  constructor() {
    this.supportedFormats = ['pdf', 'docx', 'txt', 'rtf'];
    this.maxFileSize = 10 * 1024 * 1024; // 10MB
    this.parsers = {
      pdf: this.parsePDF.bind(this),
      docx: this.parseDOCX.bind(this),
      txt: this.parseTXT.bind(this),
      rtf: this.parseRTF.bind(this)
    };
  }

  // ============ MAIN PARSING METHOD ============
  
  async parseCV(file, options = {}) {
    try {
      // Validate file
      this.validateFile(file);
      
      // Detect format
      const format = this.detectFormat(file);
      if (!this.supportedFormats.includes(format)) {
        throw new Error(`Unsupported file format: ${format}`);
      }
      
      // Parse based on format
      const parser = this.parsers[format];
      if (!parser) {
        throw new Error(`No parser available for format: ${format}`);
      }
      
      const parsedData = await parser(file, options);
      
      // Normalize and enhance the data
      return this.normalizeParsedData(parsedData);
      
    } catch (error) {
      console.error('[CVParser] Error parsing CV:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  // ============ FILE VALIDATION ============
  
  validateFile(file) {
    if (!file) {
      throw new Error('No file provided');
    }
    
    if (file.size > this.maxFileSize) {
      throw new Error(`File too large. Maximum size: ${this.maxFileSize / (1024*1024)}MB`);
    }
    
    if (!file.type && !file.name) {
      throw new Error('Invalid file object');
    }
  }

  // ============ FORMAT DETECTION ============
  
  detectFormat(file) {
    // Check MIME type
    if (file.type) {
      const mimeMap = {
        'application/pdf': 'pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'text/plain': 'txt',
        'application/rtf': 'rtf',
        'text/rtf': 'rtf'
      };
      
      if (mimeMap[file.type]) {
        return mimeMap[file.type];
      }
    }
    
    // Fallback to file extension
    if (file.name) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (this.supportedFormats.includes(ext)) {
        return ext;
      }
    }
    
    // Default to txt for text files
    if (file.type && file.type.startsWith('text/')) {
      return 'txt';
    }
    
    throw new Error('Unable to determine file format');
  }

  // ============ PDF PARSING ============
  
  async parsePDF(file, options = {}) {
    try {
      // Check if PDF.js is available
      if (typeof pdfjsLib === 'undefined') {
        throw new Error('PDF.js library not available');
      }
      
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Load PDF document
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      const pages = [];
      let fullText = '';
      
      // Extract text from each page
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        
        const pageText = textContent.items
          .map(item => item.str)
          .join(' ')
          .trim();
        
        pages.push({
          number: i,
          text: pageText,
          items: textContent.items
        });
        
        fullText += pageText + '\n\n';
      }
      
      // Parse structured data from text
      const structuredData = this.parseStructuredData(fullText);
      
      return {
        format: 'pdf',
        pages: pages.length,
        fullText: fullText,
        structured: structuredData,
        metadata: {
          filename: file.name,
          fileSize: file.size,
          parsedAt: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.error('[CVParser] PDF parsing error:', error);
      throw new Error(`Failed to parse PDF: ${error.message}`);
    }
  }

  // ============ DOCX PARSING ============
  
  async parseDOCX(file, options = {}) {
    try {
      // Check if mammoth.js is available
      if (typeof mammoth === 'undefined') {
        throw new Error('mammoth.js library not available');
      }
      
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      
      // Extract text using mammoth
      const result = await mammoth.extractRawText({ arrayBuffer });
      const fullText = result.value;
      
      // Also extract HTML for better parsing
      const htmlResult = await mammoth.convertToHtml({ arrayBuffer });
      const htmlContent = htmlResult.value;
      
      // Parse structured data
      const structuredData = this.parseStructuredData(fullText);
      
      return {
        format: 'docx',
        fullText: fullText,
        htmlContent: htmlContent,
        structured: structuredData,
        metadata: {
          filename: file.name,
          fileSize: file.size,
          parsedAt: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.error('[CVParser] DOCX parsing error:', error);
      throw new Error(`Failed to parse DOCX: ${error.message}`);
    }
  }

  // ============ TXT PARSING ============
  
  async parseTXT(file, options = {}) {
    try {
      // Read file as text
      const text = await file.text();
      
      // Parse structured data
      const structuredData = this.parseStructuredData(text);
      
      return {
        format: 'txt',
        fullText: text,
        structured: structuredData,
        metadata: {
          filename: file.name,
          fileSize: file.size,
          parsedAt: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.error('[CVParser] TXT parsing error:', error);
      throw new Error(`Failed to parse TXT: ${error.message}`);
    }
  }

  // ============ RTF PARSING ============
  
  async parseRTF(file, options = {}) {
    try {
      // Read file as text
      const rtfText = await file.text();
      
      // Simple RTF to text conversion (remove RTF formatting)
      const plainText = this.rtfToText(rtfText);
      
      // Parse structured data
      const structuredData = this.parseStructuredData(plainText);
      
      return {
        format: 'rtf',
        fullText: plainText,
        rtfContent: rtfText,
        structured: structuredData,
        metadata: {
          filename: file.name,
          fileSize: file.size,
          parsedAt: new Date().toISOString()
        }
      };
      
    } catch (error) {
      console.error('[CVParser] RTF parsing error:', error);
      throw new Error(`Failed to parse RTF: ${error.message}`);
    }
  }

  // ============ STRUCTURED DATA PARSING ============
  
  parseStructuredData(fullText) {
    const data = {
      personal: {},
      summary: '',
      experience: [],
      education: [],
      skills: [],
      projects: [],
      certifications: [],
      languages: []
    };
    
    const lines = fullText.split('\n').filter(line => line.trim());
    
    // Extract personal info (email, phone, etc.)
    data.personal = this.extractPersonalInfo(lines);
    
    // Extract professional summary
    data.summary = this.extractSummary(lines);
    
    // Extract work experience
    data.experience = this.extractExperience(lines);
    
    // Extract education
    data.education = this.extractEducation(lines);
    
    // Extract skills
    data.skills = this.extractSkills(lines);
    
    // Extract projects
    data.projects = this.extractProjects(lines);
    
    // Extract certifications
    data.certifications = this.extractCertifications(lines);
    
    // Extract languages
    data.languages = this.extractLanguages(lines);
    
    return data;
  }

  extractPersonalInfo(lines) {
    const personal = {
      name: '',
      email: '',
      phone: '',
      location: '',
      linkedin: '',
      github: ''
    };
    
    const fullText = lines.join(' ');
    
    // Extract email
    const emailMatch = fullText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    if (emailMatch) personal.email = emailMatch[0];
    
    // Extract phone
    const phoneMatch = fullText.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    if (phoneMatch) personal.phone = phoneMatch[0];
    
    // Extract name (usually first line or in header)
    if (lines.length > 0) {
      const firstLine = lines[0].trim();
      if (firstLine && !firstLine.includes('@') && !firstLine.match(/^\d/)) {
        personal.name = firstLine;
      }
    }
    
    // Extract LinkedIn URL
    const linkedinMatch = fullText.match(/linkedin\.com\/in\/[^\s]+/);
    if (linkedinMatch) personal.linkedin = 'https://' + linkedinMatch[0];
    
    // Extract GitHub URL
    const githubMatch = fullText.match(/github\.com\/[^\s]+/);
    if (githubMatch) personal.github = 'https://' + githubMatch[0];
    
    // Extract location (city, state/country pattern)
    const locationMatch = fullText.match(/([A-Z][a-z]+(?:,\s*[A-Z]{2})?\s*(?:USA|United States|UK|Canada|Australia)?)/);
    if (locationMatch) personal.location = locationMatch[0];
    
    return personal;
  }

  extractSummary(lines) {
    // Look for summary section
    const summaryKeywords = ['summary', 'objective', 'profile', 'about'];
    let summary = '';
    let inSummary = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].toLowerCase();
      
      if (summaryKeywords.some(keyword => line.includes(keyword))) {
        inSummary = true;
        continue;
      }
      
      if (inSummary) {
        // Check if we've moved to next section
        if (this.isSectionHeader(line)) {
          break;
        }
        summary += lines[i] + ' ';
      }
    }
    
    return summary.trim();
  }

  extractExperience(lines) {
    const experience = [];
    let currentExp = null;
    let inExperience = false;
    
    const expKeywords = ['experience', 'employment', 'work history', 'career'];
    const datePattern = /\d{4}|(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();
      
      // Detect experience section
      if (expKeywords.some(keyword => lowerLine.includes(keyword))) {
        inExperience = true;
        continue;
      }
      
      // Skip if not in experience section
      if (!inExperience) continue;
      
      // Check if we've moved to next section
      if (this.isSectionHeader(lowerLine) && !expKeywords.some(k => lowerLine.includes(k))) {
        if (currentExp) experience.push(currentExp);
        break;
      }
      
      // Detect new job entry (has company name and date)
      if (datePattern.test(line) && (line.includes(' at ') || line.includes(' - ') || line.includes('|'))) {
        if (currentExp) experience.push(currentExp);
        
        const parts = line.split(/\||\-| at /);
        currentExp = {
          company: parts[0].trim(),
          title: parts[1]?.trim() || '',
          dates: parts[2]?.trim() || '',
          bullets: []
        };
      } else if (currentExp && line.trim().startsWith('•')) {
        // Bullet point
        currentExp.bullets.push(line.trim().substring(1).trim());
      }
    }
    
    if (currentExp) experience.push(currentExp);
    return experience;
  }

  extractEducation(lines) {
    const education = [];
    let inEducation = false;
    
    const eduKeywords = ['education', 'academic', 'university', 'college', 'degree'];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();
      
      if (eduKeywords.some(keyword => lowerLine.includes(keyword))) {
        inEducation = true;
        continue;
      }
      
      if (!inEducation) continue;
      
      if (this.isSectionHeader(lowerLine) && !eduKeywords.some(k => lowerLine.includes(k))) {
        break;
      }
      
      // Detect education entry
      if (lowerLine.includes('university') || lowerLine.includes('college') || 
          lowerLine.includes('bachelor') || lowerLine.includes('master') || 
          lowerLine.includes('phd') || lowerLine.includes('degree')) {
        education.push({
          institution: line,
          degree: lines[i + 1] || '',
          field: lines[i + 2] || ''
        });
      }
    }
    
    return education;
  }

  extractSkills(lines) {
    const skills = [];
    let inSkills = false;
    
    const skillKeywords = ['skills', 'technologies', 'tools', 'competencies'];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();
      
      if (skillKeywords.some(keyword => lowerLine.includes(keyword))) {
        inSkills = true;
        continue;
      }
      
      if (!inSkills) continue;
      
      if (this.isSectionHeader(lowerLine) && !skillKeywords.some(k => lowerLine.includes(k))) {
        break;
      }
      
      // Split by common separators
      const skillList = line.split(/[,;|]/).map(s => s.trim()).filter(s => s);
      skillList.forEach(skill => {
        if (skill && !this.isSectionHeader(skill.toLowerCase())) {
          skills.push({ name: skill, level: 'Proficient' });
        }
      });
    }
    
    return skills;
  }

  extractProjects(lines) {
    const projects = [];
    let inProjects = false;
    
    const projKeywords = ['projects', 'portfolio', 'personal projects'];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();
      
      if (projKeywords.some(keyword => lowerLine.includes(keyword))) {
        inProjects = true;
        continue;
      }
      
      if (!inProjects) continue;
      
      if (this.isSectionHeader(lowerLine) && !projKeywords.some(k => lowerLine.includes(k))) {
        break;
      }
      
      // Simple project detection
      if (line.includes(':') || line.includes('-')) {
        const parts = line.split(/[:\-]/);
        if (parts.length >= 2) {
          projects.push({
            name: parts[0].trim(),
            description: parts[1].trim()
          });
        }
      }
    }
    
    return projects;
  }

  extractCertifications(lines) {
    const certifications = [];
    let inCertifications = false;
    
    const certKeywords = ['certifications', 'certificates', 'licenses'];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();
      
      if (certKeywords.some(keyword => lowerLine.includes(keyword))) {
        inCertifications = true;
        continue;
      }
      
      if (!inCertifications) continue;
      
      if (this.isSectionHeader(lowerLine) && !certKeywords.some(k => lowerLine.includes(k))) {
        break;
      }
      
      if (lowerLine.includes('certified') || lowerLine.includes('certificate')) {
        certifications.push({
          name: line,
          issuer: '',
          date: ''
        });
      }
    }
    
    return certifications;
  }

  extractLanguages(lines) {
    const languages = [];
    let inLanguages = false;
    
    const langKeywords = ['languages', 'spoken languages', 'fluent'];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lowerLine = line.toLowerCase();
      
      if (langKeywords.some(keyword => lowerLine.includes(keyword))) {
        inLanguages = true;
        continue;
      }
      
      if (!inLanguages) continue;
      
      if (this.isSectionHeader(lowerLine) && !langKeywords.some(k => lowerLine.includes(k))) {
        break;
      }
      
      // Common language patterns
      const commonLanguages = ['english', 'spanish', 'french', 'german', 'chinese', 'japanese', 'korean'];
      commonLanguages.forEach(lang => {
        if (lowerLine.includes(lang)) {
          languages.push({
            name: lang.charAt(0).toUpperCase() + lang.slice(1),
            proficiency: 'Proficient'
          });
        }
      });
    }
    
    return languages;
  }

  // ============ UTILITY METHODS ============
  
  isSectionHeader(line) {
    const sectionKeywords = [
      'experience', 'education', 'skills', 'projects', 'certifications',
      'languages', 'summary', 'objective', 'references', 'contact'
    ];
    
    return sectionKeywords.some(keyword => line.includes(keyword));
  }

  rtfToText(rtfText) {
    // Simple RTF to text conversion
    // Remove RTF control words and braces
    let text = rtfText;
    
    // Remove RTF header
    text = text.replace(/\\[a-z]+\d*\s*/g, '');
    text = text.replace(/[{}]/g, '');
    text = text.replace(/\\\s+/g, ' ');
    
    return text;
  }

  // ============ DATA NORMALIZATION ============
  
  normalizeParsedData(parsedData) {
    return {
      success: true,
      data: parsedData.structured,
      fullText: parsedData.fullText,
      format: parsedData.format,
      metadata: parsedData.metadata,
      atsScore: this.calculateATSScore(parsedData.structured)
    };
  }

  calculateATSScore(data) {
    let score = 0;
    
    if (data.personal?.name) score += 10;
    if (data.personal?.email) score += 10;
    if (data.summary) score += 15;
    if (data.experience?.length > 0) score += Math.min(data.experience.length * 5, 25);
    if (data.education?.length > 0) score += 10;
    if (data.skills?.length >= 5) score += 15;
    else if (data.skills?.length > 0) score += data.skills.length * 2;
    
    return Math.min(score, 100);
  }

  // ============ EXPORT ============
  
  async extractFromFile(file, options = {}) {
    return this.parseCV(file, options);
  }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EnhancedCVParser;
} else if (typeof window !== 'undefined') {
  window.EnhancedCVParser = EnhancedCVParser;
}
