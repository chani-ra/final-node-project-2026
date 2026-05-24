export const notFound = (req, res, next) => {
    const error = new Error(`The requested URL '${req.url}' with method '${req.method}' was not found.`);
    error.status = 404;
    next(error);
};

export const errorHandling = (err, req, res, next) => {
    console.error('❌ Global Error Handler:', err); 
    
if (err.status === 429 || err.message?.includes('RESOURCE_EXHAUSTED')) {
        err.message = 'הגעת למכסה היומית של ה-AI, נסי שוב מחר.';
        err.status = 429;
    }


    // אם ה-AI החזיר שגיאת מכסה, אנחנו רוצים לוודא שהסטטוס הוא 429
    const status = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    
    return res.status(status).json({ 
        success: false,
        error: message,
        timestamp: new Date().toISOString(),
        path: req.path,
        // הוספנו קישור לתיקון רק אם זו לא שגיאת מכסה
        fixLink: status === 429 ? undefined : 'http://localhost:3000/fix.html'
    });
};