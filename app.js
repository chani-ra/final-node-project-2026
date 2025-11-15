
import express, {json ,urlencoded } from 'express';
import morgan from 'morgan';
import cors from 'cors';
import { config } from 'dotenv';

import { connectDB } from './config/db.js';

config();


const app = express();

connectDB();

app.use(json());
app.use(urlencoded());

app.use(cors());
app.use(morgan('dev'));

// Routes


const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
