// Whistle SDK
export class WhistleSDK {
  private baseUrl: string;
  private headers: Record<string, string>;

  constructor(baseUrl: string, token?: string) {
    this.baseUrl = baseUrl;
    this.headers = {
      'Content-Type': 'application/json',
    };
    if (token) this.headers['Authorization'] = `Bearer ${token}`;
  }

  async getFeed() {
    const res = await fetch(`${this.baseUrl}/api/feed`, { headers: this.headers });
    return res.json();
  }

  async getPost(id: string) {
    const res = await fetch(`${this.baseUrl}/api/post/${id}`, { headers: this.headers });
    return res.json();
  }

  async createPost(subforum: string, title: string, content: string) {
    const res = await fetch(`${this.baseUrl}/api/post`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ subforumName: subforum, title, content })
    });
    return res.json();
  }

  async upvotePost(id: string) {
    return this.vote('post', id, 1);
  }

  async downvotePost(id: string) {
    return this.vote('post', id, -1);
  }

  private async vote(targetType: 'post'|'comment', targetId: string, value: number) {
    const endpoint = targetType === 'post'
      ? '/api/vote/post'
      : '/api/vote/comment';
    const res = await fetch(`${this.baseUrl}${endpoint}`, {
      method: 'POST',
      headers: this.headers,
      body: JSON.stringify({ [`${targetType}Id`]: targetId, value })
    });
    return res.json();
  }

  // More methods can be added here...
}
