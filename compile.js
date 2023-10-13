const { writeFileSync } = require("fs");

const run = async () => {
  const { remark } = await import("remark");
  const { default: remarkToc } = await import("remark-toc");
  const { includeMarkdown } = await import("@hashicorp/remark-plugins");
  const { read } = await import("to-vfile");
  const file = await remark()
    .use(includeMarkdown)
    .process(await read("docs/source/index.md"));

  // console.log(remarkToc);
  const toc = await remark()
    .use(remarkToc)
    .process(file);

  writeFileSync("docs/index.md", file.toString());
};

run();
