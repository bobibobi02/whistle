import { useEffect } from 'react';
import { indexPost } from '@/lib/meili';
import { Post } from '@/types'; // ✅ Correct alias usage

export default function MeiliInitializer({ post }: { post: Post }) {
  useEffect(() => {
    if (post) {
      indexPost({
        id: post.id,
        title: post.title,
        content: post.content,
        userEmail: post.userEmail,
        subforum: post.subforumName,
        createdAt: post.createdAt,
      });
    }
  }, [post]);

  return null;
}
