// junsi-dev-toolkit git 工具插件 (DSH port)
//
// 通用 git 透传工具：把模型给的完整 `git <args>` 命令直接执行。
//
// 设计要点 —— 为什么这个工具能绕过沙箱对 git 凭据(PAT/ssh.exe)的隔离：
//   DSH 的 bash/pwsh 工具命令走受限 token 沙箱(dsh-sandbox-windows-acl /
//   bwrap)，沙箱子进程拿不到用户的 git credential helper / ssh agent /
//   ssh.exe，导致 GitHub HTTP/SSH 的 pull/push 认证失败。
//   本工具不用 bash-sandbox，而是用 Node child_process 在 HOST 进程的完整
//   用户身份下直接 spawn git，因此继承用户的凭据环境(~/.git-credentials,
//   ssh-agent, ~/.ssh 等)，GH HTTP/SSH 认证正常。
//
//   若模型需要显式呈现在更高权限下运行，可传 sandbox=danger-full-access，
//   工具仍以 host spawn 执行（本身就不受限），并在结果里注明。
//
// 用 Node builtin 实现，preset-local 模块可用，无 bare import。

import { spawn } from 'node:child_process'

export const inject = ['tools']
export const name = 'git'

function workspaceOf(exec) {
  const cwd = exec?.agent?.session?.header?.cwd
  if (typeof cwd === 'string' && cwd.length) return cwd
  return process.cwd?.() || '.'
}

function buildParameters(spec) {
  const properties = {}
  const required = []
  for (const [k, v] of Object.entries(spec)) {
    const { required: r, default: d, ...rest } = v
    const prop = { ...rest }
    if (d !== undefined) prop.default = d
    properties[k] = prop
    if (r) required.push(k)
  }
  return { type: 'object', properties, ...(required.length ? { required } : {}) }
}

function runGit(args, opts) {
  return new Promise((resolve) => {
    let stdout = ''
    let stderr = ''
    const child = spawn('git', args, {
      cwd: opts.cwd,
      env: process.env,
      windowsHide: true,
      shell: false,
    })
    child.stdout?.on('data', (d) => (stdout += d.toString()))
    child.stderr?.on('data', (d) => (stderr += d.toString()))
    const timeout = setTimeout(() => child.kill('SIGKILL'), opts.timeoutMs || 120000)
    child.on('error', (err) => {
      clearTimeout(timeout)
      resolve({ code: -1, stdout, stderr: stderr || err.message })
    })
    child.on('close', (code, signal) => {
      clearTimeout(timeout)
      resolve({ code: code ?? (signal ? -2 : -3), stdout, stderr })
    })
  })
}

export function apply(ctx) {
  ctx.tools.register({
    name: 'git',
    description:
      '通用 git 工具：在当前会话 workspace 下透传执行完整 git 命令（status/add/commit/push/pull/fetch/clone/branch/log/diff 等）。' +
      '以 HOST 完整身份直接运行 git（不经受限沙箱），因此能访问用户的 git 凭据(PAT/ssh agent/~/.ssh)和 ssh.exe，' +
      'GitHub HTTP/SSH 的 pull/push 认证可用。传 workdir 可指定执行目录；需要显式更高权限标注时传 sandbox=danger-full-access。',
    parameters: buildParameters({
      args: { type: 'array', required: true, description: '完整 git 参数数组，如 ["status"] 或 ["push","origin","main"]；不要包含 "git" 本身', items: { type: 'string' } },
      workdir: { type: 'string', required: false, description: 'git 执行目录。默认当前会话 workspace cwd' },
      sandbox: { type: 'string', required: false, enum: ['default', 'danger-full-access'], description: 'default=直接以 host 身份执行；danger-full-access=显式标注以完整权限执行（访问凭据）。默认 default' },
    }),
    execute: async (args, exec) => {
      if (!Array.isArray(args.args) || !args.args.length) return 'git: 需要非空 args 数组'
      const cwd = args.workdir || workspaceOf(exec)
      const r = await runGit(args.args, { cwd, timeoutMs: args.timeoutMs })
      const note = args.sandbox === 'danger-full-access' ? '\n[sandbox] 以 danger-full-access（host 完整身份）执行，可访问 git 凭据。' : ''
      const out = [`工作目录: ${cwd}`, `命令: git ${args.args.join(' ')}`, '']
      if (r.stdout.trim()) out.push(r.stdout.trimEnd())
      if (r.stderr.trim()) out.push('[stderr]', r.stderr.trimEnd())
      out.push('')
      out.push(`exit code: ${r.code}`)
      if (r.code !== 0) out.push('（非零退出。若为认证错误，请确认 git credential helper/ssh-agent 已配置，并考虑传 sandbox=danger-full-access 以完整身份重试）')
      return out.join('\n') + note
    },
    output: { schema: { type: 'string' }, render: (_a, v) => [{ type: 'text', text: String(v) }] },
  })
}
