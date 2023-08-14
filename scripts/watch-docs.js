const { watchFile, writeFile } = require('fs')

function updateDocs(contents) {
  writeFile('./tmp/api-docs.json', JSON.stringify(contents, null, 2), () => {
    console.log('api-docs updated!');
  });
}

const docsPath = '../src/api-docs.js';
import(docsPath).then(docsMod => { updateDocs(docsMod.default); });

watchFile('./src/api-docs.js', async () => {
  console.log('Change detected on api-docs!')
  delete require.cache[require.resolve(docsPath)];
  const apiDocs = await import(docsPath);
  updateDocs(apiDocs.default);
});
