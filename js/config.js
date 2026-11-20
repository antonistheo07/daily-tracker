const SUPABASE_URL = "https://dyrtzrbxlayvgqjnhfku.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR5cnR6cmJ4bGF5dmdxam5oZmt1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTUxODcxMzQsImV4cCI6MjExMDc2MzEzNH0.fsuth6w5sJkjTpWulJ1-qAXy8KDdBPgunJD7SUxhNyg";

// NOTE: the library already owns the global name "supabase",
// so our client is called "sb"
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);