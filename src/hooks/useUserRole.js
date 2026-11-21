import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function useUserRole() {
  const [role, setRole] = useState(null);
  const [loadingRole, setLoadingRole] = useState(true);
  const [roleError, setRoleError] = useState("");

  useEffect(() => {
    let active = true;
    let request = 0;

    async function loadRole() {
      const current = ++request;

      setLoadingRole(true);
      setRole(null);
      setRoleError("");

      const { data: userData, error: authError } =
        await supabase.auth.getUser();

      if (!active || current !== request) return;

      if (authError || !userData.user) {
        setLoadingRole(false);
        return;
      }

      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", userData.user.id)
        .maybeSingle();

      if (!active || current !== request) return;

      if (error) {
        setRoleError(error.message);
      } else {
        setRole(data?.role ?? null);
      }

      setLoadingRole(false);
    }

    loadRole();

    const { data: { subscription } } =
      supabase.auth.onAuthStateChange((event) => {
        if (
          event === "SIGNED_IN" ||
          event === "SIGNED_OUT" ||
          event === "USER_UPDATED"
        ) {
          setTimeout(() => {
            if (active) loadRole();
          }, 0);
        }
      });

    return () => {
      active = false;
      request++;
      subscription.unsubscribe();
    };
  }, []);

  return {
    role,
    isAdmin: role === "admin",
    isStudent: role === "student",
    loadingRole,
    roleError
  };
}
