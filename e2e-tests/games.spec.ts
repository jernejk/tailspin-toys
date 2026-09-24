import { test, expect, type Response } from '@playwright/test';

test.describe('Game Listing and Navigation', () => {
  test('should display games with titles on index page', async ({ page }) => {
    await test.step('Navigate to homepage', async () => {
      await page.goto('/');
    });

    await test.step('Verify games grid is visible', async () => {
      const gamesGrid = page.getByTestId('games-grid');
      await expect(gamesGrid).toBeVisible();
    });

    await test.step('Verify game cards are displayed', async () => {
      const gameCards = page.getByTestId('game-card');
      await expect(gameCards.first()).toBeVisible();
      expect(await gameCards.count()).toBeGreaterThan(0);
    });

    await test.step('Verify game cards have titles with content', async () => {
      const gameCards = page.getByTestId('game-card');
      await expect(gameCards.first().getByTestId('game-title')).toBeVisible();
      await expect(gameCards.first().getByTestId('game-title')).not.toBeEmpty();
    });
  });

  test('should filter games by category and publisher', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByTestId('games-grid')).toBeVisible();

    const categoryFilter = page.getByTestId('category-filter');
    const publisherFilter = page.getByTestId('publisher-filter');
    const gameCards = page.getByTestId('game-card');
    const filterableGames = page.locator('[data-filterable-game]');
    const initialCount = await filterableGames.count();
    let categoryValue: string | undefined;
    let secondCategoryValue: string | undefined;

    await test.step('Filter by a category', async () => {
      const categoryValues = await filterableGames.evaluateAll((cards) => (
        cards.map((card) => card.getAttribute('data-game-category-id') ?? '')
      ));
      categoryValue = categoryValues.find((value) => (
        value !== '' && categoryValues.filter((candidate) => candidate === value).length < initialCount
      ));
      expect(categoryValue).toBeDefined();
      await categoryFilter.selectOption([categoryValue!]);

      const visibleCards = page.locator('[data-filterable-game]:not(.hidden) [data-testid="game-card"]');
      const expectedVisibleCount = categoryValues.filter((value) => value === categoryValue).length;
      await expect(visibleCards).toHaveCount(expectedVisibleCount);
      await expect(page.locator('[data-filterable-game].hidden')).toHaveCount(initialCount - expectedVisibleCount);
      await expect(page.getByTestId('filter-results-count')).toContainText('Showing');
    });

    await test.step('Support multiple categories with OR behavior', async () => {
      const categoryOptions = await categoryFilter.locator('option').evaluateAll((options) => (
        options.map((option) => option.getAttribute('value') ?? '').filter(Boolean)
      ));
      secondCategoryValue = categoryOptions.find((value) => value !== categoryValue);
      expect(secondCategoryValue).toBeDefined();
      await categoryFilter.selectOption([categoryValue!, secondCategoryValue!]);

      const visibleCards = page.locator('[data-filterable-game]:not(.hidden)');
      const expectedVisibleCount = await filterableGames.evaluateAll(
        (cards, selectedCategories) => cards.filter((card) => (
          selectedCategories.includes(card.getAttribute('data-game-category-id') ?? '')
        )).length,
        [categoryValue!, secondCategoryValue!],
      );
      await expect(visibleCards).toHaveCount(expectedVisibleCount);
      await expect(page.locator('[data-filterable-game].hidden')).toHaveCount(initialCount - expectedVisibleCount);
    });

    await test.step('Combine category and publisher filters', async () => {
      const publisherValue = await filterableGames
        .filter({ has: page.locator('[data-testid="game-card"]:visible') })
        .first()
        .getAttribute('data-game-publisher-id');
      expect(publisherValue).not.toBeNull();
      await publisherFilter.selectOption(publisherValue!);

      await expect(page.getByTestId('filter-results-count')).toContainText('Showing');
      const visibleCards = page.locator('[data-filterable-game]:not(.hidden)');
      const expectedCombinedCount = await filterableGames.evaluateAll(
        (cards, filters) => cards.filter((card) => {
          const category = card.getAttribute('data-game-category-id');
          const publisher = card.getAttribute('data-game-publisher-id');
          return filters.categories.includes(category ?? '') && publisher === filters.publisher;
        }).length,
        {
          categories: [categoryValue!, secondCategoryValue!],
          publisher: publisherValue!,
        },
      );
      await expect(visibleCards).toHaveCount(expectedCombinedCount);
    });

    await test.step('Clear filters and restore all games', async () => {
      await page.getByTestId('clear-filters').click();
      await expect(page.getByTestId('filtered-empty-state')).toBeHidden();
      await expect(page.getByTestId('filter-results-count')).toHaveText(`Showing ${initialCount} games`);
      await expect(gameCards).toHaveCount(initialCount);
    });
  });

  test('should navigate to correct game details page when clicking on a game', async ({ page }) => {
    let gameId: string | null;
    let gameTitle: string | null;

    await test.step('Navigate to homepage and wait for games to load', async () => {
      await page.goto('/');
      const gamesGrid = page.getByTestId('games-grid');
      await expect(gamesGrid).toBeVisible();
    });

    await test.step('Get first game information and click it', async () => {
      const firstGameCard = page.getByTestId('game-card').first();
      gameId = await firstGameCard.getAttribute('data-game-id');
      gameTitle = await firstGameCard.getAttribute('data-game-title');
      await firstGameCard.click();
    });

    await test.step('Verify navigation to game details page', async () => {
      await expect(page).toHaveURL(`/game/${gameId}`);
      await expect(page.getByTestId('game-details')).toBeVisible();
    });

    await test.step('Verify game title matches clicked game', async () => {
      if (gameTitle) {
        await expect(page.getByTestId('game-details-title')).toHaveText(gameTitle);
      }
    });
  });

  test('should display game details with all required information', async ({ page }) => {
    await test.step('Navigate to specific game details page', async () => {
      await page.goto('/game/1');
      await expect(page.getByTestId('game-details')).toBeVisible();
    });

    await test.step('Verify game title is displayed', async () => {
      const gameTitle = page.getByTestId('game-details-title');
      await expect(gameTitle).toBeVisible();
      await expect(gameTitle).not.toBeEmpty();
    });

    await test.step('Verify game description is displayed', async () => {
      const gameDescription = page.getByTestId('game-details-description');
      await expect(gameDescription).toBeVisible();
      await expect(gameDescription).not.toBeEmpty();
    });

    await test.step('Verify publisher or category information is present', async () => {
      const publisherExists = await page.getByTestId('game-details-publisher').isVisible();
      const categoryExists = await page.getByTestId('game-details-category').isVisible();
      expect(publisherExists || categoryExists).toBeTruthy();

      if (publisherExists) {
        await expect(page.getByTestId('game-details-publisher')).not.toBeEmpty();
      }

      if (categoryExists) {
        await expect(page.getByTestId('game-details-category')).not.toBeEmpty();
      }
    });
  });

  test('should display a button to back the game', async ({ page }) => {
    await test.step('Navigate to game details page', async () => {
      await page.goto('/game/1');
      await expect(page.getByTestId('game-details')).toBeVisible();
    });

    await test.step('Verify back game button is visible and enabled', async () => {
      const backButton = page.getByTestId('back-game-button');
      await expect(backButton).toBeVisible();
      await expect(backButton).toContainText('Support This Game');
      await expect(backButton).toBeEnabled();
    });
  });

  test('should be able to navigate back to home from game details', async ({ page }) => {
    await test.step('Navigate to game details page', async () => {
      await page.goto('/game/1');
      await expect(page.getByTestId('game-details')).toBeVisible();
    });

    await test.step('Click back to all games link', async () => {
      const backLink = page.getByRole('link', { name: /back to all games/i });
      await expect(backLink).toBeVisible();
      await backLink.click();
    });

    await test.step('Verify navigation back to homepage', async () => {
      await expect(page).toHaveURL('/');
      await expect(page.getByTestId('games-grid')).toBeVisible();
    });
  });

  test('should return a 404 page for a non-existent game', async ({ page }) => {
    let response: Response | null;

    await test.step('Navigate to non-existent game', async () => {
      response = await page.goto('/game/99999');
    });

    await test.step('Verify a branded 404 page is served', async () => {
      expect(response?.status()).toBe(404);
      await expect(page).toHaveTitle(/Page Not Found - Tailspin Toys/);
      await expect(page.getByTestId('not-found')).toBeVisible();
      await expect(page.getByTestId('not-found-heading')).not.toBeEmpty();
      await expect(page.getByTestId('not-found-home-link')).toBeVisible();
    });
  });
});
