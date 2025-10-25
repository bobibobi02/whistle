import { MeiliSearch } from 'meilisearch';

export const meili = new MeiliSearch({
  host: process.env.MEILI_HOST || 'http://127.0.0.1:7700',
  apiKey: process.env.MEILI_MASTER_KEY,
});

type Post = {
  id: string;
  title: string;
  content: string;
  subforum: string;
  authorId: string;
  createdAt: string;
  updatedAt?: string;
};

export async function indexPost(post: Post) {
  const index = meili.index('posts');
  await index.addDocuments([post]);
}
