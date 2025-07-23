# Development

## Styling

We can serve the web app outside FastAPI to quickly iterate on styling etc.

```bash
make run-web
```

## Release

The release versions can be updated as follows.

```bash
VERSION=0.5.0
hatch version $VERSION
git add -u
git commit -m "bump version to ${VERSION}"
```

Tag the commit on git.

```bash

git tag v${VERSION}
git push origin v${VERSION}
```

Then create a new release on GitHub.
