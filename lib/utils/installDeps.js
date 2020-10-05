const EventEmitter = require("events");
const chalk = require("chalk");
const execa = require("execa");
const shouldUseTaobao = require("./shouldUseTaobao");

class InstallProgress extends EventEmitter {
  constructor() {
    super();

    this._progress = -1;
  }

  get progress() {
    return this._progress;
  }

  set progress(value) {
    this._progress = value;
    this.emit("progress", value);
  }

  get enabled() {
    return this._progress !== -1;
  }

  set enabled(value) {
    this.progress = value ? 0 : -1;
  }

  log(value) {
    this.emit("log", value);
  }
}
const progress = (exports.progress = new InstallProgress());

const supportPackageManagerList = ["npm", "yarn", "pnpm"];
const packageManagerConfig = {
  npm: {
    installDeps: ["install", "--loglevel", "error"],
    installPackage: ["install", "--loglevel", "error"],
    uninstallPackage: ["uninstall", "--loglevel", "error"],
    updatePackage: ["update", "--loglevel", "error"],
  },

  pnpm: {
    installDeps: ["install", "--loglevel", "error", "--shamefully-flatten"],
    installPackage: ["install", "--loglevel", "error"],
    uninstallPackage: ["uninstall", "--loglevel", "error"],
    updatePackage: ["update", "--loglevel", "error"],
  },

  yarn: {
    installDeps: [],
    installPackage: ["add"],
    uninstallPackage: ["remove"],
    updatePackage: ["upgrade"],
  },
};

/**
 * 主入口
 *
 * @param {*} targetDir
 * @param {*} command
 * @param {*} cliRegistry
 */
exports.installDeps = async function installDeps(
  targetDir,
  command,
  cliRegistry
) {
  checkPackageManagerIsSupported(command);

  const args = packageManagerConfig[command].installDeps;

  await addRegistryToArgs(command, args, cliRegistry);
  await executeCommand(command, args, targetDir);
};

/**
 * 是否支持支持包管理（npm等方式）
 *
 * @param {*} command
 */
function checkPackageManagerIsSupported(command) {
  if (supportPackageManagerList.indexOf(command) === -1) {
    throw new Error(`Unknown package manager: ${command}`);
  }
}

async function addRegistryToArgs(command, args, cliRegistry) {
  const altRegistry =
    cliRegistry ||
    ((await shouldUseTaobao(command)) ? registries.taobao : null);

  if (altRegistry) {
    args.push(`--registry=${altRegistry}`);
    if (altRegistry === registries.taobao) {
      args.push(`--disturl=${taobaoDistURL}`);
    }
  }
}

function executeCommand(command, args, targetDir) {
  return new Promise((resolve, reject) => {
    progress.enabled = false;
    const child = execa(command, args, {
      cwd: targetDir,
      // stdio: ["inherit", "inherit", "inherit"],
      // 用于配置在父进程和子进程之间建立的管道，没有该配置报错https://nodejs.org/api/child_process.html#child_process_options_stdio
      // 该配置生效会打印yarn install的过程
    });

    // filter out unwanted yarn output
    if (command === "yarn") {
      child.stderr.on("data", (buf) => {
        const str = buf.toString();
        if (/warning/.test(str)) {
          return;
        }

        // progress bar
        const progressBarMatch = str.match(/\[.*\] (\d+)\/(\d+)/);
        if (progressBarMatch) {
          // since yarn is in a child progress, it's unable to get the width of
          // the terminal. reimplement the progress bar ourselves!
          renderProgressBar(progressBarMatch[1], progressBarMatch[2]);
          return;
        }

        progress.stderr.write(buf);
      });
    }
    // 正常应该是这种情况
    // 先exit，然后close，但是之前没有设置stdio的时候，会直接在exit的时候reject。如果没有设置exit，那么也不会走进close
    // 如果不监听exit，那么进不来close
    child.on("close", (code, signal) => {
      console.log(333, code, signal);
      if (code !== 0) {
        reject(`command failed: ${command} ${args.join(" ")}`);
        return;
      }
      resolve();
    });
    // 如果进程退出，则 code 是进程的最终退出码，否则为 null。
    // 如果进程是因为收到的信号而终止，则 signal 是信号的字符串名称，否则为 null。
    // 这两个值至少有一个是非 null 的。
    child.on("exit", (code, signal) => {
      console.log(444, code, signal);
      if (code !== 0) {
        // code === false
        // signal === null
        reject(`command failed: ${command} ${args.join(" ")}`);
        return;
      }
      resolve();
    });
  });
}

function renderProgressBar(curr, total) {
  const ratio = Math.min(Math.max(curr / total, 0), 1);
  const bar = ` ${curr}/${total}`;
  const availableSpace = Math.max(0, progress.stderr.columns - bar.length - 3);
  const width = Math.min(total, availableSpace);
  const completeLength = Math.round(width * ratio);
  const complete = `#`.repeat(completeLength);
  const incomplete = `-`.repeat(width - completeLength);
  toStartOfLine(progress.stderr);
  progress.stderr.write(`[${complete}${incomplete}]${bar}`);
}
