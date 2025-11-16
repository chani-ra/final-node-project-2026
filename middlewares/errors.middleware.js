

export const notFound = (req, res, next) => {
    const error = new Error(`The requested URL '${req.url}' with method '${req.method}' was not found.`);
    error.status = 404;
    
    next(error);
};




export const errorHandling = (err, req, res, next) => {
    console.error('Error:', err); 
    
    const message = err.message || 'Internal Server Error';
    const status = err.status || err.statusCode || 500;
    
    return res.status(status).json({ 
        error: message,
        timestamp: new Date().toISOString(),
        path: req.path,
        fixLink: 'http://localhost:5000/fix.html'

    });
};