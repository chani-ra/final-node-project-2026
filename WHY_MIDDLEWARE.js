/* 
🔐 למה צריך Authentication Middleware?
=====================================
*/

console.log("🤔 השאלה: יש לי טוקנים, אז למה עוד middleware?");

/* 
❌ מה היה קורה בלי Middleware:
==============================
*/

// בכל קונטרולר היינו צריכים לכתוב:
const getUserProfile = async (req, res) => {
    try {
        // 1. לחלץ את הטוקן מה-header
        const authHeader = req.headers.authorization;
        const token = authHeader && authHeader.startsWith('Bearer ') 
            ? authHeader.slice(7) 
            : null;
            
        if (!token) {
            return res.status(401).json({ message: 'Token required' });
        }
        
        // 2. לאמת את הטוקן
        const decoded = TokenService.verifyToken(token, 'access');
        
        // 3. לבדוק שזה access token
        if (decoded.type !== 'access') {
            return res.status(401).json({ message: 'Invalid token type' });
        }
        
        // 4. לוודא שהמשתמש עדיין קיים
        const user = await UserService.getUserById(decoded.userId);
        if (!user) {
            return res.status(401).json({ message: 'User not found' });
        }
        
        // 5. לבדוק הרשאות
        if (user.role !== 'admin' && user.role !== 'user') {
            return res.status(403).json({ message: 'Access denied' });
        }
        
        // 6. סוף סוף הקוד האמיתי!
        res.json({ profile: user });
        
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({ message: 'Invalid token' });
        }
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        return res.status(500).json({ message: 'Auth error' });
    }
};

const getUserLessons = async (req, res) => {
    // אותו קוד ארוך שוב! 😫
    // 50 שורות אותו דבר...
};

const createLesson = async (req, res) => {
    // שוב אותו קוד! 😫
    // עוד 50 שורות...
};

/* 
✅ עם Middleware - הקסם קורה:
==============================
*/

// הקונטרולר נהיה פשוט!
const getUserProfileWithMiddleware = async (req, res) => {
    // req.user כבר קיים! הוא הוכן על ידי המידלוואר
    res.json({ profile: req.user });
};

const getUserLessons = async (req, res) => {
    // req.user כבר מוכן!
    const lessons = await LessonService.getLessonsByUserId(req.user.id);
    res.json({ lessons });
};

/* 
🎯 מה המידלוואר עושה בפועל:
=============================
*/

const middlewareFlow = {
    step1: "קוראים את הטוקן מה-Authorization header",
    step2: "מאמתים שהטוקן תקף (לא פג, לא מזויף)",
    step3: "בודקים שזה access token (לא refresh)",
    step4: "מחפשים את המשתמש במסד הנתונים",
    step5: "בודקים שהמשתמש עדיין קיים (לא נמחק)",
    step6: "שומרים את פרטי המשתמש ב-req.user",
    step7: "קוראים ל-next() - ממשיכים לקונטרולר",
    
    result: "הקונטרולר מקבל req.user מוכן לשימוש! ✨"
};

/* 
🛡️ בדיקות אבטחה שהמידלוואר עושה:
==================================
*/

const securityChecks = {
    "טוקן קיים?": "אם לא → 401 Unauthorized",
    "טוקן תקף?": "אם לא → 401 Invalid Token", 
    "טוקן לא פג?": "אם פג → 401 Token Expired",
    "זה Access Token?": "אם Refresh → 401 Wrong Type",
    "משתמש קיים?": "אם נמחק → 401 User Not Found",
    "הרשאות נכונות?": "בmiddleware נפרד → 403 Access Denied"
};

/* 
🔄 איך זה עובד ב-Express:
==========================
*/

console.log("\n📋 הזרימה ב-Express:");

const expressFlow = {
    "1. בקשה מגיעה": "GET /api/profile",
    "2. עוברת דרך middleware": "authenticateToken(req, res, next)",
    "3. middleware בודק": "טוקן, משתמש, הרשאות",
    "4. middleware מכין": "req.user = { id, email, role }",
    "5. middleware קורא": "next() - מעביר לקונטרולר",
    "6. קונטרולר מקבל": "req.user מוכן לשימוש",
    "7. קונטרולר עובד": "בלי לחשוב על אבטחה"
};

/* 
🎭 דוגמאות מהחיים:
===================
*/

console.log("\n🏠 זה כמו שומר באכניסה לבניין:");

const securityGuardAnalogy = {
    "ללא middleware": {
        scenario: "כל דייר בודק תעודות בעצמו",
        problems: [
            "דייר בקומה 3 שכח לבדוק",
            "דייר בקומה 7 בדק לא נכון",  
            "כל דייר עושה את אותה עבודה",
            "אם צריך לשנות נוהל → לעדכן את כולם"
        ]
    },
    
    "עם middleware": {
        scenario: "שומר אחד באכניסה",
        benefits: [
            "בודק פעם אחת - טוב",
            "מומחה בביטחון",
            "עקבי ואמין",
            "קל לעדכן נוהלים"
        ]
    }
};

/* 
📊 השוואת קוד - לפני ואחרי:
==============================
*/

const codeComparison = {
    "ללא middleware": {
        lines_per_controller: "~50 שורות אבטחה",
        controllers_count: "20 קונטרולרים", 
        total_security_code: "1000 שורות חוזרות",
        bugs_probability: "גבוהה - קוד חוזר",
        maintenance: "סיוט - לעדכן 20 מקומות"
    },
    
    "עם middleware": {
        middleware_lines: "45 שורות במקום אחד",
        controller_lines: "3-5 שורות לקונטרולר",
        total_security_code: "45 שורות בלבד",
        bugs_probability: "נמוכה - קוד מרוכז",
        maintenance: "קל - מקום אחד לעדכון"
    }
};

/* 
🎯 למה זה חיוני דווקא לפרויקט שלך:
===================================
*/

const yourProjectBenefits = {
    "פלטפורמת לימוד": {
        "משתמשים רגילים": "צריכים גישה לשיעורים שלהם",
        "מורים": "צריכים גישה לניהול תוכן",
        "מנהלים": "צריכים גישה לכל המערכת",
        
        without_middleware: "בלגן הרשאות בכל קונטרולר",
        with_middleware: "הרשאות מסודרות ובטוחות ✅"
    },
    
    "מנוי/תשלומים": {
        problem: "משתמש חינם מנסה לגשת לתוכן פרימיום",
        without_middleware: "צריך לבדוק בכל API בנפרד", 
        with_middleware: "בדיקה אוטומטית בכניסה ✅"
    }
};

/* 
🔥 התשובה הישירה לשאלה שלך:
==============================
*/

const directAnswer = {
    question: "למה צריך middleware?",
    answer: [
        "🔒 בטיחות: אבטחה מרוכזת ואמינה",
        "📝 פשטות: קונטרולרים נקיים וקריאים", 
        "🔧 תחזוקה: שינוי במקום אחד",
        "🚀 מהירות: פיתוח מהיר יותר",
        "🎯 מקצועיות: ככה עושים בתעשייה"
    ],
    
    bottom_line: "בלי middleware = קוד מבולגן ובלתי מוגן 💀"
};

console.log("\n✨ המסקנה:");
console.log("Middleware = השומר הטוב שמטפל בביטחון בשבילך");
console.log("בלי middleware = כל קונטרולר הוא שומר חובבן 🤡");
