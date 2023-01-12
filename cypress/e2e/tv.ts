afterEach(() => {
  cy.cleanupUser();
});

describe("TV tests", () => {
  it("should be able to search, add show and mark as read", () => {
    cy.login();
    cy.visitAndCheck("/tv");

    cy.get('[data-testid="search-input"]').type("House of the dragon{enter}");
    cy.findAllByText(/House of the Dragon/);
    cy.findAllByRole("button", { name: /Add Show/i })
      .first()
      .click();
    cy.findByText(/Your shows/);
    cy.findByText(/House of the Dragon/).click();
    cy.findByText(/Remove show/);
    cy.findAllByText(/Mark as watched/)
      .first()
      .click();
    cy.findByText(/Mark as not watched/);
    cy.findByText(/Mark all aired episodes as watched/).click();
    cy.contains("Mark as watched").should("not.exist");
    cy.findAllByText(/Mark as not watched/)
      .first()
      .click();
    cy.findByText(/Mark as watched/);
    cy.findByText(/Remove show/).click();
    cy.findByText(/You have not added any shows yet/);
  });
});
