import pytest
from app.domain.services.bingo_validator import validate_bingo_claim, get_marked_coordinates
from app.domain.services.number_drawer import generate_draw_sequence, get_letter_for_number

def test_letter_mapping():
    assert get_letter_for_number(5) == "B"
    assert get_letter_for_number(20) == "I"
    assert get_letter_for_number(35) == "N"
    assert get_letter_for_number(50) == "G"
    assert get_letter_for_number(70) == "O"

def test_draw_sequence():
    seq = generate_draw_sequence()
    assert len(seq) == 75
    assert set(seq) == set(range(1, 76))

def test_bingo_validator_horizontal_row():
    # Sample matrix
    card_matrix = [
        [9, 28, 44, 51, 67],
        [13, 26, 34, 46, 73],
        [12, 16, 0, 50, 70],  # row 2 has center FREE space 0
        [10, 21, 32, 52, 71],
        [11, 30, 33, 47, 66]
    ]

    # Pattern for top row (row 0)
    top_row_pattern = [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]]

    # Drawn numbers covering top row
    drawn_numbers = {9, 28, 44, 51, 67}
    
    is_valid, _ = validate_bingo_claim(card_matrix, drawn_numbers, [top_row_pattern])
    assert is_valid is True

    # Missing one number in top row
    incomplete_drawn = {9, 28, 44, 51} # missing 67
    is_valid_inc, _ = validate_bingo_claim(card_matrix, incomplete_drawn, [top_row_pattern])
    assert is_valid_inc is False

def test_bingo_validator_center_free_space():
    card_matrix = [
        [9, 28, 44, 51, 67],
        [13, 26, 34, 46, 73],
        [12, 16, 0, 50, 70],
        [10, 21, 32, 52, 71],
        [11, 30, 33, 47, 66]
    ]

    # Row 2 pattern includes center cell [2,2]
    row2_pattern = [[2, 0], [2, 1], [2, 2], [2, 3], [2, 4]]
    
    # Drawn numbers only need 12, 16, 50, 70 (center [2,2] is FREE)
    drawn_numbers = {12, 16, 50, 70}
    is_valid, _ = validate_bingo_claim(card_matrix, drawn_numbers, [row2_pattern])
    assert is_valid is True
