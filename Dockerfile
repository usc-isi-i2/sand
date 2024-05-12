FROM python:3-slim-bookworm

RUN apt update && apt install -y curl

RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y

RUN pip install poetry


ADD . /sand

WORKDIR /sand

RUN python -m venv .venv

ENV PATH="/sand/.venv/bin:$PATH"

RUN poetry install