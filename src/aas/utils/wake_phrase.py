import re


def detect_wake_phrase(wake_phrase, text):
    """Robust wake phrase detection.

    Case insensitive and removes all punctuations before matching a
    (multi-word) wake phrase.
    """
    print(f"{wake_phrase=}")
    print(f"{text=}")
    return wake_phrase.upper() in re.sub(r"[^\w\s]", "", text.upper())
