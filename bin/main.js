// 开始处理命令
const program = require("commander");
const minimist = require("minimist");

program.version(require("../package").version).usage("<command> [options]");

// 创建命令
program
  .command("create <app-name>")
  .description("create a new project")
  .option(
    "-p, --preset <presetName>",
    "Skip prompts and use saved or remote preset"
  )
  .option("-d, --default", "Skip prompts and use default preset")
  .action((name, cmd) => {
    // 这里的name是执行脚手架时最初的create的项目名字
    const options = cleanArgs(cmd);
    const argv = minimist(process.argv.slice(3));
    if (argv._.length > 1) {
      console.log(
        chalk.yellow(
          "\n ⚠️  检测到您输入了多个名称，将以第一个参数为项目名，舍弃后续参数哦"
        )
      );
    }
    require("../lib/preCreate")(name, options);
  });

// 获取参数
function cleanArgs(cmd) {
  const args = {};
  cmd.options.forEach((o) => {
    const key = camelize(o.long.replace(/^--/, ""));
    // 如果没有传递option或者有与之相同的命令，则不被拷贝
    if (typeof cmd[key] !== "function" && typeof cmd[key] !== "undefined") {
      args[key] = cmd[key];
    }
  });
  return args;
}

// 转换为驼峰命名
function camelize(str) {
  return str.replace(/-(\w)/g, (_, c) => (c ? c.toUpperCase() : ""));
}

// 调用
program.parse(process.argv);
