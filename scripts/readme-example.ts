import { scanDirectory } from '../src/scan';
import { selectFiles, getTreePaths } from '../src/select';
import { renderFiles, renderTree } from '../src/render';
import { formatOutput } from '../src/format';
import { toDiskTmp, cleanupDisk } from '../test/fixture';
import { projectTree, patterns } from '../test/readme-example';

const main = async () => {
  const projectPath = await toDiskTmp(projectTree);
  const root = await scanDirectory(projectPath);
  const selected = selectFiles(root, patterns);
  const rendered = await renderFiles(projectPath, selected, {});

  const section = (title: string) => {
    console.log(`\n${'='.repeat(60)}`);
    console.log(title);
    console.log('='.repeat(60));
  };

  section('XML (default)');
  console.log(formatOutput(rendered, null, 'xml'));

  section('XML + directory tree (-t)');
  const treePaths = getTreePaths(selected);
  const tree = renderTree(root, treePaths, 'my_project');
  console.log(formatOutput(rendered, tree, 'xml'));

  section('Markdown (-m)');
  console.log(formatOutput(rendered, null, 'markdown'));

  section('JSON (-j)');
  console.log(formatOutput(rendered, null, 'json'));

  section('JSON + directory tree (-j -t)');
  console.log(formatOutput(rendered, tree, 'json'));

  await cleanupDisk();
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
