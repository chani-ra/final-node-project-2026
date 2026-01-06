
import express, {json ,urlencoded } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { config } from 'dotenv';

import { connectDB } from './config/db.js';

import userRoutes from './routes/users.route.js';
import adminRoutes from './routes/admin.route.js';

config();


const app = express();

 connectDB();

app.use(json());
app.use(urlencoded());

app.use(cors());
app.use(morgan('dev'));

app.get('/', (req, res) => {
    res.send('Welcome to the Learning Platform API');
});

// Routes                                       
app.use('/users',userRoutes);
app.use('/admin', adminRoutes); // הוסף נתיב למנהלים


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}`);
});
