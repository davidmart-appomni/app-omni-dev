const { writeFileSync } = require("fs");

const run = async () => {
  const { remark } = await import("remark");
  const { default: remarkToc } = await import("remark-toc");
  const { includeMarkdown } = await import("@hashicorp/remark-plugins");
  const { read } = await import("to-vfile");
  const knowledgebase = await remark()
    .use(includeMarkdown)
    .process(await read("docs/source/index.md"));

  const toc = await remark().use(remarkToc).process(knowledgebase);

  writeFileSync("docs/index.md", knowledgebase.toString());

  const tools = await remark()
    .use(includeMarkdown)
    .process(await read("tools/source/index.md"));

  writeFileSync("tools/index.md", tools.toString());
};

run();
