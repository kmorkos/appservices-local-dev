import { readFileSync } from 'fs';
import { globSync } from 'glob';

const main = () => {
  if (process.argv.length !== 3) {
    throw new Error(`Usage: node genOptions.ts /path/to/app/root`);
  }

  const projectRoot = process.argv[2];

  const datasourceFiles = globSync(`${projectRoot}/data_sources/**/config.json`);
  const valueFiles = globSync(`${projectRoot}/values/*.json`);

  const datasources = datasourceFiles.reduce<{ [key: string]: string; }>((m, filename) => {
    const j = JSON.parse(readFileSync(filename, 'utf-8'));
    m[j.name] = 'mongodb://localhost:27017';
    return m;
  }, {});

  const values = valueFiles.reduce<{ [key: string]: string; }>((m, filename) => {
    const j = JSON.parse(readFileSync(filename, 'utf-8'));
    m[j.name] = j.value;
    return m;
  }, {});

  return { datasources, values, };
};

try {
  const options = main();
  console.log(options);
} catch (e) {
  console.error(e);
  process.exit(1);
}
