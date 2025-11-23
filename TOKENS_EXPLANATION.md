# מדריך לטוקנים - Access Token vs Refresh Token

## בעיה שפתרנו:
אם הטוקן חי 30 ימים והוא נגנב - הגנב יכול להשתמש בו 30 ימים!
אם הטוקן חי שעה - המשתמש צריך להתחבר כל שעה מחדש 😭

## הפתרון - 2 טוקנים:

### Access Token (טוקן גישה)
- **חי**: 1 שעה בלבד
- **משמש**: לכל בקשה לשרת
- **אם נגנב**: נזק מוגבל לשעה אחת בלבד
- **כלול**: userId, role, type: 'access'

### Refresh Token (טוקן רענון)
- **חי**: 7 ימים
- **משמש**: רק ליצור Access Token חדש
- **אם נגנב**: נזק מוגבל יותר (לא גישה ישירה לנתונים)
- **כלול**: userId, type: 'refresh' (ללא role!)

## איך זה עובד?

### התחברות (Login):
```javascript
// המשתמש מתחבר
POST /login { email, password }

// השרת מחזיר:
{
  "token": "access_token_1h",      // לשימוש מיידי
  "refreshToken": "refresh_7d",    // לשמירה
  "user": { ... }
}
```

### בקשה רגילה:
```javascript
// הלקוח שולח עם כל בקשה:
Authorization: Bearer access_token_1h

// השרת בודק ומאמת
```

### כשהטוקן פג (אחרי שעה):
```javascript
// במקום לבקש התחברות מחדש:
POST /refresh-token { refreshToken: "refresh_7d" }

// השרת מחזיר טוקנים חדשים:
{
  "token": "new_access_token_1h",
  "refreshToken": "new_refresh_7d"
}
```

## למה Service נפרד לטוקנים?

### ❌ לפני (רע):
```javascript
// קוד מפוזר בכל הקונטרולרים
const token = jwt.sign({userId}, secret, {expiresIn: '1h'});
const refresh = jwt.sign({userId}, secret, {expiresIn: '7d'});
```

### ✅ אחרי (טוב):
```javascript
// כל הלוגיקה במקום אחד
const tokens = TokenService.generateTokenPair(userId, role);
```

## היתרונות:

1. **אבטחה**: טוקן גישה קצר = נזק מוגבל
2. **נוחות**: לא צריך להתחבר כל שעה
3. **ניהול מרכזי**: כל הטוקנים במקום אחד
4. **גמישות**: קל לשנות את זמני התפוגה
5. **ביטול**: קל לבטל refresh tokens

## דוגמה מהחיים:
כמו כרטיס אשראי + קוד PIN:
- Access Token = קוד PIN (משתנה כל פעם)
- Refresh Token = הכרטיס עצמו (תקף לתקופה ארוכה)
