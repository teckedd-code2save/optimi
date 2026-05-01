# Contributing to Optimi

Thank you for your interest in contributing! This document will help you get started.

## Development Setup

### Frontend

```bash
cd app
npm install
npm run dev
```

### Scraper

```bash
cd scraper
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt
```

## Code Style

- **TypeScript/React**: Follow the existing ESLint configuration. Run `npm run lint` before committing.
- **Python**: Follow PEP 8. Use type hints where practical.

## Commit Messages

Use clear, descriptive commit messages:

- `feat: add dark mode toggle`
- `fix: resolve calendar export timezone issue`
- `docs: update scraper README with new examples`
- `refactor: simplify KanbanColumn props`

## Testing Changes

1. Ensure `npm run build` completes without TypeScript errors.
2. Verify the Python CLI runs: `python -m scraper.cli --help`
3. Test on both desktop and mobile viewports.

## Reporting Issues

When opening an issue, please include:

- A clear description of the bug or feature request
- Steps to reproduce (for bugs)
- Browser / OS version
- Screenshots if applicable

## Pull Request Process

1. Update documentation if your change affects usage or deployment.
2. Ensure your branch is up to date with `main` before opening the PR.
3. Respond to review feedback promptly and courteously.

## Questions?

Feel free to open a discussion or reach out via the project's communication channels.
