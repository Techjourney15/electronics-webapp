import re


_WORD_NUMS = {
    'zero': 0, 'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
    'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10,
    'eleven': 11, 'twelve': 12, 'thirteen': 13, 'fourteen': 14, 'fifteen': 15,
    'sixteen': 16, 'seventeen': 17, 'eighteen': 18, 'nineteen': 19,
    'twenty': 20, 'thirty': 30, 'forty': 40, 'fifty': 50,
    'sixty': 60, 'seventy': 70, 'eighty': 80, 'ninety': 90,
}
_WORD_SCALES = {'hundred': 100, 'thousand': 1_000, 'lakh': 100_000, 'lac': 100_000, 'crore': 10_000_000}

# Internal marker appended (no space) after a number that was converted
# from a spoken price phrase (e.g. "ninety thousand" -> "90000<marker>").
# Lets the regexes below recognise it as an already-scaled price figure
# without re-multiplying it, while a bare "two" or "eight" (no scale
# word, e.g. "8 gb") is left as a plain number and never flagged as price.
_PRICE_MARKER = 'pricewordflag'


def _words_to_digits(text):
    """Rewrite spoken-style number phrases ('ninety thousand') into plain
    digits so the rest of the parser can handle them like digit input.
    Only phrases that include a scale word (thousand/lakh/lac/crore/
    hundred) get flagged as price-like; a lone number word is left as a
    plain digit and NOT treated as a price on its own.

    Two deliberate limits, both to avoid corrupting other patterns:
    - Does not glue across "and" (so "between X and Y" keeps X and Y
      separate instead of merging into one number like "X and fifty"
      style phrases would).
    - Leaves a scale word alone if it directly follows a raw digit
      (e.g. "1 lakh", "1.5 lakh") — that case is already handled
      natively by the digit+unit regexes below, so re-touching it here
      would double-process it incorrectly.
    """
    digit_re = re.compile(r'^[\d,]+(\.\d+)?$')
    tokens = text.split()
    out = []
    i = 0
    while i < len(tokens):
        word = tokens[i].lower().strip('.,')
        prev_is_digit = i > 0 and bool(digit_re.match(tokens[i - 1].strip('.,')))
        starts_run = word in _WORD_NUMS or (word in _WORD_SCALES and not prev_is_digit)

        if starts_run:
            run = []
            j = i
            while j < len(tokens):
                w = tokens[j].lower().strip('.,')
                if w in _WORD_NUMS or w in _WORD_SCALES:
                    run.append(w)
                    j += 1
                else:
                    break

            has_scale = any(w in _WORD_SCALES for w in run)

            total, current = 0, 0
            for w in run:
                if w in _WORD_NUMS:
                    current += _WORD_NUMS[w]
                else:
                    scale = _WORD_SCALES[w]
                    if scale >= 1000:
                        total += (current or 1) * scale
                        current = 0
                    else:
                        current = (current or 1) * scale
            value = total + current

            out.append(str(value) + (_PRICE_MARKER if has_scale else ''))
            i = j
        else:
            out.append(tokens[i])
            i += 1
    return ' '.join(out)


_UNIT_GROUP = rf'(k|thousand|lakh|lac|{_PRICE_MARKER})'

_RANGE_PATTERN = re.compile(
    rf'(?:between|from)\s*([\d,]+(?:\.\d+)?)\s*{_UNIT_GROUP}?\s*'
    rf'(?:and|to|-)\s*([\d,]+(?:\.\d+)?)\s*{_UNIT_GROUP}?',
    re.IGNORECASE,
)

_UNDER_PATTERN = re.compile(
    rf'(?:under|below|less than|max|maximum|upto|up to)\s*(?:rs\.?|npr)?\s*'
    rf'([\d,]+(?:\.\d+)?)\s*{_UNIT_GROUP}?',
    re.IGNORECASE,
)

_OVER_PATTERN = re.compile(
    rf'(?:above|over|more than|min|minimum)\s*(?:rs\.?|npr)?\s*'
    rf'([\d,]+(?:\.\d+)?)\s*{_UNIT_GROUP}?',
    re.IGNORECASE,
)

# Bare number with a unit (or the spoken-price marker), no explicit
# "under/above" keyword — e.g. "90k laptop", "1 lakh phone",
# "ninety thousand laptop". A unit/marker is REQUIRED here so a plain
# spec number like "8 gb" or "128 storage" never gets mistaken for price.
_BARE_PATTERN = re.compile(
    rf'(?:rs\.?|npr)?\s*([\d,]+(?:\.\d+)?)\s*{_UNIT_GROUP}',
    re.IGNORECASE,
)

# Plain bare number with NO unit word at all — e.g. "80000 vivo".
# Restricted to 4-7 digits to stay well clear of spec numbers like
# "8 gb" or "128 gb storage", which are 1-3 digits. Only used as a
# last-resort fallback if nothing else matched.
_BARE_DIGITS_ONLY_PATTERN = re.compile(r'\b(\d{4,7})\b')

_UNIT_MULTIPLIER = {
    'k': 1_000,
    'thousand': 1_000,
    'lakh': 100_000,
    'lac': 100_000,
    _PRICE_MARKER: 1,  # already-scaled by _words_to_digits
}

# Tolerance applied when the user gives a single figure with no explicit
# "under/above/between" keyword. People saying "90k laptop" usually mean
# "around/within a 90k budget", not exactly 90,000 — so we treat it as
# an upper bound with a bit of headroom rather than leaving it
# unconstrained (which is the original bug).
_BARE_UPPER_TOLERANCE = 1.15


def _to_number(raw_value, unit):
    value = float(raw_value.replace(',', ''))
    if unit:
        value *= _UNIT_MULTIPLIER[unit.lower()]
    return value


def parse_price_range(query):
    """
    Extract a (min_price, max_price, cleaned_query, target_price) tuple
    from free-text search input.

    - min_price / max_price: hard bounds to filter the SQL queryset by.
      Either may be None if not present in the query.
    - cleaned_query: the query text with the matched price phrase
      stripped out, so the remainder can be embedded for semantic
      similarity without the number confusing the match.
    - target_price: only set for the "bare number" case (e.g. "90k
      laptop", "80000 vivo") where the user gave one approximate figure
      rather than an explicit under/above/between bound. Callers can use
      this to order results by closeness to that figure within the
      price-filtered set, instead of (or before) semantic ranking. None
      for every other case, since there's no single target to be close to.
    """
    query = _words_to_digits(query)
    min_price = None
    max_price = None
    target_price = None
    cleaned = query

    m = _RANGE_PATTERN.search(query)
    if m:
        low = _to_number(m.group(1), m.group(2))
        high = _to_number(m.group(3), m.group(4))
        min_price, max_price = sorted([low, high])
        cleaned = (query[:m.start()] + ' ' + query[m.end():]).strip()
        return min_price, max_price, cleaned, target_price

    m = _UNDER_PATTERN.search(query)
    if m:
        max_price = _to_number(m.group(1), m.group(2))
        cleaned = (query[:m.start()] + ' ' + query[m.end():]).strip()
        return min_price, max_price, cleaned, target_price

    m = _OVER_PATTERN.search(query)
    if m:
        min_price = _to_number(m.group(1), m.group(2))
        cleaned = (query[:m.start()] + ' ' + query[m.end():]).strip()
        return min_price, max_price, cleaned, target_price

    m = _BARE_PATTERN.search(query)
    if m:
        target_price = _to_number(m.group(1), m.group(2))
        max_price = round(target_price * _BARE_UPPER_TOLERANCE)
        cleaned = (query[:m.start()] + ' ' + query[m.end():]).strip()
        return min_price, max_price, cleaned, target_price

    m = _BARE_DIGITS_ONLY_PATTERN.search(query)
    if m:
        target_price = _to_number(m.group(1), None)
        max_price = round(target_price * _BARE_UPPER_TOLERANCE)
        cleaned = (query[:m.start()] + ' ' + query[m.end():]).strip()
        return min_price, max_price, cleaned, target_price

    return min_price, max_price, cleaned, target_price