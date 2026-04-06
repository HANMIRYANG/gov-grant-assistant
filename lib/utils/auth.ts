import { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/lib/utils/types";

export async function getCurrentUser(): Promise<UserProfile | null> {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // user_profiles에 레코드가 없으면 기본 프로필 반환
    return {
      id: user.id,
      name: user.email?.split("@")[0] ?? "사용자",
      email: user.email ?? "",
      department: null,
      position: null,
      role: "admin",
      phone: null,
      employee_code: null,
      is_active: true,
      created_at: user.created_at,
      updated_at: user.created_at,
    };
  }

  return profile as UserProfile;
}
