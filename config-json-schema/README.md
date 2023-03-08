## VSCode usage

```bash
# link to sample vscode settings
WORKSPACE_ROOT=/path/to/workspace/
mkdir -p $WORKSPACE_ROOT/.vscode
ln -s $(realpath ./.vscode/settings.json) $WORKSPACE_ROOT/.vscode/settings.json

# host schema definitions
python -m http.server 5000
```

## TODO

- [ ] Add schema for remainder of package structure
- [ ] Use stricter types/enums where appropriate
- [ ] Add docstrings for types
- [ ] Automate schema generation
- [ ] Host schema definitions
- [ ] Add remainder of schema paths to sample settings.json
