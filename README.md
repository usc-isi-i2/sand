<h1 align="center">SAND</h1>

<div align="center">

![PyPI](https://img.shields.io/pypi/v/web-sand)
![Python](https://img.shields.io/badge/python-v3.8+-blue.svg)
[![GitHub Issues](https://img.shields.io/github/issues/usc-isi-i2/sand.svg)](https://github.com/usc-isi-i2/sand/issues)
![Contributions welcome](https://img.shields.io/badge/contributions-welcome-orange.svg)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)

</div>

## Table of Contents

- [Introduction](#introduction)
- [Installation](#installation)

## Introduction

SAND is an application to annotate semantic descriptions of tables and (optionally) linked records in tables to a target knowledge graph, then it can automatically export the table data to RDF, JSON-LD, etc. It also does basic data cleaning automatically based on the annotated semantic descriptions. SAND is designed to be customizable: you can plug in a new semantic modeling algorithm (which generates a semantic description automatically) or different knowledge graphs as long as you have a suitable plugin implemented SAND's plugin interface.

Moreover, SAND offers an internal KG browsing and table filtering so you can interactively browsing and modeling your tables.

For a demo, please see: our [demo paper](./docs/paper.pdf), [demo video](https://github.com/usc-isi-i2/sand/wiki/Demo).

<!-- For more documentation, please see [not available yet](). -->

## Installation

Install from pip: `pip install -U web-sand`

## Usage

1. Initialize database: `sand init -d <dbfile>`. For example: `sand init -d ./data/sand.db`
2. Start the webserver: `sand start -d <dbfile> --externaldb <folder_of_ent_and_ont_db>`
3. Open the URL: `http://localhost:5524`

For example, checkout [server.sh](./server.sh)

## Development

0. cd to `www`
1. Install `yarn` and [`yalc`](https://github.com/wclr/yalc)
2. Install dependencies: `yarn install`
3. Start development server: `yarn start`. Then, access development server at: `http://127.0.0.1:3000`.
4. Build production files: `yarn build`
5. Build library files and publish to private index (only if you are released `sand` as a library): `yarn build:lib && yalc public --private`
