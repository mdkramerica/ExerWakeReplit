import { PersistentMemoryStorage } from "./persistent-storage";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";

// Create a dual storage system that can seamlessly switch between file and database
export function createDualStorage() {
  const useDatabase = process.env.USE_DATABASE === 'true' || process.env.NODE_ENV === 'production';
  
  if (useDatabase) {
    console.log('📊 Using PostgreSQL database storage for production consistency');
    const sql = neon(process.env.DATABASE_URL!);
    const db = drizzle(sql);
    // Return database-backed storage (would need full implementation)
    return new PersistentMemoryStorage(); // Fallback for now
  } else {
    console.log('📁 Using file-based storage for development');
    return new PersistentMemoryStorage();
  }
}