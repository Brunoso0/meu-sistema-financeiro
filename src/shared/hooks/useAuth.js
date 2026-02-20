import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function bootstrap() {
      const { data } = await supabase.auth.getSession();
      const currentUser = data?.session?.user ?? null;

      if (!isMounted) return;

      setUser(currentUser);

      if (currentUser) {
        await loadProfile(currentUser.id, currentUser.user_metadata);
      }

      if (isMounted) setLoading(false);
    }

    async function loadProfile(userId, metadata = {}) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single();

        if (error) throw error;
        if (isMounted) setProfile(data);
      } catch {
        if (isMounted) {
          setProfile({
            id: userId,
            role: metadata.role || 'user',
            full_name: metadata.full_name || null,
          });
        }
      }
    }

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user ?? null;
      setUser(nextUser);

      if (!nextUser) {
        setProfile(null);
        setLoading(false);
        return;
      }

      loadProfile(nextUser.id, nextUser.user_metadata).finally(() => setLoading(false));
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return { user, profile, loading };
}
