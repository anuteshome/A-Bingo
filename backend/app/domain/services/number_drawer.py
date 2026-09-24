import random
from typing import List, Dict, Any

def generate_draw_sequence() -> List[int]:
    """
    Generates a cryptographically shuffled sequence of numbers from 1 to 75.
    """
    sequence = list(range(1, 76))
    random.SystemRandom().shuffle(sequence)
    return sequence


def get_letter_for_number(number: int) -> str:
    """
    Returns the standard Bingo letter corresponding to a number:
    B: 1-15, I: 16-30, N: 31-45, G: 46-60, O: 61-75
    """
    if 1 <= number <= 15:
        return "B"
    elif 16 <= number <= 30:
        return "I"
    elif 31 <= number <= 45:
        return "N"
    elif 46 <= number <= 60:
        return "G"
    elif 61 <= number <= 75:
        return "O"
    return "?"


def format_drawn_number_payload(number: int, sequence_order: int) -> Dict[str, Any]:
    return {
        "letter": get_letter_for_number(number),
        "number": number,
        "drawn_sequence": sequence_order,
        "drawn_at": None # set by caller
    }
