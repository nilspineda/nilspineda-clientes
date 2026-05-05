import { getSupabase } from "../../../lib/supabase";

export const GET = async ({ cookies, redirect }) => {
  const supabase = getSupabase(cookies);
  await supabase.auth.signOut();
  return redirect("/login");
};
