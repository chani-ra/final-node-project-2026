/* 
הסבר מפורט על generateRefreshToken
=====================================
*/

generateRefreshToken: (userId) => {
    return jwt.sign(
        { userId, type: 'refresh' }, 
        process.env.REFRESH_SECRET || process.env.JWT_SECRET, 
        { expiresIn: '7d' }
    );
}

/* 
חלוקה לחלקים:
===============

1. הפונקציה מקבלת: userId
2. jwt.sign() - יוצרת טוקן חדש
3. payload (המידע בתוך הטוקן): { userId, type: 'refresh' }
4. secret key: process.env.REFRESH_SECRET או process.env.JWT_SECRET
5. תפוגה: 7 ימים

בואי נבין כל חלק:
==================
*/

// 1. הפונקציה מקבלת רק userId (לא role!)
generateRefreshToken: (userId) => {

// 2. jwt.sign() - הפונקציה שיוצרת JWT
jwt.sign(
    // 3. PAYLOAD - מה שנשמר בתוך הטוקן
    { 
        userId,           // מזהה המשתמש
        type: 'refresh'   // סוג הטוקן (לא access!)
    },
    
    // 4. SECRET KEY - המפתח לחתימה
    process.env.REFRESH_SECRET ||     // מפתח מיוחד לרפרש
    process.env.JWT_SECRET,          // אם אין, השתמש ברגיל
    
    // 5. OPTIONS - אפשרויות נוספות
    { 
        expiresIn: '7d'  // הטוקן יפוג אחרי 7 ימים
    }
);

/*
למה type: 'refresh'?
====================
כדי שהשרת יוכל להבדיל בין:
- Access Token (type: 'access') - לבקשות רגילות
- Refresh Token (type: 'refresh') - רק לחידוש טוקנים

למה לא role?
=============
Refresh Token משמש רק לקבלת טוקנים חדשים.
ה-role נקבע מחדש כשיוצרים Access Token חדש (אולי השתנה!)

למה SECRET נפרד?
=================
- Access Token: JWT_SECRET
- Refresh Token: REFRESH_SECRET
כך אם אחד נחשף, השני עדיין מוגן.

למה 7 ימים?
============
- ארוך מספיק שהמשתמש לא יצטרך להתחבר כל הזמן
- קצר מספיק שאם הטוקן נגנב, הנזק מוגבל
*/

// דוגמה למה שהטוקן מכיל אחרי הקידוד:
const exampleRefreshToken = {
    userId: "507f1f77bcf86cd799439011",
    type: "refresh",
    iat: 1700000000,  // מתי נוצר
    exp: 1700604800   // מתי פג (אחרי 7 ימים)
}
