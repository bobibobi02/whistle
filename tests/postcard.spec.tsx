import React from 'react';
import { useRouter } from 'next/router';
import PostCard from '@/components/post-card/PostCard';

const longContent = Array(200)
  .fill('This is a long test post to demonstrate the collapse functionality. ')
  .join('');

export default function PostCardTest() {
  const router = useRouter();
  const { loading, error, long } = router.query;

  const isLoading = loading === 'true';
  const hasError = error === 'true';
  const content = long === 'true' ? longContent : 'This is a test post.';

  return (
    <div className="p-8">
      <PostCard
        user={{ name: 'Test User' }}
        timestamp={new Date().toISOString()}
        content={content}
        isLoading={isLoading}
        hasError={hasError}
        likesCount={5}
        commentsCount={2}
        collapseThreshold={100}
        onRetry={() => window.location.replace('/postcard-test')}
      />
    </div>
  );
}
