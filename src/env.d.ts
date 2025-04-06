/**
 * This is a TypeScript declaration file that defines types for environment variables in a Vite project.
 * It ensures type safety when accessing environment variables through import.meta.env
 */

/// <reference types="vite/client" /> // Imports Vite's built-in type definitions

/**
 * Defines the structure of environment variables available in the application.
 * These variables must be prefixed with VITE_ to be exposed to the client-side code.
 */
interface ImportMetaEnv {
  /** The URL of your Supabase instance (required) */
  readonly VITE_SUPABASE_URL: string;

  /** The anonymous API key for Supabase client-side access (required) */
  readonly VITE_SUPABASE_ANON_KEY: string;

  /** Optional API URL for backend services. If not set, defaults to localhost in the app */
  readonly VITE_API_URL?: string;
}

/**
 * Augments the ImportMeta interface from Vite to include our environment variables.
 * This allows TypeScript to provide autocomplete and type checking when using import.meta.env
 * Example usage: const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
 */
interface ImportMeta {
  readonly env: ImportMetaEnv;
}
