try:
    value = value.strip()
    if value.isdigit():
        return int(value)
    return float(value)
except:
    return value
