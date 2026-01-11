
/**
 * KONFIGURASI NAMA SHEET
 */
const SHEET_EXAMS = 'Exams';
const SHEET_ATTEMPTS = 'Attempts';
const SHEET_LIVE = 'LiveProgress';
const SHEET_USERS = 'Users';     // Untuk Guru / Admin
const SHEET_STUDENTS = 'Students'; // Untuk Siswa (username, password, name, classId)
const SHEET_CONFIG = 'Config';     // Konfigurasi aplikasi (appName, schoolName)
const SHEET_QUESTION_BANK = 'QuestionBank'; // Bank Soal
const SHEET_QUESTION_ANALYSIS = 'QuestionAnalysis'; // Hasil analisis soal

/**
 * STRUKTUR HEADER KOLOM
 */
const HEADERS = {
  [SHEET_EXAMS]: ['id', 'title', 'subject', 'classGrade', 'date', 'startTime', 'endTime', 'durationMinutes', 'token', 'status', 'questions', 'areResultsPublished', 'randomizeQuestions', 'randomizeOptions'],
  [SHEET_ATTEMPTS]: ['examId', 'examTitle', 'studentName', 'answers', 'score', 'submittedAt', 'violationCount'],
  [SHEET_LIVE]: ['examId', 'studentName', 'answeredCount', 'totalQuestions', 'lastActive', 'status', 'violationCount'],
  [SHEET_USERS]: ['username', 'password', 'name', 'role'],
  [SHEET_STUDENTS]: ['username', 'password', 'name', 'classId'],
  [SHEET_QUESTION_BANK]: ['id', 'text', 'type', 'subject', 'difficulty', 'tags', 'imageUrl', 'passage', 'options', 'matchingPairs', 'statements', 'sequenceItems', 'correctSequence', 'classificationItems', 'categories', 'classificationMapping', 'correctKey', 'createdAt', 'createdBy', 'usageCount', 'lastUsedAt', 'difficultyIndex', 'discriminationIndex', 'qualityStatus', 'lastAnalyzed'],
  [SHEET_QUESTION_ANALYSIS]: ['id', 'questionId', 'examId', 'examTitle', 'questionText', 'questionType', 'totalAttempts', 'correctCount', 'incorrectCount', 'difficultyIndex', 'difficultyLevel', 'discriminationIndex', 'discriminationQuality', 'isGoodQuestion', 'shouldBeReviewed', 'shouldBeDeleted', 'distractorAnalysis', 'analyzedAt']
};

/**
 * ENTRY POINT: GET REQUEST
 */
function doGet(e) {
  const action = e.parameter.action;
  
  try {
    if (action === 'GET_EXAMS') {
      const data = getSheetData(SHEET_EXAMS);
      const parsedData = data.map(item => {
        // Parse questions safely
        let questions = [];
        if (item.questions) {
          const qStr = String(item.questions);
          if (qStr.startsWith('FILE:')) {
            try {
              const fileId = qStr.substring(5);
              const fileContent = getLargeDataFromDrive(fileId);
              questions = JSON.parse(fileContent);
            } catch (e) {
              questions = [];
            }
          } else {
            try {
              const parsed = JSON.parse(item.questions);
              questions = Array.isArray(parsed) ? parsed : [];
            } catch (e) {
              questions = [];
            }
          }
        }
        
        return {
          ...item,
          id: String(item.id || ''),
          title: String(item.title || ''),
          subject: String(item.subject || ''),
          classGrade: String(item.classGrade || ''),
          date: String(item.date || ''),
          startTime: String(item.startTime || ''),
          endTime: String(item.endTime || ''),
          token: String(item.token || ''),
          status: String(item.status || 'DRAFT'),
          questions: questions,
          durationMinutes: Number(item.durationMinutes || 0),
          areResultsPublished: parseBoolean(item.areResultsPublished),
          randomizeQuestions: parseBoolean(item.randomizeQuestions),
          randomizeOptions: parseBoolean(item.randomizeOptions)
        };
      });
      return responseJSON({ success: true, data: parsedData });
    }
    
    if (action === 'GET_ATTEMPTS') {
      const data = getSheetData(SHEET_ATTEMPTS);
      const parsedData = data.map(item => {
        // Parse answers safely
        let answers = {};
        if (item.answers) {
          try {
            const parsed = JSON.parse(item.answers);
            answers = typeof parsed === 'object' && parsed !== null ? parsed : {};
          } catch (e) {
            answers = {};
          }
        }
        
        return {
          ...item,
          examId: String(item.examId || ''),
          examTitle: String(item.examTitle || ''),
          studentName: String(item.studentName || ''),
          answers: answers,
          score: Number(item.score || 0),
          isSubmitted: true, // All attempts in database are submitted
          submittedAt: String(item.submittedAt || ''),
          violationCount: Number(item.violationCount || 0)
        };
      });
      return responseJSON({ success: true, data: parsedData });
    }

    if (action === 'GET_LIVE_PROGRESS') {
      const data = getSheetData(SHEET_LIVE);
      const parsedData = data.map(item => ({
        ...item,
        examId: String(item.examId),
        answeredCount: Number(item.answeredCount || 0),
        totalQuestions: Number(item.totalQuestions || 0),
        violationCount: Number(item.violationCount || 0),
        status: String(item.status || 'WORKING'),
        lastActive: String(item.lastActive || new Date().toISOString())
      }));
      return responseJSON({ success: true, data: parsedData });
    }

    if (action === 'GET_CLASS_IDS') {
      const students = getSheetData(SHEET_STUDENTS);
      // Get unique classIds, filter out empty/null values, and sort
      const classIds = [...new Set(students.map(s => String(s.classId || '').trim()).filter(c => c !== ''))].sort();
      return responseJSON({ success: true, data: classIds });
    }

    if (action === 'GET_CONFIG') {
      const config = getConfig();
      return responseJSON({ success: true, data: config });
    }

    if (action === 'GET_BANK_QUESTIONS') {
      const data = getSheetData(SHEET_QUESTION_BANK);
      const parsedData = data.map(item => {
        // Parse complex fields
        let options = [];
        let matchingPairs = [];
        let statements = [];
        let sequenceItems = [];
        let correctSequence = [];
        let classificationItems = [];
        let categories = [];
        let classificationMapping = {};
        
        if (item.options) {
          try {
            options = JSON.parse(item.options);
            if (!Array.isArray(options)) options = [];
          } catch (e) { options = []; }
        }
        
        if (item.matchingPairs) {
          try {
            matchingPairs = JSON.parse(item.matchingPairs);
            if (!Array.isArray(matchingPairs)) matchingPairs = [];
          } catch (e) { matchingPairs = []; }
        }
        
        if (item.statements) {
          try {
            statements = JSON.parse(item.statements);
            if (!Array.isArray(statements)) statements = [];
          } catch (e) { statements = []; }
        }
        
        if (item.sequenceItems) {
          try {
            sequenceItems = JSON.parse(item.sequenceItems);
            if (!Array.isArray(sequenceItems)) sequenceItems = [];
          } catch (e) { sequenceItems = []; }
        }
        
        if (item.correctSequence) {
          try {
            correctSequence = JSON.parse(item.correctSequence);
            if (!Array.isArray(correctSequence)) correctSequence = [];
          } catch (e) { correctSequence = []; }
        }
        
        if (item.classificationItems) {
          try {
            classificationItems = JSON.parse(item.classificationItems);
            if (!Array.isArray(classificationItems)) classificationItems = [];
          } catch (e) { classificationItems = []; }
        }
        
        if (item.categories) {
          try {
            categories = JSON.parse(item.categories);
            if (!Array.isArray(categories)) categories = [];
          } catch (e) { categories = []; }
        }
        
        if (item.classificationMapping) {
          try {
            classificationMapping = JSON.parse(item.classificationMapping);
            if (typeof classificationMapping !== 'object') classificationMapping = {};
          } catch (e) { classificationMapping = {}; }
        }
        
        return {
          id: String(item.id || ''),
          text: String(item.text || ''),
          type: String(item.type || ''),
          subject: String(item.subject || ''),
          difficulty: String(item.difficulty || 'Sedang'),
          tags: String(item.tags || ''),
          imageUrl: String(item.imageUrl || ''),
          passage: String(item.passage || ''),
          options: options,
          matchingPairs: matchingPairs,
          statements: statements,
          sequenceItems: sequenceItems,
          correctSequence: correctSequence,
          classificationItems: classificationItems,
          categories: categories,
          classificationMapping: classificationMapping,
          correctKey: String(item.correctKey || ''),
          createdAt: String(item.createdAt || new Date().toISOString()),
          createdBy: String(item.createdBy || ''),
          usageCount: Number(item.usageCount || 0),
          lastUsedAt: String(item.lastUsedAt || ''),
          // Analysis metrics (Phase 2.2)
          difficultyIndex: item.difficultyIndex ? Number(item.difficultyIndex) : undefined,
          discriminationIndex: item.discriminationIndex ? Number(item.discriminationIndex) : undefined,
          qualityStatus: String(item.qualityStatus || ''),
          lastAnalyzed: String(item.lastAnalyzed || '')
        };
      });
      return responseJSON({ success: true, data: parsedData });
    }
    
    if (action === 'GET_QUESTION_ANALYSIS') {
      const examId = e.parameter.examId;
      const questionId = e.parameter.questionId;
      const data = getSheetData(SHEET_QUESTION_ANALYSIS);
      
      let filteredData = data;
      // Apply both filters if both are provided (AND condition)
      if (examId && questionId) {
        filteredData = data.filter(item => item.examId === examId && item.questionId === questionId);
      } else if (examId) {
        filteredData = data.filter(item => item.examId === examId);
      } else if (questionId) {
        filteredData = data.filter(item => item.questionId === questionId);
      }
      
      const parsedData = filteredData.map(item => {
        let distractorAnalysis = [];
        if (item.distractorAnalysis) {
          try {
            distractorAnalysis = JSON.parse(item.distractorAnalysis);
            if (!Array.isArray(distractorAnalysis)) distractorAnalysis = [];
          } catch (e) { distractorAnalysis = []; }
        }
        
        return {
          id: String(item.id || ''),
          questionId: String(item.questionId || ''),
          examId: String(item.examId || ''),
          examTitle: String(item.examTitle || ''),
          questionText: String(item.questionText || ''),
          questionType: String(item.questionType || ''),
          totalAttempts: Number(item.totalAttempts || 0),
          correctCount: Number(item.correctCount || 0),
          incorrectCount: Number(item.incorrectCount || 0),
          difficultyIndex: Number(item.difficultyIndex || 0),
          difficultyLevel: String(item.difficultyLevel || ''),
          discriminationIndex: Number(item.discriminationIndex || 0),
          discriminationQuality: String(item.discriminationQuality || ''),
          isGoodQuestion: parseBoolean(item.isGoodQuestion),
          shouldBeReviewed: parseBoolean(item.shouldBeReviewed),
          shouldBeDeleted: parseBoolean(item.shouldBeDeleted),
          distractorAnalysis: distractorAnalysis,
          analyzedAt: String(item.analyzedAt || '')
        };
      });
      
      return responseJSON({ success: true, data: parsedData });
    }

    return responseJSON({ success: false, message: 'Invalid action' });

  } catch (err) {
    return responseJSON({ success: false, message: err.toString() });
  }
}

function parseBoolean(val) {
  return String(val).toUpperCase() === 'TRUE' || val === true;
}

/**
 * Input validation & sanitization helpers
 */
function sanitizeString(input, maxLength = 1000) {
  if (typeof input !== 'string') return '';
  return String(input).trim().substring(0, maxLength);
}

function validateId(id) {
  if (!id || typeof id !== 'string') return false;
  const sanitized = sanitizeString(id, 100);
  // Allow alphanumeric, dash, underscore
  return /^[a-zA-Z0-9_-]+$/.test(sanitized);
}

function validateUsername(username) {
  if (!username || typeof username !== 'string') return false;
  const sanitized = sanitizeString(username, 50);
  return sanitized.length >= 3 && sanitized.length <= 50 && /^[a-zA-Z0-9_]+$/.test(sanitized);
}

function validatePassword(password) {
  if (!password || typeof password !== 'string') return false;
  return password.length >= 3 && password.length <= 200;
}

function validateExamData(examData) {
  if (!examData || typeof examData !== 'object') {
    Logger.log('Validation failed: examData is not an object');
    return false;
  }
  
  // Required fields
  if (!examData.title || typeof examData.title !== 'string') {
    Logger.log('Validation failed: title missing or not string');
    return false;
  }
  if (sanitizeString(examData.title, 200).length === 0) {
    Logger.log('Validation failed: title empty after sanitize');
    return false;
  }
  
  // Validate ID if present
  if (examData.id && !validateId(examData.id)) {
    Logger.log('Validation failed: invalid ID format');
    return false;
  }
  
  // Validate token - token is REQUIRED
  if (!examData.token || typeof examData.token !== 'string') {
    Logger.log('Validation failed: token missing or not string');
    return false;
  }
  
  const token = sanitizeString(examData.token, 50);
  if (token.length === 0) {
    Logger.log('Validation failed: token empty after sanitize');
    return false;
  }
  
  if (!/^[A-Z0-9]+$/.test(token)) {
    Logger.log('Validation failed: token format invalid (must be uppercase alphanumeric): ' + token);
    return false;
  }
  
  // Validate duration
  if (examData.durationMinutes !== undefined) {
    const duration = Number(examData.durationMinutes);
    if (isNaN(duration) || duration < 1 || duration > 600) {
      Logger.log('Validation failed: invalid duration: ' + duration);
      return false;
    }
  }
  
  return true;
}

/**
 * ENTRY POINT: POST REQUEST
 */
function doPost(e) {
  // Parse action first to determine if we need lock
  let action = null;
  let payload = {};
  
  // First, try postData.contents (for large data that exceeds URLSearchParams limit)
  if (e.postData && e.postData.contents) {
    try {
      const jsonBody = JSON.parse(e.postData.contents);
      action = jsonBody.action;
      payload = jsonBody.data || {};
    } catch (parseErr) {
      // If parsing fails, continue to try e.parameter
    }
  }
  
  // Fallback: Support x-www-form-urlencoded (for small data, CORS-friendly)
  if (!action && e.parameter && e.parameter.action) {
    action = e.parameter.action;
    if (e.parameter.data) {
      try {
        payload = JSON.parse(e.parameter.data);
      } catch (e) {
        payload = {};
      }
    }
  }
  
  if (!action) {
    return responseJSON({ success: false, message: 'Action required' });
  }
  
  action = sanitizeString(action, 50);

  // LOGIN is read-only operation, doesn't need lock (optimization for concurrent logins)
  // Only write operations need lock
  const needsLock = action !== 'LOGIN' && action !== 'GET_EXAMS' && action !== 'GET_ATTEMPTS' && 
                    action !== 'GET_LIVE_PROGRESS' && action !== 'GET_CLASS_IDS' && 
                    action !== 'GET_CONFIG' && action !== 'GET_BANK_QUESTIONS' && 
                    action !== 'GET_QUESTION_ANALYSIS';
  
  if (needsLock) {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(30000); 
    } catch (e) {
      return responseJSON({ 
        success: false, 
        message: 'Server sibuk. Coba lagi.' 
      });
    }
  }

  try {
    // Only initialize sheet if needed (not for pure read operations)
    if (needsLock || action === 'LOGIN') {
      initializeSheet(); 
    }

    // Input validation per action
    if (action === 'LOGIN') {
      if (!validateUsername(payload.username) || !validatePassword(payload.password)) {
        return responseJSON({ success: false, message: 'Username/Password salah.' });
      }
      const user = authenticateUser(payload.username, payload.password);
      if (user) {
        return responseJSON({ success: true, data: user });
      } else {
        return responseJSON({ success: false, message: 'Username/Password salah.' });
      }
    }

    if (action === 'SAVE_EXAM') {
      if (!validateExamData(payload)) {
        Logger.log('SAVE_EXAM validation failed for payload: ' + JSON.stringify(payload));
        return responseJSON({ 
          success: false, 
          message: 'Data ujian tidak valid. Pastikan Judul dan Token diisi dengan benar (Token: huruf/angka uppercase).' 
        });
      }
      try {
        saveExam(payload);
        return responseJSON({ success: true, message: 'Exam saved', data: payload });
      } catch (err) {
        Logger.log('SAVE_EXAM error: ' + err.toString());
        return responseJSON({ success: false, message: 'Error saving exam: ' + err.toString() });
      }
    }

    if (action === 'DELETE_EXAM') {
      if (!validateId(payload.id)) {
        return responseJSON({ success: false, message: 'Invalid exam ID' });
      }
      deleteRowById(SHEET_EXAMS, payload.id);
      return responseJSON({ success: true, message: 'Exam deleted' });
    }

    if (action === 'SUBMIT_ATTEMPT') {
      if (!validateId(payload.examId) || !sanitizeString(payload.studentName || '', 100)) {
        return responseJSON({ success: false, message: 'Invalid attempt data' });
      }
      
      // Get exam title for better reporting
      let examTitle = sanitizeString(payload.examTitle || '', 200);
      if (!examTitle) {
        // Fallback: try to get from exam data if not provided
        const examData = getSheetData(SHEET_EXAMS);
        const foundExam = examData.find(e => e.id === payload.examId);
        if (foundExam && foundExam.title) {
          examTitle = sanitizeString(foundExam.title, 200);
        }
      }
      
      appendRow(SHEET_ATTEMPTS, {
        examId: sanitizeString(payload.examId, 100),
        examTitle: examTitle || 'Unknown Exam',
        studentName: sanitizeString(payload.studentName || '', 100),
        answers: JSON.stringify(payload.answers || {}),
        score: Math.max(0, Math.min(100, Number(payload.score || 0))),
        submittedAt: String(payload.submittedAt || new Date().toISOString()),
        violationCount: Math.max(0, Math.min(100, Number(payload.violationCount || 0)))
      });
      return responseJSON({ success: true, message: 'Attempt submitted' });
    }
    
    if (action === 'UPDATE_SCORE') {
      if (!validateId(payload.examId) || !sanitizeString(payload.studentName || '', 100)) {
        return responseJSON({ success: false, message: 'Invalid score update data' });
      }
      const newScore = Math.max(0, Math.min(100, Number(payload.newScore || 0)));
      updateStudentScore(payload.examId, payload.studentName, newScore);
      return responseJSON({ success: true, message: 'Score updated' });
    }

    if (action === 'UPDATE_PROGRESS') {
      if (!validateId(payload.examId) || !sanitizeString(payload.studentName || '', 100)) {
        return responseJSON({ success: false, message: 'Invalid progress data' });
      }
      updateLiveProgress(payload);
      return responseJSON({ success: true, message: 'Progress updated' });
    }

    if (action === 'RESET_STUDENT_ATTEMPT') {
      if (!validateId(payload.examId) || !sanitizeString(payload.studentName || '', 100)) {
        return responseJSON({ success: false, message: 'Invalid reset data' });
      }
      resetStudentAttempt(payload.examId, payload.studentName);
      return responseJSON({ success: true, message: 'Student reset successful' });
    }

    if (action === 'RESET_SYSTEM') {
      // Only allow if explicitly requested (no validation needed, but log it)
      clearSheetContent(SHEET_EXAMS);
      clearSheetContent(SHEET_ATTEMPTS);
      clearSheetContent(SHEET_LIVE);
      return responseJSON({ success: true, message: 'System reset' });
    }

    if (action === 'UPLOAD_IMAGE') {
      if (!payload.base64Data || typeof payload.base64Data !== 'string') {
        return responseJSON({ success: false, message: 'Invalid image data' });
      }
      if (!payload.fileName || typeof payload.fileName !== 'string') {
        return responseJSON({ success: false, message: 'Invalid filename' });
      }
      const fileName = sanitizeString(payload.fileName, 100);
      // Validate filename extension
      if (!/\.(jpg|jpeg|png|gif|webp)$/i.test(fileName)) {
        return responseJSON({ success: false, message: 'Invalid file type' });
      }
      const url = saveImageToDrive(payload.base64Data, fileName);
      return responseJSON({ success: true, data: { url } });
    }

    if (action === 'SAVE_TO_BANK') {
      if (!payload.question || typeof payload.question !== 'object') {
        return responseJSON({ success: false, message: 'Invalid question data' });
      }
      if (!payload.createdBy || typeof payload.createdBy !== 'string') {
        return responseJSON({ success: false, message: 'createdBy required' });
      }
      
      const question = payload.question;
      const questionId = question.id || 'qb-' + Date.now();
      const now = new Date().toISOString();
      
      // Prepare data for QuestionBank sheet
      const bankData = {
        id: questionId,
        text: sanitizeString(question.text || '', 2000),
        type: sanitizeString(question.type || '', 50),
        subject: sanitizeString(payload.subject || '', 100),
        difficulty: sanitizeString(payload.difficulty || 'Sedang', 20),
        tags: sanitizeString(payload.tags || '', 500),
        imageUrl: sanitizeString(question.imageUrl || '', 500),
        passage: question.passage ? String(question.passage).substring(0, 10000) : '',
        options: question.options ? JSON.stringify(question.options) : '',
        matchingPairs: question.matchingPairs ? JSON.stringify(question.matchingPairs) : '',
        statements: question.statements ? JSON.stringify(question.statements) : '',
        sequenceItems: question.sequenceItems ? JSON.stringify(question.sequenceItems) : '',
        correctSequence: question.correctSequence ? JSON.stringify(question.correctSequence) : '',
        classificationItems: question.classificationItems ? JSON.stringify(question.classificationItems) : '',
        categories: question.categories ? JSON.stringify(question.categories) : '',
        classificationMapping: question.classificationMapping ? JSON.stringify(question.classificationMapping) : '',
        correctKey: sanitizeString(question.correctKey || '', 500),
        createdAt: now,
        createdBy: sanitizeString(payload.createdBy, 100),
        usageCount: 0,
        lastUsedAt: ''
      };
      
      saveToQuestionBank(bankData);
      return responseJSON({ success: true, message: 'Question saved to bank', data: { id: questionId } });
    }

    if (action === 'UPDATE_BANK_QUESTION') {
      if (!payload.question || typeof payload.question !== 'object') {
        return responseJSON({ success: false, message: 'Invalid question data' });
      }
      if (!payload.questionId || typeof payload.questionId !== 'string') {
        return responseJSON({ success: false, message: 'Question ID required' });
      }
      
      const question = payload.question;
      const questionId = payload.questionId;
      
      // Prepare data for update
      const bankData = {
        id: questionId,
        text: sanitizeString(question.text || '', 2000),
        type: sanitizeString(question.type || '', 50),
        subject: sanitizeString(payload.subject || '', 100),
        difficulty: sanitizeString(payload.difficulty || 'Sedang', 20),
        tags: sanitizeString(payload.tags || '', 500),
        imageUrl: sanitizeString(question.imageUrl || '', 500),
        passage: question.passage ? String(question.passage).substring(0, 10000) : '',
        options: question.options ? JSON.stringify(question.options) : '',
        matchingPairs: question.matchingPairs ? JSON.stringify(question.matchingPairs) : '',
        statements: question.statements ? JSON.stringify(question.statements) : '',
        sequenceItems: question.sequenceItems ? JSON.stringify(question.sequenceItems) : '',
        correctSequence: question.correctSequence ? JSON.stringify(question.correctSequence) : '',
        classificationItems: question.classificationItems ? JSON.stringify(question.classificationItems) : '',
        categories: question.categories ? JSON.stringify(question.categories) : '',
        classificationMapping: question.classificationMapping ? JSON.stringify(question.classificationMapping) : '',
        correctKey: sanitizeString(question.correctKey || '', 500)
      };
      
      updateQuestionInBank(questionId, bankData);
      return responseJSON({ success: true, message: 'Question updated in bank' });
    }

    if (action === 'DELETE_BANK_QUESTION') {
      if (!payload.questionId || typeof payload.questionId !== 'string') {
        return responseJSON({ success: false, message: 'Question ID required' });
      }
      if (!validateId(payload.questionId)) {
        return responseJSON({ success: false, message: 'Invalid question ID' });
      }
      
      deleteQuestionFromBank(payload.questionId);
      return responseJSON({ success: true, message: 'Question deleted from bank' });
    }
    
    if (action === 'BULK_DELETE_BANK_QUESTIONS') {
      if (!payload.questionIds || !Array.isArray(payload.questionIds)) {
        return responseJSON({ success: false, message: 'Question IDs array required' });
      }
      
      var deletedCount = 0;
      var failedCount = 0;
      
      for (var i = 0; i < payload.questionIds.length; i++) {
        var qId = payload.questionIds[i];
        if (validateId(qId)) {
          try {
            deleteQuestionFromBank(qId);
            deletedCount++;
          } catch (e) {
            failedCount++;
          }
        } else {
          failedCount++;
        }
      }
      
      return responseJSON({ 
        success: true, 
        message: deletedCount + ' soal berhasil dihapus' + (failedCount > 0 ? ', ' + failedCount + ' gagal' : ''),
        deletedCount: deletedCount,
        failedCount: failedCount
      });
    }
    
    if (action === 'ANALYZE_EXAM') {
      if (!payload.examId || typeof payload.examId !== 'string') {
        return responseJSON({ success: false, message: 'Exam ID required' });
      }
      if (!validateId(payload.examId)) {
        return responseJSON({ success: false, message: 'Invalid exam ID' });
      }
      
      const result = analyzeExam(payload.examId);
      
      // analyzeExam already returns { success: true/false, ... }
      // Wrap data if success
      if (result.success) {
        // Extract data without 'success' property
        var data = {
          examId: result.examId,
          examTitle: result.examTitle,
          totalQuestions: result.totalQuestions,
          totalStudents: result.totalStudents,
          goodQuestions: result.goodQuestions,
          reviewNeeded: result.reviewNeeded,
          shouldDelete: result.shouldDelete,
          analysisResults: result.analysisResults,
          analyzedAt: result.analyzedAt
        };
        return responseJSON({ success: true, data: data });
      } else {
        return responseJSON({ success: false, message: result.message });
      }
    }

    return responseJSON({ success: false, message: 'Invalid action' });

  } catch (err) {
    // Don't expose internal error details
    Logger.log('doPost error: ' + err.toString());
    return responseJSON({ success: false, message: 'Server error occurred' });
  } finally {
    // Only release lock if we acquired it
    if (needsLock && typeof lock !== 'undefined') {
      try {
        lock.releaseLock();
      } catch (e) {
        // Ignore lock release errors
      }
    }
  }
}

/**
 * HELPER: Save Image
 */
function saveImageToDrive(base64Data, fileName) {
  try {
    const FOLDER_NAME = "EXAMROOM_ASSET";
    
    // Get or create folder
    const folders = DriveApp.getFoldersByName(FOLDER_NAME);
    let folder;
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(FOLDER_NAME);
      // Set folder to public with view permission
      folder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      Utilities.sleep(500);
    }

    // Parse base64 data
    const splitData = base64Data.split(',');
    if (splitData.length < 2) {
      throw new Error('Invalid base64 data format');
    }
    
    const contentType = splitData[0].split(':')[1].split(';')[0];
    const base64Content = splitData[1];
    
    // Decode and create blob
    const bytes = Utilities.base64Decode(base64Content);
    const blob = Utilities.newBlob(bytes, contentType, fileName);
    
    // Create file in folder
    const file = folder.createFile(blob);
    const fileId = file.getId();
    
    // Set file to public - simple and reliable (like before)
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    // Return the ORIGINAL working format - lh3.googleusercontent.com
    // This format worked before and is most reliable
    return "https://lh3.googleusercontent.com/d/" + fileId;
    
  } catch (error) {
    Logger.log('Error saving image: ' + error.toString());
    throw new Error('Failed to save image: ' + error.message);
  }
}

function saveLargeDataToDrive(content, fileName) {
  try {
    const FOLDER_NAME = "EXAMROOM_DATA";
    const folders = DriveApp.getFoldersByName(FOLDER_NAME);
    let folder;
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(FOLDER_NAME);
    }

    const blob = Utilities.newBlob(content, 'application/json', fileName);
    const file = folder.createFile(blob);
    return file.getId();
    
  } catch (error) {
    throw new Error('Storage limit error: ' + error.message);
  }
}

function getLargeDataFromDrive(fileId) {
  try {
    const file = DriveApp.getFileById(fileId);
    return file.getBlob().getDataAsString();
  } catch (error) {
    Logger.log('Error reading file from Drive: ' + fileId + ' - ' + error.toString());
    return "[]";
  }
}

/**
 * CORE DATABASE FUNCTIONS
 */

function initializeSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetNames = [SHEET_EXAMS, SHEET_ATTEMPTS, SHEET_LIVE, SHEET_USERS, SHEET_STUDENTS, SHEET_QUESTION_BANK, SHEET_QUESTION_ANALYSIS];

  sheetNames.forEach(name => {
    let sheet = ss.getSheetByName(name);
    if (!sheet) {
      sheet = ss.insertSheet(name);
    }
    
    const definedHeaders = HEADERS[name];
    if (!definedHeaders || definedHeaders.length === 0) {
      Logger.log('Warning: No headers defined for sheet: ' + name);
      return;
    }
    
    const lastRow = sheet.getLastRow();
    
    // Check if sheet is completely empty
    if (lastRow === 0) {
      // Sheet is empty - add headers
      sheet.appendRow(definedHeaders);
      Logger.log('Added headers to empty sheet: ' + name);
      
      // Add default data for Users and Students
      if (name === SHEET_USERS) {
        const hashedAdminPassword = hashPassword('admin123');
        sheet.appendRow(['admin', hashedAdminPassword, 'Pak Guru', 'GURU']);
      }
      if (name === SHEET_STUDENTS) {
        const hashedStudentPassword = hashPassword('siswa123');
        sheet.appendRow(['siswa1', hashedStudentPassword, 'Budi Santoso', 'VIII A']);
      }
      return;
    }
    
    // Sheet has data - check if header row exists and is correct
    const currentData = sheet.getDataRange().getValues();
    
    if (currentData.length === 0) {
      // Sheet has rows but getDataRange returned empty (shouldn't happen, but safety check)
      sheet.appendRow(definedHeaders);
      Logger.log('Added headers to sheet with empty data range: ' + name);
      return;
    }
    
    const currentHeaders = currentData[0];
    
    // Check if first row looks like headers (compare with expected headers)
    const firstRowIsHeader = currentHeaders.some((cell, idx) => {
      const cellStr = String(cell || '').trim().toLowerCase();
      const expectedHeader = String(definedHeaders[idx] || '').trim().toLowerCase();
      return cellStr === expectedHeader && cellStr !== '';
    });
    
    if (!firstRowIsHeader) {
      // First row doesn't match headers - insert header row at top
      sheet.insertRowBefore(1);
      sheet.getRange(1, 1, 1, definedHeaders.length).setValues([definedHeaders]);
      Logger.log('Inserted headers at row 1 for sheet: ' + name);
    } else {
      // Headers exist - check if they match exactly or if we need to add missing headers
      const currentHeadersLower = currentHeaders.map(h => String(h || '').trim().toLowerCase());
      const definedHeadersLower = definedHeaders.map(h => String(h).trim().toLowerCase());
      
      // Find missing headers
      const missingHeaders = [];
      const missingIndices = [];
      definedHeadersLower.forEach((expectedHeader, idx) => {
        if (!currentHeadersLower.includes(expectedHeader)) {
          missingHeaders.push(definedHeaders[idx]);
          missingIndices.push(idx);
        }
      });
      
      if (missingHeaders.length > 0) {
        // Add missing headers to the right
        const lastCol = sheet.getLastColumn();
        missingHeaders.forEach((header, idx) => {
          const colIndex = lastCol + idx + 1;
          sheet.getRange(1, colIndex).setValue(header);
          Logger.log('Added missing header "' + header + '" at column ' + colIndex + ' for sheet: ' + name);
        });
      }
      
      // Check if headers are in correct order (optional check, but log if different)
      const headersMatch = currentHeaders.length === definedHeaders.length &&
        definedHeaders.every((header, idx) => {
          const currentHeader = String(currentHeaders[idx] || '').trim().toLowerCase();
          const expectedHeader = String(header).trim().toLowerCase();
          return currentHeader === expectedHeader;
        });
      
      if (!headersMatch && missingHeaders.length === 0) {
        Logger.log('Headers exist but order might be different for ' + name);
        Logger.log('Current: ' + JSON.stringify(currentHeaders));
        Logger.log('Expected: ' + JSON.stringify(definedHeaders));
      } else if (headersMatch) {
        Logger.log('Headers are correct for sheet: ' + name);
      }
    }
  });
}

function getSheetData(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  const rows = sheet.getDataRange().getValues();
  if (rows.length < 2) return [];

  const headers = rows[0]; 
  const data = rows.slice(1);

  return data.map(row => {
    let obj = {};
    headers.forEach((header, index) => {
      const key = String(header).trim();
      obj[key] = (index < row.length) ? row[index] : "";
    });
    return obj;
  });
}

/**
 * Hash password menggunakan SHA-256
 * Note: Untuk migrasi, password lama (plain text) akan tetap bisa login
 * Setelah user login pertama kali, password akan di-hash otomatis
 */
function hashPassword(password) {
  if (!password) return '';
  const rawHash = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(password),
    Utilities.Charset.UTF_8
  );
  return rawHash.map(function(byte) {
    return ('0' + (byte & 0xFF).toString(16)).slice(-2);
  }).join('');
}

/**
 * Verify password (support both hashed and plain text for migration)
 */
function verifyPassword(inputPassword, storedPassword) {
  if (!inputPassword || !storedPassword) return false;
  
  // Check if stored password is hashed (64 chars for SHA-256 hex)
  if (storedPassword.length === 64) {
    // Compare hashed passwords
    return hashPassword(inputPassword) === storedPassword;
  } else {
    // Legacy: plain text comparison (for migration)
    return String(inputPassword).trim() === String(storedPassword).trim();
  }
}

/**
 * Update password to hashed version (for migration)
 */
function updatePasswordToHash(sheetName, username, newHashedPassword) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return false;
    
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const usernameCol = headers.indexOf('username');
    const passwordCol = headers.indexOf('password');
    
    if (usernameCol < 0 || passwordCol < 0) return false;
    
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][usernameCol]).trim() === String(username).trim()) {
        sheet.getRange(i + 1, passwordCol + 1).setValue(newHashedPassword);
        return true;
      }
    }
    return false;
  } catch (e) {
    return false;
  }
}

function authenticateUser(username, password) {
  const trimmedUsername = String(username || '').trim();
  const trimmedPassword = String(password || '').trim();
  
  // Input validation
  if (!trimmedUsername || !trimmedPassword) {
    return null;
  }
  
  // Sanitize: prevent injection attempts
  if (trimmedUsername.length > 100 || trimmedPassword.length > 200) {
    return null;
  }
  
  const users = getSheetData(SHEET_USERS);
  const foundUser = users.find(u => String(u.username).trim() === trimmedUsername);
  
  if (foundUser) {
    const passwordMatch = verifyPassword(trimmedPassword, String(foundUser.password || ''));
    if (passwordMatch) {
      // Auto-migrate: if password was plain text, hash it now
      if (String(foundUser.password).length !== 64) {
        const hashedPassword = hashPassword(trimmedPassword);
        updatePasswordToHash(SHEET_USERS, trimmedUsername, hashedPassword);
      }
      return { username: foundUser.username, name: foundUser.name, role: 'GURU' };
    }
  }

  const students = getSheetData(SHEET_STUDENTS);
  const foundStudent = students.find(s => String(s.username).trim() === trimmedUsername);
  
  if (foundStudent) {
    const passwordMatch = verifyPassword(trimmedPassword, String(foundStudent.password || ''));
    if (passwordMatch) {
      // Auto-migrate: if password was plain text, hash it now
      if (String(foundStudent.password).length !== 64) {
        const hashedPassword = hashPassword(trimmedPassword);
        updatePasswordToHash(SHEET_STUDENTS, trimmedUsername, hashedPassword);
      }
      return { username: foundStudent.username, name: foundStudent.name, role: 'SISWA', classId: foundStudent.classId };
    }
  }

  return null;
}

function saveExam(examData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_EXAMS);
  
  // Ensure sheet exists and has headers
  if (!sheet) {
    throw new Error('Sheet Exams tidak ditemukan');
  }
  
  const data = sheet.getDataRange().getValues();
  
  // If sheet is empty, initialize headers
  if (data.length === 0 || !data[0] || data[0].length === 0) {
    const headers = HEADERS[SHEET_EXAMS];
    sheet.appendRow(headers);
    data.push(headers);
  }
  
  const headers = data[0];
  
  // Validate that we have the expected headers
  if (!headers || headers.length === 0) {
    throw new Error('Headers tidak ditemukan di sheet Exams');
  }

  const rowData = headers.map(key => {
    if (key === 'questions') {
      const questionsJson = JSON.stringify(examData.questions || []);
      
      // Validate questions structure before saving
      try {
        const parsed = JSON.parse(questionsJson);
        if (!Array.isArray(parsed)) {
          throw new Error('Questions must be an array');
        }
        // Validate each question has required fields
        for (let i = 0; i < parsed.length; i++) {
          const q = parsed[i];
          if (!q || typeof q !== 'object') {
            throw new Error(`Question ${i + 1} is not a valid object`);
          }
          if (!q.id || typeof q.id !== 'string') {
            throw new Error(`Question ${i + 1} missing or invalid ID`);
          }
          if (!q.text || typeof q.text !== 'string') {
            throw new Error(`Question ${i + 1} missing or invalid text`);
          }
          if (!q.type || typeof q.type !== 'string') {
            throw new Error(`Question ${i + 1} missing or invalid type`);
          }
        }
      } catch (validationErr) {
        Logger.log('Question validation error: ' + validationErr.toString());
        throw new Error('Data soal tidak valid: ' + validationErr.message);
      }
      
      // Limit 50k chars per cell
      if (questionsJson.length > 45000) {
        try {
          const fileName = `exam_questions_${examData.id}_${Date.now()}.json`;
          const fileId = saveLargeDataToDrive(questionsJson, fileName);
          Logger.log('Large exam questions saved to Drive: ' + fileId);
          return 'FILE:' + fileId;
        } catch (e) {
          Logger.log('Error saving large questions to Drive: ' + e.toString());
          throw new Error('Gagal menyimpan soal (terlalu besar).');
        }
      }
      return questionsJson;
    }
    if (['randomizeQuestions', 'randomizeOptions', 'areResultsPublished'].includes(key)) {
      // Handle boolean values properly (true/false/undefined)
      return examData[key] === true || examData[key] === 'true';
    }
    // Handle durationMinutes as number
    if (key === 'durationMinutes') {
      return Number(examData[key] || 0);
    }
    // Return value or empty string for other fields
    return examData[key] !== undefined && examData[key] !== null ? String(examData[key]) : ""; 
  });

  // Find ID column index (usually 0, but safest to find)
  let idIndex = headers.indexOf('id');
  if (idIndex === -1) idIndex = 0; // Fallback

  // Get fresh data after potential header initialization
  const currentData = sheet.getDataRange().getValues();
  let rowIndex = -1;
  
  // Start from row 1 (skip header row 0)
  for (let i = 1; i < currentData.length; i++) {
    if (String(currentData[i][idIndex]) === String(examData.id)) {
      rowIndex = i + 1; // +1 because sheet rows are 1-indexed
      break;
    }
  }

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
}

function deleteRowById(sheetName, id) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(id)) {
      sheet.deleteRow(i + 1);
      break;
    }
  }
}

/**
 * RESET ATTEMPT - BRUTE FORCE METHOD
 * Ignore headers, target columns 0 (ExamID) and 1 (StudentName) directly.
 */
function resetStudentAttempt(examId, studentName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Normalize Inputs - case-insensitive comparison
  const targetExamId = String(examId || "").toLowerCase().trim();
  const targetStudentName = String(studentName || "").toLowerCase().trim();
  
  if (!targetExamId || !targetStudentName) {
    throw new Error('Exam ID and Student Name are required');
  }
  
  // Define sheets to clean
  const targets = [SHEET_ATTEMPTS, SHEET_LIVE];
  let deletedCount = 0;

  targets.forEach(sheetName => {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      console.warn(`Sheet ${sheetName} not found`);
      return;
    }

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) {
      console.log(`Sheet ${sheetName} is empty`);
      return; // Empty sheet
    }

    // Get headers to find correct column indices (more robust)
    const headers = data[0];
    const examIdColIndex = headers.indexOf('examId');
    const studentNameColIndex = headers.indexOf('studentName');
    
    // Fallback to column 0 and 1 if headers not found (backward compatibility)
    const examIdIndex = examIdColIndex >= 0 ? examIdColIndex : 0;
    const nameIndex = studentNameColIndex >= 0 ? studentNameColIndex : 1;

    // Loop backwards to allow deletion
    for (let i = data.length - 1; i >= 1; i--) {
      // Get values from correct columns
      const rowExamId = String(data[i][examIdIndex] || "").toLowerCase().trim();
      const rowName = String(data[i][nameIndex] || "").toLowerCase().trim();

      // Match both examId and studentName (case-insensitive)
      if (rowExamId === targetExamId && rowName === targetStudentName) {
        sheet.deleteRow(i + 1);
        deletedCount++;
        console.log(`Deleted row ${i + 1} from ${sheetName}: ${rowExamId} / ${rowName}`);
      }
    }
  });
  
  console.log(`Reset complete: Deleted ${deletedCount} row(s) for ${targetStudentName} in exam ${targetExamId}`);
  
  if (deletedCount === 0) {
    console.warn(`No matching rows found to delete for ${targetStudentName} in exam ${targetExamId}`);
  }
}

function appendRow(sheetName, dataObj) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const rowData = currentHeaders.map(key => {
    const value = dataObj[key];
    // Handle undefined/null values
    if (value === undefined || value === null) return "";
    // Return value as-is (already formatted by caller)
    return value;
  });
  sheet.appendRow(rowData);
}

function updateLiveProgress(progressData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_LIVE);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // Map data according to headers with proper type conversion
  const rowData = headers.map(key => {
    if (key === 'examId') return String(progressData.examId || '');
    if (key === 'studentName') return String(progressData.studentName || '');
    if (key === 'answeredCount') return Number(progressData.answeredCount || 0);
    if (key === 'totalQuestions') return Number(progressData.totalQuestions || 0);
    if (key === 'violationCount') return Number(progressData.violationCount || 0);
    if (key === 'status') return String(progressData.status || 'WORKING');
    if (key === 'lastActive') return String(progressData.lastActive || new Date().toISOString());
    return progressData[key] !== undefined ? progressData[key] : "";
  });
  
  // Force check columns 0 and 1 for matching
  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(progressData.examId) && 
        String(data[i][1]).toLowerCase().trim() === String(progressData.studentName).toLowerCase().trim()) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex > 0) {
    sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
  } else {
    sheet.appendRow(rowData);
  }
}

function updateStudentScore(examId, studentName, newScore) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_ATTEMPTS);
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const idxScore = headers.indexOf('score');
  if (idxScore === -1) return;

  for (let i = 1; i < data.length; i++) {
    // Force check columns 0 and 1
    if (String(data[i][0]) === String(examId) && 
        String(data[i][1]).toLowerCase().trim() === String(studentName).toLowerCase().trim()) {
      sheet.getRange(i + 1, idxScore + 1).setValue(newScore);
      break;
    }
  }
}

function clearSheetContent(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  const lastRow = sheet.getLastRow();
  if (lastRow > 1) sheet.deleteRows(2, lastRow - 1);
}

/**
 * Save question to QuestionBank
 */
function saveToQuestionBank(bankData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_QUESTION_BANK);
  
  if (!sheet) {
    throw new Error('Sheet QuestionBank tidak ditemukan');
  }
  
  const data = sheet.getDataRange().getValues();
  
  // If sheet is empty, initialize headers
  if (data.length === 0 || !data[0] || data[0].length === 0) {
    const headers = HEADERS[SHEET_QUESTION_BANK];
    sheet.appendRow(headers);
  }
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  
  // Map data according to headers
  const rowData = headers.map(key => {
    const value = bankData[key];
    if (value === undefined || value === null) return "";
    
    // Handle JSON fields
    if (['options', 'matchingPairs', 'statements', 'sequenceItems', 'correctSequence',
         'classificationItems', 'categories', 'classificationMapping'].includes(key)) {
      if (typeof value === 'string' && value !== '') {
        return value; // Already stringified
      }
      return value ? JSON.stringify(value) : '';
    }
    
    // Handle number fields
    if (['usageCount'].includes(key)) {
      return Number(value || 0);
    }
    
    return String(value);
  });
  
  // Check if question with same ID exists
  const idIndex = headers.indexOf('id');
  if (idIndex >= 0) {
    const currentData = sheet.getDataRange().getValues();
    for (let i = 1; i < currentData.length; i++) {
      if (String(currentData[i][idIndex]) === String(bankData.id)) {
        sheet.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);
        return;
      }
    }
  }
  
  // Append new row
  sheet.appendRow(rowData);
}

/**
 * Updates question in QuestionBank
 */
function updateQuestionInBank(questionId, bankData) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_QUESTION_BANK);
  
  if (!sheet) {
    throw new Error('Sheet QuestionBank tidak ditemukan');
  }
  
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return; // No data to update
  
  const headers = data[0];
  const idIndex = headers.indexOf('id');
  if (idIndex < 0) return;
  
  // Find row with matching ID
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIndex]) === String(questionId)) {
      // Map data according to headers
      const rowData = headers.map(key => {
        const value = bankData[key];
        if (value === undefined || value === null) {
          // Keep existing value if not provided
          return data[i][headers.indexOf(key)] || "";
        }
        
        // Handle JSON fields
        if (['options', 'matchingPairs', 'statements', 'sequenceItems', 'correctSequence',
             'classificationItems', 'categories', 'classificationMapping'].includes(key)) {
          if (typeof value === 'string' && value !== '') {
            return value;
          }
          return value ? JSON.stringify(value) : '';
        }
        
        // Handle number fields
        if (['usageCount'].includes(key)) {
          return Number(value || 0);
        }
        
        return String(value);
      });
      
      sheet.getRange(i + 1, 1, 1, rowData.length).setValues([rowData]);
      return;
    }
  }
  
  throw new Error('Question not found in bank');
}

/**
 * Delete question from QuestionBank
 */
function deleteQuestionFromBank(questionId) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_QUESTION_BANK);
  
  if (!sheet) {
    throw new Error('Sheet QuestionBank tidak ditemukan');
  }
  
  const data = sheet.getDataRange().getValues();
  if (data.length < 2) return; // No data to delete
  
  const headers = data[0];
  const idIndex = headers.indexOf('id');
  if (idIndex < 0) return;
  
  // Find and delete row
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][idIndex]) === String(questionId)) {
      sheet.deleteRow(i + 1);
      return;
    }
  }
  
  throw new Error('Question not found in bank');
}

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);
}

/**
 * Get or initialize Config sheet
 * Returns config object with appName and schoolName
 */
function getConfig() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_CONFIG);
  
  // Create sheet if doesn't exist
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_CONFIG);
    sheet.appendRow(['key', 'value']);
    sheet.appendRow(['appName', 'TKA SDNUP03']);
    sheet.appendRow(['schoolName', 'SDN Utan Panjang 03']);
  }
  
  // Get data
  const data = sheet.getDataRange().getValues();
  
  if (data.length < 2) {
    // Initialize with defaults
    if (data.length === 0) {
      sheet.appendRow(['key', 'value']);
    }
    const hasAppName = data.some(row => String(row[0] || '').trim().toLowerCase() === 'appname');
    const hasSchoolName = data.some(row => String(row[0] || '').trim().toLowerCase() === 'schoolname');
    
    if (!hasAppName) {
      sheet.appendRow(['appName', 'TKA SDNUP03']);
    }
    if (!hasSchoolName) {
      sheet.appendRow(['schoolName', 'SDN Utan Panjang 03']);
    }
    // Re-fetch after initialization
    const newData = sheet.getDataRange().getValues();
    return parseConfigData(newData);
  }
  
  return parseConfigData(data);
}

/**
 * Parse config data from sheet rows
 */
function parseConfigData(data) {
  const config = {
    appName: 'TKA SDNUP03',
    schoolName: 'SDN Utan Panjang 03'
  };
  
  // Skip header row (index 0)
  for (let i = 1; i < data.length; i++) {
    const key = String(data[i][0] || '').trim().toLowerCase();
    const value = String(data[i][1] || '').trim();
    
    // Case-insensitive key matching
    if (key === 'appname' && value) {
      config.appName = value;
    } else if (key === 'schoolname' && value) {
      config.schoolName = value;
    }
  }
  
  return config;
}

/**
 * ===================================
 * ITEM ANALYSIS FUNCTIONS (Phase 1)
 * ===================================
 */

/**
 * Analyze all questions in an exam
 * Main entry point for item analysis
 */
function analyzeExam(examId) {
  try {
    // Get exam data
    const exams = getSheetData(SHEET_EXAMS);
    const exam = exams.find(function(e) { return e.id === examId; });
    
    if (!exam) {
      throw new Error('Exam not found');
    }
    
    // Get all attempts for this exam
    const attempts = getSheetData(SHEET_ATTEMPTS);
    const examAttempts = attempts.filter(function(a) { return a.examId === examId; });
    
    if (examAttempts.length < 5) {
      // Need at least 5 students for meaningful analysis
      return { 
        success: false, 
        message: 'Minimal 5 siswa diperlukan untuk analisis. Saat ini: ' + examAttempts.length 
      };
    }
    
    // Parse questions
    var questions = [];
    try {
      questions = JSON.parse(exam.questions);
    } catch (e) {
      throw new Error('Invalid questions data');
    }
    
    // Sort attempts by score for discrimination index
    var sortedAttempts = examAttempts.slice().sort(function(a, b) {
      return (b.score || 0) - (a.score || 0);
    });
    
    // Get top 27% and bottom 27%
    var topCount = Math.ceil(sortedAttempts.length * 0.27);
    var topGroup = sortedAttempts.slice(0, topCount);
    var bottomGroup = sortedAttempts.slice(-topCount);
    
    // Analyze each question
    var analysisResults = [];
    var goodQuestions = 0;
    var reviewNeeded = 0;
    var shouldDelete = 0;
    
    for (var i = 0; i < questions.length; i++) {
      var question = questions[i];
      var analysis = analyzeQuestion(question, examAttempts, topGroup, bottomGroup, exam);
      
      // Save to QuestionAnalysis sheet
      saveQuestionAnalysis(analysis);
      
      if (analysis.isGoodQuestion) goodQuestions++;
      if (analysis.shouldBeReviewed) reviewNeeded++;
      if (analysis.shouldBeDeleted) shouldDelete++;
      
      analysisResults.push(analysis);
      
      // Update question bank if question exists there
      updateQuestionBankMetrics(question.id, analysis);
    }
    
    return {
      success: true,
      examId: examId,
      examTitle: exam.title,
      totalQuestions: questions.length,
      totalStudents: examAttempts.length,
      goodQuestions: goodQuestions,
      reviewNeeded: reviewNeeded,
      shouldDelete: shouldDelete,
      analysisResults: analysisResults,
      analyzedAt: new Date().toISOString()
    };
    
  } catch (error) {
    Logger.log('Error in analyzeExam: ' + error.toString());
    return { success: false, message: error.toString() };
  }
}

/**
 * Analyze a single question
 */
function analyzeQuestion(question, allAttempts, topGroup, bottomGroup, exam) {
  var totalAttempts = allAttempts.length;
  var correctCount = 0;
  var topCorrect = 0;
  var bottomCorrect = 0;
  
  // Count correct answers
  for (var i = 0; i < allAttempts.length; i++) {
    var answers = allAttempts[i].answers;
    if (typeof answers === 'string') {
      try {
        answers = JSON.parse(answers);
      } catch (e) {
        continue;
      }
    }
    
    if (isAnswerCorrect(answers[question.id], question)) {
      correctCount++;
    }
  }
  
  // Count correct in top group
  for (var i = 0; i < topGroup.length; i++) {
    var answers = topGroup[i].answers;
    if (typeof answers === 'string') {
      try {
        answers = JSON.parse(answers);
      } catch (e) {
        continue;
      }
    }
    
    if (isAnswerCorrect(answers[question.id], question)) {
      topCorrect++;
    }
  }
  
  // Count correct in bottom group
  for (var i = 0; i < bottomGroup.length; i++) {
    var answers = bottomGroup[i].answers;
    if (typeof answers === 'string') {
      try {
        answers = JSON.parse(answers);
      } catch (e) {
        continue;
      }
    }
    
    if (isAnswerCorrect(answers[question.id], question)) {
      bottomCorrect++;
    }
  }
  
  // Calculate difficulty index (P value)
  var difficultyIndex = totalAttempts > 0 ? correctCount / totalAttempts : 0;
  
  // Calculate discrimination index (D value)
  var groupSize = topGroup.length;
  var discriminationIndex = groupSize > 0 ? (topCorrect - bottomCorrect) / groupSize : 0;
  
  // Categorize
  var difficultyLevel = categorizeDifficulty(difficultyIndex);
  var discriminationQuality = categorizeDiscrimination(discriminationIndex);
  
  // Determine quality flags
  var isGoodQuestion = discriminationIndex >= 0.30 && difficultyIndex >= 0.30 && difficultyIndex <= 0.70;
  var shouldBeReviewed = discriminationIndex < 0.30 || difficultyIndex < 0.20 || difficultyIndex > 0.80;
  var shouldBeDeleted = discriminationIndex < 0.20;
  
  // Analyze distractors (for multiple choice)
  var distractorAnalysis = null;
  if (question.type === 'PILIHAN_GANDA' && question.options) {
    distractorAnalysis = analyzeDistractors(question, allAttempts, topGroup, bottomGroup);
  }
  
  return {
    id: 'qa-' + exam.id + '-' + question.id + '-' + Date.now(),
    questionId: question.id,
    examId: exam.id,
    examTitle: exam.title,
    questionText: question.text.substring(0, 100), // First 100 chars
    questionType: question.type,
    totalAttempts: totalAttempts,
    correctCount: correctCount,
    incorrectCount: totalAttempts - correctCount,
    difficultyIndex: Math.round(difficultyIndex * 100) / 100,
    difficultyLevel: difficultyLevel,
    discriminationIndex: Math.round(discriminationIndex * 100) / 100,
    discriminationQuality: discriminationQuality,
    isGoodQuestion: isGoodQuestion,
    shouldBeReviewed: shouldBeReviewed,
    shouldBeDeleted: shouldBeDeleted,
    distractorAnalysis: distractorAnalysis ? JSON.stringify(distractorAnalysis) : '',
    analyzedAt: new Date().toISOString()
  };
}

/**
 * Check if answer is correct
 */
function isAnswerCorrect(studentAnswer, question) {
  if (!studentAnswer || !question.correctKey) return false;
  
  // Handle different question types
  if (question.type === 'PILIHAN_GANDA' || question.type === 'BENAR_SALAH' || question.type === 'ISIAN_SINGKAT') {
    return String(studentAnswer).trim().toLowerCase() === String(question.correctKey).trim().toLowerCase();
  }
  
  if (question.type === 'PILIHAN_GANDA_KOMPLEKS') {
    try {
      var correctAnswers = JSON.parse(question.correctKey);
      var studentAnswers = typeof studentAnswer === 'string' ? JSON.parse(studentAnswer) : studentAnswer;
      if (!Array.isArray(correctAnswers) || !Array.isArray(studentAnswers)) return false;
      if (correctAnswers.length !== studentAnswers.length) return false;
      var sortedCorrect = correctAnswers.sort();
      var sortedStudent = studentAnswers.sort();
      for (var i = 0; i < sortedCorrect.length; i++) {
        if (sortedCorrect[i] !== sortedStudent[i]) return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }
  
  // For other complex types, use exact match
  return String(studentAnswer) === String(question.correctKey);
}

/**
 * Categorize difficulty level
 */
function categorizeDifficulty(difficultyIndex) {
  if (difficultyIndex > 0.70) return 'Mudah';
  if (difficultyIndex >= 0.30) return 'Sedang';
  return 'Sulit';
}

/**
 * Categorize discrimination quality
 */
function categorizeDiscrimination(discriminationIndex) {
  if (discriminationIndex >= 0.40) return 'Sangat Baik';
  if (discriminationIndex >= 0.30) return 'Baik';
  if (discriminationIndex >= 0.20) return 'Cukup';
  if (discriminationIndex >= 0.00) return 'Jelek';
  return 'Sangat Jelek';
}

/**
 * Analyze distractors for multiple choice questions
 */
function analyzeDistractors(question, allAttempts, topGroup, bottomGroup) {
  if (!question.options || !Array.isArray(question.options)) return null;
  
  var analysis = [];
  
  for (var i = 0; i < question.options.length; i++) {
    var optionIndex = i.toString();
    var selectedCount = 0;
    var selectedByTop = 0;
    var selectedByBottom = 0;
    
    // Count selections
    for (var j = 0; j < allAttempts.length; j++) {
      var answers = allAttempts[j].answers;
      if (typeof answers === 'string') {
        try {
          answers = JSON.parse(answers);
        } catch (e) {
          continue;
        }
      }
      
      if (String(answers[question.id]) === optionIndex) {
        selectedCount++;
      }
    }
    
    // Count in top group
    for (var j = 0; j < topGroup.length; j++) {
      var answers = topGroup[j].answers;
      if (typeof answers === 'string') {
        try {
          answers = JSON.parse(answers);
        } catch (e) {
          continue;
        }
      }
      
      if (String(answers[question.id]) === optionIndex) {
        selectedByTop++;
      }
    }
    
    // Count in bottom group
    for (var j = 0; j < bottomGroup.length; j++) {
      var answers = bottomGroup[j].answers;
      if (typeof answers === 'string') {
        try {
          answers = JSON.parse(answers);
        } catch (e) {
          continue;
        }
      }
      
      if (String(answers[question.id]) === optionIndex) {
        selectedByBottom++;
      }
    }
    
    var percentage = allAttempts.length > 0 ? (selectedCount / allAttempts.length) * 100 : 0;
    
    // Get option text (handle backward compatibility: string or object)
    var optionText = '';
    if (typeof question.options[i] === 'string') {
      optionText = question.options[i];
    } else if (question.options[i] && typeof question.options[i] === 'object' && question.options[i].text) {
      optionText = question.options[i].text;
    } else {
      optionText = String(question.options[i] || '');
    }
    
    // Determine effectiveness
    var effectiveness = 'Tidak Berfungsi';
    if (optionIndex === question.correctKey) {
      effectiveness = 'Kunci Jawaban';
    } else if (selectedCount === 0) {
      effectiveness = 'Tidak Berfungsi';
    } else if (percentage < 5) {
      effectiveness = 'Kurang';
    } else if (selectedByBottom >= selectedByTop) {
      effectiveness = 'Baik';
    } else {
      effectiveness = 'Kurang';
    }
    
    analysis.push({
      optionIndex: i,
      optionText: optionText.substring(0, 50),
      selectedCount: selectedCount,
      selectedPercentage: Math.round(percentage * 10) / 10,
      selectedByTopGroup: selectedByTop,
      selectedByBottomGroup: selectedByBottom,
      effectiveness: effectiveness
    });
  }
  
  return analysis;
}

/**
 * Save question analysis to sheet
 */
function saveQuestionAnalysis(analysis) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_QUESTION_ANALYSIS);
  
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_QUESTION_ANALYSIS);
    sheet.appendRow(HEADERS[SHEET_QUESTION_ANALYSIS]);
  }
  
  sheet.appendRow([
    analysis.id,
    analysis.questionId,
    analysis.examId,
    analysis.examTitle,
    analysis.questionText,
    analysis.questionType,
    analysis.totalAttempts,
    analysis.correctCount,
    analysis.incorrectCount,
    analysis.difficultyIndex,
    analysis.difficultyLevel,
    analysis.discriminationIndex,
    analysis.discriminationQuality,
    analysis.isGoodQuestion,
    analysis.shouldBeReviewed,
    analysis.shouldBeDeleted,
    analysis.distractorAnalysis,
    analysis.analyzedAt
  ]);
}

/**
 * Updates question bank with analysis metrics
 */
function updateQuestionBankMetrics(questionId, analysis) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(SHEET_QUESTION_BANK);
  
  if (!sheet) return;
  
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var idCol = headers.indexOf('id');
  var diffCol = headers.indexOf('difficultyIndex');
  var discCol = headers.indexOf('discriminationIndex');
  var qualityCol = headers.indexOf('qualityStatus');
  var analyzedCol = headers.indexOf('lastAnalyzed');
  var usageCol = headers.indexOf('usageCount');
  var lastUsedCol = headers.indexOf('lastUsedAt');
  
  if (idCol === -1) return;
  
  // Find question row
  for (var i = 1; i < data.length; i++) {
    if (data[i][idCol] === questionId) {
      if (diffCol !== -1) sheet.getRange(i + 1, diffCol + 1).setValue(analysis.difficultyIndex);
      if (discCol !== -1) sheet.getRange(i + 1, discCol + 1).setValue(analysis.discriminationIndex);
      if (qualityCol !== -1) {
        var quality = analysis.discriminationQuality;
        if (analysis.shouldBeDeleted) quality = 'Harus Dibuang';
        else if (analysis.shouldBeReviewed) quality = 'Perlu Review';
        sheet.getRange(i + 1, qualityCol + 1).setValue(quality);
      }
      if (analyzedCol !== -1) sheet.getRange(i + 1, analyzedCol + 1).setValue(analysis.analyzedAt);
      
      if (usageCol !== -1) {
        var currentUsage = Number(data[i][usageCol] || 0);
        sheet.getRange(i + 1, usageCol + 1).setValue(currentUsage + 1);
      }
      if (lastUsedCol !== -1) {
        sheet.getRange(i + 1, lastUsedCol + 1).setValue(new Date().toISOString());
      }
      
      break;
    }
  }
}
