/* 
🚨 הבנה שגויה נפוצה vs המציאות
=======================================
*/

// ❌ מה שחושבים שקורה:
// "נכנסתי פעם אחת → מחוברת 7 ימים"

// ✅ מה שבאמת קורה:
// "נכנסתי פעם אחת → לא צריכה להקליד סיסמה שוב 7 ימים"

/* 
התהליך האמיתי:
================
*/

// 1️⃣ התחברות ראשונית
console.log("🔐 התחברות:");
const login = {
    email: "user@example.com",
    password: "123456"
};

const loginResponse = {
    token: "access_1h",      // חי רק שעה!
    refreshToken: "refresh_7d", // חי 7 ימים
    user: {...}
};

// 2️⃣ בקשה ראשונה (דקה 1)
console.log("\n📱 בקשה ראשונה:");
const request1 = {
    url: "/api/profile",
    headers: {
        "Authorization": "Bearer access_1h"  // הטוקן עדיין תקף
    }
};
// ✅ עובד!

// 3️⃣ בקשה שנייה (דקה 30)  
console.log("\n📱 בקשה שנייה:");
const request2 = {
    url: "/api/lessons", 
    headers: {
        "Authorization": "Bearer access_1h"  // עדיין תקף
    }
};
// ✅ עובד!

// 4️⃣ בקשה שלישית (שעה + 5 דקות)
console.log("\n📱 בקשה שלישית:");
const request3 = {
    url: "/api/courses",
    headers: {
        "Authorization": "Bearer access_1h"  // פג תוקף! 💥
    }
};
// ❌ שגיאה 401: Token expired

// 5️⃣ הרענון האוטומטי
console.log("\n🔄 רענון אוטומטי:");
const refreshRequest = {
    url: "/api/refresh-token",
    body: {
        refreshToken: "refresh_7d"  // עדיין תקף
    }
};

const refreshResponse = {
    token: "new_access_1h",     // טוקן חדש לשעה
    refreshToken: "new_refresh_7d"  // טוקן חדש ל-7 ימים
};

// 6️⃣ בקשה רביעית (עם הטוקן החדש)
console.log("\n📱 בקשה רביעית:");
const request4 = {
    url: "/api/courses",
    headers: {
        "Authorization": "Bearer new_access_1h"  // הטוקן החדש
    }
};
// ✅ עובד שוב!

/* 
מה זה אומר בפועל?
==================

🕐 שעה 09:00 - נכנסת לאתר
├── קיבלת: access_token (עד 10:00) + refresh_token (עד 16:00 ב-30/11)

🕙 שעה 09:30 - גלשת באתר  
├── הטוקן תקף → הכל עובד חלק

🕐 שעה 10:05 - ניסית להיכנס לדף חדש
├── הטוקן פג → האתר שלח את ה-refresh_token אוטומטית
├── קיבלת טוקן חדש (עד 11:05) ללא הודעה
└── המשכת לגלוש כרגיל

📅 7 ימים מאוחר יותר (30/11):
├── גם ה-refresh_token פג
└── צריכה להתחבר מחדש עם סיסמה
*/

/* 
איך זה מרגיש למשתמש?
=====================

✨ החוויה: "נשארתי מחוברת 7 ימים ללא בעיות"
🔧 המציאות: האתר רענן לי את הטוקן אוטומטית כל שעה

זה כמו מכונית שממלאת לעצמה דלק אוטומטית
👤 אתה: "הרכב נסע שבוע שלם!"
🔧 המכונית: בעצם מילאה דלק 168 פעמים, פעם בשעה
*/
