export type Profile = {
  id: string;
  email: string;
  avatar_url?: string;
  full_name?: string;
  username?: string;
  phone_number?: string;
};

export type User = {
  id: string;
  email?: string;
  created_at: string;
  banned_until?: string;
  profile?: {
    is_flagged?: boolean;
  };
};
