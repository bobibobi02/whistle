import React from 'react';
import PostCard, { PostCardProps } from '../../../src/components/post-card/PostCard';
import { mount } from 'cypress/react';

describe('PostCard Component - Cypress Component Tests', () => {
  const baseProps: PostCardProps = {
    user: { name: 'Alice' },
    avatarUrl: 'https://via.placeholder.com/150',
    timestamp: new Date().toISOString(),
    content: 'Hello Cypress',
    likesCount: 5,
    commentsCount: 3,
    collapseThreshold: 50,
  };

  it('renders user name and content', () => {
    mount(<PostCard {...baseProps} />);
    cy.contains('Alice').should('be.visible');
    cy.contains('Hello Cypress').should('be.visible');
  });

  it('does not show toggle for short content', () => {
    mount(<PostCard {...baseProps} collapseThreshold={1000} />);
    cy.contains('Hello Cypress').should('be.visible');
    cy.get('button[aria-label="Show more"]').should('not.exist');
  });

  it('shows "Show More" button and truncated text for long content', () => {
    const longText = 'a'.repeat(200);
    mount(<PostCard {...baseProps} content={longText} collapseThreshold={50} />);
    cy.get('p').should('contain.text', `${'a'.repeat(50)}...`);
    cy.get('button[aria-label="Show more"]').should('be.visible');
  });

  it('expands and collapses content when toggled', () => {
    const longText = 'b'.repeat(120);
    mount(<PostCard {...baseProps} content={longText} collapseThreshold={50} />);
    cy.get('button[aria-label="Show more"]').click();
    cy.get('p').should('contain.text', longText);
    cy.get('button[aria-label="Show less"]').click();
    cy.get('p').should('contain.text', `${'b'.repeat(50)}...`);
  });

  it('renders loading skeleton when isLoading is true', () => {
    mount(<PostCard {...baseProps} isLoading />);
    cy.get('.animate-pulse').its('length').should('be.gt', 0);
    cy.contains(baseProps.content).should('not.exist');
  });

  it('renders error overlay and triggers onRetry callback', () => {
    const retrySpy = cy.spy().as('retrySpy');
    mount(<PostCard {...baseProps} hasError onRetry={retrySpy} />);
    cy.contains(/Failed to load post\./).should('be.visible');
    cy.contains('Retry').click();
    cy.get('@retrySpy').should('have.been.calledOnce');
  });
});
