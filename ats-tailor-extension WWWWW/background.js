// background.js - ATS Tailor Extension Background Service Worker
// Handles extension lifecycle, bulk operations, and secure credential management

import { SecureStorage } from './secure-storage.js';

// Secure configuration - NO hardcoded credentials
const CONFIG = {
  workday: {
    // Credentials are now loaded securely from chrome.storage
    // No hardcoded values - must be configured by user
  },
  bulkApply: {
    maxConcurrent: 5,
    retryDelay: 2000,
    timeout: 30000
  }
};

// Extension installation and update handling
chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[Background] Extension installed/updated:', details.reason);
  
  // Initialize secure storage
  await SecureStorage.init();
  
  // Set default settings
  const defaultSettings = {
    autoDetectJobs: true,
    showNotifications: true,
    saveResponses: true,
    aiProvider: 'kimi',
    tailoringEnabled: true
  };
  
  const existing = await chrome.storage.local.get(['extensionSettings']);
  if (!existing.extensionSettings) {
    await chrome.storage.local.set({ extensionSettings: defaultSettings });
  }
  
  // Open welcome page on first install
  if (details.reason === 'install') {
    chrome.tabs.create({ url: chrome.runtime.getURL('welcome.html') });
  }
});

// Message handling from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sender, sendResponse);
  return true; // Keep message channel open for async response
});

async function handleMessage(request, sender, sendResponse) {
  try {
    switch (request.action) {
      case 'getCredentials':
        const creds = await SecureStorage.getCredentials(request.platform);
        sendResponse({ success: true, credentials: creds });
        break;
        
      case 'saveCredentials':
        await SecureStorage.saveCredentials(request.platform, request.credentials);
        sendResponse({ success: true });
        break;
        
      case 'getSettings':
        const settings = await chrome.storage.local.get(['extensionSettings']);
        sendResponse({ success: true, settings: settings.extensionSettings });
        break;
        
      case 'saveSettings':
        await chrome.storage.local.set({ extensionSettings: request.settings });
        sendResponse({ success: true });
        break;
        
      case 'getJobData':
        const jobData = await getJobDataFromStorage(request.jobId);
        sendResponse({ success: true, data: jobData });
        break;
        
      case 'saveJobData':
        await saveJobDataToStorage(request.jobId, request.data);
        sendResponse({ success: true });
        break;
        
      case 'clearAllData':
        await chrome.storage.local.clear();
        await SecureStorage.clear();
        sendResponse({ success: true });
        break;
        
      case 'getSession':
        const session = await chrome.storage.local.get(['ats_session']);
        sendResponse({ success: true, session: session.ats_session });
        break;
        
      case 'saveSession':
        await chrome.storage.local.set({ ats_session: request.session });
        sendResponse({ success: true });
        break;
        
      case 'bulkApplyStart':
        await startBulkApply(request.jobs, request.config);
        sendResponse({ success: true });
        break;
        
      case 'bulkApplyStop':
        await stopBulkApply();
        sendResponse({ success: true });
        break;
        
      case 'getBulkStatus':
        const status = await getBulkApplyStatus();
        sendResponse({ success: true, status: status });
        break;
        
      case 'generateCV':
        const cvResult = await generateTailoredCV(request.candidateData, request.jobData);
        sendResponse({ success: true, result: cvResult });
        break;
        
      case 'generateCoverLetter':
        const coverResult = await generateCoverLetter(request.candidateData, request.jobData);
        sendResponse({ success: true, result: coverResult });
        break;
        
      default:
        console.warn('[Background] Unknown action:', request.action);
        sendResponse({ success: false, error: 'Unknown action' });
    }
  } catch (error) {
    console.error('[Background] Error handling message:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Secure credential management - REPLACED hardcoded credentials
// Users must now configure their credentials through the extension UI
async function getWorkdayCredentials() {
  const credentials = await SecureStorage.getCredentials('workday');
  if (!credentials || !credentials.email || !credentials.password) {
    throw new Error('Workday credentials not configured. Please set up your credentials in the extension settings.');
  }
  return credentials;
}

// Job data storage with encryption for sensitive information
async function saveJobDataToStorage(jobId, data) {
  const key = `job_${jobId}`;
  
  // Encrypt sensitive fields
  const encryptedData = {
    ...data,
    sensitive: data.sensitive ? await SecureStorage.encrypt(data.sensitive) : null
  };
  
  await chrome.storage.local.set({ [key]: encryptedData });
}

async function getJobDataFromStorage(jobId) {
  const key = `job_${jobId}`;
  const result = await chrome.storage.local.get([key]);
  const data = result[key];
  
  if (!data) return null;
  
  // Decrypt sensitive fields
  return {
    ...data,
    sensitive: data.sensitive ? await SecureStorage.decrypt(data.sensitive) : null
  };
}

// Bulk apply functionality with proper error handling
let bulkApplyState = {
  isRunning: false,
  isPaused: false,
  currentIndex: 0,
  jobs: [],
  results: [],
  startTime: null
};

async function startBulkApply(jobs, config) {
  if (bulkApplyState.isRunning) {
    throw new Error('Bulk apply already running');
  }
  
  bulkApplyState = {
    isRunning: true,
    isPaused: false,
    currentIndex: 0,
    jobs: jobs,
    results: [],
    startTime: Date.now(),
    config: { ...CONFIG.bulkApply, ...config }
  };
  
  // Save state for recovery
  await chrome.storage.local.set({ 
    bulkApplyState: {
      ...bulkApplyState,
      jobs: jobs.slice(0, 50) // Limit saved jobs to prevent storage overflow
    }
  });
  
  processBulkApplyQueue();
}

async function stopBulkApply() {
  bulkApplyState.isRunning = false;
  bulkApplyState.isPaused = false;
  await chrome.storage.local.remove(['bulkApplyState']);
}

async function processBulkApplyQueue() {
  if (!bulkApplyState.isRunning || bulkApplyState.isPaused) return;
  
  const { jobs, currentIndex, config } = bulkApplyState;
  
  if (currentIndex >= jobs.length) {
    // Bulk apply complete
    await onBulkApplyComplete();
    return;
  }
  
  const job = jobs[currentIndex];
  
  try {
    // Process single job with retry logic
    const result = await processSingleJobWithRetry(job, config);
    bulkApplyState.results.push({ job, result, status: 'success' });
    
    // Send progress update to popup
    chrome.runtime.sendMessage({
      action: 'bulkApplyProgress',
      progress: {
        current: currentIndex + 1,
        total: jobs.length,
        job: job,
        result: result
      }
    });
    
  } catch (error) {
    console.error('[Background] Error processing job:', error);
    bulkApplyState.results.push({ job, error: error.message, status: 'failed' });
  }
  
  bulkApplyState.currentIndex++;
  
  // Save progress
  await chrome.storage.local.set({ 
    bulkApplyState: {
      ...bulkApplyState,
      jobs: jobs.slice(bulkApplyState.currentIndex, bulkApplyState.currentIndex + 50)
    }
  });
  
  // Continue with next job after delay
  if (bulkApplyState.isRunning) {
    setTimeout(processBulkApplyQueue, config.speedDelay);
  }
}

async function processSingleJobWithRetry(job, config) {
  let lastError;
  
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      return await processSingleJob(job, config);
    } catch (error) {
      lastError = error;
      console.warn(`[Background] Job attempt ${attempt} failed:`, error.message);
      
      if (attempt < 3) {
        await new Promise(resolve => setTimeout(resolve, config.retryDelay * attempt));
      }
    }
  }
  
  throw lastError;
}

async function processSingleJob(job, config) {
  // Create tab for job application
  const tab = await chrome.tabs.create({ 
    url: job.job_url, 
    active: false 
  });
  
  try {
    // Wait for page to load
    await waitForTabLoad(tab.id, config.timeout);
    
    // Inject content script if needed
    await ensureContentScript(tab.id);
    
    // Send autofill message
    const response = await chrome.tabs.sendMessage(tab.id, {
      action: 'AUTOFILL_CANDIDATE',
      candidate: job.candidate,
      platform: detectPlatform(job.job_url)
    });
    
    if (!response || !response.success) {
      throw new Error(response?.error || 'Autofill failed');
    }
    
    return response;
    
  } finally {
    // Always close the tab
    try {
      await chrome.tabs.remove(tab.id);
    } catch (e) {
      // Tab might already be closed
    }
  }
}

async function waitForTabLoad(tabId, timeout) {
  return new Promise((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error('Tab load timeout'));
    }, timeout);
    
    const listener = (updatedTabId, info) => {
      if (updatedTabId === tabId && info.status === 'complete') {
        clearTimeout(timeoutId);
        chrome.tabs.onUpdated.removeListener(listener);
        resolve();
      }
    };
    
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function ensureContentScript(tabId) {
  try {
    await chrome.tabs.sendMessage(tabId, { action: 'ping' });
  } catch (error) {
    // Content script not loaded, inject it
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });
    
    // Wait a moment for script to initialize
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

function detectPlatform(url) {
  const urlLower = url.toLowerCase();
  const platforms = {
    'workday': ['workday', 'myworkdayjobs'],
    'smartrecruiters': ['smartrecruiters'],
    'icims': ['icims'],
    'workable': ['workable'],
    'teamtailor': ['teamtailor'],
    'bullhorn': ['bullhorn'],
    'oracle': ['oracle', 'taleo', 'oraclecloud'],
    'greenhouse': ['greenhouse']
  };

  for (const [platform, keywords] of Object.entries(platforms)) {
    if (keywords.some(kw => urlLower.includes(kw))) {
      return platform;
    }
  }
  return 'unknown';
}

async function onBulkApplyComplete() {
  const { results, startTime } = bulkApplyState;
  const duration = Date.now() - startTime;
  const successCount = results.filter(r => r.status === 'success').length;
  const failedCount = results.filter(r => r.status === 'failed').length;
  
  console.log(`[Background] Bulk apply complete: ${successCount} success, ${failedCount} failed in ${duration}ms`);
  
  // Send completion notification
  chrome.runtime.sendMessage({
    action: 'bulkApplyComplete',
    result: {
      successCount,
      failedCount,
      duration,
      results
    }
  });
  
  // Clear state
  await chrome.storage.local.remove(['bulkApplyState']);
  bulkApplyState.isRunning = false;
}

async function getBulkApplyStatus() {
  return {
    isRunning: bulkApplyState.isRunning,
    isPaused: bulkApplyState.isPaused,
    currentIndex: bulkApplyState.currentIndex,
    totalJobs: bulkApplyState.jobs.length,
    progress: bulkApplyState.jobs.length > 0 ? (bulkApplyState.currentIndex / bulkApplyState.jobs.length) * 100 : 0
  };
}

// CV and Cover Letter generation (placeholder - actual implementation would use PDF libraries)
async function generateTailoredCV(candidateData, jobData) {
  // Implementation would use jsPDF or similar library
  // This is a simplified placeholder
  return {
    success: true,
    pdf: null, // Would contain base64 PDF data
    text: generateCVText(candidateData, jobData),
    filename: `${candidateData.firstName}_${candidateData.lastName}_CV.pdf`
  };
}

async function generateCoverLetter(candidateData, jobData) {
  // Implementation would use jsPDF or similar library
  return {
    success: true,
    pdf: null, // Would contain base64 PDF data
    text: generateCoverLetterText(candidateData, jobData),
    filename: `${candidateData.firstName}_${candidateData.lastName}_Cover_Letter.pdf`
  };
}

function generateCVText(candidateData, jobData) {
  // Simplified CV text generation
  return `
${candidateData.firstName} ${candidateData.lastName}
${candidateData.email} | ${candidateData.phone}

PROFESSIONAL SUMMARY
Results-driven professional with expertise in ${jobData.keywords?.slice(0, 3).join(', ') || 'software development'}.

WORK EXPERIENCE
${candidateData.workExperience?.map(exp => `
${exp.company}
${exp.title} | ${exp.dates}
- ${exp.bullets?.join('\n- ') || 'Key responsibilities and achievements'}
`).join('\n') || ''}

EDUCATION
${candidateData.education?.map(edu => `${edu.degree} | ${edu.institution}`).join('\n') || ''}

SKILLS
${jobData.keywords?.join(', ') || candidateData.skills?.join(', ') || ''}
`.trim();
}

function generateCoverLetterText(candidateData, jobData) {
  const company = jobData.company || 'your organization';
  const title = jobData.title || 'the position';
  
  return `
${candidateData.firstName} ${candidateData.lastName}
${candidateData.email} | ${candidateData.phone}

${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}

Re: ${title}

Dear Hiring Manager,

I am excited to apply for the ${title} position at ${company}. With experience in ${jobData.keywords?.slice(0, 2).join(' and ') || 'software development'}, I deliver measurable business impact through innovative solutions.

In my previous roles, I have successfully implemented ${jobData.keywords?.[2] || 'technical'} solutions and led cross-functional initiatives resulting in significant improvements.

I would welcome the opportunity to discuss how my expertise can contribute to ${company}'s success. Thank you for your consideration.

Sincerely,
${candidateData.firstName} ${candidateData.lastName}
`.trim();
}

// Periodic cleanup of old data
chrome.alarms.create('cleanup', { periodInMinutes: 60 });
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (alarm.name === 'cleanup') {
    await cleanupOldData();
  }
});

async function cleanupOldData() {
  const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
  
  const storage = await chrome.storage.local.get();
  const keysToRemove = [];
  
  for (const [key, value] of Object.entries(storage)) {
    if (key.startsWith('job_') && value.timestamp && value.timestamp < oneWeekAgo) {
      keysToRemove.push(key);
    }
  }
  
  if (keysToRemove.length > 0) {
    await chrome.storage.local.remove(keysToRemove);
    console.log(`[Background] Cleaned up ${keysToRemove.length} old job records`);
  }
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    handleMessage,
    processSingleJob,
    generateCVText,
    generateCoverLetterText
  };
}
