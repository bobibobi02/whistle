describe('Whistle app', () => {
  it('loads the homepage', () => {
    cy.visit('/');
    cy.contains('Whistle');
  });
});
