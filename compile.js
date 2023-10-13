const { writeFileSync } = require("fs");

const run = async () => {
  const { remark } = await import("remark");
  const remarkToc = await import("remark-toc");
  const { includeMarkdown } = await import("@hashicorp/remark-plugins");
  const { read } = await import("to-vfile");
  const file = await remark()
    .use(includeMarkdown, remarkToc)
    .process(await read("docs/source/index.md"));
  writeFileSync("docs/index.md", file.toString());
};

run();
