<h1 align="center">SMC</h1>

<div align="center">

![PyPI](https://img.shields.io/pypi/v/sem-desc-curator)
![Python](https://img.shields.io/badge/python-v3.8+-blue.svg)
[![GitHub Issues](https://img.shields.io/github/issues/binh-vu/smc.svg)](https://github.com/binh-vu/smc/issues)
![Contributions welcome](https://img.shields.io/badge/contributions-welcome-orange.svg)
[![License](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)

</div>

## Table of Contents

- [Introduction](#introduction)
- [Installation](#installation)

## Introduction

SMC is a library to annotate semantic descriptions of tables

## Installation

Install from pip: `pip install -U sem-desc-curator`

## Usage

1. Start the webserver: `smc start -d <dbfile> --externaldb <folder_of_ent_and_ont_db>`
2. Open the URL: `http://localhost:5524`

## Development

1. Install `yarn` and [`yalc`](https://github.com/wclr/yalc)
2. Install dependencies: `yarn install`
3. Start development server: `yarn start`
4. Build production files: `yarn build`
5. Build library files and publish to private index: `yarn build:lib && yalc public --private`
