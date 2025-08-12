ALTER TABLE followers
ADD CONSTRAINT followers_unique_follower_following UNIQUE (follower_id, following_id);