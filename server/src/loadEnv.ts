import dotenv from 'dotenv';
import path from 'path';

// Load environmental parameters from workspace root .env before any other imports
dotenv.config({ path: path.join(__dirname, '../../.env') });
