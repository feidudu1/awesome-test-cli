const { execSync } = require("child_process");
const semver = require("semver");
// 用于在内存中管理缓存数据，并且支持LRU算法。可以让程序不依赖任何外部数据库实现缓存管理。
// lru-cache的缓存数据保存在当前进程内存内，这就决定了依赖lru-cache的项目是有状态的程序，这样就不能够分布式部署多实例负载均衡，所以如果系统设计需要多实例运行，那么还是需要使用redis。
const LRU = require("lru-cache");

let _hasYarn;
let _hasPnpm3orLater;
let _hasGit;
const _gitCache = new LRU({
  max: 10,
  maxAge: 1000,
});

// 环境检测
exports.hasYarn = () => {
  if (_hasYarn != null) {
    return _hasYarn;
  }
  try {
    execSync("yarn --version", { stdio: "ignore" }); // api文档http://nodejs.cn/api/child_process.html#child_process_child_process_execsync_command_options
    return (_hasYarn = true);
  } catch (e) {
    return (_hasYarn = false);
  }
};

exports.hasPnpm3OrLater = () => {
  if (_hasPnpm3orLater != null) {
    return _hasPnpm3orLater;
  }
  try {
    const pnpmVersion = execSync("pnpm --version", {
      stdio: ["pipe", "pipe", "ignore"],
    }).toString();
    // there's a critical bug in pnpm 2
    // https://github.com/pnpm/pnpm/issues/1678#issuecomment-469981972
    // so we only support pnpm >= 3.0.0
    _hasPnpm = true;
    _hasPnpm3orLater = semver.gte(pnpmVersion, "3.0.0");
    return _hasPnpm3orLater;
  } catch (e) {
    return (_hasPnpm3orLater = false);
  }
};

exports.hasGit = () => {
  if (_hasGit != null) {
    return _hasGit;
  }
  try {
    execSync("git --version", { stdio: "ignore" });
    return (_hasGit = true);
  } catch (e) {
    return (_hasGit = false);
  }
};

exports.hasProjectGit = (cwd) => {
  if (_gitCache.has(cwd)) {
    return _gitCache.get(cwd);
  }

  let result;
  try {
    execSync("git status", { stdio: "ignore", cwd });
    result = true;
  } catch (e) {
    result = false;
  }
  _gitCache.set(cwd, result);
  return result;
};
