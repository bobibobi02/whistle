import React from 'react';
import SwaggerUI from 'swagger-ui-react';
import 'swagger-ui-react/swagger-ui.css';
import yaml from 'yaml';

export default function ApiDocs() {
  const spec = yaml.parse(`openapi: 3.0.0
info:
  title: Whistle API
  version: 1.0.0
servers:
  - url: https://api.whistle.com
paths:
  /api/feed:
    get:
      summary: Get personalized feed
      responses:
        '200':
          description: A list of posts
  /api/post/{id}:
    get:
      summary: Get post details
      parameters:
        - subforum: id
          in: path
          required: true
          schema:
            type: string
      responses:
        '200':
          description: Post object
  /api/post:
    post:
      summary: Create a new post
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                subforumName:
                  type: string
                title:
                  type: string
                content:
                  type: string
      responses:
        '200':
          description: Created post
`);
  return <SwaggerUI spec={spec} />;
}
