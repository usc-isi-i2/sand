try:
    value = value.strip().replace(",", "")
    return float(value)
except:
    return value
