import { describe, it, expect, beforeEach } from 'vitest';
import { createTestDatabase } from '../../db/test-helpers';
import { categories, publishers, games } from '../../db/schema';
import type { Database } from './db';
import {
    getAllGames,
    getAllGameIds,
    getGamesByFilters,
    getGameById,
} from './games';

async function seedGames(db: Database, count: number): Promise<void> {
    const [category] = await db
        .insert(categories)
        .values({ name: 'Strategy', description: 'cat' })
        .returning({ id: categories.id });
    const [publisher] = await db
        .insert(publishers)
        .values({ name: 'Pub One', description: 'pub' })
        .returning({ id: publishers.id });

    // Insert titles in reverse-alphabetical order to prove ordering is applied.
    for (let i = count; i >= 1; i--) {
        await db.insert(games).values({
            title: `Game ${String(i).padStart(2, '0')}`,
            description: `Description ${i}`,
            starRating: 4.2,
            categoryId: category.id,
            publisherId: publisher.id,
        });
    }
}

describe('games data-access helpers', () => {
    let db: Database;

    beforeEach(async () => {
        db = await createTestDatabase();
    });

    it('returns all games ordered by title', async () => {
        await seedGames(db, 3);
        const all = await getAllGames(db);
        expect(all.map((g) => g.title)).toEqual(['Game 01', 'Game 02', 'Game 03']);
        expect(all[0].category).toEqual({ id: expect.any(Number), name: 'Strategy' });
        expect(all[0].publisher).toEqual({ id: expect.any(Number), name: 'Pub One' });
    });

    it('returns all game ids ordered by title', async () => {
        await seedGames(db, 3);
        const ids = await getAllGameIds(db);
        const all = await getAllGames(db);
        expect(ids).toEqual(all.map((g) => g.id));
    });

    it('fetches a single game by id', async () => {
        await seedGames(db, 2);
        const ids = await getAllGameIds(db);
        const game = await getGameById(db, ids[0]);
        expect(game?.title).toBe('Game 01');
    });

    it('returns null for a non-existent game', async () => {
        await seedGames(db, 2);
        expect(await getGameById(db, 99999)).toBeNull();
    });

    it('filters by one or more categories and orders results by title', async () => {
        const [strategy] = await db
            .insert(categories)
            .values({ name: 'Strategy', description: 'strategy' })
            .returning({ id: categories.id });
        const [party] = await db
            .insert(categories)
            .values({ name: 'Party', description: 'party' })
            .returning({ id: categories.id });
        const [publisher] = await db
            .insert(publishers)
            .values({ name: 'Pub One', description: 'publisher' })
            .returning({ id: publishers.id });

        await db.insert(games).values([
            {
                title: 'Zeta Strategy',
                description: 'strategy game',
                starRating: 4,
                categoryId: strategy.id,
                publisherId: publisher.id,
            },
            {
                title: 'Alpha Party',
                description: 'party game',
                starRating: 4,
                categoryId: party.id,
                publisherId: publisher.id,
            },
        ]);

        const filtered = await getGamesByFilters(db, {
            categoryIds: [strategy.id, party.id],
        });

        expect(filtered.map((game) => game.title)).toEqual(['Alpha Party', 'Zeta Strategy']);
    });

    it('combines category and publisher filters', async () => {
        const [category] = await db
            .insert(categories)
            .values({ name: 'Strategy', description: 'strategy' })
            .returning({ id: categories.id });
        const [publisherOne] = await db
            .insert(publishers)
            .values({ name: 'Pub One', description: 'publisher one' })
            .returning({ id: publishers.id });
        const [publisherTwo] = await db
            .insert(publishers)
            .values({ name: 'Pub Two', description: 'publisher two' })
            .returning({ id: publishers.id });

        await db.insert(games).values([
            {
                title: 'First Match',
                description: 'matching game',
                starRating: 4,
                categoryId: category.id,
                publisherId: publisherOne.id,
            },
            {
                title: 'Wrong Publisher',
                description: 'different publisher',
                starRating: 4,
                categoryId: category.id,
                publisherId: publisherTwo.id,
            },
        ]);

        const filtered = await getGamesByFilters(db, {
            categoryIds: [category.id],
            publisherId: publisherOne.id,
        });

        expect(filtered.map((game) => game.title)).toEqual(['First Match']);
    });

    it('returns an empty collection when filters match no games', async () => {
        await seedGames(db, 1);

        const filtered = await getGamesByFilters(db, { publisherId: 99999 });

        expect(filtered).toEqual([]);
    });
});
