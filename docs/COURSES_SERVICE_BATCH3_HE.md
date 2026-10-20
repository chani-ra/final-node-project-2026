# Courses Service — רפקטורינג איכות, סבב 3

## מטרת השינוי

הפחתת כפילות ב־`service/courses.service.js` **בלי לפצל את השירות לקבצים נוספים** ובלי לשנות את התנהגות המערכת.

- חילוץ הפעולה המשותפת לארבע הפונקציות `addLessonToCourse`, `addSongToCourse`, `addExerciseToCourse` ו־`addQuizToCourse` לפונקציית עזר פנימית `addContentToCourse`.
- שמירה על שמות הפונקציות הציבוריות, סדר הפרמטרים, פילטר הבעלות ב־MongoDB, הפעולה `$addToSet`, מבנה תוצאות, קודי שגיאה והודעות בעברית.
- **לא נוספו Routes.** ארבע פעולות השיוך קיימות ב־Controller וב־Service, אך אינן מחוברות לנתיבים פעילים ב־`routes/courses.route.js` בגרסה שנבדקה.
- **לא שונו כללי הרשאות או תהליכים עסקיים.** תיקונים המשנים התנהגות יידונו בנפרד.
- נוספו שלוש בדיקות אינטגרציה בקובץ עצמאי `tests/courseServiceBatch3.test.js`: ארבעת סוגי התוכן, התנהגות שיוך חוזר, שגיאות 403/404, והרשאות עריכה/מחיקה דרך ה־API. הקובץ הקיים `tests/integration.test.js` אינו משתנה.

## בסיס השינויים

ה־Patch מיועד לענף שנוצר לאחר שני הסבבים הקודמים: `refactor/lessons-service-batch2`, שבראשו Commit `1f13220` (ומכיל את Commit `58bd5ed` של Courses). מומלץ ליצור ממנו ענף חדש לפני החלת ה־Patch.

## בדיקות לפני Commit

```cmd
node --check service/courses.service.js
node --check tests/courseServiceBatch3.test.js
npm test
git diff --check
git status -sb
```

תוצאה צפויה: **69 בדיקות** (66 קיימות ועוד שלוש). אין לבצע Commit, Push או Deploy לפני אישור הבדיקות.

## נושאים ידועים שלא טופלו בסבב זה

1. `deleteCourse` בודק בעלות בתוך השירות ללא תנאי מפורש `role === 'teacher'`, בעוד שה־Route חוסם קריאות HTTP שאינן ממורה/מנהל. תיקון הדרישה בשירות יהיה שינוי הרשאות מכוון שדורש בדיקות ייעודיות.
2. `enrollStudentInCourse` משנה מספר מסמכים ללא טרנזקציה או מנגנון פיצוי במקרה של כשל חלקי. טיפול בעקביות ובמקביליות מחייב החלטת תכנון ובדיקות נפרדות.
3. `searchCourses` מעביר מחרוזת חיפוש לביטוי רגולרי של MongoDB. יש לבחון הגבלת קלט, escaping וביצועים בנפרד כדי לא לשנות התנהגות חיפוש תוך כדי רפקטורינג מבני.
