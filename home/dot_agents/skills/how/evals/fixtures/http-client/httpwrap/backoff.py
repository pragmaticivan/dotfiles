from httpwrap import config


def delay_for(retry_number, retry_after=None):
    if retry_after is not None:
        return min(float(retry_after), config.MAX_RETRY_DELAY_SECONDS)
    return min(config.RETRY_DELAY_SECONDS * (2 ** retry_number), config.MAX_RETRY_DELAY_SECONDS)
