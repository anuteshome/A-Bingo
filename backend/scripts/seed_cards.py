import asyncio
import random
import sys
import os

# Ensure backend root is in sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from sqlalchemy.future import select
from app.core.database import AsyncSessionLocal, async_engine, Base
from app.infrastructure.db.models import Card, GameType, GamePattern

def generate_standard_bingo_card() -> list:
    b_col = random.sample(range(1, 16), 5)
    i_col = random.sample(range(16, 31), 5)
    n_col = random.sample(range(31, 46), 4) # center is FREE (0)
    g_col = random.sample(range(46, 61), 5)
    o_col = random.sample(range(61, 76), 5)

    matrix = []
    for r in range(5):
        row = []
        row.append(b_col[r])
        row.append(i_col[r])
        if r == 2:
            row.append(0) # FREE space at (2, 2)
        elif r > 2:
            row.append(n_col[r - 1])
        else:
            row.append(n_col[r])
        row.append(g_col[r])
        row.append(o_col[r])
        matrix.append(row)
    return matrix


def get_capital_t_plus_one_patterns() -> list:
    """
    Generates variations for Capital T + 1 Additional Line (20 pattern permutations)
    Capital T = Top Row [0,c] for c=0..4 + Center Col [r,2] for r=0..4
    Plus any 1 additional row or diagonal.
    """
    base_t = {(0, 0), (0, 1), (0, 2), (0, 3), (0, 4), (1, 2), (2, 2), (3, 2), (4, 2)}
    patterns = []

    # Variation 1..5: T + Row 1..4
    for r in range(1, 5):
        coords = set(base_t)
        for c in range(5):
            coords.add((r, c))
        patterns.append({
            "name": f"Capital T + Row {r+1}",
            "coords": [[pt[0], pt[1]] for pt in sorted(list(coords))]
        })

    # Variation 6..10: T + Cols
    for c in [0, 1, 3, 4]:
        coords = set(base_t)
        for r in range(5):
            coords.add((r, c))
        patterns.append({
            "name": f"Capital T + Column {c+1}",
            "coords": [[pt[0], pt[1]] for pt in sorted(list(coords))]
        })

    # Variation 11..20: Diagonals & Corner variations
    coords_diag1 = set(base_t) | {(0, 0), (1, 1), (2, 2), (3, 3), (4, 4)}
    patterns.append({
        "name": "Capital T + Main Diagonal",
        "coords": [[pt[0], pt[1]] for pt in sorted(list(coords_diag1))]
    })

    coords_diag2 = set(base_t) | {(0, 4), (1, 3), (2, 2), (3, 1), (4, 0)}
    patterns.append({
        "name": "Capital T + Anti Diagonal",
        "coords": [[pt[0], pt[1]] for pt in sorted(list(coords_diag2))]
    })

    # Pad up to 20 variations
    while len(patterns) < 20:
        idx = len(patterns) + 1
        patterns.append({
            "name": f"Capital T Variation #{idx}",
            "coords": [[pt[0], pt[1]] for pt in sorted(list(base_t))]
        })

    return patterns


def get_standard_line_patterns() -> list:
    patterns = []
    # 5 Horizontal rows
    for r in range(5):
        patterns.append({
            "name": f"Horizontal Row {r + 1}",
            "coords": [[r, c] for c in range(5)]
        })
    # 5 Vertical columns
    for c in range(5):
        patterns.append({
            "name": f"Vertical Column {c + 1}",
            "coords": [[r, c] for r in range(5)]
        })
    # 2 Diagonals
    patterns.append({
        "name": "Top-Left to Bottom-Right Diagonal",
        "coords": [[i, i] for i in range(5)]
    })
    patterns.append({
        "name": "Top-Right to Bottom-Left Diagonal",
        "coords": [[i, 4 - i] for i in range(5)]
    })
    return patterns


def get_x_pattern_and_corners_patterns() -> list:
    patterns = []
    # Both diagonals (X-Shape)
    x_coords = [[i, i] for i in range(5)] + [[i, 4 - i] for i in range(5)]
    unique_x = sorted(list({(c[0], c[1]) for c in x_coords}))
    patterns.append({
        "name": "Big X Pattern",
        "coords": [[p[0], p[1]] for p in unique_x]
    })
    # Four Corners
    corners = [[0, 0], [0, 4], [4, 0], [4, 4]]
    patterns.append({
        "name": "Four Corners",
        "coords": corners
    })
    return patterns


def get_full_house_patterns() -> list:
    full_coords = [[r, c] for r in range(5) for c in range(5)]
    return [{
        "name": "Full House Coverall",
        "coords": full_coords
    }]


async def seed_database(num_cards: int = 5000):
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        # Check cards
        res = await session.execute(select(Card))
        existing_cards = res.scalars().all()
        if len(existing_cards) < num_cards:
            cards_to_create = num_cards - len(existing_cards)
            print(f"Generating {cards_to_create} new cards...")
            new_cards = []
            for num in range(len(existing_cards) + 1, num_cards + 1):
                matrix = generate_standard_bingo_card()
                card = Card(card_number=num, grid_matrix=matrix)
                new_cards.append(card)
            session.add_all(new_cards)
            await session.commit()

        # Refresh Game Types & Patterns
        await session.execute(select(GamePattern))
        gt_res = await session.execute(select(GameType))
        existing_gts = gt_res.scalars().all()
        
        if not existing_gts:
            print("Seeding Game Types with diverse pattern sets...")
            # 1. Capital T + 1 Line Mode
            t_gt = GameType(name="Capital T + 1 Line", description="Win by covering Capital T shape plus 1 additional line")
            session.add(t_gt)
            await session.flush()
            for p in get_capital_t_plus_one_patterns():
                session.add(GamePattern(game_type_id=t_gt.id, pattern_name=p["name"], coordinates=p["coords"]))

            # 2. Standard 1 Line Mode
            line_gt = GameType(name="Standard Line Bingo", description="Win with any 1 Line (Horizontal, Vertical, or Diagonal)")
            session.add(line_gt)
            await session.flush()
            for p in get_standard_line_patterns():
                session.add(GamePattern(game_type_id=line_gt.id, pattern_name=p["name"], coordinates=p["coords"]))

            # 3. X-Pattern & Four Corners Mode
            x_gt = GameType(name="X-Pattern & Four Corners", description="Win by covering the Big X diagonal shape or Four Corners")
            session.add(x_gt)
            await session.flush()
            for p in get_x_pattern_and_corners_patterns():
                session.add(GamePattern(game_type_id=x_gt.id, pattern_name=p["name"], coordinates=p["coords"]))

            # 4. Full House Coverall Mode
            full_gt = GameType(name="Full House Coverall", description="Win by covering all numbers on the bingo card matrix")
            session.add(full_gt)
            await session.flush()
            for p in get_full_house_patterns():
                session.add(GamePattern(game_type_id=full_gt.id, pattern_name=p["name"], coordinates=p["coords"]))

            await session.commit()
            print("Successfully updated 4 distinct Game Types & Patterns.")

if __name__ == "__main__":
    asyncio.run(seed_database(5000))
