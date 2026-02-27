# CodeMama
Business Development Engine

## COARE – Customer Outreach And Relationship Engine

COARE is the core outreach module of CodeMama. It provides a simple CLI-based toolkit for tracking **companies**, **contacts**, **campaigns**, and **outreach activities** as part of a structured business development workflow.

---

## Installation

```bash
pip install -r requirements.txt
pip install -e .
```

## Usage

```
coare --help
```

### Dashboard

```bash
coare dashboard
```

### Companies

```bash
coare company add --name "Acme Corp" --industry "Technology" --website "https://acme.com"
coare company list
coare company remove <id>
```

### Contacts

```bash
coare contact add --name "Jane Doe" --email "jane@acme.com" --title "CTO" --company-id <id>
coare contact list
coare contact list --company-id <id>
coare contact remove <id>
```

### Campaigns

```bash
coare campaign add --name "Q1 Outreach" --goal "Close 5 partnerships"
coare campaign list
coare campaign list --status active
coare campaign status <id> active
```

### Outreach Activities

```bash
coare activity add --contact-id <id> --channel email --subject "Introduction"
coare activity list
coare activity list --status pending
coare activity status <id> completed
```

## Data

All data is persisted locally in `coare_data.json`.

## Development

```bash
pip install pytest
pytest tests/
```
