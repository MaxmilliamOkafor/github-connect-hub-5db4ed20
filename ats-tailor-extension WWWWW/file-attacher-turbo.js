// file-attacher-turbo.js - Enhanced file attachment with SYNC optimization for LazyApply
// Fixed async/await inconsistency in attachBothFiles function

class FileAttacherTurbo {
  constructor() {
    this.fileInputSelectors = [
      'input[type="file"][accept*="pdf"]',
      'input[type="file"][accept*="doc"]',
      'input[type="file"][accept*="docx"]',
      'input[type="file"][data-testid*="file"]',
      'input[type="file"][id*="resume"]',
      'input[type="file"][id*="cv"]',
      'input[type="file"][name*="resume"]',
      'input[type="file"][name*="cv"]',
      'input[type="file"][placeholder*="resume"]',
      'input[type="file"][placeholder*="CV"]'
    ];
    
    this.attachmentKeywords = [
      'resume', 'cv', 'curriculum vitae', 'cover letter', 'cover', 'letter',
      'dossier', 'portfolio', 'documents', 'attachments', 'upload'
    ];
    
    this.fileMonitors = new Map();
    this.retryCount = 0;
    this.maxRetries = 3;
  }

  // ============ BASE ATTACHMENT METHODS ============
  
  // Find all file input elements on the page
  findFileInputs() {
    const inputs = [];
    this.fileInputSelectors.forEach(selector => {
      try {
        inputs.push(...Array.from(document.querySelectorAll(selector)));
      } catch (e) {
        // Invalid selector, skip
      }
    });
    
    // Also look for inputs with attachment-related labels
    const allInputs = document.querySelectorAll('input[type="file"]');
    allInputs.forEach(input => {
      if (!inputs.includes(input)) {
        const label = this.findLabelForInput(input);
        if (label && this.attachmentKeywords.some(keyword => 
          label.textContent.toLowerCase().includes(keyword))) {
          inputs.push(input);
        }
      }
    });
    
    return inputs.filter(input => this.isVisible(input));
  }

  // Check if element is visible
  isVisible(element) {
    if (!element) return false;
    const style = window.getComputedStyle(element);
    return style.display !== 'none' && 
           style.visibility !== 'hidden' && 
           style.opacity !== '0' &&
           element.offsetWidth > 0 && 
           element.offsetHeight > 0;
  }

  // Find label associated with an input
  findLabelForInput(input) {
    if (input.labels && input.labels.length > 0) return input.labels[0];
    if (input.id) return document.querySelector(`label[for="${input.id}"]`);
    let parent = input.parentElement;
    while (parent && parent !== document.body) {
      if (parent.tagName === 'LABEL') return parent;
      parent = parent.parentElement;
    }
    return null;
  }

  // Reveal hidden file inputs by clicking their parent containers
  revealHiddenInputs() {
    const inputs = this.findFileInputs();
    inputs.forEach(input => {
      if (!this.isVisible(input)) {
        // Try to find and click parent label or container
        const label = this.findLabelForInput(input);
        if (label && this.isVisible(label)) {
          label.click();
        } else {
          // Try parent container
          const container = input.closest('div, section, form');
          if (container && this.isVisible(container)) {
            const clickable = container.querySelector('button, a, [role="button"]');
            if (clickable) clickable.click();
          }
        }
      }
    });
  }

  // Kill X buttons that clear files (LazyApply protection)
  killXButtons() {
    const xSelectors = [
      'button[class*="remove"]',
      'button[class*="clear"]',
      'button[class*="delete"]',
      'button[aria-label*="remove"]',
      'button[aria-label*="clear"]',
      'button[data-testid*="remove"]',
      'button[data-testid*="clear"]',
      'svg[class*="close"]',
      'svg[class*="remove"]',
      'svg[class*="delete"]'
    ];

    xSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(button => {
        if (this.isVisible(button)) {
          // Remove click handlers by replacing the element
          const clone = button.cloneNode(true);
          button.parentNode?.replaceChild(clone, button);
        }
      });
    });
  }

  // ============ SYNCHRONOUS ATTACHMENT METHODS ============

  // Synchronously attach file to first matching input
  attachToFirstMatchSync(file, type = 'cv') {
    const inputs = this.findFileInputs();
    if (inputs.length === 0) {
      console.log('[FileAttacher] No file inputs found');
      return false;
    }

    // Prioritize inputs based on type
    const prioritized = this.prioritizeInputs(inputs, type);
    
    for (const input of prioritized) {
      if (this.attachFileSync(input, file)) {
        console.log(`[FileAttacher] ✓ ${type.toUpperCase()} attached to input`, input);
        return true;
      }
    }
    
    return false;
  }

  // Synchronously attach file to a specific input
  attachFileSync(input, file) {
    try {
      if (!input || !file) return false;
      
      // Create a new FileList with our file
      const dt = new DataTransfer();
      dt.items.add(file);
      
      // Set the files property
      input.files = dt.files;
      
      // Dispatch change event
      const changeEvent = new Event('change', { bubbles: true });
      input.dispatchEvent(changeEvent);
      
      // Also try input event for some platforms
      const inputEvent = new Event('input', { bubbles: true });
      input.dispatchEvent(inputEvent);
      
      return true;
    } catch (error) {
      console.error('[FileAttacher] Error attaching file:', error);
      return false;
    }
  }

  // Prioritize file inputs based on type and context
  prioritizeInputs(inputs, type) {
    return inputs.sort((a, b) => {
      const aScore = this.scoreInput(a, type);
      const bScore = this.scoreInput(b, type);
      return bScore - aScore;
    });
  }

  // Score how well an input matches the desired type
  scoreInput(input, type) {
    let score = 0;
    const id = (input.id || '').toLowerCase();
    const name = (input.name || '').toLowerCase();
    const accept = (input.accept || '').toLowerCase();
    const placeholder = (input.placeholder || '').toLowerCase();
    const label = this.findLabelForInput(input);
    const labelText = label ? label.textContent.toLowerCase() : '';

    // Direct matches
    if (id.includes(type) || name.includes(type)) score += 100;
    if (labelText.includes(type)) score += 80;
    if (placeholder.includes(type)) score += 60;
    
    // PDF preference
    if (accept.includes('pdf')) score += 40;
    
    // Visibility bonus
    if (this.isVisible(input)) score += 20;
    
    return score;
  }

  // ============ COVER LETTER SPECIFIC METHODS ============

  // Click the Cover Letter attach button (Greenhouse specific)
  clickGreenhouseCoverAttach() {
    const coverBtnSelectors = [
      'button[data-testid="add-cover-letter"]',
      'button:contains("Cover Letter")',
      'button:contains("Add Cover")',
      'a:contains("Cover Letter")',
      'a:contains("Add Cover")',
      '[data-qa="upload-cover-letter"]',
      '[aria-label*="cover letter"]',
      '[aria-label*="Cover Letter"]'
    ];

    for (const selector of coverBtnSelectors) {
      try {
        let element;
        if (selector.startsWith('button:') || selector.startsWith('a:')) {
          // Handle :contains selectors
          const textMatch = selector.match(/:contains\("(.+?)"\)/);
          if (textMatch) {
            const tag = selector.split(':')[0];
            const text = textMatch[1];
            element = Array.from(document.querySelectorAll(tag))
              .find(el => el.textContent.includes(text) && this.isVisible(el));
          }
        } else {
          element = document.querySelector(selector);
        }

        if (element && this.isVisible(element)) {
          element.click();
          console.log('[FileAttacher] Clicked cover letter button');
          return true;
        }
      } catch (e) {
        // Selector error, continue
      }
    }
    return false;
  }

  // Attach to cover letter field specifically
  attachToCoverFieldSync(coverFile, coverText) {
    if (!coverFile && !coverText) return false;

    // If text-only cover letter
    if (!coverFile && coverText) {
      return this.fillCoverLetterText(coverText);
    }

    // Find cover letter file inputs (usually appears after clicking "Add Cover Letter")
    const coverInputs = this.findFileInputs().filter(input => {
      const context = [
        (input.id || ''),
        (input.name || ''),
        (input.placeholder || ''),
        this.findLabelForInput(input)?.textContent || ''
      ].join(' ').toLowerCase();
      
      return context.includes('cover') || context.includes('letter');
    });

    for (const input of coverInputs) {
      if (this.attachFileSync(input, coverFile)) {
        return true;
      }
    }

    return false;
  }

  // Fill cover letter text area (for text-only cover letters)
  fillCoverLetterText(text) {
    const textAreas = document.querySelectorAll('textarea');
    
    for (const textarea of textAreas) {
      const context = [
        (textarea.id || ''),
        (textarea.name || ''),
        (textarea.placeholder || ''),
        this.findLabelForInput(textarea)?.textContent || ''
      ].join(' ').toLowerCase();
      
      if (context.includes('cover') || context.includes('letter')) {
        textarea.value = text;
        
        // Trigger events
        const inputEvent = new Event('input', { bubbles: true });
        textarea.dispatchEvent(inputEvent);
        
        const changeEvent = new Event('change', { bubbles: true });
        textarea.dispatchEvent(changeEvent);
        
        return true;
      }
    }
    
    return false;
  }

  // ============ ATTACH BOTH FILES TOGETHER (SYNC - LAZYAPPLY OPTIMIZED) ============
  attachBothFiles(cvFile, coverFile, coverText = null) {
    console.log('[FileAttacher] 📎 SYNC Attaching BOTH CV + Cover Letter');
    const startTime = performance.now();
    
    // STEP 1: Reveal hidden inputs SYNC
    this.revealHiddenInputs();
    
    // STEP 2: Kill existing files SYNC
    this.killXButtons();
    
    // STEP 3: Attach CV SYNC
    let cvAttached = false;
    if (cvFile) {
      cvAttached = this.attachToFirstMatchSync(cvFile, 'cv');
    }
    
    // STEP 4: Click Cover Letter Attach button SYNC
    this.clickGreenhouseCoverAttach();
    
    // STEP 5: Attach Cover Letter SYNC
    let coverAttached = false;
    if (coverFile || coverText) {
      coverAttached = this.attachToCoverFieldSync(coverFile, coverText);
    }

    const timing = performance.now() - startTime;
    console.log(`[FileAttacher] ⚡ SYNC attachBothFiles in ${timing.toFixed(2)}ms`);

    // Show green ribbon if attached
    if (cvAttached || coverAttached) {
      this.showSuccessRibbon(cvAttached, coverAttached);
    }
    
    // STEP 6: Retry if cover not attached - FIXED: Use synchronous delay
    if (!coverAttached && (coverFile || coverText)) {
      this.clickGreenhouseCoverAttach();
      // Use synchronous delay instead of await
      this.sleepSync(100);
      coverAttached = this.attachToCoverFieldSync(coverFile, coverText);
    }
    
    console.log(`[FileAttacher] Both files: CV=${cvAttached ? '✅' : '❌'}, Cover=${coverAttached ? '✅' : '❌'}`);
    
    return { cvAttached, coverAttached };
  }

  // ============ CONTINUOUS MONITORING (LAZYAPPLY PROTECTION) ============
  startFileMonitoring(type, input, file) {
    let monitorCount = 0;
    const maxMonitors = 10;
    const checkIntervals = [1500, 3000, 5000, 8000];
    
    const monitor = setInterval(() => {
      monitorCount++;
      if (monitorCount > maxMonitors) {
        clearInterval(monitor);
        this.fileMonitors.delete(type);
        return;
      }
      
      // Check if file is still attached
      let fileStillAttached = false;
      if (input.files && input.files.length > 0) {
        fileStillAttached = true;
      }
      
      if (!fileStillAttached) {
        console.log(`[FileAttacher] 🚨 ${type.toUpperCase()} file was cleared! Re-attaching...`);
        this.attachFileSync(input, file);
      }
    }, checkIntervals[Math.min(monitorCount - 1, checkIntervals.length - 1)]);
    
    this.fileMonitors.set(type, monitor);
  }

  // ============ SUCCESS RIBBON ============
  showSuccessRibbon(cvAttached, coverAttached) {
    // Remove existing ribbon
    const existing = document.getElementById('ats-success-ribbon');
    if (existing) existing.remove();
    
    const ribbon = document.createElement('div');
    ribbon.id = 'ats-success-ribbon';
    ribbon.innerHTML = `
      <style>
        #ats-success-ribbon {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 50px;
          background: linear-gradient(90deg, #10b981, #059669);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: system-ui, -apple-system, sans-serif;
          font-size: 16px;
          font-weight: 600;
          z-index: 10000;
          box-shadow: 0 2px 10px rgba(16, 185, 129, 0.3);
          animation: slideDown 0.3s ease-out;
        }
        
        @keyframes slideDown {
          from { transform: translateY(-100%); }
          to { transform: translateY(0); }
        }
        
        .ats-icon { margin-right: 8px; }
        .ats-text { margin-right: 12px; }
        .ats-badge {
          background: rgba(255,255,255,0.2);
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 600;
        }
      </style>
      <span class="ats-icon">✅</span>
      <span class="ats-text">${cvAttached && coverAttached ? 'CV & COVER LETTER' : cvAttached ? 'CV' : 'COVER LETTER'} ATTACHED SUCCESSFULLY</span>
      <span class="ats-badge">ATS-PERFECT</span>
    `;
    
    document.body.appendChild(ribbon);
    document.body.classList.add('ats-success-ribbon-active');
    
    // Add body padding for ribbon
    const style = document.createElement('style');
    style.id = 'ats-success-ribbon-style';
    style.textContent = `
      body.ats-success-ribbon-active { padding-top: 50px !important; }
    `;
    document.head.appendChild(style);

    console.log('[FileAttacher] ✅ GREEN SUCCESS RIBBON displayed');
  }

  // ============ UTILITY METHODS ============

  // Synchronous sleep (blocks execution for specified milliseconds)
  sleepSync(ms) {
    const start = Date.now();
    while (Date.now() - start < ms) {
      // Busy wait - use sparingly and only for very short delays
    }
  }

  // Clean up resources
  cleanup() {
    // Stop all monitors
    this.fileMonitors.forEach(monitor => clearInterval(monitor));
    this.fileMonitors.clear();
    
    // Remove ribbon
    const ribbon = document.getElementById('ats-success-ribbon');
    if (ribbon) ribbon.remove();
    
    const style = document.getElementById('ats-success-ribbon-style');
    if (style) style.remove();
    
    document.body.classList.remove('ats-success-ribbon-active');
  }
}

// Export for use in content script
if (typeof module !== 'undefined' && module.exports) {
  module.exports = FileAttacherTurbo;
} else if (typeof window !== 'undefined') {
  window.FileAttacherTurbo = FileAttacherTurbo;
}
