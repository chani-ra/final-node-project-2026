// השוואה בין Access Token ל-Refresh Token
// =============================================

console.log("🔍 השוואה בין שני סוגי הטוקנים:");

// ACCESS TOKEN
// ============
const accessTokenPayload = {
    userId: "507f1f77bcf86cd799439011",
    role: "user",                    // 👈 יש role!
    type: "access",                  // 👈 סוג: גישה
    iat: 1700000000,
    exp: 1700003600                  // 👈 פג אחרי שעה!
};

// REFRESH TOKEN  
// =============
const refreshTokenPayload = {
    userId: "507f1f77bcf86cd799439011",
    // אין role! 👈 נקבע מחדש בכל רענון
    type: "refresh",                 // 👈 סוג: רענון
    iat: 1700000000,
    exp: 1700604800                  // 👈 פג אחרי 7 ימים!
};

console.log("Access Token:", accessTokenPayload);
console.log("Refresh Token:", refreshTokenPayload);

// איך זה עובד בפועל?
// ==================

// 1. כשמשתמש נכנס:
const loginResponse = {
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",      // Access (1h)
    refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...", // Refresh (7d)
    user: { id: "...", email: "...", role: "user" }
};

// 2. כל בקשה לשרת:
const apiRequest = {
    headers: {
        "Authorization": "Bearer " + loginResponse.token  // Access Token בלבד!
    }
};

// 3. כשהטוקן פג (אחרי שעה):
const refreshRequest = {
    body: {
        refreshToken: loginResponse.refreshToken  // Refresh Token
    }
};

// 4. השרת מחזיר טוקנים חדשים:
const refreshResponse = {
    token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",      // Access חדש (1h)
    refreshToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  // Refresh חדש (7d)
};

/* 
למה זה חכם?
============

🛡️ אבטחה:
- Access Token נגנב? נזק של שעה בלבד
- Refresh Token נגנב? לא נותן גישה ישירה לנתונים
- שני מפתחות נפרדים

⚡ ביצועים:
- Access Token קטן (יש role)
- לא צריך לבדוק במסד הנתונים בכל בקשה

🔄 גמישות:
- Role השתנה? ייקבע מחדש ברענון הבא
- קל לבטל Refresh Tokens במסד הנתונים
*/
