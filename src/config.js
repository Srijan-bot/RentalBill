// For Vercel Serverless, production uses relative path (empty string), local uses localhost:5000
export const API_BASE_URL = import.meta.env.PROD ? '' : 'http://localhost:5000';
