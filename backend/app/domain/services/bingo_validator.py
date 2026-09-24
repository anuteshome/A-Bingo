from typing import List, Set, Tuple

def get_marked_coordinates(card_matrix: List[List[int]], drawn_numbers: Set[int]) -> Set[Tuple[int, int]]:
    """
    Computes set of marked (row, col) coordinates on a 5x5 card given a set of drawn numbers.
    Note: Coordinate (2, 2) [FREE space] or cell with value 0 is always automatically marked.
    """
    marked = set()
    # Center FREE space is always marked
    marked.add((2, 2))

    for row in range(5):
        for col in range(5):
            cell_val = card_matrix[row][col]
            if cell_val == 0:
                marked.add((row, col))
            elif cell_val in drawn_numbers:
                marked.add((row, col))
    return marked


def check_pattern_match(marked_coords: Set[Tuple[int, int]], pattern_coords: List[List[int]]) -> bool:
    """
    Returns True if marked_coords contains ALL target coordinates of pattern_coords.
    """
    required_set = {(p[0], p[1]) for p in pattern_coords}
    return required_set.issubset(marked_coords)


def validate_bingo_claim(
    card_matrix: List[List[int]], 
    drawn_numbers: Set[int], 
    patterns: List[List[List[int]]]
) -> Tuple[bool, str]:
    """
    Validates whether a Bingo claim is valid for a given card matrix and drawn numbers.
    
    :param card_matrix: 5x5 grid of integers
    :param drawn_numbers: set of numbers drawn so far in the round
    :param patterns: list of pattern coordinate lists, e.g. [[[0,0], [0,1], ...], ...]
    :return: Tuple (is_valid: bool, matched_pattern_name: str)
    """
    marked_coords = get_marked_coordinates(card_matrix, drawn_numbers)

    for idx, pattern in enumerate(patterns):
        if check_pattern_match(marked_coords, pattern):
            return True, f"PATTERN_{idx+1}"

    return False, ""
