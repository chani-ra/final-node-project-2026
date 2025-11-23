/* 
🎯 איך המידלוואר עובד בפרויקט שלך - דוגמה חיה
================================================
*/

console.log("📋 מה קורה כשמישהו שולח בקשה:");

// דוגמה 1: בקשה להצגת פרופיל
console.log("\n👤 בקשה: GET /api/profile");

const profileRequest = {
    method: "GET",
    url: "/api/profile",
    headers: {
        "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
    }
};

const expressJourney = {
    "1️⃣ Express מקבל בקשה": profileRequest,
    
    "2️⃣ Router מזהה נתיב": {
        route: "router.get('/profile', authenticateToken, controller)",
        middleware_chain: ["authenticateToken", "controller_function"]
    },
    
    "3️⃣ authenticateToken middleware רץ": {
        action: "בודק טוקן ויוצר req.user",
        input: "req.headers.authorization",
        process: [
            "חילוץ טוקן מ-Bearer header",
            "אימות טוקן עם JWT",
            "חיפוש משתמש במסד נתונים",
            "יצירת req.user object"
        ],
        output: "req.user = { id: '123', email: 'user@example.com', role: 'user' }"
    },
    
    "4️⃣ קריאה ל-next()": "middleware מעביר שליטה לקונטרולר",
    
    "5️⃣ קונטרולר מקבל req מוכן": {
        controller_code: "(req, res) => res.json({ user: req.user })",
        available_data: "req.user כבר מוכן!",
        no_security_code: "אין צורך בבדיקות אבטחה!"
    },
    
    "6️⃣ תגובה נשלחת": {
        status: 200,
        body: {
            message: "Profile data",
            user: {
                id: "123",
                email: "user@example.com", 
                role: "user"
            }
        }
    }
};

// דוגמה 2: בקשה לתוכן מנהל
console.log("\n👑 בקשה: GET /api/admin-only");

const adminRequest = {
    method: "GET", 
    url: "/api/admin-only",
    headers: {
        "Authorization": "Bearer user_token_with_role_user"
    }
};

const adminJourney = {
    "1️⃣ Express מקבל בקשה": adminRequest,
    
    "2️⃣ Router מזהה נתיב": {
        route: "router.get('/admin-only', authenticateToken, requireAdmin, controller)",
        middleware_chain: ["authenticateToken", "requireAdmin", "controller"]
    },
    
    "3️⃣ authenticateToken middleware": {
        result: "req.user = { id: '123', role: 'user' }",
        action: "קורא ל-next()"
    },
    
    "4️⃣ requireAdmin middleware": {
        check: "req.user.role === 'user'",
        allowed_roles: "['admin']",
        result: "❌ Access denied!",
        response: {
            status: 403,
            body: { message: "Access denied. Requires one of: admin" }
        }
    },
    
    "5️⃣ קונטרולר לא רץ": "הבקשה נעצרה במידלוואר!"
};

/* 
🔧 איך זה נראה בקוד בפועל:
============================
*/

console.log("\n💻 הקוד שאת כותבת:");

// ללא middleware - סיוט 😱
const profileControllerWithoutMiddleware = `
const getProfile = async (req, res) => {
    try {
        // 15 שורות בדיקות אבטחה...
        const token = req.headers.authorization?.slice(7);
        if (!token) return res.status(401).json({...});
        
        const decoded = jwt.verify(token, secret);
        if (decoded.type !== 'access') return res.status(401).json({...});
        
        const user = await User.findById(decoded.userId);
        if (!user) return res.status(401).json({...});
        
        // סוף סוף הקוד האמיתי:
        res.json({ user });
        
    } catch (error) {
        // 10 שורות טיפול בשגיאות...
    }
};`;

// עם middleware - פשוט! ✨
const profileControllerWithMiddleware = `
// המידלוואר כבר דאג לכל האבטחה!
const getProfile = (req, res) => {
    res.json({ user: req.user }); // זהו!
};`;

/* 
🎭 דוגמאות ממשיות מהפרויקט שלך:
===================================
*/

const realExamples = {
    "רישום לקורס": {
        without_middleware: [
            "בדוק טוקן (15 שורות)",
            "בדוק שהמשתמש קיים (5 שורות)", 
            "בדוק שיש לו מנוי פעיל (10 שורות)",
            "בדוק שהקורס קיים (5 שורות)",
            "רשום לקורס (2 שורות)",
            "סה״כ: 37 שורות!"
        ],
        with_middleware: [
            "authenticateToken → req.user מוכן",
            "requireActiveSubscription → בדיקת מנוי", 
            "רשום לקורס (2 שורות)",
            "סה״כ: 2 שורות בקונטרולר! 🎉"
        ]
    },
    
    "יצירת שיעור (מורה)": {
        route: "POST /api/lessons",
        middleware: ["authenticateToken", "requireTeacher"],
        controller_logic: "רק יצירת השיעור, בלי בדיקות אבטחה"
    },
    
    "מחיקת משתמש (מנהל)": {
        route: "DELETE /api/users/:id", 
        middleware: ["authenticateToken", "requireAdmin"],
        controller_logic: "רק מחיקה, בלי בדיקות הרשאות"
    }
};

/* 
🚀 היתרונים בפרויקט Learning Platform:
======================================
*/

const platformBenefits = {
    "בטיחות": [
        "כל API מוגן אוטומטית",
        "לא ניתן לשכוח הגנה על endpoint", 
        "בדיקות אבטחה עקביות"
    ],
    
    "פשטות": [
        "קונטרולרים קצרים וברורים",
        "התמקדות בלוגיקה העסקית",
        "קוד קריא ונקי"
    ],
    
    "גמישות": [
        "קל לשנות הרשאות (מקום אחד)",
        "קל להוסיף בדיקות חדשות",
        "קל להוסיף endpoints חדשים"
    ],
    
    "מהירות פיתוח": [
        "לא צריך לחשוב על אבטחה בכל קונטרולר",
        "העתק-הדבק של middleware",
        "פחות באגים, פחות בדיקות"
    ]
};

console.log("\n🎯 התשובה הפשוטה:");
console.log("Middleware = עוזר אוטומטי שעושה את העבודה המשעממת בשבילך");
console.log("בלי Middleware = את צריכה לעשות את כל העבודה המשעממה בעצמך");
console.log("עם Middleware = את מתמקדת ברק ביצירת התכונות החדשות! 🚀");
